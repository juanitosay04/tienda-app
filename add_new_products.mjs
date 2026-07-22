import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const panaderia = [
    { name: 'Tostados (Unidad)', category: 'Panadería', price: 300, stock: 50, minStock: 10 },
    { name: 'Pan de 500', category: 'Panadería', price: 500, stock: 30, minStock: 10 },
    { name: 'Pan de 1000', category: 'Panadería', price: 1000, stock: 20, minStock: 5 },
    { name: 'Pan de 2000', category: 'Panadería', price: 2000, stock: 15, minStock: 5 },
    { name: 'Mogollas', category: 'Panadería', price: 1000, stock: 20, minStock: 5 },
    { name: 'Paquete Tostados', category: 'Panadería', price: 3000, stock: 10, minStock: 3 },
  ];

  const verduras = [
    { name: 'Papa (Kilo)', category: 'Fruver', price: 3100, stock: 20, minStock: 5 },
    { name: 'Cebolla Cabezona (Kilo)', category: 'Fruver', price: 4300, stock: 10, minStock: 2 },
    { name: 'Papa Amarilla (Kilo)', category: 'Fruver', price: 6000, stock: 10, minStock: 2 },
    { name: 'Cebolla Larga (Kilo)', category: 'Fruver', price: 7200, stock: 5, minStock: 1 },
    { name: 'Plátano (Kilo)', category: 'Fruver', price: 2900, stock: 15, minStock: 3 },
    { name: 'Pimentón (Kilo)', category: 'Fruver', price: 7200, stock: 5, minStock: 1 },
    { name: 'Pepino (Kilo)', category: 'Fruver', price: 3600, stock: 5, minStock: 1 },
    { name: 'Cilantro (Atado)', category: 'Fruver', price: 6000, stock: 5, minStock: 1 },
    { name: 'Banano (Kilo)', category: 'Fruver', price: 3600, stock: 10, minStock: 2 },
    { name: 'Tomate (Kilo)', category: 'Fruver', price: 6000, stock: 10, minStock: 2 },
    { name: 'Zanahoria (Kilo)', category: 'Fruver', price: 3000, stock: 10, minStock: 2 },
    { name: 'Habichuela (Kilo)', category: 'Fruver', price: 7200, stock: 5, minStock: 1 },
    { name: 'Arveja (Kilo)', category: 'Fruver', price: 7200, stock: 5, minStock: 1 },
    { name: 'Apio (Rama)', category: 'Fruver', price: 2400, stock: 5, minStock: 1 },
    { name: 'Melón (Kilo)', category: 'Fruver', price: 3600, stock: 5, minStock: 1 },
    { name: 'Mandarina (Kilo)', category: 'Fruver', price: 2400, stock: 10, minStock: 2 },
  ];

  for (const item of [...panaderia, ...verduras]) {
    await prisma.product.create({ data: item });
    console.log('Creado:', item.name);
  }
}
main().catch(console.error);
