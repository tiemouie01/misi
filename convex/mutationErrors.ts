import { ConvexError } from 'convex/values'

export const MUTATION_ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  INVALID: 'INVALID',
} as const

export type MutationErrorCode =
  (typeof MUTATION_ERROR_CODES)[keyof typeof MUTATION_ERROR_CODES]

export type ConvexMutationErrorData = {
  code?: MutationErrorCode
  message?: string
}

export function mutationError(code: MutationErrorCode, message: string) {
  return new ConvexError({
    code,
    message,
  })
}

export const UPLOAD_REJECTION_MUTATION_ERROR_CODES = new Set<string>([
  MUTATION_ERROR_CODES.NOT_FOUND,
  MUTATION_ERROR_CODES.FORBIDDEN,
  MUTATION_ERROR_CODES.INVALID,
])
