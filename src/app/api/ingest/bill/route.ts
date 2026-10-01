import { NextResponse } from "next/server"
import { analyzeBillImages } from "@/lib/gemini"

export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]
    if (!files || files.length===0) return NextResponse.json({ error: "No files uploaded" }, { status: 400 })

    const images: { mimeType: string; data: string }[] = []
    for (const f of files) {
      const buf = Buffer.from(await f.arrayBuffer())
      images.push({ mimeType: f.type || "image/jpeg", data: buf.toString("base64") })
    }

    const billType = (formData.get("billType") as string) || "purchase"

    // Try Gemini if key exists, else fallback mock parsing
    if (!process.env.GEMINI_API_KEY) {
      // Mock response — distinct per bill type so user sees separation
      const isSale = billType === "sale"
      return NextResponse.json({
        supplier: { name: isSale ? "Demo Customer Sale (Add GEMINI_API_KEY for real)" : "Demo Supplier (Add GEMINI_API_KEY for real parse)", phone: null },
        billNo: null,
        date: new Date().toISOString().slice(0,10),
        items: isSale ? [
          { name: "Banarasi Silk Saree - Red (Sale)", category: "Saree", fabric: "Silk", color: "Red", qty: 1, costPrice: 1850, sellingPrice: 2999, confidence: 0.55 },
          { name: "Cotton Suit - Blue (Sale)", category: "Suit", fabric: "Cotton", color: "Blue", qty: 1, costPrice: 650, sellingPrice: 999, confidence: 0.55 },
        ] : [
          { name: "Banarasi Silk Saree - Red", category: "Saree", fabric: "Silk", color: "Red", qty: 2, costPrice: 1850, sellingPrice: 2999, confidence: 0.55 },
          { name: "Cotton Printed Suit - Blue", category: "Suit", fabric: "Cotton", color: "Blue", qty: 3, costPrice: 650, sellingPrice: 999, confidence: 0.55 },
          { name: "Georgette Lehenga - Pink", category: "Lehenga", fabric: "Georgette", color: "Pink", qty: 1, costPrice: 2200, sellingPrice: 3500, confidence: 0.55 },
        ],
        total: isSale ? 3998 : 7500,
        currency: "INR",
        _note: `GEMINI_API_KEY not set — showing demo ${isSale ? "SALE" : "PURCHASE"} data (separate). Add key to .env for real ${billType} bill parsing. System knows bill type: ${billType}.`,
        _billType: billType,
        confidence: 0.55
      })
    }

    const parsed = await analyzeBillImages(images, billType)
    return NextResponse.json({ ...parsed, _billType: billType })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
