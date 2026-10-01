# Saree Store OS — Apple Grade Local Store Manager

Complete offline-first store OS for **local saree/clothing shop**. No online selling, no payment gateway — manual Cash/UPI/Udhaar collection.

**UI: Apple minimal** — white, #F5F5F7, SF Pro/Inter, blurred glass, rounded-2xl.

---

## Quick Start

```bash
# 1. Install deps (already done)
npm install

# 2. Setup DB (SQLite file at prisma/dev.db)
npx prisma db push
npx tsx prisma/seed.ts   # 12 demo sarees/suits + supplier + customer

# 3. Run
npm run dev
# open http://localhost:3000
```

**DB file:** `prisma/dev.db` — backup by copying this file.

---

## Features Built (V2 Plan)

| Module | Route | What it does |
| :--- | :--- | :--- |
| **Dashboard** | `/` | Today's sale, stock value, khata due, expenses, low stock, quick actions |
| **Inventory** | `/inventory` | Grid/list, search, filter by category, add/edit/delete, stock badges, margin % |
| **Smart Ingest** | `/ingest` | **USP**: Bill Photo + Any-Format Excel → AI maps & normalizes → review table → Add to Stock |
| **POS Billing** | `/pos` | Search products → cart → discount → Cash/UPI/Udhaar/Card → Generate Bill → stock decrements → print |
| **Customers/Khata** | `/customers` | List, Due badge, Ledger timeline, Receive Payment |
| **Purchases** | `/purchases` | Auto-created on bulk ingest, shows supplier + bill |
| **Expenses** | `/expenses` | Add/list expenses by category |
| **Reports** | `/reports` | Revenue, stock value, khata due, profit est, recent bills |

---

## Smart Ingest — How AI Works

### Bill Photo (`/api/ingest/bill`)
1. Drag 1-5 bill photos (supplier wholesale bill, printed/handwritten, Hindi/English)
2. If `GEMINI_API_KEY` set in `.env` → Gemini 1.5 Flash Vision parses → JSON `{supplier, billNo, items[]}`
3. If no key → demo parsed data shown (so you can test flow offline)
4. Review table: edit inline, delete rows, set supplier/billNo → **Add to Stock** → `POST /api/inventory/bulk` creates Products + Purchase record

### Excel Any Format (`/api/ingest/excel`)
1. Drop `.xlsx/.xls/.csv` with **any columns** in any order/language
2. Frontend parses with `xlsx` → extracts headers + sample rows → sends to `/api/ingest/excel`
3. If Gemini key → LLM maps headers to schema `[name, category, fabric, color, qty, costPrice, sellingPrice, sku, supplier, location]`
4. If no key → heuristic `heuristicMap()` maps `Rate/Daam/Price → costPrice`, `Qty/Pcs → qty`, etc.
5. Mapper UI: dropdown per header to correct mapping, live preview → Review table → Add to Stock

**To enable real AI:**
```bash
# get key at https://aistudio.google.com/app/apikey
echo 'GEMINI_API_KEY="your_key"' >> .env
# restart npm run dev
```

Without key, everything still works in **offline heuristic mode**.

---

## Data Model (Prisma + SQLite)

- **Product** — name, category, subcategory, fabric, color, pattern, size, costPrice, sellingPrice, stockQty, minStock, location, supplier
- **Sale + SaleItem** — billNo, items, subtotal, discount, total, paymentMode, amountPaid/amountDue
- **Customer + LedgerEntry** — Khata, balanceDue, ledger (DueAdded/PaymentReceived)
- **Supplier + Purchase** — supplier bills
- **Expense, User**

See `prisma/schema.prisma:1`.

---

## API Routes

- `GET/POST /api/inventory` — list/search, create
- `PUT/DELETE /api/inventory/[id]` — update/delete
- `POST /api/inventory/bulk` — bulk create from ingest + create Purchase
- `POST /api/ingest/bill` — multipart bill images → AI parse
- `POST /api/ingest/excel` — JSON headers/sampleRows → AI column map
- `GET/POST /api/sales` — list, create sale (decrements stock, creates ledger if Udhaar)
- `GET/POST /api/customers` — list/create
- `POST /api/customers/[id]/pay` — receive payment, update balanceDue
- `GET /api/stats` — dashboard aggregates
- `GET/POST /api/expenses`, `GET /api/purchases`

---

## Apple UI Details

- **Sidebar** `src/components/layout/Sidebar.tsx:1` — translucent, blurred, pill active state (#1D1D1F)
- **TopBar** `src/components/layout/TopBar.tsx:1` — search, date
- **Global** `src/app/globals.css:1` — Apple palette, card shadows, rounded-2xl
- **shadcn primitives** `src/components/ui/*` — Button (rounded-full), Card (apple-card), Badge, Input

---

## Verify

```bash
npm run build   # ✓ 7 workers, 19 routes
curl http://localhost:3000/api/inventory | jq length  # 12
curl http://localhost:3000/api/stats | jq
```

---

## Next Steps (Phase 2/3 if you want)

- Gemini prompt tuning for your specific bill formats
- Barcode if you later want it
- Thermal receipt 80mm print layout tuning
- PWA installable, Electron wrapper for .exe
- Dark mode, daily closing PDF export

---

**Location:** `/Users/yashbisht/saree-app`
**Plan:** see `PLAN.md:1`
