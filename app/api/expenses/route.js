import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const today = new Date(new Date().setHours(0,0,0,0));
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: today } },
      orderBy: { date: 'desc' }
    });
    return Response.json(expenses);
  } catch (error) {
    return Response.json({ error: 'Error fetching expenses' }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  const { description, amount, paymentMethod } = body;
  
  try {
    const record = await prisma.expense.create({
      data: {
        description,
        amount: Number(amount),
        paymentMethod: paymentMethod || 'EFECTIVO'
      }
    });

    // Si se pagó con capital de la empresa, descontarlo del capital inicial
    if (paymentMethod === 'CAPITAL') {
      const capitalConfig = await prisma.storeConfig.findUnique({ where: { key: 'capital_inicial' } });
      if (capitalConfig) {
        await prisma.storeConfig.update({
          where: { key: 'capital_inicial' },
          data: { value: String(Number(capitalConfig.value) - Number(amount)) }
        });
      }
    }

    return Response.json({ success: true, record });
  } catch (error) {
    console.error('Error creating expense:', error);
    return Response.json({ error: 'Error creating expense' }, { status: 500 });
  }
}
