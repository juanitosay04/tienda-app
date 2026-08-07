import prisma from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

// GET: obtener transacciones de fiados / abonos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // "FIADO" | "ABONO" | null
    const where = type ? { type } : {};

    const txs = await prisma.fiadoTransaction.findMany({
      where,
      include: { customer: true },
      orderBy: { date: 'desc' }
    });

    return Response.json(txs);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// POST: registrar un fiado (manual o con productos) o un abono
export async function POST(request) {
  try {
    const body = await request.json();
    const { customerId, type, amount, description, items, paymentMethod } = body;

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
        return Response.json({ error: `El abono ($${Number(amount).toLocaleString('es-CO')}) no puede ser mayor que la deuda actual ($${balance.toLocaleString('es-CO')}).` }, { status: 400 });
      }
    }

    // Crear la transacción de fiado
    const tx = await prisma.fiadoTransaction.create({
      data: {
        customerId: Number(customerId),
        type,
        paymentMethod: type === 'ABONO' ? (paymentMethod || 'EFECTIVO') : null,
        amount: Number(amount),
        description: description ? String(description).trim() : null,
      },
      include: { customer: true }
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
