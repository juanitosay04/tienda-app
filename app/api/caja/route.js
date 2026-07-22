import { PrismaClient } from '@prisma/client'
import { sendTelegramMessage } from '../../../lib/telegram'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const lastClose = await prisma.cashRegisterClose.findFirst({
      orderBy: { date: 'desc' }
    });
    
    // Si no hay cierre previo, tomar desde hoy a las 00:00
    const startDate = lastClose ? lastClose.date : new Date(new Date().setHours(0,0,0,0));
    
    const transactions = await prisma.transaction.findMany({
      where: { date: { gt: startDate }, type: 'VENTA' }
    });

    const expenses = await prisma.expense.findMany({
      where: { date: { gt: startDate } }
    });
    
    const salesEfectivo = transactions.filter(t => t.paymentMethod === 'EFECTIVO').reduce((sum, t) => sum + t.total, 0);
    const salesTransfer = transactions.filter(t => t.paymentMethod === 'TRANSFERENCIA').reduce((sum, t) => sum + t.total, 0);
    
    const expensesEfectivo = expenses.filter(e => e.paymentMethod === 'EFECTIVO').reduce((sum, e) => sum + e.amount, 0);
    const expensesTransfer = expenses.filter(e => e.paymentMethod === 'TRANSFERENCIA').reduce((sum, e) => sum + e.amount, 0);
    
    return Response.json({
      expectedCash: salesEfectivo - expensesEfectivo,
      totalTransfers: salesTransfer,
      salesCount: transactions.length,
      totalExpensesEfectivo: expensesEfectivo,
      totalExpensesTransfer: expensesTransfer,
      since: startDate
    });
  } catch (error) {
    return Response.json({ error: 'Error fetching stats' }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  const { expectedCash, actualCash, totalTransfers, salesCount } = body;
  
  try {
    const record = await prisma.cashRegisterClose.create({
      data: {
        expectedCash: Number(expectedCash),
        actualCash: Number(actualCash),
        difference: Number(actualCash) - Number(expectedCash),
        totalTransfers: Number(totalTransfers),
        salesCount: Number(salesCount)
      }
    });
    
    // Enviar alerta a Telegram
    const mensaje = `📦 <b>Cierre de Caja Registrado</b>\n\n` +
      `Ventas en el turno: ${salesCount}\n` +
      `Ingresos Efectivo: $${(Number(expectedCash) + (body.totalExpensesEfectivo||0)).toLocaleString('es-CO')}\n` +
      `Salidas/Gastos Efectivo: -$${(body.totalExpensesEfectivo||0).toLocaleString('es-CO')}\n\n` +
      `Efectivo Esperado Neto: $${Number(expectedCash).toLocaleString('es-CO')}\n` +
      `Físico Reportado: $${Number(actualCash).toLocaleString('es-CO')}\n` +
      `<b>Diferencia: $${(Number(actualCash) - Number(expectedCash)).toLocaleString('es-CO')}</b>\n\n` +
      `Total Transferencias: $${Number(totalTransfers).toLocaleString('es-CO')}`;
      
    await sendTelegramMessage(mensaje);
    
    return Response.json({ success: true, record });
  } catch (error) {
    return Response.json({ error: 'Error closing register' }, { status: 500 });
  }
}
