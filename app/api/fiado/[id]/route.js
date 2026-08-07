import prisma from '../../../../lib/prisma';
export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    await prisma.fiadoTransaction.delete({ where: { id: Number(id) } });
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
