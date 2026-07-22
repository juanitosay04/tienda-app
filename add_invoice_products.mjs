import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.product.findMany({ select: { name: true, category: true } });
  const names = existing.map(p => p.name.toLowerCase());
  console.log('=== PRODUCTOS ACTUALES EN DB ===');
  existing.forEach(p => console.log(`[${p.category}] ${p.name}`));
  console.log(`\nTotal: ${existing.length} productos`);
  
  // Todos los productos de la factura con cálculo de precio
  // Fórmula: precio_venta = costo_unitario * 1.20 (redondeado a centena)
  const r = (n) => Math.round(n / 100) * 100;

  const invoiceProducts = [
    // ─── Aseo Personal ───
    { name: 'Elite Max Doble Hoja (Rollo)',      category: 'Aseo Personal',  price: r(27914.28 / 30 * 1.2), stock: 60,  minStock: 10, key: 'elite max' },
    { name: 'Colgate Crema Dental 22ml',         category: 'Aseo Personal',  price: r(22625.21 / 12 * 1.2), stock: 12,  minStock: 3,  key: 'colgate' },
    { name: 'Winny Sec Pañal (Unidad)',           category: 'Aseo Personal',  price: r(33613.44 / 30 * 1.2), stock: 30,  minStock: 5,  key: 'winny' },

    // ─── Aseo Hogar ───
    { name: 'Brillo Chino (Unidad)',             category: 'Aseo Hogar',     price: r(6302.52 / 12 * 1.2),  stock: 12,  minStock: 3,  key: 'brillo chino' },
    { name: 'Trifogon Multiusos (Unidad)',        category: 'Aseo Hogar',     price: r(8403.36 / 12 * 1.2),  stock: 12,  minStock: 3,  key: 'trifogon multiu' },
    { name: 'Trifogon 24x60cm',                  category: 'Aseo Hogar',     price: r(2226.89 * 1.2),        stock: 2,   minStock: 1,  key: 'trifogon 24' },
    { name: 'Fumix Insecticida (Unidad)',         category: 'Aseo Hogar',     price: r(10084.03 / 36 * 1.2), stock: 36,  minStock: 6,  key: 'fumix' },

    // ─── Bebidas ───
    { name: 'Electrolit Coco 624ml',             category: 'Bebidas',        price: r(7084 / 12 * 1.2),     stock: 12,  minStock: 3,  key: 'electrolit coco' },
    { name: 'Electrolit Fresa 624ml',            category: 'Bebidas',        price: r(7084 / 12 * 1.2),     stock: 12,  minStock: 3,  key: 'electrolit fresa' },
    { name: 'Electrolit Kiwi 624ml',             category: 'Bebidas',        price: r(7084 / 12 * 1.2),     stock: 12,  minStock: 3,  key: 'electrolit kiwi' },
    { name: 'Electrolit Maracuyá 625ml',         category: 'Bebidas',        price: r(7084 / 12 * 1.2),     stock: 12,  minStock: 3,  key: 'electrolit maracuy' },
    { name: 'Electrolit Mora 625ml',             category: 'Bebidas',        price: r(7084 / 12 * 1.2),     stock: 12,  minStock: 3,  key: 'electrolit mora' },
    { name: 'Electrolit Uva 624ml',              category: 'Bebidas',        price: r(7084 / 12 * 1.2),     stock: 12,  minStock: 3,  key: 'electrolit uva' },
    { name: 'Néctar California Manzana 300ml',   category: 'Bebidas',        price: r(2100.84 * 1.2),        stock: 24,  minStock: 6,  key: 'nectar california manzana' },
    { name: 'Néctar California Pera 300ml',      category: 'Bebidas',        price: r(2100.84 * 1.2),        stock: 24,  minStock: 6,  key: 'nectar california pera' },

    // ─── Medicamentos ───
    { name: 'Noraver Gripa Cápsulas x8',         category: 'Medicamentos',   price: r(12000 * 1.2),          stock: 5,   minStock: 2,  key: 'noraver' },
    { name: 'Sal de Frutas Ua Plus (Sobre)',      category: 'Medicamentos',   price: r(63825 / 22 * 1.2),    stock: 22,  minStock: 5,  key: 'sal de frutas' },
    { name: 'Alka-Seltzer (Tableta)',             category: 'Medicamentos',   price: r(25000 / 30 * 1.2),    stock: 30,  minStock: 5,  key: 'alka' },

    // ─── Alimentos ───
    { name: 'Arroz Casanarex 450gr',             category: 'Alimentos',      price: r(45500 / 6 * 1.2),     stock: 6,   minStock: 2,  key: 'arroz casanarex' },
    { name: 'Milo Sachet 20gr',                  category: 'Alimentos',      price: r(12384.03 / 18 * 1.2), stock: 18,  minStock: 5,  key: 'milo' },
    { name: 'O-Ida Cat 500gr',                   category: 'Alimentos',      price: r(2857.14 * 1.2),        stock: 3,   minStock: 1,  key: 'o-ida cat' },
    { name: 'O-Ida Can Cachoeiro 500gr',          category: 'Alimentos',      price: r(4365.71 * 1.2),        stock: 1,   minStock: 1,  key: 'o-ida can' },
    { name: 'Vodora Clásica 4 Tubos 12gr',       category: 'Alimentos',      price: r(11176.47 * 1.2),       stock: 1,   minStock: 1,  key: 'vodora' },

    // ─── Varios ───
    { name: 'Encendedor El Sol (Unidad)',         category: 'Varios',         price: r(8403.36 / 40 * 1.2),  stock: 40,  minStock: 10, key: 'encendedor el sol' },
  ];

  console.log('\n=== PROCESANDO PRODUCTOS DE LA FACTURA ===');
  let added = 0;
  let skipped = 0;

  for (const p of invoiceProducts) {
    const alreadyExists = names.some(n => n.includes(p.key.toLowerCase()));
    if (alreadyExists) {
      console.log(`⏭  OMITIDO (ya existe): ${p.name}`);
      skipped++;
      continue;
    }

    await prisma.product.create({
      data: { name: p.name, category: p.category, price: p.price, stock: p.stock, minStock: p.minStock }
    });
    console.log(`✅ AGREGADO: ${p.name} → Precio venta: $${p.price.toLocaleString('es-CO')}`);
    added++;
  }

  console.log(`\n✔  Resumen: ${added} agregados, ${skipped} ya existían.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
