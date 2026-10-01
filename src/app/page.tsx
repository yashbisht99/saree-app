import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { ArrowUpRight, TrendingUp, Package, AlertTriangle, Users, Wallet, Sparkles, ShoppingCart, ArrowRight } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

async function getStats() {
  try {
    const [products, sales, customers, expenses, lowStock, allProducts, soldCount] = await Promise.all([
      prisma.product.count(),
      prisma.sale.findMany({ include: { items: { include: { product: true } } } }),
      prisma.customer.count(),
      prisma.expense.findMany(),
      prisma.product.findMany({ where: { stockQty: { lte: 5, gt: 0 } }, take: 5, orderBy: { stockQty: "asc" } }),
      prisma.product.findMany(),
      prisma.product.count({ where: { stockQty: { lte: 0 } } }),
    ])
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const todaySales = sales.filter(s => new Date(s.createdAt) >= todayStart)
    const todayRevenue = todaySales.reduce((a,s)=>a+s.total,0)
    const totalCost = sales.reduce((a,s)=> a + s.items.reduce((sum,it:any)=> sum + (it.product?.costPrice||0)*it.qty, 0), 0)
    const todayCost = todaySales.reduce((a,s)=> a + s.items.reduce((sum,it:any)=> sum + (it.product?.costPrice||0)*it.qty, 0), 0)
    const totalStockValue = allProducts.reduce((a,p)=> a + p.stockQty * p.costPrice,0)
    const totalRevenue = sales.reduce((a,s)=>a+s.total,0)
    const totalProfit = totalRevenue - totalCost
    const todayProfit = todayRevenue - todayCost
    const netProfit = totalProfit - expenses.reduce((a,e)=>a+e.amount,0)
    const totalDue = await prisma.customer.aggregate({ _sum: { balanceDue: true } }).then(r=> r._sum.balanceDue || 0)
    const totalExpense = expenses.reduce((a,e)=>a+e.amount,0)
    return { products, salesCount: sales.length, customers, totalRevenue, todayRevenue, totalStockValue, totalDue, totalExpense, lowStock, todaySalesCount: todaySales.length, totalCost, todayCost, totalProfit, todayProfit, netProfit, soldCount }
  } catch {
    return { products: 0, salesCount: 0, customers: 0, totalRevenue: 0, todayRevenue: 0, totalStockValue: 0, totalDue: 0, totalExpense: 0, lowStock: [], todaySalesCount: 0, totalCost: 0, todayCost: 0, totalProfit: 0, todayProfit: 0, netProfit: 0, soldCount: 0 }
  }
}

export default async function Dashboard() {
  const stats = await getStats() as any

  const cards = [
    { label: "Revenue (All Time)", value: formatCurrency(stats.totalRevenue), sub: `Cost ${formatCurrency(stats.totalCost)} • ${stats.salesCount} bills`, icon: TrendingUp, trend: `${stats.totalRevenue? Math.round(stats.totalProfit/stats.totalRevenue*100):0}% margin`, color: "bg-[#7C3AED]" },
    { label: "Gross Profit", value: formatCurrency(stats.totalProfit), sub: `Today ${formatCurrency(stats.todayProfit)}`, icon: Wallet, trend: "", color: "bg-[#059669]" },
    { label: "Expenses", value: formatCurrency(stats.totalExpense), sub: `Net Profit ${formatCurrency(stats.netProfit)}`, icon: Wallet, trend: stats.netProfit>=0? "+ve" : "-ve", color: stats.netProfit>=0 ? "bg-[#059669]" : "bg-[#DC2626]" },
    { label: "Net Profit (Real Money)", value: formatCurrency(stats.netProfit), sub: `Revenue - Cost - Expenses`, icon: TrendingUp, trend: stats.netProfit>=0? "profit" : "loss", color: stats.netProfit>=0 ? "bg-[#1D1D1F]" : "bg-[#DC2626]" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Good morning, Owner</h1>
          <p className="text-[14px] text-[#6E6E73] mt-1">Here is what is happening in your store today.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/ingest"><Button variant="secondary"><Sparkles size={16} className="mr-2" /> Smart Ingest</Button></Link>
          <Link href="/pos"><Button><ShoppingCart size={16} className="mr-2" /> New Sale</Button></Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c=>(
          <Card key={c.label} className="p-5">
            <div className="flex justify-between items-start">
              <div className={`w-9 h-9 rounded-xl ${c.color} flex items-center justify-center text-white`}>
                <c.icon size={18} />
              </div>
              {c.trend && <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#E8F5E9] text-[#0A7A1A] flex items-center gap-1"><ArrowUpRight size={12}/>{c.trend}</span>}
            </div>
            <div className="mt-4">
              <div className="text-[13px] text-[#86868B] font-medium">{c.label}</div>
              <div className="text-[22px] font-semibold tracking-tight mt-1">{c.value}</div>
              <div className="text-[12px] text-[#6E6E73] mt-1">{c.sub}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2"><AlertTriangle size={16} className="text-[#FF9F0A]"/> Low Stock</CardTitle>
            <Link href="/inventory" className="text-xs text-[#0071E3] font-medium flex items-center gap-1">View all <ArrowRight size={12}/></Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.lowStock.length===0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-[#F5F5F7] flex items-center justify-center mx-auto"><Package size={20} className="text-[#86868B]"/></div>
                <p className="text-sm text-[#6E6E73] mt-3">All good — no low stock</p>
                <p className="text-xs text-[#86868B]">Add products via Smart Ingest</p>
              </div>
            ) : stats.lowStock.map((p: any)=>(
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F7] border border-[#E8E8ED]">
                <div className="w-10 h-10 rounded-lg bg-white border border-[#E8E8ED] flex items-center justify-center text-xs font-medium">{p.category.slice(0,2).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-[#86868B]">{p.category} • {p.fabric || "—"}</div>
                </div>
                <Badge variant={p.stockQty===0?"danger": "warning"}>{p.stockQty} left</Badge>
              </div>
            ))}
            {stats.soldCount > 0 && (
              <div className="pt-2 border-t border-[#E8E8ED] flex items-center justify-between text-xs">
                <span className="text-[#86868B]">{stats.soldCount} products sold out</span>
                <Link href="/inventory?tab=sold" className="text-[#7C3AED] font-semibold hover:underline flex items-center gap-1">
                  Sold Inventory Archive <ArrowRight size={12}/>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Sales Overview</CardTitle>
            <Badge variant="secondary">Last 7 days</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex items-center justify-center border border-dashed border-[#E8E8ED] rounded-xl bg-[#F5F5F7]/50">
              <div className="text-center">
                <div className="text-sm font-medium text-[#1D1D1F]">No sales yet</div>
                <div className="text-xs text-[#86868B] mt-1">Make your first sale in POS to see chart</div>
                <Link href="/pos" className="inline-flex mt-3"><Button size="sm">Go to POS</Button></Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl bg-[#F5F5F7] p-3">
                <div className="text-xs text-[#86868B]">Total Bills</div>
                <div className="text-lg font-semibold">{stats.salesCount}</div>
              </div>
              <div className="rounded-xl bg-[#F5F5F7] p-3">
                <div className="text-xs text-[#86868B]">Revenue</div>
                <div className="text-lg font-semibold">{formatCurrency(stats.totalRevenue)}</div>
              </div>
              <div className="rounded-xl bg-[#F5F5F7] p-3">
                <div className="text-xs text-[#86868B]">Customers</div>
                <div className="text-lg font-semibold">{stats.customers}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Apple style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: "Add Inventory", desc: "Bill photo or Excel", href: "/ingest", icon: Sparkles },
          { title: "New Bill", desc: "Quick POS billing", href: "/pos", icon: ShoppingCart },
          { title: "Add Customer", desc: "Khata entry", href: "/customers", icon: Users },
          { title: "View Reports", desc: "Profit & closing", href: "/reports", icon: TrendingUp },
        ].map(a=>(
          <Link key={a.title} href={a.href} className="apple-card p-4 flex items-center gap-3 hover:shadow-md transition">
            <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] border border-[#E8E8ED] flex items-center justify-center"><a.icon size={16}/></div>
            <div><div className="text-sm font-medium">{a.title}</div><div className="text-xs text-[#86868B]">{a.desc}</div></div>
          </Link>
        ))}
      </div>
    </div>
  )
}
