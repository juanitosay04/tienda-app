import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const configs = [
    { key: 'caja_base',       value: '70000',  label: 'Saldo Base de Caja (arranque diario)' },
    { key: 'capital_inicial', value: '391000', label: 'Capital Total de la Tienda' },
  ];

  for (const c of configs) {
    const result = await prisma.storeConfig.upsert({
      where: { key: c.key },
      update: { value: c.value, label: c.label },
      create: c,
    });
    console.log(`✅ ${result.label}: $${Number(result.value).toLocaleString('es-CO')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
