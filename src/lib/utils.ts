import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 1 → "1st", 22 → "22nd", 13 → "13th". */
export function ordinal(day: number) {
  if (day >= 11 && day <= 13) return `${day}th`
  const suffixes: Partial<Record<number, string>> = {
    1: 'st',
    2: 'nd',
    3: 'rd',
  }
  return `${day}${suffixes[day % 10] ?? 'th'}`
}
