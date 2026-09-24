import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// AI modified: standard cn helper for shadcn-vue class variance authority and tailwind merging.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
