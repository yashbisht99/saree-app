"use client"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Receipt, Package } from "lucide-react"

type Purchase = { id: string; billNo: string | null; totalCost: number; items: string; billImages: string | null; createdAt: string; supplier: { name: string } | null }

export default function PurchasesPage() {
  const [data, setData] = useState<Purchase[]>([])
  useEffect(()=>{ fetch("/api/purchases").then(r=>r.json()).then(d=> setData(Array.isArray(d)?d:[])) }, [])
  return (
    <div className="space-y-6">
      <h1 className="text-[24px] font-semibold flex items-center gap-2"><Receipt size={20}/> Purchases</h1>
      <p className="text-sm text-[#6E6E73]">Every Smart Ingest bulk add creates a purchase record. Includes supplier bills.</p>
      {data.length===0 ? (
        <Card className="p-12 text-center"><Package size={24} className="mx-auto text-[#86868B]"/><p className="text-sm text-[#6E6E73] mt-2">No purchases yet</p><p className="text-xs text-[#86868B]">Use Smart Ingest to add stock — purchases auto-log.</p></Card>
      ) : (
        <div className="space-y-3">
          {data.map(p=> {
            const items = (()=>{ try{ return JSON.parse(p.items)} catch{return []}})() as unknown[]
            return (
              <Card key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{p.supplier?.name || "Unknown Supplier"} • {p.billNo || "No Bill No"}</div>
                  <div className="text-xs text-[#86868B]">{new Date(p.createdAt).toLocaleString("en-IN")} • {items.length} items</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{items.length} items</Badge>
                  <span className="font-semibold">{formatCurrency(p.totalCost)}</span>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
