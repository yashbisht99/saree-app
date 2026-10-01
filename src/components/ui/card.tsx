import * as React from "react"
import { cn } from "@/lib/utils"

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("apple-card p-6", className)} {...props} />
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 pb-4", className)} {...props} />
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-[17px] font-semibold text-[#1D1D1F] tracking-tight", className)} {...props} />
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[13px] text-[#6E6E73]", className)} {...props} />
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />
}
