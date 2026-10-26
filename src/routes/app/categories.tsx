import { convexQuery } from '@convex-dev/react-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { AppProviders } from '#/components/app/app-providers'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
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
import { errorMessage } from '#/lib/error-message'
import { cn } from '#/lib/utils'

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

function CategoriesPage() {
  const queryClient = useQueryClient()
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

  function openEdit(category: ManagedCategory) {
    setError(null)
    setEditor({
      category,
      name: category.name,
      iconId: category.iconId,
      colorId: category.colorId,
      budgetGroup: category.budgetGroup,
      confirmDelete: false,
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
      toast.success(editor.category ? 'Category updated' : 'Category added')
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
      toast.success('Category deleted')
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
      toast.success('Category restored')
    } catch (caught) {
      toast.error(errorMessage(caught, 'Unable to restore category'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppProviders>
      <div className="min-h-screen">
        <main className="page-wrap py-6 sm:py-8">
          <header className="flex items-end justify-between gap-4">
            <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-sea-ink sm:text-4xl">
              Categories
            </h1>
            <Button type="button" onClick={openAdd}>
              <Plus className="size-4" />
              Add category
            </Button>
          </header>

          {/* The count sits straight on the teal ground, like home's hero. */}
          <section className="mt-5 flex flex-col gap-3 py-1 sm:mt-6">
            <h2 className="text-[0.95rem] font-semibold text-sea-ink-soft">
              Categories you can pick
            </h2>
            <p className="text-[2.75rem] leading-none font-extrabold tracking-tight tabular-nums sm:text-6xl">
              {active.length}
            </p>
            <p className="text-sm text-sea-ink-soft">
              Customise how your spending is grouped. Tap one to change it.
            </p>
          </section>

          <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2 lg:items-start">
            {CATEGORY_BUDGET_GROUPS.map((group) => (
              <CategoryListCard
                key={group}
                title={CATEGORY_BUDGET_GROUP_LABELS[group]}
                categories={active.filter(
                  (category) => category.budgetGroup === group,
                )}
                empty={`No ${CATEGORY_BUDGET_GROUP_LABELS[group].toLowerCase()} yet.`}
                onEdit={openEdit}
              />
            ))}

            {archived.length > 0 && (
              <CategoryListCard
                className="lg:col-span-2"
                title="Archived"
                description="Hidden from pickers. Restore one to use it again."
                categories={archived}
                onRestore={(category) => void restore(category)}
              />
            )}
          </div>
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

function CategoryListCard({
  title,
  description,
  categories,
  empty,
  className,
  onEdit,
  onRestore,
}: {
  title: string
  description?: string
  categories: ManagedCategory[]
  empty?: string
  className?: string
  onEdit?: (category: ManagedCategory) => void
  onRestore?: (category: ManagedCategory) => void
}) {
  return (
    <Card variant="panel" className={cn('gap-0 p-4 sm:p-5', className)}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-lg font-bold text-sea-ink">{title}</h2>
        <span className="text-sm font-semibold text-sea-ink-soft tabular-nums">
          {categories.length}
        </span>
      </div>
      {description && (
        <p className="mt-0.5 px-1 text-sm text-sea-ink-soft">{description}</p>
      )}
      {categories.length === 0 ? (
        <p className="mt-2 px-1 py-3 text-sm text-sea-ink-soft">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-(--line)">
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryRow
                category={category}
                onEdit={onEdit && (() => onEdit(category))}
                onRestore={onRestore && (() => onRestore(category))}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function CategoryRow({
  category,
  onEdit,
  onRestore,
}: {
  category: ManagedCategory
  onEdit?: () => void
  onRestore?: () => void
}) {
  const Icon = category.icon
  const content = (
    <span
      className={cn(
        'flex min-w-0 flex-1 items-center gap-3',
        category.archived && 'opacity-60',
      )}
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-xl"
        style={{
          background: `color-mix(in oklab, ${category.color} 14%, transparent)`,
          color: category.color,
        }}
      >
        <Icon className="size-[1.125rem]" />
      </span>
      <span className="truncate font-semibold text-sea-ink">
        {category.name}
      </span>
      {category.isSystem && <Badge variant="secondary">Built-in</Badge>}
    </span>
  )
  if (onEdit) {
    return (
      <Button
        type="button"
        variant="ghost"
        aria-label={`Edit ${category.name}`}
        className="my-1 h-auto min-h-14 w-full justify-start gap-3 rounded-2xl px-1 py-2 text-left font-normal whitespace-normal hover:bg-(--chip-bg) sm:px-2"
        onClick={onEdit}
      >
        {content}
        <Pencil className="size-4 text-sea-ink-soft" aria-hidden />
      </Button>
    )
  }
  return (
    <div className="flex min-h-14 items-center gap-3 px-1 py-2 sm:px-2">
      {content}
      {onRestore && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-lagoon-deep"
          aria-label={`Restore ${category.name}`}
          onClick={onRestore}
        >
          <ArchiveRestore className="size-4" />
          Restore
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
      <DialogContent
        sheet
        className="gap-0 rounded-3xl border-(--line) bg-(--surface-strong) shadow-2xl backdrop-blur-md sm:max-w-md"
      >
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
          <Label htmlFor="category-name" className="mb-2">
            Name
          </Label>
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
                  className="h-10 w-full sm:h-8 aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink"
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
          <div className="grid grid-cols-8 gap-1.5 sm:flex sm:flex-wrap sm:gap-3">
            {CATEGORY_COLORS.map((color) => (
              <Button
                key={color.id}
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={color.label}
                aria-pressed={editor.colorId === color.id}
                className="aspect-square h-auto w-full max-w-10 justify-self-center rounded-full hover:opacity-90 sm:size-8 hover:bg-transparent aria-pressed:ring-2 aria-pressed:ring-sea-ink aria-pressed:ring-offset-2 aria-pressed:ring-offset-(--surface-strong)"
                style={{ background: `var(--${color.id})` }}
                onClick={() => onChange({ ...editor, colorId: color.id })}
              />
            ))}
          </div>
        </fieldset>

        <div className="mt-5">
          <Label htmlFor="category-budget-group" className="mb-2">
            Budget group
          </Label>
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
              Built-in categories keep their group.
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

        <DialogFooter sticky className="mt-6 flex-row items-center gap-3">
          {editor.category && editor.confirmDelete ? (
            <div className="w-full rounded-xl bg-coral/8 px-4 py-3">
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
                  className="h-10 sm:h-8"
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
                  className="h-10 sm:h-8"
                  onClick={() => onChange({ ...editor, confirmDelete: false })}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {editor.category && !isSystem && (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="px-4 text-coral-deep hover:text-coral-deep"
                  onClick={() => onChange({ ...editor, confirmDelete: true })}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              )}
              <Button
                type="button"
                size="lg"
                disabled={saving}
                className="flex-1 shadow-lg"
                onClick={onSave}
              >
                {saving ? 'Saving…' : 'Save category'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
