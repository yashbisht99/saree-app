# Saree Store OS — V2 Plan (Revised per your feedback)
### Apple-Grade UI + Local Store POS + Smart Ingest (Bill Photo & Any-Format Excel → Structured Inventory)

**Status:** `V2 APPROVED — BUILD STARTING`  
**Date:** 31 Aug 2026  
**Location:** `/Users/yashbisht/saree-app`  
**Change Log vs V1:** Removed Barcode + Product-photo AI autofill. Added Bill Photo AI + Any-Format Excel AI Mapper. UI changed from Boutique Gold/Maroon to Apple Minimal.

---

## 1. You Said

- NO barcode scanning
- NO AI autofill from single product image
- YES: I will upload **bill photos** (supplier bills, handwritten/printed) OR **Excel files in any format/unorganized** — AI should read, understand, map columns, clean data and place it properly into inventory
- UI must be **Apple best possible** — clean, minimal, premium

**Confirmed. This V2 plan reflects exactly that.**

---

## 2. Vision — Revised

> **Unorganized Bill Photo / Any Excel → AI Reads & Normalizes → Preview & Edit → One-Click Add to Stock → Sell via POS → Khata & Profit**

Core insight: Supplier bills and your old Excels are messy. Different column names, merged cells, Hindi/English mix, total rows, handwritten amounts. AI's job is to be your **data entry operator**: read any layout, map to our schema, flag confidence, let you verify.

No online selling. No payment gateway. Manual cash/UPI collection.

---

## 3. Goals / Non-Goals — Revised

**WILL BUILD:**
- Inventory Master (Saree, Suit, Lehenga, Fabric, Blouse, etc. with cost, selling price, stock, supplier, location)
- **Smart Ingest Engine** (Bill Photo → AI Parse + Excel → AI Column Mapper) — the USP
- Apple-like UI Shell (Sidebar, Dashboard, Inventory, Ingest, POS, Customers/Khata, Purchases, Expenses, Reports)
- POS Terminal (search → cart → discount → Cash/UPI/Udhaar → print receipt, auto stock decrement)
- Customer Khata Ledger (udhaar due, payment receive)
- Supplier & Purchase history (bills become purchase records)
- Expenses & Profit/Loss & Low Stock & Dead Stock
- Staff Login (Owner/Staff) + SQLite file DB (offline, backup by copying file)
- Fully working backend (Next.js API + Prisma)

**WILL NOT BUILD:**
- Barcode generation/scanning
- Product photo AI autofill (fabric/color detection)
- Online store, cart, shipping, payment gateway
- Customer-facing website

---

## 4. Tech Stack — V2

| Layer | Choice | Why for V2 |
| :--- | :--- | :--- |
| Framework | Next.js 15 App Router + TypeScript | One codebase, great UI, API routes for AI |
| Styling | Tailwind CSS + shadcn/ui + Framer Motion | Apple glass, blur, rounded-2xl, motion |
| DB | Prisma + SQLite (`prisma/dev.db`) | Local file, no server, offline-first |
| Auth | NextAuth Credentials (owner/staff) | Simple local login |
| Excel Parse | `SheetJS (xlsx)` | Reads .xlsx/.xls/.csv in browser + server |
| Bill OCR+AI | `Tesseract.js` (fallback) + `Google Gemini 1.5 Flash` via `POST /api/ingest/bill` | Gemini Vision extracts line items from photo even if handwritten/printed, any language. Tesseract as fallback offline. |
| Excel AI Mapper | `Gemini 1.5 Flash` via `POST /api/ingest/excel` | Send raw headers + 5 sample rows → LLM returns `{mappedColumns, confidence, unmapped}` |
| Charts | Recharts | Minimal Apple-style charts |
| Images | local `/public/uploads` | Bill photos stored locally |

Gemini is **optional but recommended** for Smart Ingest. Without key, Bill ingestion falls back to Tesseract (limited) and Excel falls back to heuristic header matching (exact name match). With key, it handles *any* format. You can add key later in `.env` as `GEMINI_API_KEY`.

---

## 5. Apple UI — Design System

**Inspiration:** macOS System Settings + Apple Store app + Linear.

**Palette:**
- Background: `#F5F5F7` (Apple gray), Cards: `#FFFFFF`, Sidebar: `rgba(255,255,255,0.8)` with `backdrop-blur-xl` + border `#E8E8ED`
- Text: `#1D1D1F` primary, `#6E6E73` secondary, `#86868B` tertiary
- Accent: `#0071E3` (Apple blue) for primary actions, `#34C759` success, `#FF3B30` low stock
- Radius: `16px` cards, `12px` buttons, `20px` modals
- Shadow: `0 4px 24px rgba(0,0,0,0.06)` subtle

**Typography:** `Inter` (or SF Pro if available), `600` for titles (21px), `400` for body (14px), tabular numbers for money.

**Components:**
- Sidebar: translucent, collapsible, SF Symbols style icons (Lucide), active item = filled blue pill
- Cards: white, rounded-2xl, border, hover lift `y:-2px`, no heavy gradients
- Tables: minimal, zebra none, divider `#F5F5F7`, row hover `#FAFAFC`
- Ingest Dropzone: dashed, large, drag-drop, shows preview spreadsheet
- POS: Split — left product list, right cart (like Apple POS)
- Motion: Framer spring, 200ms, content stagger

**Screens (7):** Dashboard, Inventory, Smart Ingest (Bill+Excel), POS, Customers/Khata, Purchases/Expenses, Reports.

---

## 6. Smart Ingest — Deep Dive (Your USP)

### 6A. Bill Photo → Inventory

**Input:** One or multiple photos of supplier bill (even crumpled, tilted, Hindi).

**Flow:**
1. User: `Inventory → Smart Ingest → Bill Photo` → drag photos or tap Camera (mobile).
2. Frontend compresses (max 2MB) → `POST /api/ingest/bill` (multipart).
3. Backend:
   ```
   if GEMINI_API_KEY present:
     prompt Gemini Vision: "Extract supplier name, bill date, bill no, and line items.
     Each line item: name, category (guess), qty, costPrice, sellingPrice (if present), fabric/color if mentioned.
     Return JSON: {supplier, billNo, date, items:[{name, qty, costPrice, sellingPrice, category, fabric, color}], total, confidence}"
   else:
     Tesseract OCR → regex parse → heuristic
   ```
4. Store raw extraction + save bill images to `/public/uploads/bills/`.
5. Frontend shows **Review Table** (Apple spreadsheet style): editable rows, supplier header, confidence badges (green 90%+, amber 60-90%, red <60%), duplicate detection (same name+price → yellow "Possible duplicate").
6. User edits, deletes bad rows, adds missing items, clicks `Add 12 Products to Stock` → bulk `POST /api/inventory/bulk` → creates Products + Purchase record.

**Edge handling:** Merged total row detected → auto-excluded. Handwritten → Gemini handles; Tesseract will ask to retake. Multi-page bill → upload up to 5 photos merged.

### 6B. Any-Format Excel → Inventory

**Input:** `.xlsx/.xls/.csv` with any columns, any order, any language, empty rows, merged headers.

**Flow:**
1. User: `Smart Ingest → Excel` → drag file.
2. Frontend: Parse via `xlsx` → get `headers[]` + `rows[0..4]` sample + `rowCount`.
3. Send to `POST /api/ingest/excel` with `{headers, sampleRows}`.
4. Backend:
   ```
   prompt Gemini: "Map these messy headers to schema fields:
   schema = [name, category, fabric, color, qty, costPrice, sellingPrice, sku, supplier]
   Headers: [...]
   Sample rows: [...]
   Return: {mappings: {header->field}, unmapped: [], confidence, suggestedCategory}"
   fallback: heuristic lowercase match (e.g., 'rate'->costPrice, 'daam'->costPrice, 'maal'->name)
   ```
5. Frontend shows **Column Mapper**: Left = your Excel headers, Right = dropdown to map to field, confidence chip. Live preview table with mapped data (first 10 rows).
6. User corrects mapping, clicks `Preview 42 Products` → shows same Review Table as bill flow.
7. `Add to Stock` → bulk create.

**Validation:** qty must be int, prices float, name required. Invalid rows highlighted red inline, user can fix or skip.

---

## 7. Architecture — V2

```
[ Bill Photo(s) ] --+
                    +--> [ Next.js App ] --> [ /api/ingest/bill ] --Gemini Vision--> [ normalized items JSON ]
[ Any Excel File ] --+                        [ /api/ingest/excel ] --Gemini Mapper-> [ column mappings ]
                                                    |
                                                    v
                                            [ Review Table (editable) ]
                                                    |
                                            [ POST /api/inventory/bulk ]
                                                    |
[ POS Search ] ---> [ Cart ] ---> [ Sale + SaleItem ] ---> SQLite (Prisma) ---> Dashboard/Charts
                    [ Customer Khata ] <--> LedgerEntry
                    [ Expense / Purchase ]
```

Folder (selected):
```
app/
  (dashboard)/layout.tsx  // Apple sidebar + top bar
  (dashboard)/page.tsx    // Dashboard
  (dashboard)/inventory/page.tsx
  (dashboard)/ingest/page.tsx  // Smart Ingest (Bill+Excel tabs)
  (dashboard)/pos/page.tsx
  (dashboard)/customers/page.tsx
  (dashboard)/reports/page.tsx
  api/ingest/bill/route.ts
  api/ingest/excel/route.ts
  api/inventory/bulk/route.ts
  api/inventory/route.ts
  api/sales/route.ts
components/
  ingest/BillDropzone.tsx, ExcelDropzone.tsx, ReviewTable.tsx, ColumnMapper.tsx
  ui/ (shadcn: button, card, dialog, table, badge, input)
lib/
  gemini.ts  // wrapper, handles missing key gracefully
  excel.ts   // xlsx helpers
prisma/schema.prisma
```

---

## 8. Data Model — V2 (Simplified, no barcode)

```prisma
model Product {
  id           String   @id @default(cuid())
  sku          String?  @unique // optional, auto-gen if missing e.g., SKU-0001
  name         String
  category     String   // Saree, Suit, Lehenga, Fabric, Blouse, Petticoat
  subcategory  String?  // Banarasi, Kanjivaram etc (AI guesses)
  fabric       String?
  color        String?
  pattern      String?
  size         String?  // Free, S/M/L for suits
  costPrice    Float
  sellingPrice Float
  stockQty     Int      @default(0)
  minStock     Int      @default(5)
  location     String?  // Rack-A3
  supplierId   String?
  supplier     Supplier? @relation(fields: [supplierId], references: [id])
  images       String?  // JSON urls (optional)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  saleItems    SaleItem[]
}

model Sale {
  id          String   @id @default(cuid())
  billNo      String   @unique // e.g., INV-20260831-001
  customerId  String?
  customer    Customer? @relation(fields: [customerId], references: [id])
  items       SaleItem[]
  subtotal    Float
  discount    Float    @default(0)
  total       Float
  paymentMode String   // Cash, UPI, Udhaar
  amountPaid  Float
  amountDue   Float    @default(0)
  createdAt   DateTime @default(now())
}

model SaleItem { id String @id @default(cuid()); saleId String; sale Sale @relation(fields: [saleId], references: [id]); productId String; product Product @relation(fields: [productId], references: [id]); qty Int; price Float; total Float }

model Customer {
  id         String   @id @default(cuid())
  name       String
  phone      String?  @unique
  address    String?
  balanceDue Float    @default(0)
  sales      Sale[]
  ledger     LedgerEntry[]
  createdAt  DateTime @default(now())
}

model LedgerEntry { id String @id @default(cuid()); customerId String; customer Customer @relation(fields: [customerId], references: [id]); type String; amount Float; note String?; createdAt DateTime @default(now()) }

model Supplier { id String @id @default(cuid()); name String; phone String?; products Product[]; purchases Purchase[] }

model Purchase { id String @id @default(cuid()); supplierId String?; supplier Supplier? @relation(fields: [supplierId], references: [id]); billNo String?; items Json; totalCost Float; billImages String?; createdAt DateTime @default(now()) }

model Expense { id String @id @default(cuid()); title String; amount Float; category String?; note String?; date DateTime @default(now()) }

model User { id String @id @default(cuid()); name String; username String @unique; password String; role String @default("STAFF") }
```

---

## 9. POS & Other Flows — Unchanged (minus barcode)

- POS: search by name/category (instant filter, no scan), add to cart, adjust price/discount, select payment (Cash/UPI/Udhaar/Partial), generate bill, stock decrement, print.
- Dashboard: Today's sale, profit, low stock, top sellers, khata due, expense, stock value.
- Reports: Daily closing, profit = (sellingPrice - costPrice)*qty, dead stock >60 days, khata aging.

---

## 10. Build Phases — V2

### Phase 1: MVP — Store Can Run (BUILD NOW)
- [ ] Scaffold Next.js 15 + Tailwind + shadcn + Framer + Prisma SQLite
- [ ] Apple UI shell (sidebar, topbar, layout, empty states)
- [ ] All Prisma models + seed 15 demo sarees/suits
- [ ] Inventory: grid/list, search/filter, add/edit/delete, low stock badge
- [ ] Smart Ingest SKELETON: Bill dropzone + Excel dropzone + ColumnMapper UI + ReviewTable (with mock AI, then real Gemini)
- [ ] Backend: /api/ingest/bill, /api/ingest/excel, /api/inventory/bulk
- [ ] POS Terminal (cart, discounts, bill print, stock update)
- [ ] Dashboard + Customers/Khata basic + Expenses

### Phase 2: AI Hardening
- [ ] Gemini Vision prompt tuning for Hindi/English bills
- [ ] Excel heuristic fallback + duplicate detection + validation
- [ ] Purchase history from ingested bills
- [ ] Profit/Loss charts (Apple style)

### Phase 3: Polish
- [ ] PWA installable, offline queue, dark mode, receipt PDF
- [ ] Export Reports to Excel/PDF

---

## 11. What You Get After Phase 1

- Run `npm run dev` → http://localhost:3000 → Apple UI
- Login owner/owner123
- Drag any Excel OR bill photo → see AI-mapped preview → Add to Stock → See inventory update instantly → Sell via POS →Print bill
- SQLite file = your data

---

## 12. Next Step

**Plan V2 is approved per your message. Building Phase 1 now. You will see live progress file-by-file. First: scaffold.**

