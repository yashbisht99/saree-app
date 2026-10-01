import * as React from "react"
import { cn } from "@/lib/utils"

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-xl border border-[#D2D2D7] bg-white px-3 py-2 text-[14px] placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn("flex min-h-[80px] w-full rounded-xl border border-[#D2D2D7] bg-white px-3 py-2 text-[14px] placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition", className)}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      className={cn("flex h-9 w-full rounded-xl border border-[#D2D2D7] bg-white px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]", className)}
      ref={ref}
      {...props}
    >{children}</select>
  )
)
Select.displayName = "Select"
