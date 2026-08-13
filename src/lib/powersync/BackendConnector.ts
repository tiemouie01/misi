import { UpdateType } from '@powersync/web'
import type { ConvexReactClient } from 'convex/react'
import { makeFunctionReference } from 'convex/server'
import { ConvexError } from 'convex/values'

import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
} from '@powersync/web'
import type { ConvexMutationErrorData } from '../../../convex/mutationErrors'
import { UPLOAD_REJECTION_MUTATION_ERROR_CODES } from '../../../convex/mutationErrors'
import ConvexSchema from '../../../convex/schema'

import { authClient } from '#/lib/auth-client'
import { createConvexDecoder } from './ConvexDecoder'

const SYNC_TABLES = [
  'categories',
  'accounts',
  'cycles',
  'transactions',
  'budgets',
  'incomeSources',
  'cycleIncomePlans',
  'debts',
  'settings',
  'autoSaveEvents',
] as const

type SyncTable = (typeof SYNC_TABLES)[number]

type TableDecoder = {
  create: (data: Record<string, unknown>) => Record<string, unknown>
  patch: (data: Record<string, unknown>) => Record<string, unknown>
}

/** Literal/union string fields that pass through as SQLite text. */
const UNION_FIELD_OVERRIDES = {
  type: { decode: (value: unknown) => value },
  budgetGroup: { decode: (value: unknown) => value },
  kind: { decode: (value: unknown) => value },
  currency: { decode: (value: unknown) => value },
  status: { decode: (value: unknown) => value },
  walletId: { decode: (value: unknown) => value },
}

function isSyncTable(table: string): table is SyncTable {
  return (SYNC_TABLES as readonly string[]).includes(table)
}

function makeTableDecoders(validator: {
  omit: (field: 'userId') => {
    fields: Record<string, unknown>
    partial: () => { fields: Record<string, unknown> }
  }
}): TableDecoder {
  // Per-table validators form a union; call omit via this narrow shape.
  const withoutUserId = validator.omit('userId')
  return {
    create: createConvexDecoder(
      withoutUserId as never,
      UNION_FIELD_OVERRIDES as never,
    ),
    // Patches keep NULLs so the server can clear fields (e.g. unarchive,
    // removing a note); the sync.ts update mutations accept null for these.
    patch: createConvexDecoder(
      withoutUserId.partial() as never,
      UNION_FIELD_OVERRIDES as never,
      { preserveNull: true },
    ),
  }
}

function buildConvexDecoders() {
  const decoders = {} as Record<SyncTable, TableDecoder>

  for (const table of SYNC_TABLES) {
    decoders[table] = makeTableDecoders(
      ConvexSchema.tables[table].validator,
    )
  }

  return decoders
}

const convexDecoders = buildConvexDecoders()

function stripUserId(data: Record<string, unknown>) {
  const { userId: _userId, ...rest } = data
  return rest
}

function decodeCrudData(
  table: string,
  mode: 'create' | 'patch',
  data: Record<string, unknown>,
) {
  if (!isSyncTable(table)) {
    throw new Error(`No Convex decoder configured for table "${table}".`)
  }

  return convexDecoders[table][mode](stripUserId(data))
}

function getConvexErrorData(error: unknown): ConvexMutationErrorData | undefined {
  if (error instanceof ConvexError) {
    return error.data as ConvexMutationErrorData
  }

  const data = (error as { data?: unknown } | undefined)?.data
  if (data && typeof data === 'object') {
    return data
  }
}

function isPermanentConvexRejection(error: unknown) {
  const code = getConvexErrorData(error)?.code
  return typeof code === 'string' && UPLOAD_REJECTION_MUTATION_ERROR_CODES.has(code)
}

export type ConnectorOptions = {
  convexClient: ConvexReactClient
}

/**
 * Bridges PowerSync to Convex Cloud.
 *
 * Supplies PowerSync credentials from the Better Auth JWT, uploads queued
 * local writes via `sync:*` mutations, and drops transactions only on
 * permanent Convex rejection codes.
 */
export class BackendConnector implements PowerSyncBackendConnector {
  readonly powersyncUrl: string
  private convexClient: ConvexReactClient
  private authToken: string | null

  constructor(options: ConnectorOptions) {
    this.authToken = null
    this.convexClient = options.convexClient
    this.powersyncUrl =
      import.meta.env.VITE_POWERSYNC_URL ?? 'http://localhost:8080'
  }

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  async fetchCredentials() {
    // PowerSync calls this when it needs a (re)fresh token, so always try to
    // mint a new short-lived Better Auth JWT instead of reusing the cache.
    try {
      const { data } = await authClient.convex.token({
        fetchOptions: { throw: false },
      })
      if (data?.token) {
        this.authToken = data.token
      }
    } catch {
      // Fall back to the cached token below.
    }

    if (!this.authToken) {
      throw new Error('Not authenticated')
    }

    return {
      endpoint: this.powersyncUrl,
      token: this.authToken,
    }
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction()

    if (!transaction) {
      return
    }

    try {
      for (const op of transaction.crud) {
        const table = op.table

        switch (op.op) {
          case UpdateType.PUT: {
            const createRef = makeFunctionReference<'mutation'>(
              `sync:${table}Create`,
            )
            const putData = decodeCrudData(table, 'create', op.opData ?? {})
            await this.convexClient.mutation(createRef, {
              ...putData,
              uuid: op.id,
            })
            break
          }
          case UpdateType.PATCH: {
            const updateRef = makeFunctionReference<'mutation'>(
              `sync:${table}Update`,
            )
            const patchData = decodeCrudData(table, 'patch', op.opData ?? {})
            await this.convexClient.mutation(updateRef, {
              ...patchData,
              uuid: op.id,
            })
            break
          }
          case UpdateType.DELETE: {
            const removeRef = makeFunctionReference<'mutation'>(
              `sync:${table}Remove`,
            )
            await this.convexClient.mutation(removeRef, { uuid: op.id })
            break
          }
        }
      }

      await transaction.complete()
    } catch (ex: unknown) {
      if (isPermanentConvexRejection(ex)) {
        console.warn(
          '[PowerSync] Rejecting upload transaction after permanent Convex mutation error',
          { error: getConvexErrorData(ex) },
        )
        await transaction.complete()
        return
      }

      throw ex
    }
  }
}
