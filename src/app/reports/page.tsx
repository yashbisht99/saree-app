"use client"
import { useEffect, useState, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { BarChart3, TrendingUp, Package, Users, Wallet, Calendar, Download, Filter, TrendingDown, Award, AlertTriangle, CreditCard, ShoppingCart, FileText, ArrowUpRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts"

type Sale = { id: string; billNo: string; subtotal: number; discount: number; total: number; paymentMode: string; createdAt: string; items: { qty: number; price: number; product: { name: string; category: string; costPrice: number } }[]; customer?: { name: string } | null }
type Product = { id: string; name: string; category: string; stockQty: number; costPrice: number; sellingPrice: number; minStock: number }
type Expense = { id: string; title: string; amount: number; category: string | null; date: string }

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [customers, setCustomers] = useState<{ balanceDue: number }[]>([])
  const [dateRange, setDateRange] = useState<"today"|"week"|"month"|"all">("month")
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    Promise.all([
      fetch("/api/sales").then(r=>r.json()),
      fetch("/api/inventory").then(r=>r.json()),
      fetch("/api/expenses").then(r=>r.json()),
      fetch("/api/customers").then(r=>r.json()),
    ]).then(([s,p,e,c])=>{
      if(Array.isArray(s)) setSales(s)
      if(Array.isArray(p)) setProducts(p)
      if(Array.isArray(e)) setExpenses(e)
      if(Array.isArray(c)) setCustomers(c)
      setLoading(false)
    })
  }, [])

  const filteredSales = useMemo(()=>{
    if(dateRange==="all") return sales
    const now = new Date()
    return sales.filter(s=>{
      const d = new Date(s.createdAt)
      if(dateRange==="today") return d.toDateString()===now.toDateString()
      if(dateRange==="week") { const w = new Date(now.getTime()-7*24*60*60*1000); return d>=w }
      if(dateRange==="month") return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()
      return true
    })
  }, [sales, dateRange])

  const stats = useMemo(()=>{
    const revenue = filteredSales.reduce((a,s)=> a+s.total, 0)
    const subtotal = filteredSales.reduce((a,s)=> a+s.subtotal, 0)
    const discount = filteredSales.reduce((a,s)=> a+s.discount, 0)
    const cost = filteredSales.reduce((a,s)=> a+ s.items.reduce((sum,it)=> sum + (it.product.costPrice||0)*it.qty, 0), 0)
    const profit = revenue - cost
    const margin = revenue ? Math.round(profit/revenue*100) : 0
    const totalExpenses = expenses.filter(e=>{
      if(dateRange==="all") return true
      const d = new Date(e.date)
      const now = new Date()
      if(dateRange==="today") return d.toDateString()===now.toDateString()
      if(dateRange==="week") return d >= new Date(now.getTime()-7*24*60*60*1000)
      if(dateRange==="month") return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()
      return true
    }).reduce((a,e)=> a+e.amount, 0)
    const netProfit = profit - totalExpenses
    const stockValue = products.reduce((a,p)=> a + p.stockQty * p.costPrice, 0)
    const stockSaleValue = products.reduce((a,p)=> a + p.stockQty * p.sellingPrice, 0)
    const totalDue = customers.reduce((a,c)=> a+c.balanceDue, 0)
    const lowStock = products.filter(p=> p.stockQty>0 && p.stockQty<=p.minStock).length
    const outStock = products.filter(p=> p.stockQty===0).length
    const totalPCS = filteredSales.reduce((a,s)=> a+ s.items.reduce((sum,it)=> sum+it.qty,0), 0)
    return { revenue, subtotal, discount, cost, profit, margin, totalExpenses, netProfit, stockValue, stockSaleValue, totalDue, lowStock, outStock, totalPCS, count: filteredSales.length }
  }, [filteredSales, expenses, products, customers, dateRange])

  const dailyData = useMemo(()=>{
    const map: Record<string,{date:string; revenue:number; profit:number; bills:number}> = {}
    filteredSales.forEach(s=>{
      const d = new Date(s.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short"})
      if(!map[d]) map[d] = { date:d, revenue:0, profit:0, bills:0 }
      map[d].revenue += s.total
      const cost = s.items.reduce((sum,it)=> sum + (it.product.costPrice||0)*it.qty, 0)
      map[d].profit += s.total - cost
      map[d].bills += 1
    })
    return Object.values(map).slice(-7)
  }, [filteredSales])

  const categoryData = useMemo(()=>{
    const map: Record<string,number> = {}
    filteredSales.forEach(s=> s.items.forEach(it=> {
      const cat = it.product.category || "Other"
      map[cat] = (map[cat]||0) + it.qty * it.price
    }))
    return Object.entries(map).map(([name,value])=> ({ name, value })).sort((a,b)=> b.value-a.value).slice(0,5)
  }, [filteredSales])

  const paymentData = useMemo(()=>{
    const map: Record<string,number> = {}
    filteredSales.forEach(s=> { map[s.paymentMode] = (map[s.paymentMode]||0)+ s.total })
    return Object.entries(map).map(([name,value])=> ({ name, value }))
  }, [filteredSales])

  const topProducts = useMemo(()=>{
    const map: Record<string,{name:string; qty:number; revenue:number}> = {}
    filteredSales.forEach(s=> s.items.forEach(it=>{
      const n = it.product.name
      if(!map[n]) map[n] = { name:n, qty:0, revenue:0 }
      map[n].qty += it.qty
      map[n].revenue += it.qty * it.price
    }))
    return Object.values(map).sort((a,b)=> b.revenue-a.revenue).slice(0,5)
  }, [filteredSales])

  const COLORS = ["#7C3AED","#059669","#F59E0B","#DC2626","#0C4A6E"]

  if (loading) return <div className="text-sm text-[#86868B] p-8">Loading luxury reports...</div>

  return (
    <div className="space-y-6">
      {/* Luxury Gold Header — Showroom Print */}
      <div className="rounded-[20px] bg-gradient-to-r from-[#FFFBEB] via-[#FFF8E1] to-[#FFFBEB] border-2 border-[#FFD700] p-6 flex flex-col sm:flex-row justify-between gap-4 shadow-md">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1D1D1F] flex items-center justify-center text-white"><BarChart3 size={20}/></div>
          <div>
            <h1 className="text-[22px] font-black tracking-tight">VAISHNAVI SAREE • Almora</h1>
            <p className="text-xs font-bold text-[#7C3AED] tracking-widest">PREMIUM COLLECTION • LUXURY REPORTS</p>
            <p className="text-xs text-[#6E6E73]">Month at a Glance — Big numbers for family • Printable • Showroom brand</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-xs text-[#6E6E73]">Report Date</div>
          <div className="font-bold">{new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric"})}</div>
          <div className="text-xs text-[#86868B]">One-page executive summary</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold flex items-center gap-2"><TrendingUp size={16} className="text-[#7C3AED]"/> Money Clarity — Real Profit</h2>
          <p className="text-xs text-[#6E6E73]">Revenue — Cost — Expenses = Net Profit • Green = profit, Red = loss</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 bg-white border-2 border-[#7C3AED]/20 rounded-full shadow-sm sticky top-[64px] z-20">
            {(["today","week","month","all"] as const).map(r=>(
              <button key={r} onClick={()=>setDateRange(r)} className={`px-4 py-2 rounded-full text-[14px] font-bold capitalize transition ${dateRange===r?"bg-[#7C3AED] text-white shadow":"text-[#6E6E73] hover:bg-[#F5F3FF]"}`}>{r === "all" ? "All Time" : r === "today" ? "Today" : r === "week" ? "This Week" : "This Month"}</button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={()=>window.print()} className="hidden sm:flex"><Download size={14} className="mr-1"/> Export</Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white border-0">
          <div className="flex justify-between items-start"><div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><TrendingUp size={16}/></div><Badge variant="secondary" className="bg-white text-[#7C3AED] text-xs">{dateRange}</Badge></div>
          <div className="text-xs text-white/70 mt-3">Revenue</div>
          <div className="text-xl font-bold mt-1">{formatCurrency(stats.revenue)}</div>
          <div className="text-xs text-white/60 mt-1">{stats.count} bills • {stats.totalPCS} pcs • Avg {formatCurrency(stats.count? stats.revenue/stats.count:0)}</div>
        </Card>
        <Card className="p-5">
          <div className="flex justify-between items-start"><div className="w-9 h-9 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#065F46]"><span className="font-bold text-sm">₹</span></div><span className={`text-xs px-2 py-1 rounded-full font-medium ${stats.margin>=0?"bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]":"bg-[#FFEBEE] text-[#B71C1C]"}`}>{stats.margin}% margin</span></div>
          <div className="text-xs text-[#86868B] mt-3">Gross Profit</div>
          <div className={`text-xl font-bold mt-1 ${stats.profit>=0?"text-[#059669]":"text-[#DC2626]"}`}>{formatCurrency(stats.profit)}</div>
          <div className="text-xs text-[#6E6E73] mt-1">Cost {formatCurrency(stats.cost)} • Disc {formatCurrency(stats.discount)}</div>
        </Card>
        <Card className="p-5">
          <div className="flex justify-between items-start"><div className="w-9 h-9 rounded-xl bg-[#FFF8E1] border border-[#FFECB3] flex items-center justify-center text-[#92400E]"><TrendingDown size={16}/></div><span className="text-xs bg-[#FFEBEE] text-[#B71C1C] px-2 py-1 rounded-full border border-[#FFCDD2]">Expense</span></div>
          <div className="text-xs text-[#86868B] mt-3">Net Profit (after expenses)</div>
          <div className={`text-xl font-bold mt-1 ${stats.netProfit>=0?"text-[#059669]":"text-[#DC2626]"}`}>{formatCurrency(stats.netProfit)}</div>
          <div className="text-xs text-[#6E6E73] mt-1">Expenses {formatCurrency(stats.totalExpenses)} in {dateRange}</div>
        </Card>
        <Card className="p-5">
          <div className="flex justify-between items-start"><div className="w-9 h-9 rounded-xl bg-[#E0F2FE] border border-[#BAE6FD] flex items-center justify-center text-[#0C4A6E]"><Package size={16}/></div><Badge variant="secondary">{stats.lowStock} low • {stats.outStock} out</Badge></div>
          <div className="text-xs text-[#86868B] mt-3">Stock Value (Cost)</div>
          <div className="text-xl font-bold mt-1">{formatCurrency(stats.stockValue)}</div>
          <div className="text-xs text-[#6E6E73] mt-1">Sale value {formatCurrency(stats.stockSaleValue)} • Due {formatCurrency(stats.totalDue)}</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp size={16} className="text-[#7C3AED]"/> Sales Trend (Revenue vs Profit)</CardTitle></CardHeader>
          <CardContent>
            {dailyData.length===0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-[#86868B] border border-dashed border-[#E8E8ED] rounded-xl">No sales in this period — create a bill in POS</div>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7"/>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#86868B"/>
                    <YAxis tick={{ fontSize: 11 }} stroke="#86868B" tickFormatter={v=> `₹${v/1000}k`}/>
                    <Tooltip formatter={(v: any)=> formatCurrency(Number(v)||0)} contentStyle={{ borderRadius: 12, border:"1px solid #E8E8ED"}}/>
                    <Legend/>
                    <Bar dataKey="revenue" name="Revenue" fill="#7C3AED" radius={[6,6,0,0]}/>
                    <Bar dataKey="profit" name="Profit" fill="#059669" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="p-2 rounded-xl bg-[#F5F3FF] border border-[#EDE9FE]"><div className="text-xs text-[#86868B]">Bills</div><div className="font-bold">{stats.count}</div></div>
              <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]"><div className="text-xs text-[#86868B]">Avg/Day</div><div className="font-bold">{formatCurrency(dailyData.length? stats.revenue/dailyData.length:0)}</div></div>
              <div className="p-2 rounded-xl bg-[#FFF8E1] border border-[#FFECB3]"><div className="text-xs text-[#86868B]">PCS Sold</div><div className="font-bold">{stats.totalPCS}</div></div>
            </div>
          </CardContent>
        </Card>

        {/* Payment & Category */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard size={14}/> Payment Mix</CardTitle></CardHeader>
            <CardContent>
              {paymentData.length===0 ? <div className="text-xs text-[#86868B] text-center py-8">No payment data</div> : (
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: any)=> `${name} ${percent ? (percent*100).toFixed(0):0}%`}>
                        {paymentData.map((_,i)=> <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={(v:any)=> formatCurrency(Number(v)||0)}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="space-y-1 mt-2">
                {paymentData.map((p,i)=>(
                  <div key={p.name} className="flex justify-between text-xs p-2 rounded-lg bg-[#F9FAFB] border border-[#E8E8ED]">
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: COLORS[i%COLORS.length]}}></span>{p.name}</span>
                    <span className="font-semibold">{formatCurrency(p.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Award size={14} className="text-[#F59E0B]"/> Top Categories</CardTitle></CardHeader>
            <CardContent>
              {categoryData.length===0 ? <div className="text-xs text-[#86868B] text-center py-4">No category data</div> : (
                <div className="space-y-2">
                  {categoryData.map((c,i)=>(
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-20 truncate">{c.name}</span>
                      <div className="flex-1 h-2 bg-[#F5F5F7] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.round(c.value / Math.max(1, categoryData[0].value) *100)}%`, background: COLORS[i%COLORS.length]}}></div>
                      </div>
                      <span className="text-xs font-semibold w-20 text-right">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart size={14} className="text-[#7C3AED]"/> Top Selling Products</CardTitle></CardHeader>
          <CardContent>
            {topProducts.length===0 ? <div className="text-xs text-[#86868B] text-center py-8">No sales yet</div> : (
              <div className="space-y-2">
                {topProducts.map((p,i)=>(
                  <div key={p.name} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E8ED] hover:border-[#7C3AED]/20 hover:bg-[#F5F3FF]/30">
                    <span className="w-7 h-7 rounded-full bg-[#1D1D1F] text-white flex items-center justify-center text-xs font-bold">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-[#86868B]">{p.qty} pcs sold</div>
                    </div>
                    <span className="font-bold text-sm">{formatCurrency(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle size={14} className="text-[#F59E0B]"/> Stock Alerts & Insights</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]"><div className="text-lg font-bold text-[#065F46]">{products.filter(p=>p.stockQty> p.minStock).length}</div><div className="text-xs text-[#86868B]">Healthy</div></div>
              <div className="p-3 rounded-xl bg-[#FFF8E1] border border-[#FFECB3]"><div className="text-lg font-bold text-[#92400E]">{stats.lowStock}</div><div className="text-xs text-[#86868B]">Low</div></div>
              <div className="p-3 rounded-xl bg-[#FFEBEE] border border-[#FFCDD2]"><div className="text-lg font-bold text-[#B71C1C]">{stats.outStock}</div><div className="text-xs text-[#86868B]">Out</div></div>
            </div>
            <div className="space-y-2 max-h-[180px] overflow-auto">
              {products.filter(p=> p.stockQty<=p.minStock).slice(0,5).map(p=>(
                <div key={p.id} className="flex justify-between text-sm p-2 rounded-lg bg-[#FFF8E1] border border-[#FFECB3]">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="font-bold">{p.stockQty} pcs</span>
                </div>
              ))}
              {stats.lowStock===0 && stats.outStock===0 && <div className="text-xs text-[#86868B] text-center py-4">All stock healthy ✓</div>}
            </div>
            <div className="p-3 rounded-xl bg-[#1D1D1F] text-white flex justify-between items-center">
              <div><div className="text-xs text-white/70">Potential Profit if All Stock Sold</div><div className="font-bold">{formatCurrency(products.reduce((a,p)=> a + (p.sellingPrice - p.costPrice)*p.stockQty, 0))}</div></div>
              <TrendingUp size={18} className="text-white/60"/>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom: GST & Dues */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText size={14}/> Recent Expenses vs Sales</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData.length? dailyData : [{ date:"No Data", revenue:0, profit:0, bills:0 } as any]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7"/>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }}/>
                  <YAxis tick={{ fontSize: 11 }}/>
                  <Tooltip/>
                  <Legend/>
                  <Line type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2} dot={false}/>
                  <Line type="monotone" dataKey="profit" stroke="#059669" strokeWidth={2} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs mt-2 p-2 rounded-lg bg-[#F9FAFB] border border-[#E8E8ED]">
              <span>Net after expenses: <span className={stats.netProfit>=0?"text-[#059669] font-bold":"text-[#DC2626] font-bold"}>{formatCurrency(stats.netProfit)}</span></span>
              <span>Expenses: {formatCurrency(stats.totalExpenses)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users size={14}/> Customer Dues (Khata)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-[#FFEBEE] to-[#FFF8E1] border border-[#FFCDD2]">
              <div className="text-xs text-[#6E6E73]">Total Outstanding (Udhar)</div>
              <div className="text-2xl font-black text-[#B71C1C] mt-1">{formatCurrency(stats.totalDue)}</div>
              <div className="text-xs text-[#86868B] mt-1">{customers.length} customers • Collect via Customers tab</div>
            </div>
            <div className="mt-3 p-3 rounded-xl bg-[#1D1D1F] text-white text-xs flex justify-between">
              <span>Stock Sale Value (MRP)</span>
              <span className="font-bold">{formatCurrency(stats.stockSaleValue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
