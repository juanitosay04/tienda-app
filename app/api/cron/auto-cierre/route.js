import { PrismaClient } from '@prisma/client';
import { sendTelegramMessage } from '../../../../lib/telegram';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // ── Calcular inicio del día en Colombia (UTC-5) ──
    // Ejemplo: si el cron corre a las 04:30 UTC del 24 → son las 23:30 del 23 en Colombia
    const nowUTC = new Date();
    const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000; // UTC-5

    // Hora actual en Colombia
    const nowColombia = new Date(nowUTC.getTime() + COLOMBIA_OFFSET_MS);

    // Medianoche de hoy en Colombia (hora local)
    const startColombia = new Date(nowColombia);
    startColombia.setHours(0, 0, 0, 0);

    // Convertir medianoche Colombia a UTC (para consultas en BD)
    const startUTC = new Date(startColombia.getTime() - COLOMBIA_OFFSET_MS);

    const fechaLabel = nowColombia.toLocaleDateString('es-CO', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });

    // ── ¿Ya se cerró caja hoy? ──
    const cierreHoy = await prisma.cashRegisterClose.findFirst({
      where: { date: { gte: startUTC } },
      orderBy: { date: 'desc' }
    });

    if (cierreHoy) {
      console.log('[auto-cierre] Ya hay cierre manual hoy. Nada que hacer.');
      return Response.json({
        message: 'Ya hay cierre registrado hoy. No se requiere cierre automático.',
        cierreHoy
      });
    }

    // ── Obtener el último cierre previo (para calcular el período) ──
    const lastClose = await prisma.cashRegisterClose.findFirst({
      where: { date: { lt: startUTC } },
      orderBy: { date: 'desc' }
    });

    const periodStart = lastClose ? lastClose.date : startUTC;

    // ── Transacciones y gastos del período ──
    const transactions = await prisma.transaction.findMany({
      where: { date: { gt: periodStart }, type: 'VENTA' }
    });

    const expenses = await prisma.expense.findMany({
      where: { date: { gt: periodStart } }
    });

    // Si no hay nada que cerrar, salir silenciosamente
    if (transactions.length === 0 && expenses.length === 0) {
      console.log('[auto-cierre] Sin actividad hoy. No se crea cierre.');
      return Response.json({ message: 'Sin actividad hoy. No se crea cierre automático.' });
    }

    // ── Calcular totales ──
    const cajaBaseConfig = await prisma.storeConfig.findUnique({ where: { key: 'caja_base' } });
    const cajaBase = cajaBaseConfig ? Number(cajaBaseConfig.value) : 0;

    const salesEfectivo    = transactions.filter(t => t.paymentMethod === 'EFECTIVO').reduce((s, t) => s + t.total, 0);
    const salesTransfer    = transactions.filter(t => t.paymentMethod === 'TRANSFERENCIA').reduce((s, t) => s + t.total, 0);
    const expensesEfectivo = expenses.filter(e => e.paymentMethod === 'EFECTIVO').reduce((s, e) => s + e.amount, 0);

    const expectedCash = cajaBase + salesEfectivo - expensesEfectivo;

    // ── Crear cierre automático ──
    // actualCash = expectedCash (asumimos que cuadró, pendiente verificación al día siguiente)
    const record = await prisma.cashRegisterClose.create({
      data: {
        expectedCash,
        actualCash:     expectedCash,
        difference:     0,
        totalTransfers: salesTransfer,
        salesCount:     transactions.length,
      }
    });

    // ── Notificación Telegram ──
    const msg =
      `🤖 <b>Cierre Automático de Caja — ${fechaLabel}</b>\n\n` +
      `No se registró cierre manual antes de las 11:30 PM.\n` +
      `El sistema cerró automáticamente.\n\n` +
      `📊 Resumen del día:\n` +
      `  • Ventas: ${transactions.length}\n` +
      `  • Efectivo esperado: $${expectedCash.toLocaleString('es-CO')}\n` +
      `  • Nequi/Banco: $${salesTransfer.toLocaleString('es-CO')}\n\n` +
      `⚠️ <i>Recuerda revisar que el efectivo cuadre mañana al abrir.</i>`;

    await sendTelegramMessage(msg);

    console.log('[auto-cierre] Cierre automático creado:', record.id);
    return Response.json({
      success: true,
      message: `Cierre automático del ${fechaLabel} registrado correctamente.`,
      record
    });

  } catch (error) {
    console.error('[auto-cierre] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
