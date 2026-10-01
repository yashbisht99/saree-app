import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "outline"
  size?: "default" | "sm" | "lg" | "icon"
}

export function Button({ className, variant="default", size="default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] disabled:opacity-50 disabled:pointer-events-none",
        variant==="default" && "bg-[#0071E3] text-white hover:bg-[#0077ED] shadow-sm active:scale-[0.98]",
        variant==="secondary" && "bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E8E8ED] border border-[#E8E8ED]",
        variant==="ghost" && "hover:bg-[#F5F5F7] text-[#1D1D1F]",
        variant==="outline" && "border border-[#D2D2D7] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F]",
        size==="default" && "h-9 px-5 text-[14px]",
        size==="sm" && "h-7 px-3 text-[13px] rounded-full",
        size==="lg" && "h-11 px-8 text-[15px]",
        size==="icon" && "h-9 w-9",
        className
      )}
      {...props}
    />
  )
}
