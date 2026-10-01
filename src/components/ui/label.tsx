import * as React from "react"
import { cn } from "@/lib/utils"

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium text-[#1D1D1F]", className)} {...props} />
}
