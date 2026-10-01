"use client"
import { Search, Bell, Command } from "lucide-react"
import { Input } from "@/components/ui/input"

export function TopBar() {
  return (
    <header className="h-[64px] sticky top-0 z-30 apple-material-thin flex items-center gap-4 px-4 lg:px-8">
      <div className="flex-1 max-w-[560px] relative hidden md:block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
        <input
          placeholder="Search products, customers, bills…"
          className="w-full h-9 pl-9 pr-20 rounded-full bg-white border border-[#E8E8ED] text-sm placeholder:text-[#86868B] focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/10"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1 text-[11px] bg-[#F5F5F7] border border-[#E8E8ED] px-2 py-1 rounded-full text-[#86868B]">
          <Command size={12} /> K
        </span>
      </div>
      <div className="flex-1 md:hidden flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#1D1D1F] flex items-center justify-center text-white font-semibold text-sm">S</div>
        <span className="font-semibold text-[15px]">Saree Store OS</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 rounded-full bg-white border border-[#E8E8ED] flex items-center justify-center text-[#6E6E73] hover:bg-[#F5F5F7]">
          <Bell size={16} />
        </button>
        <div className="hidden sm:flex items-center gap-2 pl-2">
          <div className="text-right">
            <div className="text-[13px] font-medium leading-none">Today</div>
            <div className="text-[11px] text-[#86868B]">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
