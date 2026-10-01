import * as React from "react"
import { cn } from "@/lib/utils"

export function Badge({ className, variant="default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default"|"secondary"|"success"|"warning"|"danger" }) {
  return (
    <div className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      variant==="default" && "bg-[#0071E3] text-white",
      variant==="secondary" && "bg-[#F5F5F7] text-[#6E6E73] border border-[#E8E8ED]",
      variant==="success" && "bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]",
      variant==="warning" && "bg-[#FFF8E1] text-[#F57F17] border border-[#FFECB3]",
      variant==="danger" && "bg-[#FFEBEE] text-[#B71C1C] border border-[#FFCDD2]",
      className
    )} {...props} />
  )
}
