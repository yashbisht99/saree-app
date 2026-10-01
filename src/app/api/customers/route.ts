import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const customers = await prisma.customer.findMany({ include: { ledger: true, sales: true }, orderBy: { createdAt: "desc" } })
  return NextResponse.json(customers)
}

export async function POST(req: Request) {
  const body = await req.json()
  try {
    const c = await prisma.customer.create({ data: { name: body.name, phone: body.phone || null, address: body.address || null, favoriteColor: body.favoriteColor || null, occasion: body.occasion || null, occasionDate: body.occasionDate ? new Date(body.occasionDate) : null, notes: body.notes || null } })
    return NextResponse.json(c)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
