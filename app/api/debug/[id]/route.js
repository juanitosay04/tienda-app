export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = await params;
  const productId = Number(id);

  const info = {
    productId,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? '✅ Existe' : '❌ NO EXISTE',
      PRISMA_DATABASE_URL: process.env.PRISMA_DATABASE_URL ? '✅ Existe' : '❌ NO EXISTE',
    }
  };

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return Response.json({ ...info, error: 'Producto no encontrado con id=' + productId });
    }

    // Intenta el UPDATE real sin cambiar nada
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { name: product.name + '' } // forzar mismo nombre
    });

    return Response.json({ ...info, ok: true, product: updated });
  } catch (error) {
    return Response.json({
      ...info,
      ok: false,
      error: error.message,
      code: error.code,
      name: error.name,
      full: String(error),
    }, { status: 500 });
  }
}
