import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const amount = Number(body.amount)
  if (!amount || amount <=0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  await prisma.ledgerEntry.create({ data: { customerId: id, type: "PaymentReceived", amount, note: body.note || null } })
  const updated = await prisma.customer.update({ where: { id }, data: { balanceDue: { decrement: amount } } })
  return NextResponse.json(updated)
}
