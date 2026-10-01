const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Fast Batch Migration to Supabase PostgreSQL ---');
  
  const dumpPath = path.join(__dirname, '../scratch/sqlite_dump.json');
  const data = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

  // 1. Users
  console.log('Inserting Users...');
  const users = data.User.map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    password: u.password,
    role: u.role || 'STAFF',
  }));
  await prisma.user.createMany({ data: users });
  console.log(`Users inserted: ${users.length}`);

  // 2. Suppliers
  console.log('Inserting Suppliers...');
  const suppliers = data.Supplier.map(s => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
  }));
  await prisma.supplier.createMany({ data: suppliers });
  console.log(`Suppliers inserted: ${suppliers.length}`);

  // 3. Customers
  console.log('Inserting Customers...');
  const customers = data.Customer.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    balanceDue: Number(c.balanceDue || 0),
    favoriteColor: c.favoriteColor,
    occasion: c.occasion,
    occasionDate: c.occasionDate ? new Date(c.occasionDate) : null,
    notes: c.notes,
    totalSpent: Number(c.totalSpent || 0),
    lastPurchase: c.lastPurchase ? new Date(c.lastPurchase) : null,
    createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
  }));
  await prisma.customer.createMany({ data: customers });
  console.log(`Customers inserted: ${customers.length}`);

  // 4. Products (in chunks of 100)
  console.log(`Inserting Products (${data.Product.length} total)...`);
  const products = data.Product.map(p => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    subcategory: p.subcategory,
    fabric: p.fabric,
    color: p.color,
    colors: p.colors,
    pattern: p.pattern,
    size: p.size,
    hsn: p.hsn,
    variants: p.variants,
    costPrice: Number(p.costPrice),
    sellingPrice: Number(p.sellingPrice),
    stockQty: Number(p.stockQty),
    minStock: Number(p.minStock ?? 5),
    location: p.location,
    supplierId: p.supplierId,
    images: p.images,
    createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
    updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
  }));
  for (let i = 0; i < products.length; i += 100) {
    const chunk = products.slice(i, i + 100);
    await prisma.product.createMany({ data: chunk });
  }
  console.log(`Products inserted: ${products.length}`);

  // 5. Sales (in chunks of 100)
  console.log(`Inserting Sales (${data.Sale.length} total)...`);
  const sales = data.Sale.map(s => ({
    id: s.id,
    billNo: s.billNo,
    customerId: s.customerId,
    subtotal: Number(s.subtotal),
    discount: Number(s.discount || 0),
    total: Number(s.total),
    paymentMode: s.paymentMode,
    amountPaid: Number(s.amountPaid),
    amountDue: Number(s.amountDue || 0),
    createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
  }));
  for (let i = 0; i < sales.length; i += 100) {
    const chunk = sales.slice(i, i + 100);
    await prisma.sale.createMany({ data: chunk });
  }
  console.log(`Sales inserted: ${sales.length}`);

  // 6. SaleItems (in chunks of 100)
  console.log(`Inserting SaleItems (${data.SaleItem.length} total)...`);
  const saleItems = data.SaleItem.map(si => ({
    id: si.id,
    saleId: si.saleId,
    productId: si.productId,
    qty: Number(si.qty),
    price: Number(si.price),
    total: Number(si.total),
  }));
  for (let i = 0; i < saleItems.length; i += 100) {
    const chunk = saleItems.slice(i, i + 100);
    await prisma.saleItem.createMany({ data: chunk });
  }
  console.log(`SaleItems inserted: ${saleItems.length}`);

  // 7. Purchases
  console.log('Inserting Purchases...');
  const purchases = data.Purchase.map(pur => ({
    id: pur.id,
    supplierId: pur.supplierId,
    billNo: pur.billNo,
    items: pur.items,
    totalCost: Number(pur.totalCost),
    billImages: pur.billImages,
    createdAt: pur.createdAt ? new Date(pur.createdAt) : new Date(),
  }));
  await prisma.purchase.createMany({ data: purchases });
  console.log(`Purchases inserted: ${purchases.length}`);

  // 8. Expenses
  console.log('Inserting Expenses...');
  const expenses = data.Expense.map(exp => ({
    id: exp.id,
    title: exp.title,
    amount: Number(exp.amount),
    category: exp.category,
    note: exp.note,
    date: exp.date ? new Date(exp.date) : new Date(),
  }));
  await prisma.expense.createMany({ data: expenses });
  console.log(`Expenses inserted: ${expenses.length}`);

  console.log('=== MIGRATION COMPLETE! ALL RECORDS SYNCHRONIZED ===');
}

main()
  .catch((err) => {
    console.error('Fast batch migration error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
