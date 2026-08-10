import prisma from '../../../lib/prisma';
import { sendTelegramMessage } from '../../../lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('history') === 'true') {
      const history = await prisma.cashRegisterClose.findMany({
        orderBy: { date: 'desc' },
        take: 50
      });
      return Response.json(history);
    }

    const lastClose = await prisma.cashRegisterClose.findFirst({
      orderBy: { date: 'desc' }
    });
    
    // Si no hay cierre previo, tomar desde hoy a las 00:00
    const startDate = lastClose ? lastClose.date : new Date(new Date().setHours(0,0,0,0));
    
    const [transactions, expenses, abonos] = await Promise.all([
      prisma.transaction.findMany({
        where: { date: { gt: startDate }, type: 'VENTA' }
      }),
      prisma.expense.findMany({
        where: { date: { gt: startDate } }
      }),
      prisma.fiadoTransaction.findMany({
        where: { date: { gt: startDate }, type: 'ABONO' },
        include: { customer: true }
      })
    ]);

    // Leer saldo base de caja desde configuración
    const cajaBaseConfig = await prisma.storeConfig.findUnique({ where: { key: 'caja_base' } });
    const cajaBase = cajaBaseConfig ? Number(cajaBaseConfig.value) : 0;
    
    const salesEfectivo = transactions.filter(t => t.paymentMethod === 'EFECTIVO').reduce((sum, t) => sum + t.total, 0);
    const salesTransfer = transactions.filter(t => t.paymentMethod === 'TRANSFERENCIA').reduce((sum, t) => sum + t.total, 0);
    
    const abonosEfectivo = abonos.filter(a => a.paymentMethod === 'EFECTIVO' || !a.paymentMethod).reduce((sum, a) => sum + a.amount, 0);
    const abonosTransfer = abonos.filter(a => a.paymentMethod === 'TRANSFERENCIA').reduce((sum, a) => sum + a.amount, 0);

    const totalIngresosEfectivo = salesEfectivo + abonosEfectivo;
    const totalTransfers = salesTransfer + abonosTransfer;

    const expensesEfectivo = expenses.filter(e => e.paymentMethod === 'EFECTIVO').reduce((sum, e) => sum + e.amount, 0);
    const expensesTransfer = expenses.filter(e => e.paymentMethod === 'TRANSFERENCIA').reduce((sum, e) => sum + e.amount, 0);
    
    return Response.json({
      cajaBase,
      salesEfectivo,
      salesTransfer,
      abonosEfectivo,
      abonosTransfer,
      totalAbonos: abonosEfectivo + abonosTransfer,
      abonosList: abonos,
      totalIngresosEfectivo,
      totalTransfers,
      salesCount: transactions.length,
      abonosCount: abonos.length,
      totalExpensesEfectivo: expensesEfectivo,
      totalExpensesTransfer: expensesTransfer,
      expectedCash: cajaBase + totalIngresosEfectivo - expensesEfectivo,
      since: startDate
    });
  } catch (error) {
    console.error('Error in GET /api/caja:', error);
    return Response.json({ error: 'Error fetching stats' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      expectedCash,
      actualCash,
      totalTransfers,
      salesCount,
      salesEfectivo = 0,
      abonosEfectivo = 0,
      abonosTransfer = 0,
      totalExpensesEfectivo = 0
    } = body;
    
    const record = await prisma.cashRegisterClose.create({
      data: {
        expectedCash: Number(expectedCash),
        actualCash: Number(actualCash),
        difference: Number(actualCash) - Number(expectedCash),
        totalTransfers: Number(totalTransfers),
        salesCount: Number(salesCount)
      }
    });
    
    // ----- NUEVO: SUMAR AL CAPITAL DE LA EMPRESA -----
    const cajaBaseConfig = await prisma.storeConfig.findUnique({ where: { key: 'caja_base' } });
    const cajaBase = cajaBaseConfig ? Number(cajaBaseConfig.value) : 70000;
    
    // Calculamos el excedente de caja física (dejando la base intacta)
    const excedenteEfectivo = Math.max(0, Number(actualCash) - cajaBase);
    
    // El monto a sumar al capital es el excedente de efectivo + todas las transferencias
    const montoAlCapital = excedenteEfectivo + Number(totalTransfers);

    if (montoAlCapital > 0) {
      const capitalConfig = await prisma.storeConfig.findUnique({ where: { key: 'capital_inicial' } });
      const capitalActual = capitalConfig ? Number(capitalConfig.value) : 0;
      
      await prisma.storeConfig.upsert({
        where: { key: 'capital_inicial' },
        update: { value: String(capitalActual + montoAlCapital) },
        create: { key: 'capital_inicial', value: String(capitalActual + montoAlCapital), label: 'Capital Total de la Tienda' }
      });
    }
    // -------------------------------------------------
    
    // Formatear mensaje detallado para Telegram
    const diff = Number(actualCash) - Number(expectedCash);
    const diffText = diff === 0 
      ? '✅ Cuadre Perfecto ($0)' 
      : diff < 0 
        ? `🔴 Faltante: -$${Math.abs(diff).toLocaleString('es-CO')}` 
        : `🟢 Sobrante: +$${diff.toLocaleString('es-CO')}`;

    let mensaje = `🔒 <b>CIERRE DE CAJA REGISTRADO</b>\n` +
      `📅 Fecha: ${new Date().toLocaleString('es-CO')}\n\n` +
      `🛒 <b>Ventas Directas Efectivo:</b> $${Number(salesEfectivo).toLocaleString('es-CO')} (${salesCount} ventas)\n`;

    if (Number(abonosEfectivo) > 0) {
      mensaje += `📒 <b>Abonos Fiados Efectivo:</b> +$${Number(abonosEfectivo).toLocaleString('es-CO')}\n`;
    }

    if (Number(totalExpensesEfectivo) > 0) {
      mensaje += `💸 <b>Gastos en Efectivo:</b> -$${Number(totalExpensesEfectivo).toLocaleString('es-CO')}\n`;
    }

    mensaje += `\n💰 <b>Efectivo Esperado en Caja:</b> $${Number(expectedCash).toLocaleString('es-CO')}\n` +
      `💵 <b>Físico Contado:</b> $${Number(actualCash).toLocaleString('es-CO')}\n` +
      `📊 <b>Diferencia:</b> <b>${diffText}</b>\n\n` +
      `📱 <b>Total Transferencias (Nequi/Banco):</b> $${Number(totalTransfers).toLocaleString('es-CO')}`;

    if (Number(abonosTransfer) > 0) {
      mensaje += ` (incluye $${Number(abonosTransfer).toLocaleString('es-CO')} en abonos)`;
    }
    
    if (montoAlCapital > 0) {
      mensaje += `\n\n🏦 <b>Capital de la Empresa:</b> Se sumaron +$${montoAlCapital.toLocaleString('es-CO')} al capital (dejando $${cajaBase.toLocaleString('es-CO')} de base en caja).`;
    }
      
    await sendTelegramMessage(mensaje);
    
    return Response.json({ success: true, record });
  } catch (error) {
    console.error('Error in POST /api/caja:', error);
    return Response.json({ error: 'Error closing register' }, { status: 500 });
  }
}
