"use client"
import { useEffect, useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { BookOpen, TrendingUp, TrendingDown, Wallet, Package, Users, FileText, Calendar, ArrowUpRight, Clock, CreditCard, Banknote } from "lucide-react"
import Link from "next/link"

type Sale = { id: string; billNo: string; total: number; subtotal: number; discount: number; paymentMode: string; createdAt: string; items: { qty: number; price: number; product: { name: string; costPrice: number } }[] }
type Expense = { amount: number; date: string }
type Purchase = { totalCost: number; createdAt: string }

export default function DayBookPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [due, setDue] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    Promise.all([
      fetch("/api/sales").then(r=>r.json()),
      fetch("/api/expenses").then(r=>r.json()),
      fetch("/api/purchases").then(r=>r.json()),
      fetch("/api/stats").then(r=>r.json()),
    ]).then(([s,e,p,st])=>{
      if(Array.isArray(s)) setSales(s)
      if(Array.isArray(e)) setExpenses(e)
      if(Array.isArray(p)) setPurchases(p)
      if(st?.totalDue) setDue(st.totalDue)
      setLoading(false)
    })
  }, [])

  const today = useMemo(()=>{
    const now = new Date()
    const isToday = (d: string) => new Date(d).toDateString() === now.toDateString()
    const todaySales = sales.filter(s=> isToday(s.createdAt))
    const todayExpenses = expenses.filter(e=> isToday(e.date))
    const todayPurchases = purchases.filter(p=> isToday(p.createdAt))
    const revenue = todaySales.reduce((a,s)=> a+s.total, 0)
    const discount = todaySales.reduce((a,s)=> a+s.discount, 0)
    const cost = todaySales.reduce((a,s)=> a+ s.items.reduce((sum,it)=> sum + (it.product.costPrice||0)*it.qty, 0), 0)
    const profit = revenue - cost
    const expenseTotal = todayExpenses.reduce((a,e)=> a+e.amount, 0)
    const purchaseTotal = todayPurchases.reduce((a,p)=> a+p.totalCost, 0)
    // Cash in hand: Cash sales + UPI (assume collected) - expenses - purchases (if paid cash) - we assume purchases paid
    const cashSales = todaySales.filter(s=> s.paymentMode==="Cash" || s.paymentMode==="UPI").reduce((a,s)=> a+s.total, 0)
    const cashInHand = cashSales - expenseTotal // simplified: purchases are stock, not cash out today? Show separately
    const dueCollected = 0 // Would need ledger filter by today
    const bills = todaySales.length
    const pcs = todaySales.reduce((a,s)=> a+ s.items.reduce((sum,it)=> sum+it.qty,0), 0)
    return { revenue, discount, cost, profit, expenseTotal, purchaseTotal, cashInHand, bills, pcs, todaySales, todayExpenses, todayPurchases }
  }, [sales, expenses, purchases])

  const netProfit = today.profit - today.expenseTotal

  if (loading) return <div className="text-sm text-[#86868B] p-8">Loading Day Book...</div>

  return (
    <div className="space-y-6">
      <div className="rounded-[20px] bg-[#1D1D1F] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-2xl bg-white text-[#1D1D1F] flex items-center justify-center"><BookOpen size={22}/></div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">Day Book — Today</h1>
            <p className="text-sm text-white/70">{new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric"})} • Like Bill Book home</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-white text-[#1D1D1F]">{today.bills} bills • {today.pcs} pcs</Badge>
      </div>

      {/* Money King Hero — 4 large cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white border-0">
          <div className="text-xs text-white/70">Today's Sale (Revenue)</div>
          <div className="text-2xl font-black mt-1">{formatCurrency(today.revenue)}</div>
          <div className="text-xs text-white/60 mt-1">{today.bills} bills • Avg {today.bills? formatCurrency(today.revenue/today.bills): formatCurrency(0)}</div>
        </Card>
        <Card className="p-5 border-2 border-[#A7F3D0] bg-[#ECFDF5]">
          <div className="text-xs text-[#065F46] font-semibold">Gross Profit (Sale - Cost)</div>
          <div className={`text-2xl font-black mt-1 ${today.profit>=0?"text-[#065F46]":"text-[#DC2626]"}`}>{formatCurrency(today.profit)}</div>
          <div className="text-xs text-[#6E6E73] mt-1">Cost {formatCurrency(today.cost)} • Disc {formatCurrency(today.discount)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-[#86868B]">Expenses Today</div>
          <div className="text-2xl font-black mt-1 text-[#DC2626]">{formatCurrency(today.expenseTotal)}</div>
          <div className="text-xs text-[#6E6E73] mt-1">Purchase Stock {formatCurrency(today.purchaseTotal)}</div>
        </Card>
        <Card className={`p-5 border-2 ${netProfit>=0?"bg-[#EDE9FE] border-[#DDD6FE]":"bg-[#FFEBEE] border-[#FFCDD2]"}`}>
          <div className="text-xs font-bold flex items-center gap-1">{netProfit>=0?<TrendingUp size={12} className="text-[#059669]"/>:<TrendingDown size={12} className="text-[#DC2626]"/>} Net Profit Today</div>
          <div className={`text-2xl font-black mt-1 ${netProfit>=0?"text-[#059669]":"text-[#DC2626]"}`}>{formatCurrency(netProfit)}</div>
          <div className="text-xs text-[#6E6E73] mt-1">After expenses • Real money</div>
        </Card>
      </div>

      {/* Cash in Hand + Due */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 bg-[#FFFBEB] border-[#FDE68A]">
          <div className="text-xs font-bold text-[#92400E] flex items-center gap-1"><Wallet size={14}/> Cash in Hand Today</div>
          <div className="text-xl font-black mt-1">{formatCurrency(today.cashInHand)}</div>
          <div className="text-xs text-[#6E6E73] mt-1">Cash + UPI sales minus expenses • For closing</div>
        </Card>
        <Card className="p-5 bg-[#FFEBEE] border-[#FFCDD2]">
          <div className="text-xs font-bold text-[#B71C1C] flex items-center gap-1"><Users size={14}/> Due to Collect (Total Khata)</div>
          <div className="text-xl font-black mt-1 text-[#B71C1C]">{formatCurrency(due)}</div>
          <div className="text-xs text-[#6E6E73] mt-1">Today's due added: {formatCurrency(today.revenue - today.cashInHand)} • Collect via Customers</div>
        </Card>
        <Card className="p-5 bg-white border-[#E8E8ED]">
          <div className="text-xs font-bold flex items-center gap-1"><Package size={14}/> Stock Movement Today</div>
          <div className="text-sm mt-2 space-y-1">
            <div className="flex justify-between"><span className="text-[#6E6E73]">Sold:</span><span className="font-bold">{today.pcs} pcs</span></div>
            <div className="flex justify-between"><span className="text-[#6E6E73]">Purchased:</span><span className="font-bold">{today.todayPurchases.length} bills</span></div>
            <div className="flex justify-between"><span className="text-[#6E6E73]">Bills:</span><span className="font-bold">{today.bills}</span></div>
          </div>
        </Card>
      </div>

      {/* Today's Bills List */}
      <Card className="p-6">
        <h3 className="font-bold flex items-center gap-2 mb-3"><FileText size={16} className="text-[#7C3AED]"/> Today's Bills — Detailed Log</h3>
        {today.todaySales.length===0 ? (
          <div className="text-center py-8">
            <Calendar size={24} className="mx-auto text-[#D2D2D7]"/>
            <p className="text-sm text-[#6E6E73] mt-2">No sales today yet</p>
            <Link href="/pos"><Button size="sm" className="mt-2 bg-[#7C3AED]">Create First Bill in POS</Button></Link>
          </div>
        ) : (
          <div className="space-y-2">
            {today.todaySales.map(s=>{
              const cost = s.items.reduce((sum,it)=> sum + (it.product.costPrice||0)*it.qty, 0)
              const profit = s.total - cost
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E8ED] hover:bg-[#F5F3FF]/50">
                  <span className="font-mono text-xs font-bold bg-[#1D1D1F] text-white px-2 py-1 rounded">{s.billNo}</span>
                  <span className="text-xs text-[#6E6E73]">{new Date(s.createdAt).toLocaleTimeString("en-IN")}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${s.paymentMode==="Cash"?"bg-[#FFF8E1] border-[#FFECB3] text-[#F57F17]": s.paymentMode==="Udhaar"?"bg-[#FFEBEE] border-[#FFCDD2] text-[#B71C1C]":"bg-[#EDE9FE] border-[#DDD6FE] text-[#7C3AED]"}`}>{s.paymentMode}</span>
                  <span className="flex-1 text-xs truncate">{s.items.map(i=> `${i.product?.name || "Item"} x${i.qty}`).join(", ")}</span>
                  <span className="font-bold text-sm">{formatCurrency(s.total)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${profit>=0?"bg-[#ECFDF5] text-[#065F46]":"bg-[#FFEBEE] text-[#B71C1C]"}`}>{formatCurrency(profit)}</span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="flex gap-2 justify-center">
        <Link href="/pos"><Button className="bg-[#7C3AED] hover:bg-[#6D28D9]">Go to POS</Button></Link>
        <Link href="/reports"><Button variant="secondary">View Advanced Reports</Button></Link>
        <Link href="/sales"><Button variant="secondary">All Sales</Button></Link>
      </div>
    </div>
  )
}
