"use client"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import { Wallet, Plus } from "lucide-react"

type Expense = { id: string; title: string; amount: number; category: string | null; note: string | null; date: string }

export default function ExpensesPage() {
  const [list, setList] = useState<Expense[]>([])
  const [form, setForm] = useState({ title:"", amount:"", category:"General", note:"" })
  const load = async ()=>{ const r=await fetch("/api/expenses"); const d=await r.json(); if(Array.isArray(d)) setList(d) }
  useEffect(()=>{ load() }, [])
  const add = async (e: React.FormEvent)=>{ e.preventDefault(); await fetch("/api/expenses", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ ...form, amount: Number(form.amount) })}); setForm({ title:"", amount:"", category:"General", note:"" }); load() }
  const total = list.reduce((a,b)=>a+b.amount,0)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-semibold flex items-center gap-2"><Wallet size={20}/> Expenses</h1>
        <span className="text-sm font-medium">{formatCurrency(total)} total</span>
      </div>
      <Card className="p-6">
        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <Input placeholder="Title *" required value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
          <Input placeholder="Amount *" required type="number" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} />
          <Select value={form.category} onChange={e=>setForm({...form, category:e.target.value})}>
            <option>General</option><option>Rent</option><option>Electricity</option><option>Transport</option><option>Staff</option><option>Other</option>
          </Select>
          <Input placeholder="Note" value={form.note} onChange={e=>setForm({...form, note:e.target.value})} />
          <Button type="submit"><Plus size={16} className="mr-2"/> Add</Button>
        </form>
      </Card>
      <div className="space-y-2">
        {list.map(e=>(
          <Card key={e.id} className="p-4 flex justify-between items-center">
            <div><div className="font-medium text-sm">{e.title}</div><div className="text-xs text-[#86868B]">{e.category} • {new Date(e.date).toLocaleDateString("en-IN")} {e.note?`• ${e.note}`:""}</div></div>
            <span className="font-semibold">{formatCurrency(e.amount)}</span>
          </Card>
        ))}
        {list.length===0 && <Card className="p-12 text-center text-sm text-[#86868B]">No expenses yet</Card>}
      </div>
    </div>
  )
}
