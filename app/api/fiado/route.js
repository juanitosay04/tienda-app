import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// POST: registrar un fiado (manual o con productos) o un abono
export async function POST(request) {
  try {
    const body = await request.json();
    const { customerId, type, amount, description, items } = body;

    if (!customerId || !type || !amount) {
      return Response.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }
    if (!['FIADO', 'ABONO'].includes(type)) {
      return Response.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    if (type === 'ABONO') {
      const txs = await prisma.fiadoTransaction.findMany({ where: { customerId: Number(customerId) } });
      const totalFiado = txs.filter(t => t.type === 'FIADO').reduce((s, t) => s + t.amount, 0);
      const totalAbono = txs.filter(t => t.type === 'ABONO').reduce((s, t) => s + t.amount, 0);
      const balance = totalFiado - totalAbono;
      if (Number(amount) > balance) {
        return Response.json({ error: `El abono ($${Number(amount)}) no puede ser mayor que la deuda actual ($${balance}).` }, { status: 400 });
      }
    }

    // Crear la transacción de fiado
    const tx = await prisma.fiadoTransaction.create({
      data: {
        customerId: Number(customerId),
        type,
        amount: Number(amount),
        description: description ? String(description).trim() : null,
      }
    });

    // Si viene con productos → descontar stock del inventario
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await prisma.product.update({
          where: { id: Number(item.productId) },
          data: { stock: { decrement: Number(item.quantity) } }
        });
      }
    }

    return Response.json(tx);
  } catch (e) {
    console.error('Error en fiado POST:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
