"use client"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Users, Plus, CreditCard, UserPlus, Phone, BookOpen, Heart, Calendar, MapPin, ShoppingBag, StickyNote } from "lucide-react"

type Customer = { id: string; name: string; phone: string | null; address: string | null; balanceDue: number; favoriteColor: string | null; occasion: string | null; occasionDate: string | null; notes: string | null; totalSpent: number; lastPurchase: string | null; sales: unknown[]; ledger: { id:string; type:string; amount:number; note:string|null; createdAt:string }[] }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [form, setForm] = useState({ name:"", phone:"", address:"", favoriteColor:"", occasion:"", occasionDate:"", notes:"" })
  const [pay, setPay] = useState<Record<string,string>>({})
  const [showAdd, setShowAdd] = useState(false)

  const load = async () => {
    const res = await fetch("/api/customers")
    const data = await res.json()
    if (Array.isArray(data)) setCustomers(data)
  }
  useEffect(()=>{ load() }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch("/api/customers", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ ...form, occasionDate: form.occasionDate || null }) })
    setForm({ name:"", phone:"", address:"", favoriteColor:"", occasion:"", occasionDate:"", notes:"" }); setShowAdd(false); load()
  }

  const receivePayment = async (id:string) => {
    const amount = Number(pay[id])
    if (!amount) return
    await fetch(`/api/customers/${id}/pay`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ amount }) })
    setPay({ ...pay, [id]:"" }); load()
  }

  const totalDue = customers.reduce((a,c)=> a+c.balanceDue, 0)
  const totalCustomers = customers.length
  const upcomingOccasions = customers.filter(c=> c.occasionDate && new Date(c.occasionDate) > new Date() && new Date(c.occasionDate).getTime() - Date.now() < 7*24*60*60*1000).slice(0,3)

  return (
    <div className="space-y-6">
      <div className="rounded-[20px] bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-2xl bg-white text-[#7C3AED] flex items-center justify-center"><Users size={22}/></div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">Customer Memory — Vaishnavi</h1>
            <p className="text-sm text-white/80">Remember every customer — no photos, no blouse size guarantee. Just pure memory.</p>
            <p className="text-xs text-white/60">Saree has no size • Blouse they tailor — we just remember color taste</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-white/70">Total Customers</div>
            <div className="text-lg font-bold">{totalCustomers}</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-white/70">Total Udhaar Due</div>
            <div className="text-lg font-bold">{formatCurrency(totalDue)}</div>
          </div>
          <Button onClick={()=>setShowAdd(!showAdd)} className="bg-white text-[#7C3AED] hover:bg-[#F5F3FF]"><Plus size={16} className="mr-2"/> {showAdd?"Cancel":"Add Customer"}</Button>
        </div>
      </div>

      {upcomingOccasions.length>0 && (
        <Card className="p-4 bg-gradient-to-r from-[#FFFBEB] to-[#FFF8E1] border-[#FDE68A]">
          <h3 className="font-bold text-sm flex items-center gap-2 text-[#92400E]"><Calendar size={14}/> Occasion Reminders — Next 7 Days (3 days before notify)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mt-3">
            {upcomingOccasions.map(c=>(
              <div key={c.id} className="p-3 rounded-xl bg-white border border-[#FDE68A] flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold">{c.name} • {c.occasion}</div>
                  <div className="text-xs text-[#6E6E73]">{c.occasionDate && new Date(c.occasionDate).toLocaleDateString("en-IN")} {c.favoriteColor && `• Loves ${c.favoriteColor}`}</div>
                </div>
                <Button size="sm" className="bg-[#25D366] hover:bg-[#128C7E] text-white h-7 text-xs" onClick={()=>{ const msg = `Hi ${c.name}, your ${c.occasion} is coming on ${c.occasionDate && new Date(c.occasionDate).toLocaleDateString("en-IN")}! Your favorite ${c.favoriteColor || "collection"} is ready at Vaishnavi Saree. Visit us!`; window.open(`https://wa.me/${(c.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`, "_blank") }}>WhatsApp</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showAdd && (
        <Card className="p-6 border-[#7C3AED]/20 shadow-md">
          <h3 className="font-bold mb-1 flex items-center gap-2"><UserPlus size={16} className="text-[#7C3AED]"/> Add Customer Memory</h3>
          <p className="text-xs text-[#86868B] mb-4">No photos. No blouse size guarantee — they tailor their own. Just remember what matters: color taste, occasion, notes.</p>
          <form onSubmit={add} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold">Name *</label>
                <Input placeholder="Priya Sharma" required value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold">Phone</label>
                <Input placeholder="98765 43210" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold">City / Address</label>
                <Input placeholder="Almora, Main Market" value={form.address} onChange={e=>setForm({...form, address:e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold flex items-center gap-1"><Heart size={12} className="text-[#EC4899]"/> Favorite Color</label>
                <Select value={form.favoriteColor} onChange={e=>setForm({...form, favoriteColor:e.target.value})}>
                  <option value="">Select favorite</option>
                  <option value="Red">Red — Bridal favorite</option>
                  <option value="Maroon">Maroon — Wedding</option>
                  <option value="Pink">Pink — Festive</option>
                  <option value="Blue">Blue</option>
                  <option value="Green">Green</option>
                  <option value="Yellow">Yellow — Haldi</option>
                  <option value="Purple">Purple</option>
                  <option value="Wine">Wine</option>
                  <option value="Gold">Gold — Zari</option>
                </Select>
                <p className="text-[11px] text-[#86868B] mt-1">So you can WhatsApp: "Didi, your favorite Red Banarasi is back"</p>
              </div>
              <div>
                <label className="text-xs font-semibold flex items-center gap-1"><Calendar size={12}/> Occasion</label>
                <Input placeholder="Wedding, Diwali, Anniversary" value={form.occasion} onChange={e=>setForm({...form, occasion:e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold">Occasion Date</label>
                <Input type="date" value={form.occasionDate} onChange={e=>setForm({...form, occasionDate:e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold flex items-center gap-1"><StickyNote size={12}/> Notes (Memory)</label>
              <Input placeholder="Loves red Banarasi, husband prefers cotton, blouse they tailor themselves..." value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} />
              <p className="text-[11px] text-[#86868B] mt-1">No size guarantee — they tailor blouse themselves. Just write what you remember.</p>
            </div>
            <Button type="submit" className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] h-10"><Plus size={16} className="mr-2"/> Save Customer Memory</Button>
          </form>
        </Card>
      )}

      {customers.length===0 ? (
        <Card className="p-12 text-center">
          <Users size={32} className="mx-auto text-[#D2D2D7]"/>
          <h3 className="font-bold mt-4">No customers yet</h3>
          <p className="text-sm text-[#6E6E73] mt-1">Customers are added automatically when you do Udhaar in POS, or add manually above.</p>
          <p className="text-xs text-[#86868B] mt-1">No photos needed. No blouse size. Just name, color taste, and memory.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {customers.map(c=>{
            const isDue = c.balanceDue>0
            return (
              <Card key={c.id} className={`p-5 hover:shadow-md transition ${isDue ? "border-[#FFCDD2] bg-[#FFFBFA]" : "hover:border-[#7C3AED]/20"}`}>
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white flex items-center justify-center font-bold text-sm">{c.name.slice(0,2).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm flex items-center gap-2">{c.name} {c.favoriteColor && <span className="px-2 py-0.5 rounded-full bg-[#FCE7F3] border border-[#FBCFE8] text-xs flex items-center gap-1"><Heart size={10} className="text-[#EC4899]"/>{c.favoriteColor}</span>}</div>
                      <div className="text-xs text-[#6E6E73] flex flex-wrap items-center gap-2 mt-0.5">
                        {c.phone && <span className="flex items-center gap-1"><Phone size={10}/>{c.phone}</span>}
                        {c.address && <span className="flex items-center gap-1"><MapPin size={10}/>{c.address}</span>}
                      </div>
                      {(c.occasion || c.occasionDate) && <div className="text-xs text-[#7C3AED] flex items-center gap-1 mt-1"><Calendar size={10}/>{c.occasion} {c.occasionDate && `• ${new Date(c.occasionDate).toLocaleDateString("en-IN")}`}</div>}
                      {c.notes && <div className="text-xs text-[#6E6E73] mt-1 italic bg-[#F9FAFB] border border-[#E8E8ED] p-2 rounded-lg">"{c.notes}"</div>}
                    </div>
                  </div>
                  <Badge variant={isDue?"danger":"success"}>{formatCurrency(c.balanceDue)} {isDue?"Due":"Clear"}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="p-2 rounded-xl bg-[#F5F5F7] border border-[#E8E8ED]"><div className="text-xs text-[#86868B]">Total Spent</div><div className="text-sm font-bold">{formatCurrency(c.totalSpent || 0)}</div></div>
                  <div className="p-2 rounded-xl bg-[#EDE9FE] border border-[#DDD6FE]"><div className="text-xs text-[#86868B]">Bills</div><div className="text-sm font-bold">{(c.sales as unknown[]).length}</div></div>
                  <div className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]"><div className="text-xs text-[#86868B]">Last Visit</div><div className="text-xs font-medium">{c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString("en-IN") : "—"}</div></div>
                </div>

                {/* Proper Memory — Full Shopping History for repeat customers */}
                {(c.sales as unknown[]).length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-[#F5F3FF] border border-[#EDE9FE]">
                    <div className="text-xs font-bold text-[#7C3AED] flex items-center gap-1"><ShoppingBag size={12}/> Shopping History — Every visit remembered ({(c.sales as unknown[]).length} times)</div>
                    <div className="space-y-1.5 mt-2 max-h-[160px] overflow-auto">
                      {(c.sales as unknown as { id: string; billNo: string; total: number; createdAt: string; items?: { product: { name: string }; qty: number }[]; paymentMode?: string }[]).slice(0,5).map(s=>(
                        <div key={s.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-white border border-[#EDE9FE]">
                          <div>
                            <div className="font-mono font-bold text-[#1D1D1F]">{s.billNo}</div>
                            <div className="text-[#6E6E73]">{new Date(s.createdAt).toLocaleDateString("en-IN")} • {s.items?.slice(0,2).map((it:any)=> `${it.product?.name || "Item"} x${it.qty}`).join(", ") || "—"} {(s.items?.length||0)>2 && `+${(s.items?.length||0)-2} more`}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[#7C3AED]">{formatCurrency(s.total)}</div>
                            <div className="text-[11px] text-[#86868B]">{s.paymentMode || "Cash"}</div>
                          </div>
                        </div>
                      ))}
                      {(c.sales as unknown[]).length > 1 && <div className="text-xs text-[#059669] font-medium text-center pt-1">★ Repeat customer — knows your shop well!</div>}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white h-8" onClick={()=>{ 
                    const phone = (c.phone||"").replace(/\D/g,"");
                    const msg = `Hi ${c.name}, your favorite ${c.favoriteColor || "collection"} is back at Vaishnavi Saree! Visit us in Almora. - Vaishnavi Saree`;
                    const url = phone ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                    const win = window.open(url, "_blank");
                    if(!win) { navigator.clipboard?.writeText(msg); alert("WhatsApp blocked by browser. Message copied to clipboard:\n\n" + msg) }
                  }}><span className="mr-1">↗</span> One-tap WhatsApp</Button>
                  <Button variant="secondary" size="sm" className="h-8" onClick={()=>{ 
                    const phone = (c.phone||"").replace(/\D/g,"");
                    if(!phone) { alert("No phone for this customer. Add phone first."); return }
                    const msg = `Hi ${c.name}, gentle reminder: your due ${formatCurrency(c.balanceDue)} at Vaishnavi Saree. Pay via UPI 9876543210@upi. Thank you!`;
                    const url = `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}`;
                    const win = window.open(url, "_blank");
                    if(!win) { navigator.clipboard?.writeText(msg); alert("WhatsApp blocked. Message copied:\n\n" + msg) }
                  }}>Remind Due</Button>
                </div>

                {isDue && (
                  <div className="mt-3 flex gap-2">
                    <Input placeholder="Payment amount" type="number" value={pay[c.id]||""} onChange={e=>setPay({...pay, [c.id]:e.target.value})} className="flex-1 h-9" />
                    <Button size="sm" onClick={()=>receivePayment(c.id)} className="bg-[#059669] hover:bg-[#047857]"><CreditCard size={14} className="mr-2"/> Receive</Button>
                  </div>
                )}

                <div className="mt-3">
                  <div className="text-xs font-semibold text-[#6E6E73] flex items-center gap-1 mb-2"><BookOpen size={12}/> Khata Ledger • Saree has no size, blouse they tailor</div>
                  <div className="space-y-1 max-h-[120px] overflow-auto">
                    {c.ledger.length===0 ? <div className="text-xs text-[#86868B] p-2">No entries — will show Due + / Paid -</div> : c.ledger.slice(0,5).map(l=>(
                      <div key={l.id} className="flex justify-between text-xs p-2 rounded-lg bg-white border border-[#E8E8ED]">
                        <span className={l.type==="DueAdded"?"text-[#DC2626] font-medium":"text-[#059669] font-medium"}>{l.type==="DueAdded"?"Due +":"Paid -"} {formatCurrency(l.amount)} {l.note && `• ${l.note}`}</span>
                        <span className="text-[#86868B]">{new Date(l.createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
