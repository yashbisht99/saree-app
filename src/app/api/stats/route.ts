import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const [products, sales, customers, expenses] = await Promise.all([
      prisma.product.findMany(),
      prisma.sale.findMany({ include: { items: true } }),
      prisma.customer.findMany(),
      prisma.expense.findMany(),
    ])
    const totalStockValue = products.reduce((a,p)=> a + p.stockQty * p.costPrice, 0)
    const totalRevenue = sales.reduce((a,s)=> a+s.total,0)
    const totalDue = customers.reduce((a,c)=> a+c.balanceDue,0)
    const lowStock = products.filter(p=> p.stockQty <= p.minStock).length
    return NextResponse.json({ totalProducts: products.length, totalRevenue, totalStockValue, totalDue, lowStock, salesCount: sales.length })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
