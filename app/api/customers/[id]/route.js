import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
      include: {
        transactions: { orderBy: { date: 'desc' } }
      }
    });
    if (!customer) return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const totalFiado = customer.transactions.filter(t => t.type === 'FIADO').reduce((s, t) => s + t.amount, 0);
    const totalAbono = customer.transactions.filter(t => t.type === 'ABONO').reduce((s, t) => s + t.amount, 0);
    const balance = totalFiado - totalAbono;

    return Response.json({ ...customer, balance, totalFiado, totalAbono });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const updated = await prisma.customer.update({
      where: { id: Number(id) },
      data: {
        name: String(body.name).trim(),
        phone: body.phone ? String(body.phone).trim() : null,
        notes: body.notes ? String(body.notes).trim() : null,
      }
    });
    return Response.json(updated);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    await prisma.fiadoTransaction.deleteMany({ where: { customerId: Number(id) } });
    await prisma.customer.delete({ where: { id: Number(id) } });
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
