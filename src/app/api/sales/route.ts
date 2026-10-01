import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limitParam = searchParams.get("limit")
  const take = limitParam ? parseInt(limitParam) : undefined
  try {
    const sales = await prisma.sale.findMany({ 
      include: { items: { include: { product: true } }, customer: true }, 
      orderBy: { createdAt: "desc" },
      ...(take ? { take } : {})
    })
    return NextResponse.json(sales)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { items, customerId, customerName, customerPhone, discount = 0, paymentMode = "Cash", amountPaid } = body
    if (!items || items.length===0) return NextResponse.json({ error: "No items" }, { status: 400 })

    let resolvedCustomerId = customerId || null
    const { customerAddress } = body as { customerAddress?: string }
    if (!resolvedCustomerId && customerName) {
      // Create/find customer for any payment mode if name provided (for professional bill logging)
      let cust = customerPhone ? await prisma.customer.findUnique({ where: { phone: customerPhone } }) : null
      if (!cust) {
        // Also try by name if phone not found
        cust = await prisma.customer.findFirst({ where: { name: customerName } })
      }
      if (!cust) {
        cust = await prisma.customer.create({ data: { name: customerName, phone: customerPhone || null, address: customerAddress || null } })
      } else if (customerAddress && !cust.address) {
        cust = await prisma.customer.update({ where: { id: cust.id }, data: { address: customerAddress } })
      }
      resolvedCustomerId = cust?.id || null
    }

    const subtotal = items.reduce((a:number, it:{price:number, qty:number})=> a + it.price*it.qty, 0)
    const total = subtotal - Number(discount)
    const paid = amountPaid !== undefined ? Number(amountPaid) : (paymentMode==="Udhaar" ? 0 : total)
    const due = total - paid

    // generate billNo
    const billNo = `INV-${Date.now().toString().slice(-8)}`

    // check stock
    for (const it of items) {
      const p = await prisma.product.findUnique({ where: { id: it.productId } })
      if (!p) return NextResponse.json({ error: `Product not found ${it.productId}` }, { status: 400 })
      if (p.stockQty < it.qty) return NextResponse.json({ error: `Insufficient stock for ${p.name}` }, { status: 400 })
    }

    const sale = await prisma.sale.create({
      data: {
        billNo,
        customerId: resolvedCustomerId,
        subtotal,
        discount: Number(discount),
        total,
        paymentMode,
        amountPaid: paid,
        amountDue: due,
        items: {
          create: items.map((it:{productId:string, qty:number, price:number})=> ({
            productId: it.productId,
            qty: it.qty,
            price: it.price,
            total: it.price*it.qty
          }))
        }
      },
      include: { items: true }
    })

    // decrement stock, update customer stats, and create ledger if udhaar
    for (const it of items) {
      await prisma.product.update({ where: { id: it.productId }, data: { stockQty: { decrement: it.qty } } })
    }
    if (resolvedCustomerId) {
      await prisma.customer.update({ where: { id: resolvedCustomerId }, data: { totalSpent: { increment: total }, lastPurchase: new Date() } })
    }
    if (due > 0 && resolvedCustomerId) {
      await prisma.ledgerEntry.create({ data: { customerId: resolvedCustomerId, type: "DueAdded", amount: due, note: `Bill ${billNo}` } })
      await prisma.customer.update({ where: { id: resolvedCustomerId }, data: { balanceDue: { increment: due } } })
    }

    return NextResponse.json(sale)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
