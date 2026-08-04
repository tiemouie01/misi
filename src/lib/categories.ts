import {
  Baby,
  Banknote,
  BookOpen,
  Bus,
  Car,
  Church,
  Coffee,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  Hammer,
  HeartPulse,
  House,
  Music,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  PlugZap,
  Scale,
  Scissors,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sprout,
  Tag,
  UtensilsCrossed,
  Wifi,
} from 'lucide-react'

import {
  CATEGORY_COLOR_IDS,
  CATEGORY_ICON_IDS,
  DEFAULT_CATEGORIES,
  SYSTEM_CATEGORY_KEY,
} from '../../shared/category-defs'

import type { CategoryColorId, CategoryIconId } from '../../shared/category-defs'
import type { LucideIcon } from 'lucide-react'

export { DEFAULT_CATEGORIES, SYSTEM_CATEGORY_KEY }

export interface Category {
  id: string
  key: string
  name: string
  icon: LucideIcon
  color: string
  isSystem: boolean
  archived: boolean
}

const ICON_REGISTRY: Record<
  CategoryIconId,
  { icon: LucideIcon; label: string }
> = {
  basket: { icon: ShoppingBasket, label: 'Basket' },
  bus: { icon: Bus, label: 'Bus' },
  utensils: { icon: UtensilsCrossed, label: 'Utensils' },
  smartphone: { icon: Smartphone, label: 'Smartphone' },
  plug: { icon: PlugZap, label: 'Plug' },
  'heart-pulse': { icon: HeartPulse, label: 'Health' },
  house: { icon: House, label: 'House' },
  wifi: { icon: Wifi, label: 'Wi-Fi' },
  'graduation-cap': { icon: GraduationCap, label: 'Education' },
  shirt: { icon: Shirt, label: 'Clothing' },
  gift: { icon: Gift, label: 'Gift' },
  car: { icon: Car, label: 'Car' },
  fuel: { icon: Fuel, label: 'Fuel' },
  paw: { icon: PawPrint, label: 'Pet' },
  baby: { icon: Baby, label: 'Baby' },
  church: { icon: Church, label: 'Church' },
  dumbbell: { icon: Dumbbell, label: 'Fitness' },
  plane: { icon: Plane, label: 'Travel' },
  coffee: { icon: Coffee, label: 'Coffee' },
  music: { icon: Music, label: 'Music' },
  book: { icon: BookOpen, label: 'Book' },
  pill: { icon: Pill, label: 'Medicine' },
  scissors: { icon: Scissors, label: 'Personal care' },
  banknote: { icon: Banknote, label: 'Money' },
  piggy: { icon: PiggyBank, label: 'Savings' },
  sprout: { icon: Sprout, label: 'Garden' },
  hammer: { icon: Hammer, label: 'Repairs' },
  tag: { icon: Tag, label: 'Tag' },
  scale: { icon: Scale, label: 'Adjustment' },
}

const COLOR_LABELS: Record<CategoryColorId, string> = {
  palm: 'Palm',
  lagoon: 'Lagoon',
  'lagoon-deep': 'Deep lagoon',
  coral: 'Coral',
  'coral-deep': 'Deep coral',
  sun: 'Sun',
  berry: 'Berry',
  tide: 'Tide',
}

export const CATEGORY_ICONS = CATEGORY_ICON_IDS.map((id) => ({
  id,
  ...ICON_REGISTRY[id],
}))

export const CATEGORY_COLORS = CATEGORY_COLOR_IDS.map((id) => ({
  id,
  label: COLOR_LABELS[id],
}))

export function resolveCategory(categories: Category[], key?: string) {
  return categories.find((category) => category.key === key)
}

export function resolveCategoryIcon(iconId: string) {
  return (
    CATEGORY_ICONS.find((categoryIcon) => categoryIcon.id === iconId) ??
    CATEGORY_ICONS[0]
  ).icon
}

export function resolveCategoryColor(colorId: string) {
  const color =
    CATEGORY_COLORS.find((categoryColor) => categoryColor.id === colorId) ??
    CATEGORY_COLORS[0]
  return `var(--${color.id})`
}

export function firstExpenseCategoryKey(categories: Category[]) {
  const active = categories.find(
    (category) => !category.archived && !category.isSystem,
  )
  if (active) return active.key

  const anyExpense = categories.find((category) => !category.isSystem)
  if (anyExpense) return anyExpense.key

  if (categories.length > 0) return categories[0].key
  return 'groceries'
}
