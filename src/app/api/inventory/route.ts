import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""
  const category = searchParams.get("category") || ""
  const fabric = searchParams.get("fabric") || ""
  const stockFilter = searchParams.get("stock") || ""
  try {
    const products = await prisma.product.findMany({
      where: {
        AND: [
          q ? { OR: [{ name: { contains: q } }, { category: { contains: q } }, { fabric: { contains: q } }, { color: { contains: q } }, { colors: { contains: q } }] } : {},
          category ? { category } : {},
          fabric ? { fabric } : {},
          stockFilter==="low" ? { stockQty: { lte: 5, gt: 0 } } : (stockFilter==="out" || stockFilter==="sold") ? { stockQty: { lte: 0 } } : stockFilter==="in" ? { stockQty: { gt: 0 } } : {},
        ]
      },
      orderBy: { createdAt: "desc" },
      include: {
        supplier: true,
        saleItems: { select: { qty: true, total: true } }
      }
    })
    return NextResponse.json(products)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const colors = body.colors ? (Array.isArray(body.colors) ? JSON.stringify(body.colors) : body.colors) : body.color ? JSON.stringify([body.color]) : null
    const product = await prisma.product.create({
      data: {
        name: body.name,
        category: body.category,
        subcategory: body.subcategory || null,
        fabric: body.fabric || null,
        color: body.color || (body.colors && body.colors[0]) || null,
        colors: colors,
        pattern: body.pattern || null,
        size: body.size || null,
        hsn: body.hsn || null,
        variants: body.variants ? JSON.stringify(body.variants) : null,
        costPrice: Number(body.costPrice),
        sellingPrice: Number(body.sellingPrice),
        stockQty: Number(body.stockQty) || 0,
        minStock: Number(body.minStock) || 5,
        location: body.location || null,
        sku: body.sku || null,
        supplierId: body.supplierId || null,
        images: body.images ? JSON.stringify(body.images) : null,
      }
    })
    return NextResponse.json(product)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
