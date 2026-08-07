import prisma from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) return Response.json({ error: 'Gasto no encontrado' }, { status: 404 });

    // Si el gasto era de CAPITAL, devolver el monto al capital_inicial
    if (expense.paymentMethod === 'CAPITAL') {
      const capitalConfig = await prisma.storeConfig.findUnique({ where: { key: 'capital_inicial' } });
      if (capitalConfig) {
        await prisma.storeConfig.update({
          where: { key: 'capital_inicial' },
          data: { value: String(Number(capitalConfig.value) + Number(expense.amount)) }
        });
      }
    }

    await prisma.expense.delete({ where: { id } });
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return Response.json({ error: 'Error al eliminar el gasto' }, { status: 500 });
  }
}
