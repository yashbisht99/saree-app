"use client"
import { useEffect, useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { FileText, Search, Filter, Calendar, TrendingUp, CreditCard, Banknote, BookOpen, Eye, Printer, Download, ArrowUpRight, ArrowDownRight, Clock, User, ShoppingCart } from "lucide-react"
import Link from "next/link"

type Sale = {
  id: string
  billNo: string
  subtotal: number
  discount: number
  total: number
  paymentMode: string
  amountPaid: number
  amountDue: number
  createdAt: string
  customer?: { id: string; name: string; phone: string | null } | null
  items: { id: string; qty: number; price: number; total: number; product: { name: string; category: string; costPrice: number; sellingPrice: number } }[]
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [q, setQ] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("")
  const [dateFilter, setDateFilter] = useState<"today"|"week"|"month"|"all">("month")
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch("/api/sales")
    const data = await res.json()
    if (Array.isArray(data)) setSales(data)
    setLoading(false)
  }
  useEffect(()=>{ load() }, [])

  const filtered = useMemo(()=>{
    let list = [...sales]
    if (q) {
      const lq = q.toLowerCase()
      list = list.filter(s=> s.billNo.toLowerCase().includes(lq) || s.customer?.name.toLowerCase().includes(lq) || s.items.some(i=> i.product.name.toLowerCase().includes(lq)))
    }
    if (paymentFilter) list = list.filter(s=> s.paymentMode === paymentFilter)
    if (dateFilter !== "all") {
      const now = new Date()
      list = list.filter(s=>{
        const d = new Date(s.createdAt)
        if (dateFilter==="today") return d.toDateString()===now.toDateString()
        if (dateFilter==="week") { const weekAgo = new Date(now.getTime()-7*24*60*60*1000); return d >= weekAgo }
        if (dateFilter==="month") return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()
        return true
      })
    }
    return list
  }, [sales, q, paymentFilter, dateFilter])

  const stats = useMemo(()=>{
    const totalRevenue = filtered.reduce((a,s)=> a+s.total, 0)
    const totalSubtotal = filtered.reduce((a,s)=> a+s.subtotal, 0)
    const totalDiscount = filtered.reduce((a,s)=> a+s.discount, 0)
    const totalProfit = filtered.reduce((a,s)=> {
      const cost = s.items.reduce((sum,it)=> sum + (it.product.costPrice||0)*it.qty, 0)
      return a + (s.total - cost)
    }, 0)
    const totalItems = filtered.reduce((a,s)=> a+ s.items.reduce((sum,it)=> sum+it.qty,0), 0)
    const avgBill = filtered.length ? totalRevenue / filtered.length : 0
    return { totalRevenue, totalDiscount, totalProfit, totalItems, avgBill, count: filtered.length }
  }, [filtered])

  const exportSales = () => {
    const csv = ["BillNo,Date,Customer,Payment,Items,Qty,Subtotal,Discount,Total,Profit"].concat(filtered.map(s=>{
      const profit = s.items.reduce((sum,it)=> sum + (it.price - (it.product.costPrice||0))*it.qty, 0) - s.discount
      return `${s.billNo},${new Date(s.createdAt).toLocaleDateString("en-IN")},${s.customer?.name||"Walk-in"},${s.paymentMode},${s.items.length},${s.items.reduce((a,i)=>a+i.qty,0)},${s.subtotal},${s.discount},${s.total},${profit}`
    })).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href=url; a.download=`Vaishnavi_Sales_${new Date().toISOString().slice(0,10)}.csv`; a.click()
  }

  if (loading) return <div className="text-sm text-[#86868B] p-8">Loading sales...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#7C3AED] flex items-center justify-center text-white"><FileText size={18}/></span>
            Sales — Vaishnavi Saree
            <Badge variant="secondary">{sales.length} bills</Badge>
          </h1>
          <p className="text-sm text-[#6E6E73]">Every POS bill is logged here with profit, payment, customer. Professional store operation.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/pos"><Button className="bg-[#7C3AED] hover:bg-[#6D28D9]"><ShoppingCart size={16} className="mr-2"/> New Bill (POS)</Button></Link>
          <Button variant="secondary" onClick={exportSales}><Download size={16} className="mr-2"/> Export CSV</Button>
        </div>
      </div>

      {/* Stats - Fixed: Revenue card now visible with solid Vaishnavi purple */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#7C3AED] text-white border-0 shadow-md">
          <div className="text-xs text-white/80 font-medium">Revenue (Filtered)</div>
          <div className="text-xl font-bold mt-1 text-white">{formatCurrency(stats.totalRevenue)}</div>
          <div className="text-xs text-white/70 mt-1 flex items-center gap-1"><TrendingUp size={12}/> {stats.count} bills • {stats.totalItems} pcs</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-[#86868B]">Profit</div>
          <div className="text-xl font-bold text-[#059669] mt-1">{formatCurrency(stats.totalProfit)}</div>
          <div className="text-xs text-[#6E6E73] mt-1">{stats.totalRevenue? Math.round(stats.totalProfit/stats.totalRevenue*100):0}% margin • Discount {formatCurrency(stats.totalDiscount)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-[#86868B]">Avg Bill</div>
          <div className="text-xl font-bold mt-1">{formatCurrency(stats.avgBill)}</div>
          <div className="text-xs text-[#6E6E73] mt-1">Subtotal {formatCurrency(filtered.reduce((a,s)=>a+s.subtotal,0))}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-[#86868B]">Payment Mix</div>
          <div className="text-sm font-semibold mt-1 flex flex-wrap gap-1">
            {["Cash","UPI","Udhaar","Card"].map(m=> {
              const cnt = filtered.filter(s=> s.paymentMode===m).length
              return cnt? <span key={m} className="px-2 py-1 rounded-full bg-[#F5F3FF] border border-[#EDE9FE] text-xs">{m}: {cnt}</span> : null
            })}
          </div>
          <div className="text-xs text-[#6E6E73] mt-1">Due: {formatCurrency(filtered.reduce((a,s)=>a+s.amountDue,0))}</div>
        </Card>
      </div>

      {/* Filters — Month default, sticky purple */}
      <Card className="p-4 sticky top-[64px] z-20 shadow-sm border-[#7C3AED]/20">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]"/>
            <Input placeholder="Search billNo, customer, item..." className="pl-9" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          <div className="flex gap-1 p-1 bg-white border-2 border-[#7C3AED]/20 rounded-full">
            {(["today","week","month","all"] as const).map(r=>(
              <button key={r} onClick={()=>setDateFilter(r)} className={`px-4 py-1.5 rounded-full text-[14px] font-bold capitalize ${dateFilter===r?"bg-[#7C3AED] text-white shadow":"text-[#6E6E73] hover:bg-[#F5F3FF]"}`}>{r==="all"?"All Time": r==="today"?"Today": r==="week"?"This Week":"This Month"}</button>
            ))}
          </div>
          <Select value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)} className="w-full lg:w-[140px] h-9">
            <option value="">All Payments</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Udhaar">Udhaar</option>
            <option value="Card">Card</option>
          </Select>
          <Button variant="secondary" onClick={()=>{setQ(""); setPaymentFilter(""); setDateFilter("month")}} className="h-9"><Filter size={14} className="mr-1"/> Clear</Button>
        </div>
      </Card>

      {/* Sales Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1D1D1F] text-white text-xs">
              <tr>
                <th className="p-3 text-left">Bill</th>
                <th className="p-3 text-left">Date & Customer</th>
                <th className="p-3 text-left">Items</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Subtotal</th>
                <th className="p-3 text-right">Disc.</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Profit</th>
                <th className="p-3 text-center">Pay</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 ? (
                <tr><td colSpan={10} className="p-12 text-center">
                  <FileText size={24} className="mx-auto text-[#D2D2D7]"/>
                  <p className="text-sm text-[#6E6E73] mt-2">No bills found</p>
                  <p className="text-xs text-[#86868B]">Try POS → Generate Bill → it will appear here instantly</p>
                </td></tr>
              ) : filtered.map(s=>{
                const profit = s.items.reduce((sum,it)=> sum + (it.price - (it.product.costPrice||0))*it.qty, 0) - s.discount
                const margin = s.total ? Math.round(profit/s.total*100) : 0
                return (
                  <tr key={s.id} className="border-b border-[#F5F5F7] hover:bg-[#F5F3FF]/50">
                    <td className="p-3 font-mono font-semibold text-xs">{s.billNo}</td>
                    <td className="p-3">
                      <div className="font-medium text-xs flex items-center gap-1"><Clock size={10} className="text-[#86868B]"/>{new Date(s.createdAt).toLocaleDateString("en-IN")} {new Date(s.createdAt).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit"})}</div>
                      <div className="text-xs flex items-center gap-1"><User size={10} className="text-[#86868B]"/>{s.customer?.name || "Walk-in"} {s.customer?.phone && `• ${s.customer.phone}`}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-xs line-clamp-2 max-w-[200px]">{s.items.map(i=> `${i.product.name} x${i.qty}`).join(", ")}</div>
                      <div className="text-[11px] text-[#86868B]">{s.items.length} types</div>
                    </td>
                    <td className="p-3 text-right font-medium">{s.items.reduce((a,i)=>a+i.qty,0)}</td>
                    <td className="p-3 text-right">{formatCurrency(s.subtotal)}</td>
                    <td className="p-3 text-right text-[#DC2626]">{s.discount? `-${formatCurrency(s.discount)}`:"-"}</td>
                    <td className="p-3 text-right font-bold text-[#7C3AED]">{formatCurrency(s.total)}</td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${profit>=0?"bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]":"bg-[#FFEBEE] text-[#B71C1C] border border-[#FFCDD2]"}`}>{formatCurrency(profit)}</span>
                      <div className="text-[11px] text-[#86868B] flex items-center gap-1 justify-end">{margin>=0 ? <ArrowUpRight size={10} className="text-[#059669]"/> : <ArrowDownRight size={10} className="text-[#DC2626]"/>}{margin}%</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${s.paymentMode==="Cash"?"bg-[#FFF8E1] border-[#FFECB3] text-[#F57F17]": s.paymentMode==="Udhaar"?"bg-[#FFEBEE] border-[#FFCDD2] text-[#B71C1C]": s.paymentMode==="UPI"?"bg-[#E0F2FE] border-[#BAE6FD] text-[#0C4A6E]":"bg-[#F5F3FF] border-[#EDE9FE] text-[#7C3AED]"}`}>{s.paymentMode}</span>
                      {s.amountDue>0 && <div className="text-[11px] text-[#DC2626]">Due {formatCurrency(s.amountDue)}</div>}
                    </td>
                    <td className="p-3 text-center">
                      <Button variant="secondary" size="sm" onClick={()=>setSelectedSale(s)}><Eye size={12} className="mr-1"/> View</Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-[700px] w-full max-h-[90vh] overflow-auto p-0">
            <div className="sticky top-0 bg-white border-b border-[#E8E8ED] p-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><FileText size={16} className="text-[#7C3AED]"/> Bill {selectedSale.billNo} — Vaishnavi Saree</h3>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={()=>setSelectedSale(null)}>Close</Button>
                <Button size="sm" onClick={()=>window.print()} className="bg-[#7C3AED]"><Printer size={12} className="mr-1"/> Print</Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm p-3 rounded-xl bg-[#F5F3FF] border border-[#EDE9FE]">
                <div><span className="text-[#6E6E73]">Customer:</span> <span className="font-semibold">{selectedSale.customer?.name || "Walk-in"}</span> {selectedSale.customer?.phone && `• ${selectedSale.customer.phone}`}</div>
                <div className="text-right"><span className="text-[#6E6E73]">Date:</span> {new Date(selectedSale.createdAt).toLocaleString("en-IN")}</div>
                <div><span className="text-[#6E6E73]">Payment:</span> <Badge variant="secondary">{selectedSale.paymentMode}</Badge> {selectedSale.amountDue>0 && <span className="text-[#DC2626]">Due {formatCurrency(selectedSale.amountDue)}</span>}</div>
                <div className="text-right"><span className="text-[#6E6E73]">Bill Total:</span> <span className="font-bold text-[#7C3AED]">{formatCurrency(selectedSale.total)}</span></div>
              </div>
              <table className="w-full text-sm border border-[#E8E8ED] rounded-xl overflow-hidden">
                <thead className="bg-[#1D1D1F] text-white text-xs">
                  <tr><th className="p-2 text-left">Item</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Amount</th><th className="p-2 text-right">Profit</th></tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((it,i)=> {
                    const profitPer = (it.price - (it.product.costPrice||0)) * it.qty
                    return (
                      <tr key={i} className="border-b border-[#F5F5F7]">
                        <td className="p-2"><div className="font-medium">{it.product.name}</div><div className="text-xs text-[#86868B]">{it.product.category} • Cost {formatCurrency(it.product.costPrice||0)}</div></td>
                        <td className="p-2 text-center">{it.qty}</td>
                        <td className="p-2 text-right">{formatCurrency(it.price)}</td>
                        <td className="p-2 text-right font-semibold">{formatCurrency(it.total)}</td>
                        <td className="p-2 text-right"><span className={`px-2 py-1 rounded-full text-xs ${profitPer>=0?"bg-[#ECFDF5] text-[#065F46]":"bg-[#FFEBEE] text-[#B71C1C]"}`}>{formatCurrency(profitPer)}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-[#F5F5F7] text-sm">
                  <tr><td colSpan={3} className="p-2 text-right">Subtotal</td><td className="p-2 text-right font-semibold">{formatCurrency(selectedSale.subtotal)}</td><td></td></tr>
                  <tr><td colSpan={3} className="p-2 text-right text-[#DC2626]">Discount</td><td className="p-2 text-right text-[#DC2626]">-{formatCurrency(selectedSale.discount)}</td><td></td></tr>
                  <tr className="bg-[#7C3AED] text-white font-bold"><td colSpan={3} className="p-2 text-right">Total</td><td className="p-2 text-right">{formatCurrency(selectedSale.total)}</td><td className="p-2 text-right">{formatCurrency(selectedSale.items.reduce((a,it)=> a + (it.price - (it.product.costPrice||0))*it.qty,0) - selectedSale.discount)}</td></tr>
                </tfoot>
              </table>
              <div className="text-xs text-[#86868B] p-3 rounded-xl bg-[#F9FAFB] border border-[#E8E8ED]">
                Logged properly • Stock decreased • {selectedSale.paymentMode==="Udhaar" ? "Khata updated" : "Payment recorded"} • Profit calculated as (selling - cost)*qty - discount • Vaishnavi Saree OS
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
