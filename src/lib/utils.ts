import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

export function generateBillNo() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth()+1).padStart(2,'0')
  const d = String(now.getDate()).padStart(2,'0')
  const rand = Math.floor(Math.random()*900+100)
  return `INV-${y}${m}${d}-${rand}`
}

export function skuGen() {
  return `SKU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,4).toUpperCase()}`
}
