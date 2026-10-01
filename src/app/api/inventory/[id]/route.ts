import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
    const colors = body.colors ? (Array.isArray(body.colors) ? JSON.stringify(body.colors) : body.colors) : body.color ? JSON.stringify([body.color]) : undefined
    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        category: body.category,
        fabric: body.fabric,
        color: body.color,
        colors: colors,
        pattern: body.pattern,
        size: body.size,
        hsn: body.hsn,
        variants: body.variants ? JSON.stringify(body.variants) : undefined,
        costPrice: body.costPrice ? Number(body.costPrice) : undefined,
        sellingPrice: body.sellingPrice ? Number(body.sellingPrice) : undefined,
        stockQty: body.stockQty !== undefined ? Number(body.stockQty) : undefined,
        minStock: body.minStock ? Number(body.minStock) : undefined,
        location: body.location,
      }
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
