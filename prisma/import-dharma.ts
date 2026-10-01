import { PrismaClient } from "@prisma/client"
import * as XLSX from "xlsx"
import * as fs from "fs"

const prisma = new PrismaClient()
const FILE = "/Users/yashbisht/Documents/DHARMA TEX.xlsx"

function norm(name: string): string {
  return String(name || "").trim().replace(/\s+/g, " ").toUpperCase()
}
function num(v: unknown): number {
  if (v == null || v === "") return 0
  if (typeof v === "number") return v
  const s = String(v).replace(/[,₹]/g, "").trim()
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}
function round2(n: number): number { return Math.round(n * 100) / 100 }

async function main() {
  console.log("Reading", FILE)
  if (!fs.existsSync(FILE)) throw new Error("File not found: " + FILE)
  const wb = XLSX.readFile(FILE)

  console.log("Sheets:", wb.SheetNames)

  // 1. CLEAR FAKE DATA
  console.log("\n--- Clearing fake/demo data ---")
  const before = {
    products: await prisma.product.count(),
    sales: await prisma.sale.count(),
    purchases: await prisma.purchase.count(),
    customers: await prisma.customer.count(),
    expenses: await prisma.expense.count(),
    suppliers: await prisma.supplier.count(),
  }
  console.log("Before:", before)
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.product.deleteMany()
  await prisma.purchase.deleteMany()
  await prisma.ledgerEntry.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.supplier.deleteMany()
  console.log("Cleared all")

  // 2. CREATE SUPPLIERS
  const supplierNames = [
    "AJMERA FASHION LIMITED",
    "DHARMA TEX SURAT",
    "M B CREATION - LEHENGA",
    "RAJBANNI TEXTILE",
    "LALA JI TEX",
    "SUPREME TEX",
  ]
  const supplierMap: Record<string, string> = {}
  for (const name of supplierNames) {
    const s = await prisma.supplier.create({ data: { name } })
    supplierMap[name] = s.id
    console.log(`Supplier: ${name} -> ${s.id}`)
  }

  // 3. PARSE SUPPLIER SHEETS
  type ProdInfo = {
    name: string
    normName: string
    category: string
    fabric: string | null
    size: string | null
    description: string | null
    hsn: string | null
    qty: number
    rate: number
    cost: number
    selling: number
    sku: string | null
    supplier: string
  }
  const productMap = new Map<string, ProdInfo>()

  function addOrUpdate(info: ProdInfo, preferNew: boolean = false) {
    const existing = productMap.get(info.normName)
    if (!existing) {
      productMap.set(info.normName, info)
    } else {
      // Prefer version with selling price, or newer
      if (preferNew) {
        // Keep existing qty? Sum? No, keep max? Actually keep the one with more complete data
        // If new has selling and old doesn't, replace cost/selling but keep qty max
        if (info.selling > 0 && existing.selling === 0) {
          productMap.set(info.normName, { ...info, qty: Math.max(info.qty, existing.qty) })
        }
        // Else keep existing (D-TEX preferred over COPY)
      }
      // Else keep existing
    }
  }

  function parseSheet(sheetName: string, supplierKey: string, categoryDefault: string) {
    const ws = wb.Sheets[sheetName]
    if (!ws) { console.log(`Sheet ${sheetName} not found`); return 0 }
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
    if (rows.length < 3) return 0
    const header = (rows[1] as (string | null)[]).map(h => String(h || "").toLowerCase().trim())
    const idx = (names: string[]) => {
      for (const n of names) {
        const i = header.findIndex(h => h.includes(n))
        if (i >= 0) return i
      }
      return -1
    }
    const iItems = idx(["items"])
    const iQty = idx(["qty"])
    const iRate = idx(["rate"])
    const iAfterGst = idx(["after gst"])
    const iAmount = idx(["amount"]) // Amount column (landed per pc for D-TEX) - careful: also "amount after margin", "final amount"
    // Need exact match for Amount vs Amount after Margin vs Final Amount
    // header exact: find index where header === "amount"
    let iAmountExact = header.findIndex(h => h === "amount")
    if (iAmountExact < 0) iAmountExact = iAmount
    const iTransport = idx(["transport"])
    const iSellingPrice = header.findIndex(h => h === "selling price" || h === "selling amt" || h === "sale price")
    const iSalePrice = header.findIndex(h => h === "sale price")
    const iFinalAmount = header.findIndex(h => h === "final amount")
    const iDiscount = idx(["discount"])
    const iCode = idx(["code"])
    const iSize = idx(["size"])
    const iDesc = idx(["description"])
    const iSeasonDisc = idx(["season disc"])

    let count = 0
    for (let r = 2; r < rows.length; r++) {
      const row = rows[r] as unknown[]
      if (!row) continue
      const rawName = row[iItems] as string | null
      if (!rawName || String(rawName).trim() === "" || String(rawName).toLowerCase().includes("items")) continue
      const name = String(rawName).trim()
      const nname = norm(name)
      if (!nname) continue
      const qty = Math.round(num(row[iQty]))
      const rate = round2(num(row[iRate]))
      const afterGst = round2(num(row[iAfterGst >= 0 ? iAfterGst : -1]))
      const transport = round2(num(row[iTransport >= 0 ? iTransport : -1]))
      let amountExact = iAmountExact >= 0 ? round2(num(row[iAmountExact])) : 0
      // For AJMERA, Amount column is total landed + margin, not per-pc cost. So cost = After gst + Transport
      let cost = 0
      let selling = 0
      if (sheetName === "AJMERA TEX") {
        cost = round2(afterGst + transport)
        // Selling: prefer Sale Price, else Selling Price
        const salePrice = iSalePrice >= 0 ? num(row[iSalePrice]) : 0
        const sellingPrice = iSellingPrice >= 0 ? num(row[iSellingPrice]) : 0
        selling = round2(salePrice || sellingPrice || 0)
      } else {
        // D-TEX etc: Amount is per-pc landed cost (Rate+Gst+Transport)
        cost = round2(amountExact || (rate + transport))
        // Selling: Selling Amt, else Final Amount
        let sellIdx = -1
        // Prefer Selling Amt / Selling Price
        const sellHeaderIdx = header.findIndex(h => h === "selling amt" || h === "selling price")
        if (sellHeaderIdx >= 0 && num(row[sellHeaderIdx]) > 0) {
          selling = round2(num(row[sellHeaderIdx]))
        } else if (iFinalAmount >= 0 && num(row[iFinalAmount]) > 0) {
          selling = round2(num(row[iFinalAmount]))
        } else if (iSalePrice >= 0 && num(row[iSalePrice]) > 0) {
          selling = round2(num(row[iSalePrice]))
        }
        // For suits sheet, Final Amount is selling (e.g., 411.75)
        // For LEHENGE where Selling Amt null, use Final Amount
      }
      const sku = iCode >= 0 && row[iCode] ? String(row[iCode]).trim() : null
      const size = iSize >= 0 && row[iSize] ? String(row[iSize]).trim() : null
      const desc = iDesc >= 0 && row[iDesc] ? String(row[iDesc]).trim() : null

      let category = categoryDefault
      if (desc) {
        const d = desc.toUpperCase()
        if (d.includes("SAREE")) category = "Saree"
        else if (d.includes("BLOUSE")) category = "Blouse"
        else if (d.includes("PETICOAT") || d.includes("PETICOAT")) category = "Petticoat"
        else if (d.includes("LAHENGA") || d.includes("LEHENGA")) category = "Lehenga"
        else if (d.includes("SUIT") || d.includes("KURTI") || d.includes("CTS")) category = "Suit"
      } else {
        // Infer from name
        const un = nname
        if (un.includes("KURTI") || un.startsWith("CTS")) category = "Suit"
        else if (un.includes("ARTICLE")) category = "Lehenga"
        else if (un.includes("PATTI") && sheetName === "AJMERA TEX") category = "Petticoat"
        // else Saree default
      }

      const info: ProdInfo = {
        name, normName: nname, category,
        fabric: null, size: size === "NONE" ? null : size,
        description: desc, hsn: null,
        qty, rate, cost, selling, sku,
        supplier: supplierKey,
      }
      // For D-TEX vs COPY: prefer D-TEX (canonical). COPY sheet is duplicate with discount, skip if exists
      if (sheetName === "COPY OF D-TEX") {
        addOrUpdate(info, false) // only add if not exists
      } else {
        // For other sheets, if duplicate across suppliers (e.g., same name in AJMERA and D-TEX?), keep first, but prefer one with selling
        const ex = productMap.get(nname)
        if (!ex) productMap.set(nname, info)
        else {
          // If existing has no selling but new does, update
          if (ex.selling === 0 && selling > 0) {
            productMap.set(nname, { ...ex, selling, cost: cost || ex.cost, sku: ex.sku || sku })
          }
        }
      }
      count++
    }
    console.log(`${sheetName} (${supplierKey}): ${count} rows parsed, map now ${productMap.size}`)
    return count
  }

  parseSheet("AJMERA TEX", "AJMERA FASHION LIMITED", "Saree")
  parseSheet("D-TEX", "DHARMA TEX SURAT", "Saree")
  parseSheet("COPY OF D-TEX", "DHARMA TEX SURAT", "Saree")
  parseSheet("LEHENGE-M B Creation", "M B CREATION - LEHENGA", "Lehenga")
  parseSheet("RAJBANNI TEX", "RAJBANNI TEXTILE", "Saree")
  parseSheet("LALA JI TEX ", "LALA JI TEX", "Saree")
  parseSheet("suits", "SUPREME TEX", "Suit")

  console.log(`\nTotal unique products from supplier sheets: ${productMap.size}`)

  // 4. PARSE SALE PURCHASE STOCK
  const wsStock = wb.Sheets["SALE PURCHASE"]
  const stockRows: unknown[][] = XLSX.utils.sheet_to_json(wsStock, { header: 1, defval: null })
  // Row 0 title, Row1 groups, Row2 header: Date, Product, Qty, Date, Product, QTY, Sl No, Product, Purchase, Sales, Stock, Remarks, PRICE, TOTAL PRICE
  const stockMap = new Map<string, { stock: number; price: number; purchase: number; sales: number; remarks: string | null; product: string }>()
  for (let r = 3; r < stockRows.length; r++) {
    const row = stockRows[r] as unknown[]
    const prod = row[7] as string | null
    if (!prod || String(prod).trim() === "") continue
    const name = String(prod).trim()
    const nname = norm(name)
    const purchase = Math.round(num(row[8]))
    const sales = Math.round(num(row[9]))
    let stock = Math.round(num(row[10]))
    if (isNaN(stock)) stock = 0
    const price = round2(num(row[12]))
    const remarks = row[11] ? String(row[11]).trim() : null
    stockMap.set(nname, { stock, price, purchase, sales, remarks, product: name })
  }
  console.log(`SALE PURCHASE stock rows: ${stockMap.size}`)

  // 5. PARSE DEAD STOCK (header-aware, handles leading empty col dropped by xlsx)
  const wsDead = wb.Sheets["DEAD STOCK"]
  const deadRows: unknown[][] = XLSX.utils.sheet_to_json(wsDead, { header: 1, defval: null })
  // Find header row containing PRODUCT
  let deadHeaderIdx = deadRows.findIndex(r => Array.isArray(r) && r.some(c => String(c || "").toUpperCase().includes("PRODUCT")))
  if (deadHeaderIdx < 0) deadHeaderIdx = 2
  const deadHeader = (deadRows[deadHeaderIdx] as unknown[]).map(c => String(c || "").toUpperCase().trim())
  const dProd = deadHeader.findIndex(h => h === "PRODUCT")
  const dQty = deadHeader.findIndex(h => h === "QTY")
  const dRate = deadHeader.findIndex(h => h === "RATE")
  console.log(`DEAD STOCK header row ${deadHeaderIdx}:`, deadHeader)
  const deadMap = new Map<string, { qty: number; rate: number; name: string }>()
  for (let r = deadHeaderIdx + 1; r < deadRows.length; r++) {
    const row = deadRows[r] as unknown[]
    if (!row) continue
    const prod = row[dProd] as string | null
    if (!prod || String(prod).trim() === "" || String(prod).toUpperCase().includes("PRODUCT")) continue
    const name = String(prod).trim()
    const nname = norm(name)
    // Skip numeric-only names (these would be mis-parsed QTY)
    if (/^\d+$/.test(name)) {
      console.log(`Skipping numeric dead name "${name}" (likely mis-aligned)`)
      continue
    }
    deadMap.set(nname, { qty: Math.round(num(row[dQty])), rate: round2(num(row[dRate])), name })
  }
  console.log(`DEAD STOCK rows: ${deadMap.size}`)

  // 6. CREATE PRODUCTS (with SKU dedupe)
  let created = 0
  const idByNorm = new Map<string, string>()
  const usedSkus = new Set<string>()
  // First, from supplier map
  for (const [nname, info] of productMap) {
    const stockInfo = stockMap.get(nname)
    let stockQty = info.qty
    let selling = info.selling
    let cost = info.cost
    let location: string | null = null
    if (stockInfo) {
      // Use SALE PURCHASE Stock as current stock (can be negative -> set 0 but keep remark)
      stockQty = stockInfo.stock < 0 ? 0 : stockInfo.stock
      if (stockInfo.price > 0) {
        // PRICE is current selling price, prefer it if supplier selling is 0 or very different?
        // Use PRICE as selling if supplier selling is 0, else keep supplier selling? Actually PRICE is likely latest.
        // Let's use PRICE as selling (since it's stock summary price)
        selling = stockInfo.price
      }
      if (stockInfo.remarks === "Dead Stock") location = "Dead Stock"
      else if (stockInfo.remarks) location = null // "Please Update Stock" ignore
    }
    // Dead stock override
    if (deadMap.has(nname)) {
      location = "Dead Stock"
      // Ensure stock at least dead qty if stock is 0?
      const dead = deadMap.get(nname)!
      if (stockQty === 0 && dead.qty > 0) stockQty = dead.qty
      if (cost === 0 && dead.rate > 0) cost = dead.rate
      if (selling === 0 && dead.rate > 0) selling = dead.rate
    }
    // If selling still 0, set selling = cost (profit 0, user sets later) - no auto-margin
    if (selling === 0 && cost > 0) selling = cost
    if (cost === 0 && selling > 0) cost = selling // fallback to avoid 0 cost profit inflation? Better set cost=selling

    const supplierId = supplierMap[info.supplier] || null
    // SKU dedupe: if sku already used, set null
    let skuToUse: string | null = info.sku
    if (skuToUse && usedSkus.has(skuToUse)) skuToUse = null
    try {
      const p = await prisma.product.create({
        data: {
          name: info.name,
          category: info.category,
          subcategory: null,
          fabric: null,
          color: null,
          colors: null,
          pattern: null,
          size: info.size,
          hsn: null,
          costPrice: cost,
          sellingPrice: selling,
          stockQty,
          minStock: 5,
          location,
          supplierId,
          sku: skuToUse,
        }
      })
      if (skuToUse) usedSkus.add(skuToUse)
      idByNorm.set(nname, p.id)
      created++
    } catch (e) {
      // Retry with sku null (unique violation)
      try {
        const p = await prisma.product.create({
          data: {
            name: info.name,
            category: info.category,
            size: info.size,
            costPrice: cost,
            sellingPrice: selling,
            stockQty,
            minStock: 5,
            location,
            supplierId,
            sku: null,
          }
        })
        idByNorm.set(nname, p.id)
        created++
      } catch (e2) {
        console.log(`Failed product ${info.name}: ${String(e2).slice(0,200)}`)
      }
    }
  }
  console.log(`Created ${created} products from supplier sheets`)

  // Then, products only in SALE PURCHASE but not in supplier sheets
  let createdExtra = 0
  for (const [nname, s] of stockMap) {
    if (idByNorm.has(nname)) continue
    // Check dead?
    const isDead = deadMap.has(nname) || s.remarks === "Dead Stock"
    const price = s.price || 0
    const stockQty = s.stock < 0 ? 0 : s.stock
    try {
      const p = await prisma.product.create({
        data: {
          name: s.product,
          category: "Saree",
          costPrice: price, // cost=selling to avoid inflated profit, user can correct
          sellingPrice: price,
          stockQty,
          minStock: 5,
          location: isDead ? "Dead Stock" : null,
          supplierId: supplierMap["DHARMA TEX SURAT"],
        }
      })
      idByNorm.set(nname, p.id)
      createdExtra++
    } catch (e) {
      console.log(`Failed extra ${s.product}: ${String(e).slice(0,200)}`)
    }
  }
  console.log(`Created ${createdExtra} extra products from SALE PURCHASE only`)

  // Then, DEAD STOCK products not yet created (use original casing)
  let createdDead = 0
  for (const [nname, dead] of deadMap) {
    if (idByNorm.has(nname)) continue
    try {
      const p = await prisma.product.create({
        data: {
          name: (dead as { name: string }).name || nname,
          category: "Saree",
          costPrice: dead.rate,
          sellingPrice: dead.rate,
          stockQty: dead.qty,
          minStock: 5,
          location: "Dead Stock",
          supplierId: supplierMap["DHARMA TEX SURAT"],
        }
      })
      idByNorm.set(nname, p.id)
      createdDead++
    } catch (e) {
      console.log(`Failed dead ${nname}: ${String(e).slice(0,200)}`)
    }
  }
  console.log(`Created ${createdDead} dead-only products`)

  const totalProducts = await prisma.product.count()
  console.log(`Total products in DB: ${totalProducts}`)

  // 7. CREATE PURCHASES (one per supplier)
  for (const [supName, supId] of Object.entries(supplierMap)) {
    // Count products for this supplier
    const prods = await prisma.product.findMany({ where: { supplierId: supId } })
    if (prods.length === 0) continue
    const totalCost = prods.reduce((a, p) => a + p.costPrice * p.stockQty, 0)
    await prisma.purchase.create({
      data: {
        supplierId: supId,
        billNo: `DHARMA-IMPORT-${supName.slice(0,3)}`,
        items: JSON.stringify(prods.slice(0,50).map(p => ({ name: p.name, qty: p.stockQty, costPrice: p.costPrice }))),
        totalCost: round2(totalCost),
      }
    })
    console.log(`Purchase for ${supName}: ${prods.length} items, cost ${totalCost}`)
  }

  // 8. CREATE EXPENSES from Sheet1
  const wsExp = wb.Sheets["Sheet1"]
  const expRows: unknown[][] = XLSX.utils.sheet_to_json(wsExp, { header: 1, defval: null })
  let expCount = 0
  for (let r = 2; r < expRows.length; r++) {
    const row = expRows[r] as unknown[]
    const item = row[0] as string | null
    const total = num(row[3])
    if (!item || String(item).trim() === "" || total <= 0) continue
    await prisma.expense.create({
      data: { title: String(item).trim(), amount: round2(total), category: "Setup", note: `Qty ${row[1] || ""} x ${row[2] || ""} from DHARMA file Sheet1` }
    })
    expCount++
    console.log(`Expense: ${item} = ${total}`)
  }
  console.log(`Created ${expCount} expenses`)

  // 9. IMPORT DAILY SHEET SALES (header-aware, handles leading empty col)
  const wsDaily = wb.Sheets["Daily Sheet"]
  const dailyRows: unknown[][] = XLSX.utils.sheet_to_json(wsDaily, { header: 1, defval: null })
  // Find header row with Product + Price
  let dailyHeaderIdx = dailyRows.findIndex(r => Array.isArray(r) && r.some(c => String(c || "").toUpperCase() === "PRODUCT") && r.some(c => String(c || "").toUpperCase() === "PRICE"))
  if (dailyHeaderIdx < 0) dailyHeaderIdx = 1
  const dailyHeader = (dailyRows[dailyHeaderIdx] as unknown[]).map(c => String(c || "").toUpperCase().trim())
  console.log(`Daily Sheet header row ${dailyHeaderIdx}:`, dailyHeader)
  // Left sales set is first occurrence of DATE/PRODUCT/QTY/PRICE
  const dyDate = dailyHeader.indexOf("DATE")
  const dyProd = dailyHeader.indexOf("PRODUCT")
  const dyQty = dailyHeader.indexOf("QTY")
  const dyPrice = dailyHeader.indexOf("PRICE")
  let salesCreated = 0
  let salesSkipped = 0
  let billCounter = 0
  for (let r = dailyHeaderIdx + 1; r < dailyRows.length; r++) {
    const row = dailyRows[r] as unknown[]
    if (!row) { salesSkipped++; continue }
    const dateVal = (dyDate >= 0 ? row[dyDate] : null) as Date | string | number | null
    const prodName = (dyProd >= 0 ? row[dyProd] : null) as string | null
    const qty = Math.round(num(dyQty >= 0 ? row[dyQty] : null))
    const price = round2(num(dyPrice >= 0 ? row[dyPrice] : null))
    if (!prodName || String(prodName).trim() === "" || qty <= 0 || price <= 0) { salesSkipped++; continue }
    const name = String(prodName).trim()
    const nname = norm(name)
    let productId = idByNorm.get(nname)
    if (!productId) {
      // Create missing product (sold but not in stock sheets)
      try {
        const p = await prisma.product.create({
          data: { name, category: "Saree", costPrice: price, sellingPrice: price, stockQty: 0, minStock: 5, supplierId: supplierMap["DHARMA TEX SURAT"] }
        })
        productId = p.id
        idByNorm.set(nname, productId)
      } catch {
        salesSkipped++; continue
      }
    }
    let date = new Date()
    if (dateVal instanceof Date) date = dateVal
    else if (typeof dateVal === "string" && dateVal) { const d = new Date(dateVal); if (!isNaN(d.getTime())) date = d }
    // Handle Excel serial date? xlsx with defval may give number? sheet_to_json with header:1 gives raw? Dates are Date objects (we saw datetime). Good.
    // Also handle number serial
    if (typeof dateVal === "number") {
      // Excel serial to JS date
      const excelEpoch = new Date(1899, 11, 30)
      date = new Date(excelEpoch.getTime() + dateVal * 86400000)
    }
    const total = round2(qty * price)
    billCounter++
    const billNo = `DHARMA-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}-${String(billCounter).padStart(4,"0")}`
    try {
      await prisma.sale.create({
        data: {
          billNo,
          subtotal: total,
          discount: 0,
          total,
          paymentMode: "Cash",
          amountPaid: total,
          amountDue: 0,
          createdAt: date,
          items: { create: [{ productId, qty, price, total }] }
        }
      })
      salesCreated++
      // Update customer stats? No customer for historical (walk-in), skip
    } catch (e) {
      // Duplicate billNo? Increment and retry? Just skip
      salesSkipped++
    }
    if (salesCreated % 100 === 0) console.log(`Sales... ${salesCreated}`)
  }
  console.log(`Sales imported: ${salesCreated}, skipped: ${salesSkipped}`)

  const final = {
    products: await prisma.product.count(),
    sales: await prisma.sale.count(),
    purchases: await prisma.purchase.count(),
    expenses: await prisma.expense.count(),
    suppliers: await prisma.supplier.count(),
  }
  console.log("\nFinal:", final)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
