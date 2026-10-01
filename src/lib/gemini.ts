import { GoogleGenAI } from "@google/genai"

export function getGemini() {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  return new GoogleGenAI({ apiKey: key })
}

export async function analyzeBillImages(base64Images: { mimeType: string; data: string }[], billType: string = "purchase") {
  const ai = getGemini()
  if (!ai) throw new Error("GEMINI_API_KEY not set")

  const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash"
  const isSale = billType === "sale"

  const prompt = isSale
    ? `
You are a professional Indian retail sale bill parser (20+ years experience) for a saree/clothing store. You handle GST, discounts, and final sale amounts with precision.

BILL TYPE: SALE (stock OUT to customer) — Extract customer details, focus on sellingPrice. DO NOT invent costPrice.

EXTRACTION RULES:
- Customer: name, phone, address, GSTIN if any, billNo, date (YYYY-MM-DD)
- Line items: For each row, extract name, description, HSN, qty (PCS), RATE (selling rate), AMOUNT (qty*rate), category guess, fabric/color guess, qty int, sellingPrice = RATE, costPrice null, confidence 0-1
- Summary: taxableAmount, cgst, sgst, igst, totalGst, freight/delivery, discount, billAmount, totalPCS
- DO NOT estimate costPrice. Return null if not on bill. Never auto-apply margin.
- Handle Hindi/English, handwritten, merged cells, skewed photos.
- Ignore remark unless it corrects qty.

OUTPUT ONLY JSON, no markdown:
{
  "supplier": {"name": string, "phone": string|null, "gstin": string|null},
  "billNo": string|null,
  "date": string|null,
  "items": [{"name":string,"description":string|null,"hsn":string|null,"category":string,"fabric":string|null,"color":string|null,"qty":number,"rate":number,"costPrice":number|null,"sellingPrice":number,"amount":number,"confidence":number}],
  "summary": {"taxableAmount":number|null,"cgst":number|null,"sgst":number|null,"igst":number|null,"totalGst":number|null,"freight":number|null,"discount":number|null,"billAmount":number|null,"totalPCS":number|null},
  "charges": {"freight":number|null,"deliveryCharges":number|null,"otherCharges":number|null,"totalCharges":number|null},
  "total": number|null,
  "currency": "INR"
}
`.trim()
    : `
You are a professional Indian wholesale textile bill parser (20+ years experience) specializing in saree/suit/lehenga accounting, GST (CGST/SGST/IGST), and landed cost. You handle skewed photos, handwritten notes, Hindi/English mix.

BILL TYPE: PURCHASE (stock IN from supplier) — Extract supplier details, focus on cost (RATE). DO NOT invent sellingPrice. Never auto-apply margin.

TASK: Extract with HIGH accuracy from bill image(s):

1. SUPPLIER: name (e.g., "AJMERA FASHION LIMITED"), phone, GSTIN, address, billNo (e.g., "23356"), date (YYYY-MM-DD, e.g., "2025-10-06" from 06/10/2025), GSTIN of receiver if visible

2. LINE ITEMS: For each table row (SK 1..N), extract:
   - name: ITEM NAME exactly as on bill (e.g., "ALL-BHAGALPURI-2711", "MAA-RASHI PATTI", "BRT-J SONAPADI", "ALL-HOLLAND SILK-01")
   - description: DESCRIPTION OF GOODS (e.g., "SAREE", "PETICOAT", "LAHENGA")
   - hsn: HSN CODE (e.g., "540754", "626010")
   - qty: PCS as integer (e.g., 36, 4, 8)
   - rate: RATE per piece as number (e.g., 84.00, 427.00)
   - costPrice: same as rate (do NOT add GST yet)
   - amount: AMOUNT as number (qty*rate, e.g., 1708.00)
   - category: Guess from description/name (Saree/Petticoat/Lehenga/Suit/Fabric)
   - fabric/color: Guess if visible in name (e.g., "HOLLAND SILK" -> fabric Silk, no color)
   - sellingPrice: MUST be null (not on purchase bill) — DO NOT estimate.
   - confidence: 0-1 (0.95 if clearly printed, lower if blurry/handwritten)

3. SUMMARY: Extract all totals from bill footer/side tables:
   - taxableAmount: sum of TAXABLE AMOUNT column (e.g., 46950.00)
   - cgst, sgst, igst: from HSN-wise CGST/SGST/IGST columns and also "ADD: CGST/SGST/IGST" side (e.g., IGST 2808.48)
   - totalGst: sum of gst (e.g., 2808.48)
   - gstPercent: GST % if visible (e.g., 5.00 for saree HSN 540754)
   - freight: "PAID FREIGHT" / "FREIGHT" / "TRANSPORT" / "COURIER" / "DELIVERY CHARGES" (e.g., 0.00)
   - transport, deliveryCharges, otherCharges: capture separately if present
   - discount, roundOff, tcs if any
   - totalAmount: "Total" amount before GST (e.g., 46950.00)
   - billAmount: Final "BILL AMOUNT" / "ADD: IGST" total (e.g., 49758.00)
   - totalPCS: Total PCS from footer (e.g., 79)
   - total: same as billAmount for compatibility

4. CHARGES: Breakout of all extra charges:
   - freight, transport, deliveryCharges, otherCharges, totalCharges (sum)

CRITICAL RULES:
- DO NOT estimate sellingPrice. Return null. User will set selling price manually after seeing landed cost.
- DO NOT add GST to costPrice in extraction. Return raw rate. System will distribute GST + freight proportionally and ask user before adding.
- DO NOT invent data. If field not visible, return null.
- For GST: Look for HSN-wise table with TAXABLE, CGST%, SGST%, IGST% columns, and also side summary with "TAXABLE AMOUNT 46950.00 | IGST 2808.48 | BILL AMOUNT 49758.00". Sum correctly.
- For freight: Look for "PAID FREIGHT 0.00", "FREIGHT", "TRANSPORT", "DELIVERY" — often 0.00 but capture.
- Handle "Total: 79 | 46,950.00" footer — this is totalPCS and totalAmount.
- Handle handwritten "Holland Silk short 4" — this is a remark about shortage, not a line item. Do NOT create item from it, but add to notes.
- Handle Hindi/English mix, merged cells, skewed/tilted photos.

OUTPUT: Return ONLY valid JSON, no markdown, no explanation, with shape:
{
  "supplier": {"name": string, "phone": string|null, "gstin": string|null},
  "billNo": string|null,
  "date": string|null,
  "items": [{"name":string,"description":string|null,"hsn":string|null,"category":string,"fabric":string|null,"color":string|null,"qty":number,"rate":number,"costPrice":number,"amount":number,"sellingPrice":null,"confidence":number}],
  "summary": {"taxableAmount":number|null,"cgst":number|null,"sgst":number|null,"igst":number|null,"totalGst":number|null,"gstPercent":number|null,"freight":number|null,"transport":number|null,"deliveryCharges":number|null,"discount":number|null,"roundOff":number|null,"totalAmount":number|null,"billAmount":number|null,"totalPCS":number|null},
  "charges": {"freight":number|null,"transport":number|null,"deliveryCharges":number|null,"otherCharges":number|null,"totalCharges":number|null},
  "total": number|null,
  "currency": "INR",
  "notes": string|null
}
- notes: Any remark like "Holland Silk short 4" or shortage.

EXAMPLE for Ajmera row 3: "3 | ALL-BHAGALPURI-2711 | SAREE | 540754 | 4 | 427.00 | 1708.00" → {"name":"ALL-BHAGALPURI-2711","description":"SAREE","hsn":"540754","qty":4,"rate":427,"costPrice":427,"amount":1708,"sellingPrice":null,"confidence":0.95}
`.trim()

  const parts: unknown[] = [{ text: prompt }]
  for (const img of base64Images) {
    parts.push({
      inlineData: { mimeType: img.mimeType, data: img.data },
      mediaResolution: { level: "MEDIA_RESOLUTION_HIGH" },
    })
  }

  const config = {
    thinkingConfig: { thinkingLevel: "HIGH" as const, includeThoughts: false },
    mediaResolution: "MEDIA_RESOLUTION_HIGH" as const,
    temperature: 0.1,
    responseMimeType: "application/json",
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: parts as never }],
      config: config as never,
    })
    const text = response.text || ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON in Gemini response: " + text.slice(0, 600))
    const parsed = JSON.parse(jsonMatch[0])

    // Post-process: Ensure costPrice is rate, sellingPrice is null (no auto-margin), and distribute GST/freight if present
    // Calculate total amount from items for proportional distribution
    const items = parsed.items || []
    const totalAmount = items.reduce((s: number, it: { amount?: number; qty?: number; rate?: number; costPrice?: number }) => s + (Number(it.amount) || Number(it.qty) * Number(it.rate || it.costPrice) || 0), 0)
    const totalGst = Number(parsed.summary?.totalGst ?? parsed.summary?.igst ?? 0) || 0
    const freight = Number(parsed.summary?.freight ?? parsed.charges?.freight ?? parsed.charges?.totalCharges ?? 0) || 0
    const totalCharges = totalGst + freight

    // If there are charges, calculate landed cost per item proportionally but keep raw costPrice, add landedCost field for UI
    if (totalCharges > 0 && totalAmount > 0) {
      for (const it of items) {
        const amount = Number(it.amount) || Number(it.qty) * Number(it.rate || it.costPrice) || 0
        const share = amount / totalAmount
        const gstShare = totalGst * share
        const freightShare = freight * share
        const landedPerPiece = Number(it.costPrice || it.rate || 0) + (gstShare + freightShare) / Math.max(1, Number(it.qty) || 1)
        it.landedCost = Math.round(landedPerPiece * 100) / 100
        it.gstShare = Math.round((gstShare / Math.max(1, Number(it.qty) || 1)) * 100) / 100
        it.freightShare = Math.round((freightShare / Math.max(1, Number(it.qty) || 1)) * 100) / 100
      }
      parsed.summary = { ...parsed.summary, totalCharges, gstPerPieceDistributed: true }
    }

    // Ensure sellingPrice is null (no auto-margin)
    for (const it of items) {
      if (it.sellingPrice !== null && it.sellingPrice !== undefined) {
        // If AI hallucinated sellingPrice, null it out as per rule
        const rawRate = Number(it.rate ?? it.costPrice ?? 0)
        if (Math.abs(Number(it.sellingPrice) - rawRate * 1.5) < 1) {
          it.sellingPrice = null
        }
      }
      // Ensure costPrice is rate
      if (it.costPrice == null && it.rate != null) it.costPrice = Number(it.rate)
    }

    return parsed
  } catch (e: unknown) {
    const msg = String(e)
    if (msg.includes("404") || msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("not supported")) {
      throw e
    }
    throw e
  }
}

export async function mapExcelColumns(headers: string[], sampleRows: Record<string, string>[]) {
  const ai = getGemini()
  if (!ai) return null

  const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash"

  const prompt = `
You are a professional data mapper for a saree store Excel import (20+ years experience). You handle messy Indian wholesale Excels with GST, freight, and varied column names.

Schema fields to map to: ["name","category","subcategory","fabric","color","pattern","size","qty","costPrice","sellingPrice","sku","supplier","location","minStock"]

Given headers: ${JSON.stringify(headers)}
Sample rows (first 3): ${JSON.stringify(sampleRows.slice(0, 3))}

Task:
- Map each header to best schema field or null if no match. Be precise: "Rate" in purchase context is costPrice, "MRP" is sellingPrice, "Qty"/"PCS" is qty, "Amount" is amount (ignore, derived).
- For Hindi/misspelled/varied names like "Rate","Daam","Kharid","MRP","Price","Qty","Quantity","Maal","Item","Saree Name","HSN","PCS","Delivery","Freight","GST" handle intelligently.
- Special: If headers contain "GST", "CGST", "SGST", "IGST", "Freight", "Transport", "Delivery Charges" — map those to null (they are charges, not item fields) but note in notes that they should be distributed.
- Return ONLY JSON:
{
  "mappings": {"<header>": "<field>"|null},
  "confidence": number,
  "unmapped": [headers not mapped],
  "notes": string
}
Notes should mention if GST/freight columns detected and that they will be distributed.

No markdown.
`.trim()

  const config = {
    thinkingConfig: { thinkingLevel: "HIGH" as const },
    temperature: 0.1,
    responseMimeType: "application/json",
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: config as never,
    })
    const text = response.text || ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

export function heuristicMap(headers: string[]) {
  const map: Record<string, string | null> = {}
  const lower = headers.map((h) => h.toLowerCase().trim())
  const fieldKeywords: Record<string, string[]> = {
    name: ["name", "item", "product", "maal", "saree", "suit", "description", "particulars", "article", "design"],
    category: ["category", "type", "cat", "kind"],
    fabric: ["fabric", "material", "kapda", "cloth"],
    color: ["color", "colour", "rang"],
    qty: ["qty", "quantity", "pcs", "pieces", "stock", "qnty", "nos"],
    costPrice: ["cost", "kharid", "purchase", "rate", "cp", "buy", "wholesale", "price", "daam"],
    sellingPrice: ["selling", "sale", "sp", "mrp", "retail", "bechne"],
    sku: ["sku", "code", "item code", "barcode"],
    supplier: ["supplier", "vendor", "party", "supplier name"],
    location: ["location", "rack", "shelf", "almirah"],
    size: ["size"],
  }
  headers.forEach((h, i) => {
    const lh = lower[i]
    let found: string | null = null
    for (const [field, keywords] of Object.entries(fieldKeywords)) {
      if (keywords.some((k) => lh.includes(k))) {
        found = field
        break
      }
    }
    // Don't map GST/freight to item fields
    if (["gst", "cgst", "sgst", "igst", "freight", "transport", "delivery"].some((k) => lh.includes(k))) {
      found = null
    }
    map[h] = found
  })
  return {
    mappings: map,
    confidence: 0.6,
    unmapped: Object.entries(map)
      .filter(([, v]) => !v)
      .map(([k]) => k),
    notes: "Heuristic fallback (no Gemini key). GST/freight columns ignored for item mapping.",
  }
}
