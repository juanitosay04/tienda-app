import prisma from '../../../lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: { transactions: true },
      orderBy: { name: 'asc' },
    });

    // Calcular saldo de cada cliente
    const withBalance = customers.map(c => {
      const totalFiado = c.transactions.filter(t => t.type === 'FIADO').reduce((s, t) => s + t.amount, 0);
      const totalAbono = c.transactions.filter(t => t.type === 'ABONO').reduce((s, t) => s + t.amount, 0);
      const balance = totalFiado - totalAbono;
      return {
        id: c.id, name: c.name, phone: c.phone, notes: c.notes,
        createdAt: c.createdAt, balance, totalFiado, totalAbono,
        lastTransaction: c.transactions.sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null,
      };
    });

    return Response.json(withBalance);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const customer = await prisma.customer.create({
      data: {
        name: String(body.name).trim(),
        phone: body.phone ? String(body.phone).trim() : null,
        notes: body.notes ? String(body.notes).trim() : null,
      }
    });
    return Response.json(customer);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
