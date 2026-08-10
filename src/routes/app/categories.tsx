import { convexQuery } from '@convex-dev/react-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { AppHeader } from '#/components/app/app-header'
import { AppProviders } from '#/components/app/app-providers'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  resolveCategoryColor,
  resolveCategoryIcon,
} from '#/lib/categories'
import {
  CATEGORY_BUDGET_GROUP_LABELS,
  CATEGORY_BUDGET_GROUPS,
} from '../../../shared/category-defs'

import type { Id } from '../../../convex/_generated/dataModel'
import type { Category } from '#/lib/categories'
import type { BudgetGroup } from '../../../shared/category-defs'

type ManagedCategory = Category & {
  iconId: string
  colorId: string
  budgetGroup: BudgetGroup
  referenced: boolean
}

type EditorState = {
  category: ManagedCategory | null
  name: string
  iconId: string
  colorId: string
  budgetGroup: BudgetGroup
  confirmDelete: boolean
}

const bootstrapQuery = convexQuery(api.misi.bootstrap, {})
const listCategoriesQuery = convexQuery(api.misi.listCategories, {})

export const Route = createFileRoute('/app/categories')({
  loader: async ({ context }) => {
    const [data] = await Promise.all([
      context.queryClient.ensureQueryData(bootstrapQuery),
      context.queryClient.ensureQueryData(listCategoriesQuery),
    ])
    if (data === null || !data.settings?.onboardedAt) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: CategoriesPage,
})

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

function CategoriesPage() {
  const queryClient = useQueryClient()
  const { data: bootstrap } = useSuspenseQuery(bootstrapQuery)
  const { data: listCategories } = useSuspenseQuery(listCategoriesQuery)
  const createCategory = useMutation(api.misi.createCategory)
  const updateCategory = useMutation(api.misi.updateCategory)
  const restoreCategory = useMutation(api.misi.restoreCategory)
  const deleteCategory = useMutation(api.misi.deleteCategory)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const categories: ManagedCategory[] = listCategories.map((category) => ({
    id: category._id,
    key: category.key,
    name: category.name,
    icon: resolveCategoryIcon(category.icon),
    color: resolveCategoryColor(category.color),
    iconId: category.icon,
    colorId: category.color,
    budgetGroup: category.budgetGroup,
    isSystem: category.isSystem,
    archived: category.archivedAt !== undefined,
    referenced: category.referenced,
  }))
  const active = categories.filter((category) => !category.archived)
  const archived = categories.filter((category) => category.archived)

  function openAdd() {
    setError(null)
    setEditor({
      category: null,
      name: '',
      iconId: CATEGORY_ICONS[0].id,
      colorId: CATEGORY_COLORS[0].id,
      budgetGroup: 'needs',
      confirmDelete: false,
    })
  }

  function openEdit(category: ManagedCategory, confirmDelete = false) {
    setError(null)
    setEditor({
      category,
      name: category.name,
      iconId: category.iconId,
      colorId: category.colorId,
      budgetGroup: category.budgetGroup,
      confirmDelete,
    })
  }

  async function invalidateCategoryQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bootstrapQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: listCategoriesQuery.queryKey }),
    ])
  }

  async function save() {
    if (!editor || saving) return
    setError(null)
    setSaving(true)
    try {
      if (editor.category) {
        const id = editor.category.id as Id<'categories'>
        if (editor.category.isSystem) {
          await updateCategory({
            id,
            icon: editor.iconId,
            color: editor.colorId,
          })
        } else {
          await updateCategory({
            id,
            name: editor.name,
            icon: editor.iconId,
            color: editor.colorId,
            budgetGroup: editor.budgetGroup,
          })
        }
      } else {
        await createCategory({
          name: editor.name,
          icon: editor.iconId,
          color: editor.colorId,
          budgetGroup: editor.budgetGroup,
        })
      }
      await invalidateCategoryQueries()
      setEditor(null)
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to save category'))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!editor?.category || editor.category.isSystem || saving) return
    setError(null)
    setSaving(true)
    try {
      await deleteCategory({
        id: editor.category.id as Id<'categories'>,
      })
      await invalidateCategoryQueries()
      setEditor(null)
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to delete category'))
    } finally {
      setSaving(false)
    }
  }

  async function restore(category: ManagedCategory) {
    if (saving) return
    setError(null)
    setSaving(true)
    try {
      await restoreCategory({
        id: category.id as Id<'categories'>,
      })
      await invalidateCategoryQueries()
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to restore category'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppProviders>
      <div className="min-h-screen">
        <AppHeader badge={bootstrap?.currentCycle?.label ?? 'Categories'} />
        <main className="page-wrap py-6 sm:py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
                Categories
              </h1>
              <p className="mt-1.5 text-[0.95rem] text-sea-ink-soft">
                Customise how your spending is grouped.
              </p>
            </div>
            <Button type="button" onClick={openAdd}>
              <Plus className="size-4" />
              Add category
            </Button>
          </div>

          {error && !editor && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
            >
              {error}
            </p>
          )}

          <Card variant="island" className="mt-6 gap-0 rounded-3xl p-3 sm:p-4">
            {active.map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                divided={index > 0}
                onEdit={() => openEdit(category)}
                onDelete={() => openEdit(category, true)}
              />
            ))}
          </Card>

          {archived.length > 0 && (
            <section className="mt-8 border-t border-dashed border-(--line) pt-6">
              <p className="field-label">Archived</p>
              <Card
                variant="island"
                className="mt-3 gap-0 rounded-3xl p-3 sm:p-4"
              >
                {archived.map((category, index) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    divided={index > 0}
                    archived
                    onRestore={() => void restore(category)}
                  />
                ))}
              </Card>
            </section>
          )}
        </main>

        {editor && (
          <CategoryDialog
            editor={editor}
            error={error}
            saving={saving}
            onChange={setEditor}
            onClose={() => setEditor(null)}
            onSave={() => void save()}
            onDelete={() => void remove()}
          />
        )}
      </div>
    </AppProviders>
  )
}

function CategoryRow({
  category,
  divided,
  archived,
  onEdit,
  onDelete,
  onRestore,
}: {
  category: ManagedCategory
  divided: boolean
  archived?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onRestore?: () => void
}) {
  const Icon = category.icon
  return (
    <div
      className={`flex items-center gap-3 px-2 py-3 sm:px-3 ${divided ? 'border-t border-(--line)' : ''} ${archived ? 'opacity-50' : ''}`}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full"
        style={{
          background: `color-mix(in oklab, ${category.color} 14%, transparent)`,
          color: category.color,
        }}
      >
        <Icon className="size-4" />
      </span>
      <p className="min-w-0 flex-1 truncate text-sm font-bold text-sea-ink">
        {category.name}
      </p>
      <Badge variant="outline">
        {CATEGORY_BUDGET_GROUP_LABELS[category.budgetGroup]}
      </Badge>
      {category.isSystem && <Badge variant="secondary">System</Badge>}
      {onEdit && (
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          aria-label={`Edit ${category.name}`}
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </Button>
      )}
      {onDelete && !category.isSystem && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${category.name}`}
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
      {onRestore && (
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          aria-label={`Restore ${category.name}`}
          onClick={onRestore}
        >
          <ArchiveRestore className="size-4" />
        </Button>
      )}
    </div>
  )
}

function CategoryDialog({
  editor,
  error,
  saving,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  editor: EditorState
  error: string | null
  saving: boolean
  onChange: (editor: EditorState) => void
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}) {
  const selectedIcon =
    CATEGORY_ICONS.find((icon) => icon.id === editor.iconId) ??
    CATEGORY_ICONS[0]
  const selectedColor = resolveCategoryColor(editor.colorId)
  const SelectedIcon = selectedIcon.icon
  const isSystem = editor.category?.isSystem ?? false

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="top-auto right-0 bottom-0 left-0 max-h-[92dvh] max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-3xl rounded-b-none border border-(--line) bg-(--surface-strong) p-5 pb-8 shadow-2xl backdrop-blur-md data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:top-1/2 sm:right-auto sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6 sm:pb-6 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0">
        <DialogTitle className="font-display text-xl font-bold text-sea-ink">
          {editor.category ? 'Edit category' : 'Add category'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Choose a category name, icon, and color.
        </DialogDescription>

        <div className="mt-5 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3.5 py-2 text-sm font-bold text-sea-ink">
            <SelectedIcon className="size-4" style={{ color: selectedColor }} />
            {editor.name.trim() || 'New category'}
          </span>
        </div>

        <div className="mt-5">
          <label htmlFor="category-name" className="field-label mb-2 block">
            Name
          </label>
          <Input
            id="category-name"
            disabled={isSystem}
            value={editor.name}
            onChange={(event) =>
              onChange({ ...editor, name: event.target.value })
            }
          />
        </div>

        <fieldset className="mt-5">
          <legend className="field-label mb-2">Icon</legend>
          <div className="grid grid-cols-6 gap-2">
            {CATEGORY_ICONS.map((categoryIcon) => {
              const Icon = categoryIcon.icon
              return (
                <Button
                  key={categoryIcon.id}
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  aria-label={categoryIcon.label}
                  aria-pressed={editor.iconId === categoryIcon.id}
                  className="w-full aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink"
                  onClick={() =>
                    onChange({ ...editor, iconId: categoryIcon.id })
                  }
                >
                  <Icon className="size-4" />
                </Button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="field-label mb-2">Color</legend>
          <div className="flex flex-wrap gap-3">
            {CATEGORY_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                aria-label={color.label}
                aria-pressed={editor.colorId === color.id}
                className="size-8 rounded-full aria-pressed:ring-2 aria-pressed:ring-sea-ink aria-pressed:ring-offset-2 aria-pressed:ring-offset-(--surface-strong)"
                style={{ background: `var(--${color.id})` }}
                onClick={() => onChange({ ...editor, colorId: color.id })}
              />
            ))}
          </div>
        </fieldset>

        <div className="mt-5">
          <label
            htmlFor="category-budget-group"
            className="field-label mb-2 block"
          >
            Budget group
          </label>
          <Select
            value={editor.budgetGroup}
            disabled={isSystem}
            onValueChange={(value) =>
              onChange({ ...editor, budgetGroup: value as BudgetGroup })
            }
          >
            <SelectTrigger id="category-budget-group" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_BUDGET_GROUPS.map((group) => (
                <SelectItem key={group} value={group}>
                  {CATEGORY_BUDGET_GROUP_LABELS[group]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isSystem && (
            <p className="mt-1.5 text-xs text-sea-ink-soft">
              System categories keep their group.
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
          >
            {error}
          </p>
        )}

        <Button
          type="button"
          size="lg"
          disabled={saving}
          className="mt-6 h-auto w-full py-3.5 shadow-lg"
          onClick={onSave}
        >
          {saving ? 'Saving…' : 'Save category'}
        </Button>

        {editor.category && !isSystem && (
          <div className="mt-5 border-t border-dashed border-(--line) pt-5">
            {editor.confirmDelete ? (
              <div className="rounded-xl bg-coral/8 px-4 py-3">
                <p className="text-sm font-semibold text-coral-deep">
                  {editor.category.referenced
                    ? 'Used by existing transactions or budgets — it will be archived and hidden from pickers.'
                    : 'This category is unused and will be permanently deleted.'}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={saving}
                    onClick={onDelete}
                  >
                    {editor.category.referenced
                      ? 'Archive instead'
                      : 'Confirm delete'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onChange({ ...editor, confirmDelete: false })
                    }
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-coral-deep"
                onClick={() => onChange({ ...editor, confirmDelete: true })}
              >
                <Trash2 className="size-4" />
                Delete category
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
