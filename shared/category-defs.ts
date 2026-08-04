export const CATEGORY_ICON_IDS = [
  'basket',
  'bus',
  'utensils',
  'smartphone',
  'plug',
  'heart-pulse',
  'house',
  'wifi',
  'graduation-cap',
  'shirt',
  'gift',
  'car',
  'fuel',
  'paw',
  'baby',
  'church',
  'dumbbell',
  'plane',
  'coffee',
  'music',
  'book',
  'pill',
  'scissors',
  'banknote',
  'piggy',
  'sprout',
  'hammer',
  'tag',
  'scale',
] as const

export const CATEGORY_COLOR_IDS = [
  'palm',
  'lagoon',
  'lagoon-deep',
  'coral',
  'coral-deep',
  'sun',
  'berry',
  'tide',
] as const

export const DEFAULT_CATEGORIES = [
  {
    key: 'groceries',
    name: 'Groceries',
    icon: 'basket',
    color: 'palm',
    isSystem: false,
  },
  {
    key: 'transport',
    name: 'Minibus & transport',
    icon: 'bus',
    color: 'lagoon-deep',
    isSystem: false,
  },
  {
    key: 'eating-out',
    name: 'Eating out',
    icon: 'utensils',
    color: 'coral',
    isSystem: false,
  },
  {
    key: 'airtime',
    name: 'Airtime & data',
    icon: 'smartphone',
    color: 'lagoon',
    isSystem: false,
  },
  {
    key: 'utilities',
    name: 'Utilities',
    icon: 'plug',
    color: 'lagoon-deep',
    isSystem: false,
  },
  {
    key: 'health',
    name: 'Health',
    icon: 'heart-pulse',
    color: 'palm',
    isSystem: false,
  },
  {
    key: 'adjustment',
    name: 'Adjustment',
    icon: 'scale',
    color: 'coral',
    isSystem: true,
  },
] as const

export type CategoryIconId = (typeof CATEGORY_ICON_IDS)[number]
export type CategoryColorId = (typeof CATEGORY_COLOR_IDS)[number]

export const SYSTEM_CATEGORY_KEY = 'adjustment' as const
