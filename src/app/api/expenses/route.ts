import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const data = await prisma.expense.findMany({ orderBy: { date: "desc" } })
  return NextResponse.json(data)
}
export async function POST(req: Request) {
  const body = await req.json()
  const e = await prisma.expense.create({ data: { title: body.title, amount: Number(body.amount), category: body.category || null, note: body.note || null, date: body.date ? new Date(body.date) : new Date() } })
  return NextResponse.json(e)
}
