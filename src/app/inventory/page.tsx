"use client"
import { useEffect, useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { 
  Search, Plus, Edit2, Trash2, Package, Sparkles, Filter, 
  Palette, Tag, AlertTriangle, TrendingUp, X, Check, 
  RotateCcw, Archive, ShoppingBag, ArrowRight, CheckCircle2 
} from "lucide-react"
import Link from "next/link"

type SaleItemSummary = {
  qty: number
  total: number
}

type Product = {
  id: string
  name: string
  category: string
  subcategory: string | null
  fabric: string | null
  color: string | null
  colors: string | null
  pattern: string | null
  hsn: string | null
  size: string | null
  costPrice: number
  sellingPrice: number
  stockQty: number
  minStock: number
  location: string | null
  supplier?: { name: string } | null
  saleItems?: SaleItemSummary[]
}

const PRESET_COLORS = ["Red","Maroon","Pink","Peach","Orange","Yellow","Green","Olive","Blue","Navy","Purple","Wine","Brown","Beige","Black","White","Grey","Gold","Silver"]
const CATEGORY_OPTIONS = ["Saree","Suit","Lehenga","Fabric","Blouse","Petticoat","Other"]
const FABRIC_OPTIONS = ["Silk","Cotton","Georgette","Chiffon","Net","Art Silk","Linen","Chanderi","Bhagalpuri","Other"]

function parseColors(p: Product): string[] {
  if (p.colors) {
    try { const arr = JSON.parse(p.colors); if (Array.isArray(arr)) return arr } catch {}
  }
  if (p.color) return [p.color]
  return []
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("")
  const [fabric, setFabric] = useState("")
  const [stockFilter, setStockFilter] = useState("") // "", "low", "in", "out"
  const [activeTab, setActiveTab] = useState<"active" | "sold" | "all">("active")
  
  // Add/Edit Form
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ 
    name:"", category:"Saree", subcategory:"", fabric:"", pattern:"", 
    hsn:"", size:"", costPrice:"", sellingPrice:"", stockQty:"", location:"", minStock:"5" 
  })
  const [colors, setColors] = useState<string[]>([])
  const [colorInput, setColorInput] = useState("")
  const [editing, setEditing] = useState<Product | null>(null)

  // Restock Modal
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null)
  const [restockAddQty, setRestockAddQty] = useState<number>(10)
  const [restockSellingPrice, setRestockSellingPrice] = useState<string>("")
  const [restockCostPrice, setRestockCostPrice] = useState<string>("")
  const [restockingLoading, setRestockingLoading] = useState(false)
  const [restockSuccess, setRestockSuccess] = useState<string | null>(null)

  // Sync tab with URL search parameter (?tab=sold)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get("tab")
      if (tabParam === "sold") setActiveTab("sold")
      else if (tabParam === "all") setActiveTab("all")
      else if (tabParam === "active") setActiveTab("active")
    }
  }, [])

  const load = async () => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (category) params.set("category", category)
    if (fabric) params.set("fabric", fabric)
    // We fetch full filtered list and separate active vs sold cleanly in UI
    const res = await fetch(`/api/inventory?${params}`)
    const data = await res.json()
    if (Array.isArray(data)) setProducts(data)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [q, category, fabric])

  const resetForm = () => {
    setForm({ 
      name:"", category:"Saree", subcategory:"", fabric:"", pattern:"", 
      hsn:"", size:"", costPrice:"", sellingPrice:"", stockQty:"", location:"", minStock:"5" 
    })
    setColors([])
    setColorInput("")
    setEditing(null)
  }

  const addColor = (c: string) => {
    const v = c.trim()
    if (!v) return
    if (!colors.includes(v)) setColors([...colors, v])
    setColorInput("")
  }
  const removeColor = (c: string) => setColors(colors.filter(x => x !== c))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { 
      ...form, 
      colors, 
      color: colors[0] || null, 
      costPrice: Number(form.costPrice), 
      sellingPrice: Number(form.sellingPrice), 
      stockQty: Number(form.stockQty), 
      minStock: Number(form.minStock) 
    }
    if (editing) {
      await fetch(`/api/inventory/${editing.id}`, { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      })
    } else {
      await fetch("/api/inventory", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      })
    }
    resetForm()
    setShowAdd(false)
    load()
  }

  const del = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this product? Historical sales will be preserved.")) return
    await fetch(`/api/inventory/${id}`, { method: "DELETE" })
    load()
  }

  const startEdit = (p: Product) => {
    setEditing(p)
    setForm({ 
      name: p.name, 
      category: p.category, 
      subcategory: p.subcategory || "", 
      fabric: p.fabric || "", 
      pattern: p.pattern || "", 
      hsn: p.hsn || "", 
      size: p.size || "", 
      costPrice: String(p.costPrice), 
      sellingPrice: String(p.sellingPrice), 
      stockQty: String(p.stockQty), 
      location: p.location || "", 
      minStock: String(p.minStock) 
    })
    setColors(parseColors(p))
    setShowAdd(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Quick Restock Handler
  const openRestock = (p: Product) => {
    setRestockingProduct(p)
    setRestockAddQty(10)
    setRestockCostPrice(String(p.costPrice))
    setRestockSellingPrice(String(p.sellingPrice))
  }

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restockingProduct) return
    setRestockingLoading(true)
    try {
      const newQty = Math.max(1, restockingProduct.stockQty + Number(restockAddQty))
      const body: Record<string, number> = { stockQty: newQty }
      if (restockCostPrice) body.costPrice = Number(restockCostPrice)
      if (restockSellingPrice) body.sellingPrice = Number(restockSellingPrice)

      const res = await fetch(`/api/inventory/${restockingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error("Failed to restock product")
      
      const productName = restockingProduct.name
      setRestockSuccess(`Successfully restocked ${restockAddQty} pcs of "${productName}". It is now LIVE in Active Stock!`)
      setRestockingProduct(null)
      await load()
      setTimeout(() => setRestockSuccess(null), 6000)
    } catch (err) {
      alert(String(err))
    } finally {
      setRestockingLoading(false)
    }
  }

  // High-level statistics
  const stats = useMemo(() => {
    const activeItems = products.filter(p => p.stockQty > 0)
    const lowItems = products.filter(p => p.stockQty > 0 && p.stockQty <= p.minStock)
    const soldItems = products.filter(p => p.stockQty === 0)
    
    const activeValue = activeItems.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0)
    
    // Calculate total historical sold units and revenue across sold out items
    let soldUnits = 0
    let soldRevenue = 0
    soldItems.forEach(p => {
      if (p.saleItems && p.saleItems.length > 0) {
        soldUnits += p.saleItems.reduce((s, it) => s + it.qty, 0)
        soldRevenue += p.saleItems.reduce((s, it) => s + it.total, 0)
      }
    })

    return {
      total: products.length,
      active: activeItems.length,
      low: lowItems.length,
      sold: soldItems.length,
      activeValue,
      soldUnits,
      soldRevenue
    }
  }, [products])

  // Filtered views depending on tab
  const displayedProducts = useMemo(() => {
    let list = products
    if (activeTab === "active") {
      list = list.filter(p => p.stockQty > 0)
      if (stockFilter === "low") {
        list = list.filter(p => p.stockQty <= p.minStock)
      }
    } else if (activeTab === "sold") {
      list = list.filter(p => p.stockQty === 0)
    } else {
      // "all"
      if (stockFilter === "in") list = list.filter(p => p.stockQty > 0)
      else if (stockFilter === "low") list = list.filter(p => p.stockQty > 0 && p.stockQty <= p.minStock)
      else if (stockFilter === "out") list = list.filter(p => p.stockQty === 0)
    }
    return list
  }, [products, activeTab, stockFilter])

  return (
    <div className="space-y-6">
      {/* Restock Success Notification */}
      {restockSuccess && (
        <div className="rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] p-4 text-[#065F46] flex items-center justify-between shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#10B981] text-white flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold">{restockSuccess}</p>
              <p className="text-xs text-[#047857]">Now visible in POS billing and ready for sales.</p>
            </div>
          </div>
          <button onClick={() => setRestockSuccess(null)} className="text-[#047857] hover:text-[#065F46] p-1">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="rounded-[20px] bg-white border border-[#E8E8ED] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] border border-[#C8E6C9] flex items-center justify-center text-[#1B5E20]">
            <Package size={22} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight flex items-center gap-2">
              Store Inventory 
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]">
                Vaishnavi Saree • Almora
              </span>
            </h1>
            <p className="text-sm text-[#6E6E73]">
              {stats.active} active in-stock • {stats.sold} in sold archive • Active valuation: {formatCurrency(stats.activeValue)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/ingest">
            <Button variant="secondary" className="border-[#C8E6C9] bg-[#F1F8E9] hover:bg-[#E8F5E9] text-[#1B5E20]">
              <Sparkles size={16} className="mr-2" /> Smart Ingest (Purchase Bill)
            </Button>
          </Link>
          <Button 
            onClick={() => { resetForm(); setShowAdd(!showAdd) }} 
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow"
          >
            <Plus size={16} className="mr-2" /> {editing ? "Edit Item" : "Add New Item"}
          </Button>
        </div>
      </div>

      {/* Stats Cards — Clickable to switch tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Active Stock Card */}
        <div 
          onClick={() => { setActiveTab("active"); setStockFilter("") }}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
            activeTab === "active" && stockFilter !== "low"
              ? "bg-[#F0FDF4] border-[#86EFAC] shadow-sm ring-2 ring-[#22C55E]/30" 
              : "bg-white border-[#E8E8ED] hover:border-[#86EFAC]/50"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-[#1B5E20]">
            <Package size={18} />
          </div>
          <div>
            <div className="text-xs text-[#86868B] font-medium">Active In-Stock</div>
            <div className="text-xl font-bold text-[#1B5E20]">{stats.active}</div>
            <div className="text-[11px] text-[#6E6E73]">Ready in POS</div>
          </div>
        </div>

        {/* Low Stock Card */}
        <div 
          onClick={() => { setActiveTab("active"); setStockFilter("low") }}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
            activeTab === "active" && stockFilter === "low"
              ? "bg-[#FFFBEB] border-[#FCD34D] shadow-sm ring-2 ring-[#F59E0B]/30" 
              : "bg-white border-[#E8E8ED] hover:border-[#FCD34D]/50"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#FFF8E1] flex items-center justify-center text-[#F57F17]">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="text-xs text-[#86868B] font-medium">Low Stock Alert</div>
            <div className="text-xl font-bold text-[#D97706]">{stats.low}</div>
            <div className="text-[11px] text-[#6E6E73]">1 to 5 pieces left</div>
          </div>
        </div>

        {/* Sold Inventory Card */}
        <div 
          onClick={() => { setActiveTab("sold"); setStockFilter("") }}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
            activeTab === "sold"
              ? "bg-[#FEF2F2] border-[#FCA5A5] shadow-sm ring-2 ring-[#EF4444]/30" 
              : "bg-white border-[#E8E8ED] hover:border-[#FCA5A5]/50"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] flex items-center justify-center text-[#DC2626]">
            <Archive size={18} />
          </div>
          <div>
            <div className="text-xs text-[#86868B] font-medium">Sold Inventory</div>
            <div className="text-xl font-bold text-[#DC2626]">{stats.sold}</div>
            <div className="text-[11px] text-[#6E6E73]">Out of stock archive</div>
          </div>
        </div>

        {/* Active Stock Value Card */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8E8ED] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED]">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="text-xs text-[#86868B] font-medium">Live Stock Valuation</div>
            <div className="text-lg font-bold text-[#1D1D1F]">{formatCurrency(stats.activeValue)}</div>
            <div className="text-[11px] text-[#6E6E73]">Total landed cost</div>
          </div>
        </div>
      </div>

      {/* Segmented View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 bg-[#F5F5F7] rounded-2xl border border-[#E8E8ED]">
        <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-[#E8E8ED] shadow-sm">
          <button
            onClick={() => { setActiveTab("active"); setStockFilter("") }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "active" 
                ? "bg-[#1B5E20] text-white shadow" 
                : "text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]"
            }`}
          >
            <Package size={15} />
            Active Stock ({stats.active})
          </button>
          <button
            onClick={() => { setActiveTab("sold"); setStockFilter("") }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "sold" 
                ? "bg-[#DC2626] text-white shadow" 
                : "text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]"
            }`}
          >
            <Archive size={15} />
            Sold Inventory ({stats.sold})
          </button>
          <button
            onClick={() => { setActiveTab("all"); setStockFilter("") }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "all" 
                ? "bg-[#1D1D1F] text-white shadow" 
                : "text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]"
            }`}
          >
            All Products ({stats.total})
          </button>
        </div>

        {/* Tab Description helper */}
        <div className="text-xs text-[#6E6E73] px-2 flex items-center gap-2">
          {activeTab === "active" && (
            <span className="text-[#1B5E20] font-medium flex items-center gap-1">
              ✓ 0-stock products hidden • Only billing-ready stock shown
            </span>
          )}
          {activeTab === "sold" && (
            <span className="text-[#DC2626] font-medium flex items-center gap-1">
              🔒 Preserved archive • Hidden from POS billing • Quick Restock enabled
            </span>
          )}
          {activeTab === "all" && (
            <span className="text-[#1D1D1F] font-medium">
              Complete catalog overview (both in-stock and sold items)
            </span>
          )}
        </div>
      </div>

      {/* SOLD INVENTORY DEDICATED BANNER */}
      {activeTab === "sold" && (
        <Card className="p-6 bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#1E1B4B] text-white border-0 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                  <Archive size={22} className="text-[#FCA5A5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    Sold Inventory & Depleted Stock Archive
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                      Historical Vault
                    </Badge>
                  </h3>
                  <p className="text-xs text-white/70 mt-1 max-w-2xl">
                    All items here have 0 pieces in store and are automatically excluded from POS billing so cashiers cannot sell ghost inventory. Data, supplier links, costs, and historical sales are 100% preserved. Click <strong>Quick Restock</strong> to reactivate any item back into active inventory.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/reports">
                  <Button variant="secondary" size="sm" className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs">
                    View Sales Reports <ArrowRight size={13} className="ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick KPIs for Sold Inventory */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-xs text-white/70">Sold Out Products</div>
                <div className="text-2xl font-bold mt-0.5 text-white">{stats.sold}</div>
                <div className="text-[11px] text-white/50">Stored in database</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-xs text-white/70">Total Units Sold (Archive)</div>
                <div className="text-2xl font-bold mt-0.5 text-[#86EFAC]">{stats.soldUnits} pcs</div>
                <div className="text-[11px] text-white/50">Tracked across bills</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-xs text-white/70">Revenue Generated</div>
                <div className="text-2xl font-bold mt-0.5 text-[#FDE047]">{formatCurrency(stats.soldRevenue)}</div>
                <div className="text-[11px] text-white/50">From historical sales</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-xs text-white/70">POS Billing Status</div>
                <div className="text-lg font-bold mt-1 text-[#FCA5A5] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse"></span>
                  Filtered Out (Safe)
                </div>
                <div className="text-[11px] text-white/50">Cashiers cannot bill</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* QUICK RESTOCK MODAL */}
      {restockingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-[#E8E8ED] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E8ED]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Quick Restock Product</h3>
                  <p className="text-xs text-[#86868B]">Instantly moves item back to Active Stock & POS</p>
                </div>
              </div>
              <button 
                onClick={() => setRestockingProduct(null)} 
                className="w-8 h-8 rounded-full hover:bg-[#F5F5F7] flex items-center justify-center text-[#86868B]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4 mt-4">
              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E8E8ED] space-y-1">
                <div className="text-sm font-bold text-[#1D1D1F]">{restockingProduct.name}</div>
                <div className="text-xs text-[#6E6E73]">
                  {restockingProduct.category} {restockingProduct.fabric ? `• ${restockingProduct.fabric}` : ""} 
                  {restockingProduct.supplier ? ` • Supplier: ${restockingProduct.supplier.name}` : ""}
                </div>
                <div className="text-xs text-[#DC2626] font-medium pt-1">
                  Current Stock: 0 pieces (Sold Out)
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1D1D1F] block mb-1">
                  Pieces to Add to Stock *
                </label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    min="1" 
                    required 
                    value={restockAddQty} 
                    onChange={e => setRestockAddQty(Math.max(1, Number(e.target.value)))} 
                    className="font-bold text-lg h-11"
                  />
                  <div className="flex gap-1.5">
                    {[5, 10, 20, 50].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRestockAddQty(n)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          restockAddQty === n 
                            ? "bg-[#7C3AED] text-white border-[#7C3AED]" 
                            : "bg-[#F5F5F7] text-[#1D1D1F] border-[#E8E8ED] hover:bg-[#E8E8ED]"
                        }`}
                      >
                        +{n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6E6E73] block mb-1">
                    Landed Cost Price (₹)
                  </label>
                  <Input 
                    type="number" 
                    value={restockCostPrice} 
                    onChange={e => setRestockCostPrice(e.target.value)} 
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6E6E73] block mb-1">
                    Selling Price / MRP (₹)
                  </label>
                  <Input 
                    type="number" 
                    value={restockSellingPrice} 
                    onChange={e => setRestockSellingPrice(e.target.value)} 
                    className="h-10"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534]">
                ✨ Upon confirming, this product will immediately have <strong>{restockAddQty} pieces</strong> and will appear in POS billing.
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setRestockingProduct(null)} 
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={restockingLoading} 
                  className="flex-1 h-11 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold"
                >
                  {restockingLoading ? "Updating..." : `Confirm Restock (+${restockAddQty} pcs)`}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add / Edit Product Form Drawer */}
      {showAdd && (
        <Card className="p-6 border-[#C8E6C9] shadow-md animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2 text-base">
              {editing ? "Edit Product Details" : "Add New Product"} 
              <Badge variant="secondary">Multi-Color Support</Badge>
            </h3>
            <Button variant="ghost" size="icon" onClick={() => { setShowAdd(false); resetForm() }}>
              <X size={16} />
            </Button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="lg:col-span-2">
                <label className="text-xs font-semibold">Product Name *</label>
                <Input 
                  required 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  placeholder="Vaishnavi Banarasi Silk Saree - Red Zari" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Category</label>
                <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold">Subcategory</label>
                <Input 
                  value={form.subcategory} 
                  onChange={e => setForm({ ...form, subcategory: e.target.value })} 
                  placeholder="Banarasi, Kanjivaram, Bandhani..." 
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Fabric</label>
                <Select value={form.fabric} onChange={e => setForm({ ...form, fabric: e.target.value })}>
                  <option value="">Select Fabric</option>
                  {FABRIC_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold">Pattern / Work</label>
                <Input 
                  value={form.pattern} 
                  onChange={e => setForm({ ...form, pattern: e.target.value })} 
                  placeholder="Zari, Embroidered, Printed, Jaipuri..." 
                />
              </div>
              <div>
                <label className="text-xs font-semibold">HSN Code</label>
                <Input 
                  value={form.hsn} 
                  onChange={e => setForm({ ...form, hsn: e.target.value })} 
                  placeholder="540754" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Size</label>
                <Input 
                  value={form.size} 
                  onChange={e => setForm({ ...form, size: e.target.value })} 
                  placeholder="Free, S, M, L, XL" 
                />
              </div>
            </div>

            {/* Multiple Colors */}
            <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E8E8ED]">
              <label className="text-xs font-bold flex items-center gap-1">
                <Palette size={12} /> Color Variants
              </label>
              <p className="text-xs text-[#86868B]">
                Specify available colors for this saree/garment.
              </p>
              <div className="flex flex-wrap gap-2 mt-2 min-h-[32px] p-2 bg-white border border-[#E8E8ED] rounded-xl">
                {colors.length === 0 && <span className="text-xs text-[#B0B0B0]">No colors added yet</span>}
                {colors.map(c => (
                  <span key={c} className="px-2.5 py-1 rounded-full bg-[#1D1D1F] text-white text-xs font-medium flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full border border-white/30" style={{ background: c.toLowerCase() }}></span>
                    {c} 
                    <button type="button" onClick={() => removeColor(c)} className="ml-1 hover:text-[#FF8A80]">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input 
                  placeholder="Add color e.g., Maroon, Wine" 
                  value={colorInput} 
                  onChange={e => setColorInput(e.target.value)} 
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addColor(colorInput) } }} 
                  className="flex-1" 
                />
                <Button type="button" variant="secondary" onClick={() => addColor(colorInput)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {PRESET_COLORS.map(c => (
                  <button 
                    key={c} 
                    type="button" 
                    onClick={() => addColor(c)} 
                    className={`px-2 py-1 rounded-full text-xs border transition ${
                      colors.includes(c) 
                        ? "bg-[#7C3AED] text-white border-[#7C3AED]" 
                        : "bg-white border-[#E8E8ED] hover:bg-[#F5F3FF]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold">Cost Price (₹) *</label>
                <Input 
                  required 
                  type="number" 
                  value={form.costPrice} 
                  onChange={e => setForm({ ...form, costPrice: e.target.value })} 
                  placeholder="1850" 
                />
                <p className="text-[11px] text-[#86868B]">Landed cost after GST</p>
              </div>
              <div>
                <label className="text-xs font-semibold">Selling Price (₹) *</label>
                <Input 
                  required 
                  type="number" 
                  value={form.sellingPrice} 
                  onChange={e => setForm({ ...form, sellingPrice: e.target.value })} 
                  placeholder="3200" 
                />
                <p className="text-[11px] text-[#86868B]">Retail MRP</p>
              </div>
              <div>
                <label className="text-xs font-semibold">Stock Qty *</label>
                <Input 
                  required 
                  type="number" 
                  value={form.stockQty} 
                  onChange={e => setForm({ ...form, stockQty: e.target.value })} 
                  placeholder="10" 
                />
                <p className="text-[11px] text-[#86868B]">0 will put it in Sold Inventory</p>
              </div>
              <div>
                <label className="text-xs font-semibold">Min Stock Alert</label>
                <Input 
                  type="number" 
                  value={form.minStock} 
                  onChange={e => setForm({ ...form, minStock: e.target.value })} 
                  placeholder="5" 
                />
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs font-semibold">Location / Rack</label>
                <Input 
                  value={form.location} 
                  onChange={e => setForm({ ...form, location: e.target.value })} 
                  placeholder="Rack A1, Shelf 2" 
                />
              </div>
              <div className="flex items-end gap-2 lg:col-span-2">
                <Button type="submit" className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] h-10">
                  {editing ? "Update Product" : "Add to Inventory"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); resetForm() }} className="h-10">
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
            <Input 
              placeholder={`Search ${activeTab === "sold" ? "sold / out-of-stock items" : activeTab === "active" ? "active in-stock catalog" : "all items"} by name, fabric, color...`} 
              className="pl-9" 
              value={q} 
              onChange={e => setQ(e.target.value)} 
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={category} onChange={e => setCategory(e.target.value)} className="w-[140px]">
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Select value={fabric} onChange={e => setFabric(e.target.value)} className="w-[140px]">
              <option value="">All Fabrics</option>
              {FABRIC_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
            {activeTab === "all" && (
              <Select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="w-[140px]">
                <option value="">All Statuses</option>
                <option value="in">In Stock Only</option>
                <option value="low">Low Stock (1-5)</option>
                <option value="out">Sold Out Only</option>
              </Select>
            )}
            {(q || category || fabric || stockFilter) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setQ(""); setCategory(""); setFabric(""); setStockFilter("") }}
                className="text-xs text-[#86868B]"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Product List Grid */}
      {displayedProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F5F7] border border-[#E8E8ED] flex items-center justify-center mx-auto">
            {activeTab === "sold" ? <Archive size={26} className="text-[#86868B]" /> : <Package size={26} className="text-[#86868B]" />}
          </div>
          <h3 className="font-semibold text-lg mt-4">
            {activeTab === "sold" ? "No sold or out-of-stock items found" : "No matching in-stock products found"}
          </h3>
          <p className="text-sm text-[#6E6E73] mt-1 max-w-md mx-auto">
            {activeTab === "sold" 
              ? "All your current inventory has active stock! As items sell out to 0 stock in POS, they will automatically appear here." 
              : "Try adjusting your search or filters, or add new inventory."}
          </p>
          <div className="flex justify-center gap-2 mt-5">
            {activeTab === "sold" ? (
              <Button onClick={() => setActiveTab("active")} className="bg-[#1B5E20] hover:bg-[#2E7D32]">
                View Active Stock ({stats.active})
              </Button>
            ) : (
              <>
                <Link href="/ingest">
                  <Button className="bg-[#7C3AED] hover:bg-[#6D28D9]">
                    <Sparkles size={16} className="mr-2" /> Smart Ingest
                  </Button>
                </Link>
                <Button variant="secondary" onClick={() => setShowAdd(true)}>
                  <Plus size={16} className="mr-2" /> Add Manually
                </Button>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedProducts.map(p => {
            const cols = parseColors(p)
            const margin = p.sellingPrice ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0
            const isSoldOut = p.stockQty === 0
            
            // Historical sold details for this item
            const soldQty = p.saleItems ? p.saleItems.reduce((sum, item) => sum + item.qty, 0) : 0
            const soldTotal = p.saleItems ? p.saleItems.reduce((sum, item) => sum + item.total, 0) : 0

            return (
              <Card 
                key={p.id} 
                className={`p-4 flex flex-col gap-3 transition group ${
                  isSoldOut 
                    ? "bg-[#FCFCFD] border-[#F1F1F4] hover:border-[#DC2626]/30 hover:shadow-md" 
                    : "hover:shadow-lg hover:border-[#7C3AED]/20"
                }`}
              >
                {/* Top Row: Category Avatar + Name + Stock Badge */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ${
                      isSoldOut 
                        ? "bg-gradient-to-br from-[#64748B] to-[#475569]" 
                        : "bg-gradient-to-br from-[#7C3AED] to-[#4F46E5]"
                    }`}>
                      {p.category.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold leading-tight line-clamp-2">
                        {p.name}
                      </div>
                      <div className="text-xs text-[#86868B] mt-0.5 flex items-center gap-1 flex-wrap">
                        <span>{p.category}</span>
                        {p.fabric && <span>• {p.fabric}</span>}
                        {p.hsn && <span>• HSN {p.hsn}</span>}
                      </div>
                    </div>
                  </div>

                  {isSoldOut ? (
                    <Badge variant="danger" className="bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5] flex-shrink-0 font-bold">
                      Sold Out
                    </Badge>
                  ) : p.stockQty <= p.minStock ? (
                    <Badge variant="warning" className="bg-[#FFF8E1] text-[#B45309] border-[#FDE68A] flex-shrink-0 font-bold">
                      {p.stockQty} pcs left
                    </Badge>
                  ) : (
                    <Badge variant="success" className="bg-[#E8F5E9] text-[#1B5E20] border-[#C8E6C9] flex-shrink-0 font-bold">
                      {p.stockQty} pcs in stock
                    </Badge>
                  )}
                </div>

                {/* Sold Performance Chip for Sold Out Items */}
                {isSoldOut && (
                  <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
                    <span className="text-[#475569] font-medium flex items-center gap-1.5">
                      <ShoppingBag size={13} className="text-[#64748B]" />
                      {soldQty > 0 ? `${soldQty} pcs sold historically` : "Depleted / 0 Stock"}
                    </span>
                    {soldTotal > 0 && (
                      <span className="font-bold text-[#0F172A] bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                        {formatCurrency(soldTotal)} earned
                      </span>
                    )}
                  </div>
                )}

                {/* Colors */}
                {cols.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cols.map(c => (
                      <span key={c} className="px-2 py-0.5 rounded-full bg-[#F5F3FF] border border-[#EDE9FE] text-[11px] font-medium flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full border border-[#E8E8ED]" style={{ background: c.toLowerCase() }}></span>
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Pricing Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-[#F5F5F7] p-2.5 border border-[#E8E8ED]">
                    <div className="text-[11px] text-[#86868B]">Cost (Landed)</div>
                    <div className="font-bold">{formatCurrency(p.costPrice)}</div>
                  </div>
                  <div className="rounded-xl bg-[#1D1D1F] text-white p-2.5">
                    <div className="text-[11px] text-white/70">Selling (MRP)</div>
                    <div className="font-bold">{formatCurrency(p.sellingPrice)}</div>
                  </div>
                </div>

                {/* Supplier & Margin */}
                <div className="flex items-center justify-between text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    margin > 50 
                      ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]" 
                      : margin > 20 
                      ? "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]" 
                      : "bg-[#FFEBEE] text-[#B71C1C] border border-[#FFCDD2]"
                  }`}>
                    {margin}% margin
                  </span>
                  <span className="text-[#86868B] truncate max-w-[170px]">
                    {p.supplier?.name || "Dharma Tex"} {p.location && `• ${p.location}`}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-[#F5F5F7] items-center">
                  {isSoldOut ? (
                    <Button 
                      size="sm" 
                      onClick={() => openRestock(p)}
                      className="flex-1 h-8 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-sm"
                    >
                      <RotateCcw size={13} className="mr-1.5" /> Quick Restock
                    </Button>
                  ) : null}
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className={`${isSoldOut ? "w-20" : "flex-1"} h-8 text-xs`} 
                    onClick={() => startEdit(p)}
                  >
                    <Edit2 size={13} className="mr-1" /> Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-[#FF3B30] hover:bg-[#FFEBEE] px-2.5" 
                    onClick={() => del(p.id)}
                    title="Delete product"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
