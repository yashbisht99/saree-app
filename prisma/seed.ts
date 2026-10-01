import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  console.log("Seeding...")
  const supplier = await prisma.supplier.upsert({
    where: { id: "seed-supplier-1" },
    update: {},
    create: { id: "seed-supplier-1", name: "Shree Textiles Surat", phone: "9876543210" }
  })
  await prisma.supplier.upsert({
    where: { id: "seed-supplier-2" },
    update: {},
    create: { id: "seed-supplier-2", name: "Kalaniketan Varanasi", phone: "9123456789" }
  })

  const products = [
    { name: "Banarasi Silk Saree - Royal Red Zari", category: "Saree", subcategory: "Banarasi", fabric: "Silk", color: "Red", pattern: "Zari", costPrice: 1850, sellingPrice: 2999, stockQty: 8, location: "Rack A1", supplierId: supplier.id },
    { name: "Kanjivaram Silk Saree - Peacock Blue", category: "Saree", subcategory: "Kanjivaram", fabric: "Silk", color: "Blue", pattern: "Zari", costPrice: 2400, sellingPrice: 3899, stockQty: 3, location: "Rack A1", supplierId: supplier.id },
    { name: "Georgette Printed Saree - Floral Pink", category: "Saree", subcategory: "Georgette", fabric: "Georgette", color: "Pink", pattern: "Printed", costPrice: 650, sellingPrice: 1199, stockQty: 15, location: "Rack B2", supplierId: supplier.id },
    { name: "Cotton Chikankari Suit - White", category: "Suit", subcategory: "Chikankari", fabric: "Cotton", color: "White", pattern: "Embroidery", costPrice: 750, sellingPrice: 1399, stockQty: 12, location: "Shelf S1", supplierId: supplier.id },
    { name: "Chanderi Silk Suit - Mint Green", category: "Suit", fabric: "Silk", color: "Green", pattern: "Zari", costPrice: 1100, sellingPrice: 1899, stockQty: 6, location: "Shelf S1", supplierId: supplier.id },
    { name: "Net Embroidered Lehenga - Wine", category: "Lehenga", fabric: "Net", color: "Wine", pattern: "Embroidery", costPrice: 3200, sellingPrice: 5499, stockQty: 2, location: "Rack L1", supplierId: supplier.id },
    { name: "Cotton Daily Wear Saree - Yellow", category: "Saree", fabric: "Cotton", color: "Yellow", pattern: "Printed", costPrice: 420, sellingPrice: 799, stockQty: 20, location: "Rack B3", supplierId: supplier.id },
    { name: "Art Silk Party Saree - Black Sequins", category: "Saree", fabric: "Art Silk", color: "Black", pattern: "Sequins", costPrice: 950, sellingPrice: 1699, stockQty: 4, location: "Rack A2", supplierId: supplier.id },
    { name: "Linen Kurta Fabric - Beige", category: "Fabric", fabric: "Linen", color: "Beige", costPrice: 300, sellingPrice: 550, stockQty: 30, location: "Fabric Shelf", supplierId: supplier.id },
    { name: "Blouse Petticoat Set - Red", category: "Blouse", fabric: "Cotton", color: "Red", costPrice: 180, sellingPrice: 350, stockQty: 25, location: "Counter", supplierId: supplier.id },
    { name: "Bandhani Saree - Orange Green", category: "Saree", subcategory: "Bandhani", fabric: "Cotton", color: "Orange", pattern: "Bandhani", costPrice: 580, sellingPrice: 999, stockQty: 9, location: "Rack B1", supplierId: supplier.id },
    { name: "Paithani Silk Saree - Purple Gold", category: "Saree", subcategory: "Paithani", fabric: "Silk", color: "Purple", pattern: "Zari", costPrice: 2800, sellingPrice: 4499, stockQty: 1, location: "Rack A1", supplierId: supplier.id },
  ]

  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { name: p.name } })
    if (!exists) {
      await prisma.product.create({ data: p })
      console.log("Created", p.name)
    }
  }

  // seed customer
  await prisma.customer.upsert({
    where: { phone: "9988776655" },
    update: {},
    create: { name: "Priya Sharma", phone: "9988776655", address: "Main Bazaar", balanceDue: 1200 }
  })

  // seed expense
  const expExists = await prisma.expense.findFirst({ where: { title: "Shop Rent - August" } })
  if (!expExists) await prisma.expense.create({ data: { title: "Shop Rent - August", amount: 15000, category: "Rent" } })

  console.log("Seed done")
}

main().catch(e=>{ console.error(e); process.exit(1) }).finally(()=> prisma.$disconnect())
