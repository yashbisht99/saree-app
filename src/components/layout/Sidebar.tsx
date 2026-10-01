"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, Sparkles, ShoppingCart, Users, BarChart3, Settings, Receipt, Wallet, FileText, TrendingUp, BookOpen, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daybook", label: "Day Book", icon: BookOpen, badge: "Today" },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/ingest", label: "Smart Ingest", icon: Sparkles, badge: "AI" },
  { href: "/pos", label: "POS Billing", icon: ShoppingCart },
  { href: "/sales", label: "Sales", icon: FileText, badge: "New" },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/purchases", label: "Purchases", icon: Receipt },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/business", label: "Business", icon: Building2, badge: "Pro" },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 flex-col border-r border-[#E8E8ED] apple-material-regular sticky top-0 h-screen">
      <div className="h-[64px] flex items-center gap-3 px-6 border-b border-[#E8E8ED]">
        <div className="w-8 h-8 rounded-xl bg-[#7C3AED] flex items-center justify-center text-white font-semibold text-sm">V</div>
        <div>
          <div className="text-[15px] font-semibold tracking-tight leading-none">Vaishnavi Saree</div>
          <div className="text-[11px] text-[#7C3AED] font-medium leading-none mt-0.5">✦ Premium Collection</div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {nav.map(item => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-[14px] font-medium transition-all",
                active ? "bg-[#1D1D1F] text-white shadow-sm" : "text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
              )}
            >
              <item.icon size={18} className={cn(active ? "text-white" : "text-[#86868B]")} />
              <span className="flex-1">{item.label}</span>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(item as any).badge && (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", active ? "bg-white text-[#1D1D1F]" : "bg-[#0071E3] text-white")}>{(item as any).badge}</span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-[#E8E8ED]">
        <div className="rounded-xl bg-[#F5F5F7] p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0071E3] flex items-center justify-center text-white text-xs font-semibold">OW</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium leading-none">Owner</div>
            <div className="text-[11px] text-[#86868B] truncate">owner@store.local</div>
          </div>
          <Settings size={16} className="text-[#86868B]" />
        </div>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const mobileNav = [nav[0], nav[2], nav[4], nav[5], nav[10]] // Dashboard, Ingest, POS, Sales, Business
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-[#E8E8ED] flex justify-around py-2 pb-safe z-50">
      {mobileNav.map(item => {
        const active = pathname === item.href
        return (
          <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 px-3 py-1 rounded-xl", active ? "text-[#7C3AED]" : "text-[#86868B]")}>
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
