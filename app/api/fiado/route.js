import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// POST: registrar un fiado o un abono
export async function POST(request) {
  try {
    const body = await request.json();
    const { customerId, type, amount, description } = body;

    if (!customerId || !type || !amount) {
      return Response.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }
    if (!['FIADO', 'ABONO'].includes(type)) {
      return Response.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const tx = await prisma.fiadoTransaction.create({
      data: {
        customerId: Number(customerId),
        type,
        amount: Number(amount),
        description: description ? String(description).trim() : null,
      }
    });
    return Response.json(tx);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
