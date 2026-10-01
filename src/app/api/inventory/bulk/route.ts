import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { items, supplierName, billNo, billImages } = body
    if (!Array.isArray(items) || items.length===0) return NextResponse.json({ error: "No items" }, { status: 400 })

    let supplierId: string | null = null
    if (supplierName) {
      const existing = await prisma.supplier.findFirst({ where: { name: supplierName } })
      if (existing) supplierId = existing.id
      else {
        const created = await prisma.supplier.create({ data: { name: supplierName } })
        supplierId = created.id
      }
    }

    const created: string[] = []
    const updated: string[] = []
    const failed: unknown[] = []
    for (const it of items) {
      const name = String(it.name || "").trim()
      if (!name) { failed.push({ item: it, error: "Missing name" }); continue }
      try {
        // Check if product with same name already exists — upsert stock instead of duplicate (fixes "vanished, no inventory" confusion)
        const existing = await prisma.product.findFirst({ where: { name } })
        const qty = Number(it.qty ?? it.stockQty) || 0
        const cost = Number(it.costPrice ?? it.rate ?? 0) || 0
        // No auto-margin: if sellingPrice not provided, leave as 0/null and let user set manually (fixes "not put margins on its own")
        const sellingRaw = it.sellingPrice
        const selling = sellingRaw == null || sellingRaw === "" ? 0 : Number(sellingRaw) || 0
        // If landedCost provided (GST+freight distributed), use it as effective cost
        const effectiveCost = Number(it.landedCost ?? cost) || cost
        if (existing) {
          const upd = await prisma.product.update({
            where: { id: existing.id },
            data: {
              stockQty: { increment: qty },
              // Use landed cost (with GST+freight) if provided, else raw cost
              ...(effectiveCost ? { costPrice: effectiveCost } : {}),
              ...(selling ? { sellingPrice: selling } : {}),
              ...(supplierId ? { supplierId } : {}),
            }
          })
          updated.push(upd.id)
        } else {
          const p = await prisma.product.create({
            data: {
              name,
              category: it.category || "Other",
              subcategory: it.subcategory || null,
              fabric: it.fabric || null,
              color: it.color || null,
              pattern: it.pattern || null,
              size: it.size || null,
              costPrice: effectiveCost,
              sellingPrice: selling,
              stockQty: qty,
              minStock: 5,
              supplierId,
              sku: it.sku || null,
            }
          })
          created.push(p.id)
        }
      } catch (err) { failed.push({ item: it, error: String(err).slice(0,300) }) }
    }

    // create purchase record
    const totalCost = items.reduce((a:number, it:Record<string,unknown>)=> a + (Number(it.costPrice)||0)*(Number(it.qty)||0), 0)
    await prisma.purchase.create({
      data: {
        supplierId,
        billNo: billNo || null,
        items: JSON.stringify(items),
        totalCost,
        billImages: billImages ? JSON.stringify(billImages) : null,
      }
    })

    return NextResponse.json({ created: created.length, updated: updated.length, failed, ids: [...created, ...updated] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
