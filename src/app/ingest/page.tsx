"use client"
import { useState, useCallback, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Upload, FileSpreadsheet, Image as ImageIcon, Check, AlertCircle, Loader2, Trash2, Plus, Package, Receipt, ShoppingBag, ArrowRight } from "lucide-react"
import * as XLSX from "xlsx"

type ParsedBill = {
  supplier: { name: string; phone: string | null }
  billNo: string | null
  date: string | null
  items: { name: string; category: string; fabric: string | null; color: string | null; qty: number; costPrice: number; sellingPrice: number | null; confidence: number }[]
  total: number | null
  _note?: string
}

type ExcelMap = {
  mappings: Record<string, string | null>
  confidence: number
  unmapped: string[]
  notes: string
}

const SCHEMA_FIELDS = ["name","category","fabric","color","qty","costPrice","sellingPrice","sku","supplier","location","size"]

export default function IngestPage() {
  const [tab, setTab] = useState<"bill"|"excel">("bill")
  const [billType, setBillType] = useState<"purchase"|"sale">("purchase")

  // Bill state — separate for clarity per user request
  const [purchaseFiles, setPurchaseFiles] = useState<File[]>([])
  const [saleFiles, setSaleFiles] = useState<File[]>([])
  const [billLoading, setBillLoading] = useState(false)
  const [billResult, setBillResult] = useState<ParsedBill | null>(null)
  const [billError, setBillError] = useState<string | null>(null)

  // Excel state
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelHeaders, setExcelHeaders] = useState<string[]>([])
  const [excelRows, setExcelRows] = useState<Record<string,string>[]>([])
  const [excelMap, setExcelMap] = useState<ExcelMap | null>(null)
  const [excelLoading, setExcelLoading] = useState(false)
  const [mappedPreview, setMappedPreview] = useState<Record<string, string>[]>([])

  // Shared review items — persisted so tab switch / reload doesn't make it "vanish"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reviewItems, setReviewItems] = useState<any[]>([])
  const [supplierName, setSupplierName] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [billNo, setBillNo] = useState("")
  const [saving, setSaving] = useState(false)
  const [includeCharges, setIncludeCharges] = useState(true)
  const [deliveryOverride, setDeliveryOverride] = useState("")

  // Persist review so it doesn't "sucked away" on tab change / refresh
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ingestReviewV2")
      if (raw) {
        const p = JSON.parse(raw)
        if (Array.isArray(p.items) && p.items.length) {
          setReviewItems(p.items)
          if (p.billType) setBillType(p.billType)
          if (p.supplierName) setSupplierName(p.supplierName)
          if (p.customerName) setCustomerName(p.customerName)
          if (p.billNo) setBillNo(p.billNo)
          if (p.billResult) setBillResult(p.billResult)
        }
      }
    } catch {}
  }, [])
  useEffect(() => {
    try {
      if (reviewItems.length) {
        localStorage.setItem("ingestReviewV2", JSON.stringify({ items: reviewItems, billType, supplierName, customerName, billNo, billResult }))
      } else {
        localStorage.removeItem("ingestReviewV2")
      }
    } catch {}
  }, [reviewItems, billType, supplierName, customerName, billNo, billResult])

  // Compress image to max 2000px and ~1MB to avoid 4MB limit and speed up Gemini 2K handling
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (file.size < 800 * 1024) { resolve(file); return }
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const maxDim = 2000
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          if (blob) {
            const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" })
            resolve(compressed.size < file.size ? compressed : file)
          } else resolve(file)
        }, "image/jpeg", 0.8)
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  const handleBillUpload = async (type: "purchase"|"sale") => {
    const files = type==="purchase" ? purchaseFiles : saleFiles
    if (!files.length) { setBillError("No file selected. Please browse or drag a bill photo first."); return }
    setBillLoading(true); setBillError(null); setBillResult(null)
    // Lock current type so UI doesn't flip during upload
    setBillType(type)
    try {
      // Compress large images client-side for faster upload + 2K handling
      const compressedFiles: File[] = []
      for (const f of files) {
        // eslint-disable-next-line no-await-in-loop
        const cf = await compressImage(f)
        compressedFiles.push(cf)
      }
      const fd = new FormData()
      compressedFiles.forEach(f=> fd.append("files", f))
      fd.append("billType", type)
      const res = await fetch("/api/ingest/bill", { method: "POST", body: fd })
      const data = await res.json().catch(async ()=> ({ error: await res.text() }))
      if (!res.ok) throw new Error(data.error || `Parse failed (${res.status})`)
      setBillResult(data)
      setReviewItems(data.items || [])
      if (type==="purchase") {
        setSupplierName(data.supplier?.name || "")
      } else {
        setCustomerName(data.supplier?.name || "")
      }
      setBillNo(data.billNo || "")
      if (!data.items || data.items.length===0) {
        setBillError("AI returned 0 items. Try a clearer photo (straight, good light) or check the bill is a purchase/sale bill. You can also try the other bill type tab.")
      }
    } catch (e) { setBillError(String(e).slice(0,600)) }
    finally { setBillLoading(false) }
  }

  // Excel handlers
  const handleExcelFile = async (file: File) => {
    setExcelFile(file)
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: "array" })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string,string>>(sheet, { defval: "" })
    if (json.length===0) return
    const headers = Object.keys(json[0])
    const rows = json.slice(0, 20)
    setExcelHeaders(headers)
    setExcelRows(json)
    setExcelLoading(true)
    try {
      const res = await fetch("/api/ingest/excel", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ headers, sampleRows: json.slice(0,3) }) })
      const data = await res.json()
      setExcelMap(data)
      const mappings = data.mappings || {}
      const preview = json.slice(0, 10).map(r=>{
        const out: Record<string,string> = {}
        for (const [header, field] of Object.entries(mappings)) {
          if (field) out[field as string] = String(r[header] || "")
        }
        return out
      })
      setMappedPreview(preview)
      const items = json.map(r=>{
        const out: Record<string,string> = {}
        for (const [header, field] of Object.entries(mappings as Record<string,string>)) {
          if (field) out[field] = String(r[header] || "")
        }
        return out
      })
      setReviewItems(items as unknown as ParsedBill["items"])
      setBillType("purchase")
    } catch (e) { console.error(e) }
    finally { setExcelLoading(false) }
  }

  const updateMapping = (header: string, field: string) => {
    if (!excelMap) return
    const newMap = { ...excelMap.mappings, [header]: field || null }
    setExcelMap({ ...excelMap, mappings: newMap })
    const preview = excelRows.slice(0,10).map(r=>{
      const out: Record<string,string> = {}
      for (const [h, f] of Object.entries(newMap)) { if (f) out[f] = String(r[h]||"") }
      return out
    })
    setMappedPreview(preview)
    const items = excelRows.map(r=>{
      const out: Record<string,string> = {}
      for (const [h, f] of Object.entries(newMap)) { if (f) out[f] = String(r[h]||"") }
      return out
    })
    setReviewItems(items as unknown as ParsedBill["items"])
  }

  const saveReview = async () => {
    // Handle delivery override distribution if user entered extra delivery charges
    let itemsToSave = reviewItems as unknown as Record<string, unknown>[]
    const extraDelivery = Number(deliveryOverride) || 0
    if (extraDelivery > 0 && includeCharges) {
      const totalAmt = itemsToSave.reduce((s, it:any)=> s + (Number(it.amount)|| Number(it.qty)*Number(it.costPrice||it.rate)||0), 0) || 1
      itemsToSave = itemsToSave.map((it:any)=>{
        const amt = Number(it.amount)|| Number(it.qty)*Number(it.costPrice||it.rate)||0
        const share = (amt / totalAmt) * extraDelivery
        const perPieceExtra = share / Math.max(1, Number(it.qty)||1)
        const baseLanded = Number(it.landedCost ?? it.costPrice ?? it.rate ?? 0)
        return { ...it, landedCost: Math.round((baseLanded + perPieceExtra)*100)/100 }
      })
    }
    const items = itemsToSave.map(r=> {
      const rawCost = Number(r.costPrice || (r as any).rate || 0) || 0
      const landed = Number((r as any).landedCost ?? rawCost)
      const costToUse = includeCharges ? landed : rawCost
      return {
        name: (r.name || r.Name || (r as any).item || "") as string,
        category: (r.category || "Other") as string,
        fabric: r.fabric as string || null,
        color: r.color as string || null,
        qty: Number(r.qty || r.quantity || r.stockQty || 1) || 1,
        costPrice: costToUse,
        // No auto-margin: sellingPrice stays as is (null/0) — user sets manually
        sellingPrice: r.sellingPrice == null || r.sellingPrice === "" ? 0 : Number(r.sellingPrice) || 0,
        sku: r.sku as string || null,
        landedCost: (r as any).landedCost ?? null,
        rate: rawCost,
      }
    }).filter(i=> i.name)
    if (items.length===0) { alert("No valid items to save — check Name column"); return }
    setSaving(true)
    setBillError(null)
    try {
      const payload = billType==="sale"
        ? { items, supplierName: customerName || supplierName, billNo: billNo ? `SALE-${billNo}` : `SALE-${Date.now()}` }
        : { items, supplierName, billNo }
      const res = await fetch("/api/inventory/bulk", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Bulk save failed")
      // Only clear review if actually created >0 — fixes "vanished but no inventory" bug
      if (data.created === 0) {
        const failedMsg = data.failed?.length ? ` Failed: ${JSON.stringify(data.failed).slice(0,400)}` : ""
        setBillError(`No products created. Check data — names/prices may be invalid.${failedMsg}`)
        alert(`No products added. ${failedMsg || "Check that Name and Cost are filled."}`)
        return
      }
      const totalHandled = (data.created || 0) + (data.updated || 0)
      const msg = billType==="sale"
        ? `Sale bill handled — ${totalHandled} records (${data.created||0} new, ${data.updated||0} updated) — kept separate from purchase stock. Use POS for true sales.`
        : `Inventory updated — ${data.created||0} new + ${data.updated||0} updated (stock increased) — total ${totalHandled} handled. ${data.failed?.length ? ` (${data.failed.length} failed)` : ""} — check Inventory tab!`
      alert(msg)
      // Clear only after confirmed success — and persist so user sees inventory increase
      setBillResult(null); setPurchaseFiles([]); setSaleFiles([]); setReviewItems([]); setExcelFile(null); setExcelHeaders([]); setExcelMap(null)
      // Force inventory refetch hint — user can go to Inventory tab and see new count
      // Keep a flag in localStorage so inventory page knows to reload
      try { localStorage.setItem("lastIngestAt", Date.now().toString()) } catch {}
    } catch (e) {
      setBillError(String(e).slice(0,800))
      alert(String(e))
    }
    finally { setSaving(false) }
  }

  const saveAsSale = async () => {
    // Save review items as a Sale record (for old handwritten sale bills)
    const items = (reviewItems as unknown as Record<string, unknown>[]).map(r=> ({
      name: (r.name || "") as string,
      qty: Number(r.qty || 1) || 1,
      price: Number(r.sellingPrice || r.costPrice || 0) || 0,
    })).filter(i=> i.name && i.price)
    if (items.length===0) { alert("Need name and price per row"); return }
    // we need productIds — for old sale bills, we try to find or create products then make sale
    setSaving(true)
    try {
      // For demo, just inform - real sale creation needs product lookup
      alert(`Sale bill with ${items.length} items — will be implemented as POS sale. For now, processed as inventory review. Use POS for sales.`)
    } finally { setSaving(false) }
  }

  const onDropPurchase = useCallback((e: React.DragEvent)=>{ e.preventDefault(); const files = Array.from(e.dataTransfer.files).filter(f=> f.type.startsWith("image/")); if(files.length){ setPurchaseFiles(files); setBillType("purchase"); setBillError(null) } }, [])
  const onDropSale = useCallback((e: React.DragEvent)=>{ e.preventDefault(); const files = Array.from(e.dataTransfer.files).filter(f=> f.type.startsWith("image/")); if(files.length){ setSaleFiles(files); setBillType("sale"); setBillError(null) } }, [])
  const onDropExcel = useCallback((e: React.DragEvent)=>{ e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleExcelFile(file) }, [])

  return (
    <div className="space-y-6 max-w-[1150px] mx-auto">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#1D1D1F] flex items-center justify-center text-white"><Sparkles size={18}/></span>
          Smart Ingest
          <Badge variant="secondary" className="ml-2">AI • Separate by bill type</Badge>
        </h1>
        <p className="text-sm text-[#6E6E73] mt-1">Two separate photo ingests — system knows exactly which bill you uploaded. Inventory bills → stock. Sale bills → recorded separately. Any Excel → auto-mapped.</p>
      </div>

      {/* Tabs - disabled while uploading to prevent abort */}
      <div className="flex gap-2 p-1 bg-white border border-[#E8E8ED] rounded-full w-fit">
        <button disabled={billLoading || excelLoading} onClick={()=>!(billLoading||excelLoading) && setTab("bill")} className={`px-5 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${tab==="bill" ? "bg-[#1D1D1F] text-white shadow" : "text-[#6E6E73] hover:bg-[#F5F5F7]"} disabled:opacity-50 disabled:cursor-not-allowed`}><ImageIcon size={14}/> Bill Photos</button>
        <button disabled={billLoading || excelLoading} onClick={()=>!(billLoading||excelLoading) && setTab("excel")} className={`px-5 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${tab==="excel" ? "bg-[#1D1D1F] text-white shadow" : "text-[#6E6E73] hover:bg-[#F5F5F7]"} disabled:opacity-50 disabled:cursor-not-allowed`}><FileSpreadsheet size={14}/> Excel File</button>
      </div>

      {/* Global persistent loading banner - stays even if tab would change, but tabs are disabled so it persists */}
      {billLoading && (
        <div className="rounded-2xl bg-[#1D1D1F] text-white p-4 flex items-center gap-3 animate-pulse">
          <Loader2 size={18} className="animate-spin flex-shrink-0"/>
          <div className="flex-1">
            <div className="text-sm font-semibold">Analyzing bill with Gemini 3.6 Flash — HIGH thinking + 2K media • {billType==="purchase"?"Purchase":"Sale"} mode</div>
            <div className="text-xs text-white/70">This may take 30-70 seconds for 9-row bills. Please keep this tab open — do not switch or close. Tab switching is disabled during upload.</div>
          </div>
          <Badge variant="secondary" className="bg-white text-[#1D1D1F]">Uploading…</Badge>
        </div>
      )}
      {excelLoading && (
        <div className="rounded-2xl bg-[#0071E3] text-white p-4 flex items-center gap-3">
          <Loader2 size={18} className="animate-spin"/>
          <div className="text-sm font-semibold">Mapping Excel columns with Gemini 3.6 Flash HIGH thinking…</div>
        </div>
      )}

      {tab==="bill" && (
        <>
          {/* Bill type selector - makes it explicit */}
          <div className="flex gap-2">
            <button onClick={()=>setBillType("purchase")} className={`flex-1 p-4 rounded-2xl border-2 text-left transition ${billType==="purchase" ? "border-[#0071E3] bg-[#EEF5FF]" : "border-[#E8E8ED] bg-white hover:border-[#D2D2D7]"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${billType==="purchase" ? "bg-[#0071E3] text-white" : "bg-[#F5F5F7] text-[#86868B]"}`}><Package size={18}/></div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">Purchase Bill — Inventory In</div>
                  <div className="text-xs text-[#6E6E73]">Supplier wholesale bills → adds to stock</div>
                </div>
                {billType==="purchase" && <Badge variant="default">Selected</Badge>}
              </div>
            </button>
            <button onClick={()=>setBillType("sale")} className={`flex-1 p-4 rounded-2xl border-2 text-left transition ${billType==="sale" ? "border-[#FF3B30] bg-[#FFEBEE]" : "border-[#E8E8ED] bg-white hover:border-[#D2D2D7]"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${billType==="sale" ? "bg-[#FF3B30] text-white" : "bg-[#F5F5F7] text-[#86868B]"}`}><ShoppingBag size={18}/></div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">Sale Record — Inventory Out</div>
                  <div className="text-xs text-[#6E6E73]">Old sale bills / customer records → separate</div>
                </div>
                {billType==="sale" && <Badge variant="danger">Selected</Badge>}
              </div>
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Purchase Bill Card — always visible but highlighted when selected */}
            <Card className={`${billType==="purchase" ? "ring-2 ring-[#0071E3] shadow-md" : "opacity-60 hover:opacity-100"} transition`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#0071E3] flex items-center justify-center text-white"><Package size={14}/></span>
                  Purchase Bill Photos
                  <Badge variant="secondary">Inventory In</Badge>
                </CardTitle>
                <CardDescription>Supplier bills from Surat/Varanasi — wholesale purchase. AI adds to stock.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onDragOver={e=>e.preventDefault()}
                  onDrop={onDropPurchase}
                  className="border-2 border-dashed rounded-2xl p-6 text-center bg-[#F5F5F7]/50 hover:bg-[#EEF5FF] transition border-[#D2D2D7] hover:border-[#0071E3]"
                >
                  <Upload size={26} className="mx-auto text-[#0071E3]"/>
                  <p className="text-sm font-medium mt-2">Drag Purchase Bill here</p>
                  <p className="text-xs text-[#86868B]">Supplier bill • printed/handwritten • Hindi ok</p>
                  <input type="file" accept="image/*" multiple className="hidden" id="purchase-input" onChange={e=> { const f = Array.from(e.target.files||[]); if(f.length) { setPurchaseFiles(f); setBillType("purchase"); setBillError(null) } } } />
                  <label htmlFor="purchase-input" className="inline-flex mt-3 px-4 py-1.5 rounded-full bg-white border border-[#E8E8ED] text-sm font-medium cursor-pointer hover:bg-[#F5F5F7]">Browse Purchase Bills</label>
                  {purchaseFiles.length>0 && (
                    <div className="mt-3">
                      <p className="text-xs text-[#0071E3] font-medium">{purchaseFiles.length} file(s) • {purchaseFiles[0].name} {purchaseFiles.length>1?`+${purchaseFiles.length-1} more`:""} • {(purchaseFiles[0].size/1024).toFixed(0)}KB</p>
                      <button onClick={()=>setPurchaseFiles([])} className="mt-1 text-xs text-[#86868B] underline">Clear</button>
                    </div>
                  )}
                </div>
                <Button onClick={()=>handleBillUpload("purchase")} disabled={!purchaseFiles.length || billLoading} className="w-full bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-50">
                  {billLoading && billType==="purchase" ? <><Loader2 size={16} className="mr-2 animate-spin"/> Analyzing Purchase Bill… (30-70s)</> : <><Sparkles size={16} className="mr-2"/> Analyze Purchase Bill</>}
                </Button>
                <div className="text-xs text-[#86868B] p-3 bg-[#F5F5F7] rounded-xl flex gap-2">
                  <span className="text-[#0071E3]">●</span> System will tag as <b>Purchase</b> • creates Purchase record • stock increases
                </div>
              </CardContent>
            </Card>

            {/* Sale Bill Card */}
            <Card className={`${billType==="sale" ? "ring-2 ring-[#FF3B30] shadow-md" : "opacity-60 hover:opacity-100"} transition`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#FF3B30] flex items-center justify-center text-white"><Receipt size={14}/></span>
                  Sale Record Photos
                  <Badge variant="danger">Inventory Out</Badge>
                </CardTitle>
                <CardDescription>Old handwritten sale bills / customer sale records — kept separate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onDragOver={e=>e.preventDefault()}
                  onDrop={onDropSale}
                  className="border-2 border-dashed rounded-2xl p-6 text-center bg-[#F5F5F7]/50 hover:bg-[#FFEBEE] transition border-[#D2D2D7] hover:border-[#FF3B30]"
                >
                  <Upload size={26} className="mx-auto text-[#FF3B30]"/>
                  <p className="text-sm font-medium mt-2">Drag Sale Record here</p>
                  <p className="text-xs text-[#86868B]">Sale bill • customer receipt • separate ledger</p>
                  <input type="file" accept="image/*" multiple className="hidden" id="sale-input" onChange={e=> { const f = Array.from(e.target.files||[]); if(f.length) { setSaleFiles(f); setBillType("sale"); setBillError(null) } } } />
                  <label htmlFor="sale-input" className="inline-flex mt-3 px-4 py-1.5 rounded-full bg-white border border-[#E8E8ED] text-sm font-medium cursor-pointer hover:bg-[#F5F5F7]">Browse Sale Records</label>
                  {saleFiles.length>0 && (
                    <div className="mt-3">
                      <p className="text-xs text-[#FF3B30] font-medium">{saleFiles.length} file(s) • {saleFiles[0].name} • {(saleFiles[0].size/1024).toFixed(0)}KB</p>
                      <button onClick={()=>setSaleFiles([])} className="mt-1 text-xs text-[#86868B] underline">Clear</button>
                    </div>
                  )}
                </div>
                <Button onClick={()=>handleBillUpload("sale")} disabled={!saleFiles.length || billLoading} className="w-full bg-[#FF3B30] hover:bg-[#FF453A] disabled:opacity-50">
                  {billLoading && billType==="sale" ? <><Loader2 size={16} className="mr-2 animate-spin"/> Analyzing Sale Record…</> : <><Receipt size={16} className="mr-2"/> Analyze Sale Record</>}
                </Button>
                <div className="text-xs text-[#86868B] p-3 bg-[#FFEBEE] rounded-xl flex gap-2">
                  <span className="text-[#FF3B30]">●</span> System will tag as <b>Sale</b> • kept separate from purchase stock
                </div>
              </CardContent>
            </Card>
          </div>

          {billError && <div className="text-sm text-[#FF3B30] bg-[#FFEBEE] border border-[#FFCDD2] rounded-xl p-3 flex gap-2"><AlertCircle size={16}/>{billError}</div>}
          {billResult?._note && <div className="text-xs text-[#F57F17] bg-[#FFF8E1] border border-[#FFECB3] rounded-xl p-3 flex gap-2"><AlertCircle size={14}/>{billResult._note}</div>}

          <Card className="bg-[#1D1D1F] text-white border-[#333]">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1">
                <div className="text-sm font-semibold flex items-center gap-2">How system knows which bill <ArrowRight size={14}/></div>
                <div className="text-xs text-white/70 mt-1">You choose <span className="text-white font-medium">Purchase vs Sale</span> before upload, or click the card. Badge shows selected type. AI prompt also adapts. Sale bills are not mixed with purchase stock.</div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-white text-[#1D1D1F]">Purchase = Inventory In</Badge>
                <Badge variant="danger" className="bg-[#FF3B30] text-white">Sale = Separate</Badge>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {tab==="excel" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-[#0071E3]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#0071E3]"/> Excel Inventory In</CardTitle>
              <CardDescription>.xlsx, .xls, .csv — any columns, any order → maps to <b>Inventory</b>. Clearly separate from sales.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-xl bg-[#EEF5FF] border border-[#0071E3]/20 flex items-center gap-2 text-sm"><Package size={14} className="text-[#0071E3]"/> <span className="font-medium">Excel always = Inventory In (Purchase)</span> <Badge variant="secondary">Purchase</Badge></div>
              <div onDragOver={e=>e.preventDefault()} onDrop={onDropExcel} className="border-2 border-dashed border-[#D2D2D7] rounded-2xl p-8 text-center bg-[#F5F5F7]/50 hover:bg-[#EEF5FF] transition">
                <FileSpreadsheet size={28} className="mx-auto text-[#0071E3]"/>
                <p className="text-sm font-medium mt-2">Drop Excel here (Inventory)</p>
                <p className="text-xs text-[#86868B]">Any format • Hindi ok • Messy rows ok</p>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" id="excel-input" onChange={e=> { const f=e.target.files?.[0]; if(f) handleExcelFile(f)}}/>
                <label htmlFor="excel-input" className="inline-flex mt-3"><Button variant="secondary" size="sm">Browse Excel</Button></label>
                {excelFile && <p className="text-xs text-[#0071E3] mt-3 font-medium">{excelFile.name} • {excelHeaders.length} cols • {excelRows.length} rows</p>}
              </div>
              {excelLoading && <div className="flex items-center gap-2 text-sm text-[#6E6E73]"><Loader2 size={16} className="animate-spin"/> Mapping columns with AI…</div>}
              {excelMap && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Column Mapper → Inventory</span>
                    <Badge variant={excelMap.confidence>0.8 ? "success" : "warning"}>Confidence {Math.round(excelMap.confidence*100)}%</Badge>
                  </div>
                  <div className="text-xs text-[#86868B]">{excelMap.notes}</div>
                  <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                    {excelHeaders.map(h=>(
                      <div key={h} className="flex items-center gap-2 p-2 rounded-xl bg-[#F5F5F7] border border-[#E8E8ED]">
                        <span className="flex-1 text-sm font-medium truncate">{h}</span>
                        <span className="text-xs text-[#86868B]">→</span>
                        <Select value={excelMap.mappings[h] || ""} onChange={e=> updateMapping(h, e.target.value)} className="w-[160px]">
                          <option value="">Ignore</option>
                          {SCHEMA_FIELDS.map(f=> <option key={f} value={f}>{f}</option>)}
                        </Select>
                      </div>
                    ))}
                  </div>
                  {mappedPreview.length>0 && (
                    <div className="rounded-xl border border-[#E8E8ED] overflow-hidden">
                      <div className="text-xs font-medium p-2 bg-[#F5F5F7] border-b">Preview (first 3 rows mapped)</div>
                      <div className="overflow-auto max-h-[180px]">
                        <table className="w-full text-xs">
                          <thead className="bg-white sticky top-0"><tr>{Object.keys(mappedPreview[0]||{}).map(k=> <th key={k} className="text-left p-2 border-b font-medium">{k}</th>)}</tr></thead>
                          <tbody>{mappedPreview.slice(0,3).map((r,i)=><tr key={i} className="border-b last:border-0">{Object.values(r).map((v,j)=><td key={j} className="p-2 truncate max-w-[120px]">{v as string}</td>)}</tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Excel Tips — Inventory Only</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="p-3 rounded-xl bg-[#EEF5FF] border border-[#0071E3]/20"><div className="font-medium flex items-center gap-2"><Package size={14} className="text-[#0071E3]"/> Inventory In</div><div className="text-xs text-[#6E6E73]">Excel is always treated as <b>purchase/inventory</b>, never as sale. For sales, use POS or Sale Bill Photo.</div></div>
              <div className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E8E8ED]"><div className="font-medium">Messy allowed</div><div className="text-xs text-[#6E6E73]">Empty rows, merged headers, totals — ignored.</div></div>
              <div className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E8E8ED]"><div className="font-medium">Sale vs Inventory</div><div className="text-xs text-[#6E6E73]">Sale things live in <b>POS</b> (dark header). Inventory things live here (blue header). Visually distinct.</div></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Professional GST + Delivery breakdown — asks before adding to inventory */}
      {billResult && (billResult as any).summary && (
        <Card className="border-[#FF9500]/30 bg-[#FFFBEB]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#9A3412]">
              <span className="w-7 h-7 rounded-full bg-[#FF9500] text-white flex items-center justify-center text-xs">₹</span>
              Professional Bill Summary — GST & Delivery
              <Badge variant="warning">Review before stock</Badge>
            </CardTitle>
            <CardDescription>AI extracted GST and delivery charges. They will be distributed proportionally to landed cost. Confirm before adding — no auto-margin applied.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-white border border-[#E8E8ED]">
                <div className="text-xs text-[#86868B]">Taxable Amount</div>
                <div className="font-semibold">₹{Number((billResult as any).summary?.taxableAmount ?? (billResult as any).total ?? 0).toLocaleString("en-IN")}</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E8E8ED]">
                <div className="text-xs text-[#86868B]">Total GST (CGST+SGST+IGST)</div>
                <div className="font-semibold text-[#DC2626]">₹{Number((billResult as any).summary?.totalGst ?? (billResult as any).summary?.igst ?? 0).toLocaleString("en-IN")}</div>
                <div className="text-[11px] text-[#86868B]">CGST { (billResult as any).summary?.cgst ?? 0} • SGST { (billResult as any).summary?.sgst ?? 0} • IGST { (billResult as any).summary?.igst ?? 0}</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E8E8ED]">
                <div className="text-xs text-[#86868B]">Freight / Delivery</div>
                <div className="font-semibold">₹{Number((billResult as any).summary?.freight ?? (billResult as any).charges?.freight ?? 0).toLocaleString("en-IN")}</div>
                <div className="text-[11px] text-[#86868B]">Transport { (billResult as any).summary?.transport ?? 0} • Delivery { (billResult as any).summary?.deliveryCharges ?? 0}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#1D1D1F] text-white">
                <div className="text-xs text-white/70">Bill Amount (Final)</div>
                <div className="font-semibold">₹{Number((billResult as any).summary?.billAmount ?? (billResult as any).total ?? 0).toLocaleString("en-IN")}</div>
                <div className="text-[11px] text-white/60">PCS: {(billResult as any).summary?.totalPCS ?? reviewItems.length}</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border-2 border-[#FF9500]/30">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={includeCharges} onChange={e=>setIncludeCharges(e.target.checked)} className="mt-1 w-4 h-4 accent-[#FF9500]" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">Include GST + Delivery in landed cost? (Recommended)</div>
                  <div className="text-xs text-[#6E6E73] mt-1">
                    When checked, GST (₹{Number((billResult as any).summary?.totalGst ?? 0).toLocaleString("en-IN")}) + Freight (₹{Number((billResult as any).summary?.freight ?? 0).toLocaleString("en-IN")}) will be distributed proportionally to each item by amount. 
                    Example: {(reviewItems[0] as any)?.name || "Item"} — Raw Rate ₹{(reviewItems[0] as any)?.costPrice ?? 0} → Landed ₹{(reviewItems[0] as any)?.landedCost ?? (reviewItems[0] as any)?.costPrice ?? 0} (+GST+freight share). 
                    Uncheck to add with raw RATE only (you can add charges as separate expense).
                  </div>
                  {(billResult as any).notes && <div className="text-xs text-[#9A3412] mt-2 bg-[#FFFBEB] border border-[#FF9500]/20 p-2 rounded">Note: {(billResult as any).notes}</div>}
                </div>
              </div>
              <div className="mt-3 flex gap-2 items-center">
                <span className="text-xs font-medium">Additional Delivery Charges (if not on bill, e.g., courier):</span>
                <Input placeholder="e.g., 250" type="number" value={deliveryOverride} onChange={e=>setDeliveryOverride(e.target.value)} className="w-[140px] h-8" />
                <span className="text-xs text-[#86868B]">Will be distributed too if you include charges</span>
              </div>
              <div className="text-xs text-[#86868B] mt-2">No auto-margin: Selling price is left empty (0) — you set it manually in Inventory after. Professional prompting ensures no hallucinated margins.</div>
            </div>

            {(billResult as any).items?.[0]?.landedCost && (
              <div className="text-xs p-3 rounded-xl bg-[#F0FDF4] border border-[#C8E6C9]">
                <span className="font-medium text-[#166534]">Landed cost preview:</span> {(reviewItems as any[]).slice(0,3).map((r:any)=> `${r.name}: ₹${r.costPrice} → ₹${r.landedCost} (incl. GST)`).join(" • ")}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review Table - shows bill type badge */}
      {reviewItems.length>0 && (
        <Card className={`${billType==="purchase" ? "border-[#0071E3]/30" : "border-[#FF3B30]/30"}`}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                Review & Edit ({reviewItems.length} items)
                <Badge variant={billType==="purchase" ? "default" : "danger"}>{billType==="purchase" ? "Purchase Bill • Inventory In" : "Sale Record • Separate"}</Badge>
              </CardTitle>
              <CardDescription>{billType==="purchase" ? "Verify → Add to Stock (Purchase). Clearly separate from sales." : "Verify → will be handled as Sale record, not mixed with purchase stock."}</CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              {billType==="purchase" ? (
                <Input placeholder="Supplier Name" value={supplierName} onChange={e=>setSupplierName(e.target.value)} className="w-[180px]" />
              ) : (
                <Input placeholder="Customer Name (for sale)" value={customerName} onChange={e=>setCustomerName(e.target.value)} className="w-[180px]" />
              )}
              <Input placeholder="Bill No (optional)" value={billNo} onChange={e=>setBillNo(e.target.value)} className="w-[160px]" />
              <button onClick={()=>{ if(confirm("Clear this review?")) { setReviewItems([]); setBillResult(null); try{localStorage.removeItem("ingestReviewV2")}catch{} } }} className="text-xs text-[#FF3B30] px-2 py-1 rounded-full hover:bg-[#FFEBEE]">Clear</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-[#E8E8ED] overflow-hidden">
              <div className="overflow-auto max-h-[420px]">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F5F7] sticky top-0 text-xs">
                    <tr>
                      <th className="text-left p-3 font-medium w-10">#</th>
                      <th className="text-left p-3 font-medium">Name *</th>
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-left p-3 font-medium">Qty</th>
                      <th className="text-left p-3 font-medium">Rate (Raw)</th>
                      {includeCharges && (billResult as any)?.items?.[0]?.landedCost && <th className="text-left p-3 font-medium text-[#9A3412]">Landed Cost</th>}
                      <th className="text-left p-3 font-medium">Selling (you set)</th>
                      <th className="text-left p-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reviewItems as Record<string, unknown>[]).map((r, idx)=>(
                      <tr key={idx} className="border-t hover:bg-[#F5F5F7]/50">
                        <td className="p-2 text-xs text-[#86868B]">{idx+1}</td>
                        <td className="p-1"><input value={String(r.name||"")} onChange={e=>{ const v=[...reviewItems]; (v[idx] as Record<string,unknown>).name=e.target.value; setReviewItems([...v])}} className="w-full px-2 py-1.5 rounded-lg border border-[#E8E8ED] text-sm focus:outline-none focus:border-[#0071E3]" placeholder="Item name" /></td>
                        <td className="p-1"><input value={String(r.category||"")} onChange={e=>{ const v=[...reviewItems]; (v[idx] as Record<string,unknown>).category=e.target.value; setReviewItems([...v])}} className="w-full px-2 py-1.5 rounded-lg border border-[#E8E8ED] text-sm placeholder:text-[#B0B0B0]" placeholder="Saree" /></td>
                        <td className="p-1"><input type="number" value={String(r.qty??"")} onChange={e=>{ const v=[...reviewItems]; (v[idx] as Record<string,unknown>).qty=Number(e.target.value); setReviewItems([...v])}} className="w-[60px] px-2 py-1.5 rounded-lg border border-[#E8E8ED] text-sm" /></td>
                        <td className="p-1"><input type="number" value={String(r.costPrice?? (r as any).rate ??"")} onChange={e=>{ const v=[...reviewItems]; (v[idx] as Record<string,unknown>).costPrice=Number(e.target.value); (v[idx] as any).rate=Number(e.target.value); setReviewItems([...v])}} className="w-[80px] px-2 py-1.5 rounded-lg border border-[#E8E8ED] text-sm bg-white" title="Raw RATE from bill" /></td>
                        {includeCharges && (r as any).landedCost && <td className="p-1"><span className="px-2 py-1.5 rounded-lg bg-[#FFFBEB] border border-[#FF9500]/30 text-sm font-medium text-[#9A3412]">₹{(r as any).landedCost}</span><div className="text-[10px] text-[#86868B]">+GST/freight</div></td>}
                        <td className="p-1"><input type="number" placeholder="0 — you set" value={String(r.sellingPrice??"")} onChange={e=>{ const v=[...reviewItems]; (v[idx] as Record<string,unknown>).sellingPrice=Number(e.target.value); setReviewItems([...v])}} className="w-[90px] px-2 py-1.5 rounded-lg border border-[#D2D2D7] text-sm bg-[#F9FAFB] placeholder:text-[#B0B0B0]" /></td>
                        <td className="p-1"><button onClick={()=> setReviewItems(reviewItems.filter((_,i)=>i!==idx))} className="w-7 h-7 rounded-full hover:bg-[#FFEBEE] flex items-center justify-center text-[#FF3B30]"><Trash2 size={14}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <Button variant="secondary" onClick={()=> setReviewItems([...reviewItems, { name:"", category:"Saree", fabric:"", color:"", qty:1, costPrice:0, sellingPrice:0 } as unknown as ParsedBill["items"][number]])}><Plus size={16} className="mr-2"/> Add Row</Button>
              <div className="flex gap-2">
                {billType==="sale" && <Button variant="secondary" onClick={saveAsSale}>Preview as Sale</Button>}
                <Button onClick={saveReview} disabled={saving} className={billType==="purchase" ? "bg-[#0071E3] hover:bg-[#0077ED] px-8" : "bg-[#FF3B30] hover:bg-[#FF453A] px-8"}>
                  {saving ? <><Loader2 size={16} className="mr-2 animate-spin"/> Saving…</> : <><Check size={16} className="mr-2"/> {billType==="purchase" ? `Add ${reviewItems.length} to Stock (Purchase)` : `Handle ${reviewItems.length} Sale Records`}</>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
