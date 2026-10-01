"use client"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Search, ShoppingCart, Plus, Minus, Trash2, Printer, User, CreditCard, Banknote, BookOpen, Percent, FileText, Clock, Eye, X, Check, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

type Product = { id: string; name: string; category: string; stockQty: number; sellingPrice: number; costPrice: number; color: string | null; fabric: string | null; hsn?: string | null }
type CartItem = { productId: string; name: string; price: number; costPrice: number; qty: number; stockQty: number; hsn?: string | null }
type Sale = { id: string; billNo: string; total: number; subtotal: number; discount: number; paymentMode: string; customer?: { name: string; phone: string | null } | null; createdAt: string; items: { product: { name: string }; qty: number; price: number }[] }

const STORE = {
  name: "VAISHNAVI SAREE",
  tagline: "Premium Saree • Suit • Lehenga Collection",
  address: "Main Market, Near City Centre, Almora, Uttarakhand - 263601",
  phone: "+91 98765 43210, +91 91234 56789",
  email: "vaishnavisaree@gmail.com",
  gstin: "05ABCDE1234F1Z5",
  state: "Uttarakhand",
  stateCode: "05",
}

export default function POSPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [q, setQ] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [paymentMode, setPaymentMode] = useState("Cash")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [lastBill, setLastBill] = useState<Sale | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [activeTab, setActiveTab] = useState<"pos"|"history">("pos")

  const load = async () => {
    const res = await fetch(`/api/inventory?stock=in&q=${encodeURIComponent(q)}`)
    const data = await res.json()
    if (Array.isArray(data)) {
      setProducts(data.filter((p: any) => p.stockQty > 0) as unknown as Product[])
    }
  }
  const loadSales = async () => {
    const res = await fetch("/api/sales")
    const data = await res.json()
    if (Array.isArray(data)) setRecentSales(data as Sale[])
  }
  useEffect(()=>{ load() }, [])
  useEffect(()=>{ const t=setTimeout(load,300); return ()=>clearTimeout(t)}, [q])
  useEffect(()=>{ loadSales() }, [])

  const addToCart = (p: Product) => {
    if (!p || p.stockQty <= 0) {
      alert("This item is sold out / out of stock and cannot be added to cart.")
      return
    }
    setCart(prev=>{
      const ex = prev.find(c=>c.productId===p.id)
      if (ex) {
        if (ex.qty+1 > p.stockQty) { alert(`Only ${p.stockQty} pieces available in stock.`); return prev }
        return prev.map(c=> c.productId===p.id ? {...c, qty:c.qty+1} : c)
      }
      return [...prev, { productId: p.id, name: p.name, price: p.sellingPrice, costPrice: p.costPrice, qty:1, stockQty: p.stockQty, hsn: (p as any).hsn || "540754" }]
    })
  }
  const updateQty = (id:string, d:number) => {
    setCart(prev=> prev.map(c=> c.productId===id ? {...c, qty: Math.max(1, Math.min(c.stockQty, c.qty+d))} : c))
  }
  const remove = (id:string)=> setCart(prev=> prev.filter(c=>c.productId!==id))

  const subtotal = cart.reduce((a,c)=> a + c.price*c.qty, 0)
  const total = Math.max(0, subtotal - discount)
  const totalQty = cart.reduce((a,c)=> a + c.qty, 0)
  const totalCost = cart.reduce((a,c)=> a + c.costPrice*c.qty, 0)
  const profit = total - totalCost + discount // discount reduces total but not cost

  const checkout = async () => {
    if (cart.length===0) return
    if (paymentMode==="Udhaar" && !customerName) { alert("Customer name required for Udhaar/Khata"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/sales", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ items: cart, discount, paymentMode, customerName, customerPhone, customerAddress }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Fetch full sale with customer for preview
      const salesRes = await fetch("/api/sales")
      const salesData = await salesRes.json()
      const fullSale = Array.isArray(salesData) ? salesData.find((s: Sale)=> s.billNo === data.billNo) || data : data
      setLastBill(fullSale)
      setShowPreview(true)
      setCart([]); setDiscount(0)
      load(); loadSales()
    } catch (e) { alert(String(e)) }
    finally { setLoading(false) }
  }

  const handlePrint = () => {
    window.print()
  }

  const viewBill = (sale: Sale) => {
    setLastBill(sale)
    setShowPreview(true)
  }

  return (
    <div className="space-y-6">
      {/* Professional Sales Header — Vaishnavi Saree */}
      <div className="rounded-[20px] bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 rounded-2xl bg-white text-[#7C3AED] flex items-center justify-center shadow-md">
            <span className="text-xl font-bold">V</span>
          </div>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight">Vaishnavi Saree — POS</h1>
            <p className="text-sm text-white/80 mt-0.5">{STORE.tagline} • <span className="text-white font-medium">{STORE.gstin}</span></p>
            <p className="text-xs text-white/60 hidden sm:block">{STORE.address} • {STORE.phone}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setActiveTab("pos")} className={`px-5 py-2.5 rounded-full text-sm font-medium transition ${activeTab==="pos" ? "bg-white text-[#7C3AED] shadow" : "bg-white/20 text-white hover:bg-white/30"}`}>New Bill</button>
          <button onClick={()=>setActiveTab("history")} className={`px-5 py-2.5 rounded-full text-sm font-medium transition flex items-center gap-2 ${activeTab==="history" ? "bg-white text-[#7C3AED] shadow" : "bg-white/20 text-white hover:bg-white/30"}`}><Clock size={14}/> History ({recentSales.length})</button>
        </div>
      </div>

      {activeTab==="history" ? (
        <Card className="p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4"><FileText size={16}/> Recent Bills — Vaishnavi Saree Sales Log</h3>
          <p className="text-xs text-[#86868B] mb-4">All sales are logged with billNo, customer, items, payment mode. Click eye to reprint professional bill.</p>
          {recentSales.length===0 ? (
            <div className="text-center py-12">
              <FileText size={24} className="mx-auto text-[#D2D2D7]"/>
              <p className="text-sm text-[#6E6E73] mt-2">No sales yet</p>
              <p className="text-xs text-[#86868B]">Create your first bill in POS → it will be logged here with full details</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-auto pr-1">
              {recentSales.map(s=>(
                <div key={s.id} className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E8ED] hover:border-[#7C3AED]/30 hover:bg-[#F5F3FF] transition">
                  <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center text-xs font-bold">{s.billNo.slice(-3)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold flex items-center gap-2">{s.billNo} <Badge variant="secondary" className="text-xs">{s.paymentMode}</Badge> {s.customer && <span className="text-xs text-[#6E6E73]">• {s.customer.name}</span>}</div>
                    <div className="text-xs text-[#86868B]">{new Date(s.createdAt).toLocaleString("en-IN")} • {s.items.length} items • {s.items.map(i=> `${i.product.name} x${i.qty}`).join(", ").slice(0,60)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{formatCurrency(s.total)}</div>
                    <div className="text-xs text-[#86868B]">Sub {formatCurrency(s.subtotal)} {s.discount>0 && `- Disc ${formatCurrency(s.discount)}`}</div>
                  </div>
                  <Button variant="secondary" size="icon" onClick={()=>viewBill(s)}><Eye size={14}/></Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[1.25fr_0.9fr] gap-6">
          {/* Left: Products */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Select Products — In-Stock Catalog</h3>
              <Badge variant="success" className="bg-[#E8F5E9] text-[#1B5E20] border-[#C8E6C9]">{products.length} in stock</Badge>
            </div>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]"/>
              <Input placeholder="Search saree, suit, lehenga, fabric…" className="pl-9" value={q} onChange={e=>setQ(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-auto pr-1">
              {products.map(p=>(
                <div key={p.id} onClick={()=>addToCart(p)} className="group p-3 rounded-2xl border border-[#E8E8ED] bg-white hover:border-[#7C3AED]/30 hover:shadow-md cursor-pointer transition flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-medium leading-tight line-clamp-2 flex-1">{p.name}</div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${p.stockQty<=5?'bg-[#FFF8E1] text-[#F57F17]':'bg-[#E8F5E9] text-[#1B5E20]'}`}>{p.stockQty} left</span>
                  </div>
                  <div className="text-xs text-[#86868B]">{p.category} {p.fabric?`• ${p.fabric}`:""} {p.color?`• ${p.color}`:""}</div>
                  <div className="flex items-center justify-between mt-1">
                    <div>
                      <span className="font-bold text-[15px] text-[#7C3AED]">{formatCurrency(p.sellingPrice)}</span>
                      <span className="text-[11px] text-[#86868B] ml-1">MRP</span>
                    </div>
                    <span className="text-xs bg-[#1D1D1F] text-white px-3 py-1 rounded-full group-hover:bg-[#7C3AED] transition">Add +</span>
                  </div>
                </div>
              ))}
              {products.length===0 && (
                <div className="col-span-2 text-center py-12 text-sm text-[#86868B]">
                  No in-stock products found. (Sold-out items are safely preserved in Inventory → Sold Inventory).
                </div>
              )}
            </div>
          </Card>

          {/* Right: Cart & Checkout */}
          <Card className="p-0 overflow-hidden flex flex-col shadow-md">
            <div className="p-4 border-b border-[#E8E8ED] bg-gradient-to-r from-[#F5F3FF] to-[#EDE9FE]">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2"><ShoppingCart size={16} className="text-[#7C3AED]"/> Cart • {cart.length} items • {totalQty} pcs</h3>
                {cart.length>0 && <button onClick={()=>setCart([])} className="text-xs text-[#FF3B30] font-medium hover:underline">Clear</button>}
              </div>
              <p className="text-xs text-[#6E6E73] mt-1">Vaishnavi Saree • Customer bill • Stock will decrease on Generate</p>
            </div>

            <div className="flex-1 overflow-auto divide-y divide-[#F5F5F7] max-h-[280px]">
              {cart.length===0 ? (
                <div className="text-center py-10">
                  <ShoppingCart size={28} className="mx-auto text-[#D2D2D7]"/>
                  <p className="text-sm text-[#6E6E73] mt-2">Cart empty</p>
                  <p className="text-xs text-[#86868B]">Tap products to add — professional bill preview below</p>
                </div>
              ) : cart.map(c=>(
                <div key={c.productId} className="flex items-center gap-3 p-3 hover:bg-[#F5F3FF]/50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-xs text-[#86868B]">{formatCurrency(c.price)} each {c.hsn && `• HSN ${c.hsn}`}</div>
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-[#E8E8ED] rounded-full p-1">
                    <button onClick={()=>updateQty(c.productId,-1)} className="w-7 h-7 rounded-full bg-[#F5F5F7] hover:bg-white border border-transparent hover:border-[#E8E8ED] flex items-center justify-center"><Minus size={12}/></button>
                    <span className="w-7 text-center text-sm font-bold">{c.qty}</span>
                    <button onClick={()=>updateQty(c.productId,1)} className="w-7 h-7 rounded-full bg-[#F5F5F7] hover:bg-white border border-transparent hover:border-[#E8E8ED] flex items-center justify-center"><Plus size={12}/></button>
                  </div>
                  <div className="text-sm font-bold w-[85px] text-right">{formatCurrency(c.price*c.qty)}</div>
                  <button onClick={()=>remove(c.productId)} className="w-7 h-7 rounded-full hover:bg-[#FFEBEE] flex items-center justify-center text-[#86868B] hover:text-[#FF3B30]"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>

            <div className="p-4 space-y-3 bg-white border-t border-[#E8E8ED]">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Percent size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#86868B]"/>
                  <Input placeholder="Discount ₹" type="number" value={discount||""} onChange={e=>setDiscount(Number(e.target.value)||0)} className="pl-8 h-9" />
                </div>
                <Select value={paymentMode} onChange={e=>setPaymentMode(e.target.value)} className="h-9">
                  <option value="Cash">💵 Cash</option>
                  <option value="UPI">📱 UPI</option>
                  <option value="Udhaar">📒 Udhaar / Khata</option>
                  <option value="Card">💳 Card</option>
                </Select>
              </div>

              <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E8E8ED] space-y-2">
                <div className="text-xs font-semibold text-[#7C3AED] flex items-center gap-1"><User size={12}/> Customer Details (for bill & Khata)</div>
                <Input placeholder="Customer Name *" value={customerName} onChange={e=>setCustomerName(e.target.value)} className="h-9" />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Phone" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} className="h-9" />
                  <Input placeholder="Address / City" value={customerAddress} onChange={e=>setCustomerAddress(e.target.value)} className="h-9" />
                </div>
                {paymentMode==="Udhaar" && !customerName && <p className="text-xs text-[#FF3B30]">Customer name required for Udhaar — will be added to Khata ledger</p>}
              </div>

              <div className="space-y-1.5 text-sm p-3 rounded-xl bg-[#F5F3FF] border border-[#EDE9FE]">
                <div className="flex justify-between text-[#6E6E73]"><span>Subtotal ({totalQty} pcs)</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-[#6E6E73]"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>
                <div className="flex justify-between font-bold text-[18px] pt-2 border-t border-[#DDD6FE]"><span>Total Payable</span><span className="text-[#7C3AED]">{formatCurrency(total)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#86868B]">Payment</span><span className="font-medium flex items-center gap-1">{paymentMode==="Cash"?<Banknote size={12}/>:paymentMode==="Udhaar"?<BookOpen size={12}/>:<CreditCard size={12}/>} {paymentMode}</span></div>
                <div className="flex justify-between text-[11px] text-[#86868B]"><span>Profit on this bill</span><span className={profit>=0?"text-[#059669]":"text-[#DC2626]"}>{formatCurrency(profit)} ({subtotal? Math.round(profit/subtotal*100):0}%)</span></div>
              </div>

              <Button onClick={checkout} disabled={cart.length===0 || loading} className="w-full h-12 text-[15px] bg-[#7C3AED] hover:bg-[#6D28D9] shadow-md">
                {loading ? "Processing…" : `Generate Professional Bill • ${formatCurrency(total)}`}
              </Button>
              <p className="text-[11px] text-center text-[#86868B]">Bill will be logged • Stock updated • Khata updated if Udhaar • Print ready</p>

              {lastBill && !showPreview && (
                <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-sm flex items-center justify-between">
                  <span className="font-medium text-[#065F46] flex items-center gap-1"><Check size={14}/> Bill {lastBill.billNo} logged</span>
                  <Button size="sm" onClick={()=>setShowPreview(true)} className="bg-[#059669] hover:bg-[#047857]"><Eye size={14} className="mr-1"/> View Bill</Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Professional Bill Preview Modal */}
      {showPreview && lastBill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[800px] w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-[#E8E8ED] p-4 flex items-center justify-between no-print">
              <h3 className="font-bold flex items-center gap-2"><FileText size={16} className="text-[#7C3AED]"/> Professional Bill Preview — Vaishnavi Saree</h3>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={()=>setShowPreview(false)}><X size={14} className="mr-1"/> Close</Button>
                <Button size="sm" onClick={handlePrint} variant="secondary"><Printer size={14} className="mr-1"/> Print</Button>
                <Button size="sm" onClick={()=>{ setShowPreview(false); router.push("/sales")}} className="bg-[#059669] hover:bg-[#047857]"><Check size={14} className="mr-1"/> Done — View in Sales <ArrowRight size={14} className="ml-1"/></Button>
              </div>
            </div>

            {/* Bill Content — Printable */}
            <div id="printable-bill" className="p-8 bg-white text-[#1D1D1F]">
              {/* Header */}
              <div className="text-center border-b-2 border-[#1D1D1F] pb-4">
                <h1 className="text-2xl font-black tracking-tight">{STORE.name}</h1>
                <p className="text-xs font-medium text-[#7C3AED]">{STORE.tagline}</p>
                <p className="text-[11px] text-[#6E6E73] mt-1">{STORE.address}</p>
                <p className="text-[11px] text-[#6E6E73]">Ph: {STORE.phone} • Email: {STORE.email}</p>
                <p className="text-[11px] font-semibold">GSTIN: {STORE.gstin} • State: {STORE.state} ({STORE.stateCode})</p>
                <div className="mt-2 inline-block px-3 py-1 bg-[#1D1D1F] text-white text-xs font-bold tracking-widest">TAX INVOICE / RETAIL BILL</div>
              </div>

              {/* Bill Meta */}
              <div className="grid grid-cols-2 gap-6 mt-4 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-[#7C3AED]">Billed To (Customer):</div>
                  <div><span className="text-[#6E6E73]">Name:</span> <span className="font-semibold">{(lastBill as any).customer?.name || customerName || "Walk-in Customer"}</span></div>
                  <div><span className="text-[#6E6E73]">Phone:</span> {(lastBill as any).customer?.phone || customerPhone || "-"}</div>
                  {(customerAddress || (lastBill as any).customer?.address) && <div><span className="text-[#6E6E73]">Address:</span> {customerAddress || (lastBill as any).customer?.address}</div>}
                </div>
                <div className="space-y-1 text-right">
                  <div><span className="text-[#6E6E73]">Invoice No:</span> <span className="font-bold">{lastBill.billNo}</span></div>
                  <div><span className="text-[#6E6E73]">Date:</span> {new Date(lastBill.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric"})}</div>
                  <div><span className="text-[#6E6E73]">Time:</span> {new Date(lastBill.createdAt).toLocaleTimeString("en-IN")}</div>
                  <div><span className="text-[#6E6E73]">Payment:</span> <span className="font-semibold px-2 py-0.5 rounded bg-[#F5F3FF] border border-[#EDE9FE]">{lastBill.paymentMode}</span></div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mt-4 text-xs border border-[#1D1D1F] border-collapse">
                <thead>
                  <tr className="bg-[#1D1D1F] text-white">
                    <th className="p-2 text-left font-semibold border border-[#333] w-8">S.No</th>
                    <th className="p-2 text-left font-semibold border border-[#333]">Item Description</th>
                    <th className="p-2 text-center font-semibold border border-[#333] w-16">HSN</th>
                    <th className="p-2 text-center font-semibold border border-[#333] w-14">Qty</th>
                    <th className="p-2 text-right font-semibold border border-[#333] w-20">Rate</th>
                    <th className="p-2 text-right font-semibold border border-[#333] w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(lastBill.items || cart.map(c=> ({ product: { name: c.name }, qty: c.qty, price: c.price })) as any).map((it: any, idx: number)=>(
                    <tr key={idx} className="border-b border-[#E8E8ED]">
                      <td className="p-2 border border-[#E8E8ED] text-center">{idx+1}</td>
                      <td className="p-2 border border-[#E8E8ED] font-medium">{it.product?.name || (it as any).name || `Item ${idx+1}`}</td>
                      <td className="p-2 border border-[#E8E8ED] text-center text-[#6E6E73]">{(it as any).hsn || it.product?.hsn || "540754"}</td>
                      <td className="p-2 border border-[#E8E8ED] text-center">{it.qty}</td>
                      <td className="p-2 border border-[#E8E8ED] text-right">{formatCurrency(it.price)}</td>
                      <td className="p-2 border border-[#E8E8ED] text-right font-semibold">{formatCurrency(it.price * it.qty)}</td>
                    </tr>
                  ))}
                  {/* Empty rows to fill */}
                  {Array.from({ length: Math.max(0, 6 - (lastBill.items?.length || cart.length)) }).map((_, i)=>(
                    <tr key={`empty-${i}`} className="border-b border-[#E8E8ED] h-6">
                      <td className="p-2 border border-[#E8E8ED]"></td><td className="p-2 border border-[#E8E8ED]"></td><td className="p-2 border border-[#E8E8ED]"></td><td className="p-2 border border-[#E8E8ED]"></td><td className="p-2 border border-[#E8E8ED]"></td><td className="p-2 border border-[#E8E8ED]"></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F5F5F7] font-semibold">
                    <td colSpan={3} className="p-2 border border-[#1D1D1F] text-right">Total</td>
                    <td className="p-2 border border-[#1D1D1F] text-center">{(lastBill as any).items ? (lastBill.items as any[]).reduce((s, it)=> s+it.qty, 0) : totalQty}</td>
                    <td className="p-2 border border-[#1D1D1F]"></td>
                    <td className="p-2 border border-[#1D1D1F] text-right">{formatCurrency(lastBill.subtotal ?? subtotal)}</td>
                  </tr>
                  { (lastBill.discount ?? discount) >0 && (
                    <tr>
                      <td colSpan={5} className="p-2 border border-[#E8E8ED] text-right text-[#6E6E73]">Discount</td>
                      <td className="p-2 border border-[#E8E8ED] text-right text-[#DC2626]">-{formatCurrency(lastBill.discount ?? discount)}</td>
                    </tr>
                  )}
                  <tr className="bg-[#7C3AED] text-white font-bold">
                    <td colSpan={5} className="p-2 border border-[#7C3AED] text-right">BILL AMOUNT (Payable)</td>
                    <td className="p-2 border border-[#7C3AED] text-right text-[14px]">{formatCurrency(lastBill.total ?? total)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="p-2 border border-[#E8E8ED] text-right text-xs">Payment Mode: <span className="font-semibold">{lastBill.paymentMode ?? paymentMode}</span> {lastBill.paymentMode==="Udhaar" && <span className="text-[#DC2626]">(Khata — Due {formatCurrency((lastBill as any).amountDue ?? total)})</span>}</td>
                    <td className="p-2 border border-[#E8E8ED] text-right text-xs">{lastBill.paymentMode==="Udhaar" ? "Due" : "Paid"}: {formatCurrency(lastBill.total ?? total)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Amount in Words */}
              <div className="mt-3 p-2 bg-[#F5F5F7] border border-[#E8E8ED] rounded text-xs">
                <span className="font-semibold">Amount in Words:</span> {formatCurrency(lastBill.total ?? total)} Only
                <span className="float-right text-[#6E6E73]">E. & O.E.</span>
              </div>

              {/* Terms & Footer */}
              <div className="grid grid-cols-2 gap-6 mt-4 text-[10px]">
                <div>
                  <div className="font-bold mb-1">Terms & Conditions:</div>
                  <div className="text-[#6E6E73] space-y-0.5">
                    <div>1. Goods once sold will not be taken back.</div>
                    <div>2. Subject to {STORE.state} jurisdiction.</div>
                    <div>3. Exchange within 7 days with bill.</div>
                  </div>
                  <div className="mt-3">
                    <div className="font-semibold">Thank you for shopping at Vaishnavi Saree!</div>
                    <div className="text-[#7C3AED]">Visit again • Premium Collection • Almora</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">For {STORE.name}</div>
                  <div className="mt-12 border-t border-[#1D1D1F] pt-1 text-xs">Authorised Signatory</div>
                  <div className="text-[10px] text-[#6E6E73] mt-2">This is a computer generated bill. No signature required if printed digitally.</div>
                </div>
              </div>

              {/* Gold Border + UPI QR + Favorite Color + WhatsApp — Showroom */}
              <div className="mt-4 p-3 rounded-xl border-2 border-[#FFD700] bg-gradient-to-r from-[#FFFBEB] to-[#FFF8E1] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-white border-2 border-[#1D1D1F] p-1 flex items-center justify-center text-[8px] font-mono text-center leading-none">
                    UPI QR<br/>98765 43210<br/>₹{lastBill.total}
                  </div>
                  <div className="text-xs">
                    <div className="font-bold">Scan UPI to Pay — Vaishnavi Saree</div>
                    <div className="text-[#6E6E73]">UPI: vaishnavi@upi • {STORE.phone}</div>
                    <div className="text-[#7C3AED] font-medium">We know you love {(lastBill as any).customer?.favoriteColor || "your favorite color"} ❤</div>
                  </div>
                </div>
                <Button size="sm" onClick={()=>{ const name = (lastBill as any).customer?.name || customerName || "Customer"; let phone = ((lastBill as any).customer?.phone || customerPhone || "").replace(/\D/g,""); phone = phone ? `91${phone.slice(-10)}` : ""; const text = `Hi ${name}, your bill ${lastBill.billNo} for ${formatCurrency(lastBill.total)} from Vaishnavi Saree is ready. Thank you! Visit again. - Vaishnavi Saree, Almora`; const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`; const win = window.open(url, "_blank"); if(!win){ navigator.clipboard?.writeText(text); alert("WhatsApp blocked. Message copied:\n\n"+text) } }} className="bg-[#25D366] hover:bg-[#128C7E] text-white">↗ WhatsApp Bill with Photo</Button>
              </div>

              {/* Footer bar — Gold */}
              <div className="mt-4 pt-2 border-t-2 border-[#FFD700] flex justify-between text-[10px] text-[#86868B]">
                <span>Bill generated by Vaishnavi Saree OS • {new Date(lastBill.createdAt).toLocaleString("en-IN")} • Premium Almora • Gold Certified</span>
                <span>Page 1/1 • {lastBill.billNo}</span>
              </div>
            </div>

            <div className="p-4 bg-[#F5F5F7] border-t border-[#E8E8ED] flex flex-col sm:flex-row justify-between items-center gap-3 no-print">
              <span className="text-xs text-[#6E6E73]">✓ Logged in Sales • Stock updated • {lastBill.paymentMode==="Udhaar" ? "Khata updated" : "Payment recorded"} • Gold showroom finish</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handlePrint}><Printer size={14} className="mr-1"/> Print</Button>
                <Button size="sm" onClick={()=>{ setShowPreview(false); router.push("/sales")}} className="bg-[#7C3AED] hover:bg-[#6D28D9]">Done — View in Sales <ArrowRight size={14} className="ml-1"/></Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-bill, #printable-bill * { visibility: visible; }
          #printable-bill { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
