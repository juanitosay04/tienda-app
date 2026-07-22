import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  
  try {
    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        name: body.name,
        category: body.category,
        price: Number(body.price),
        stock: Number(body.stock),
        minStock: Number(body.minStock)
      }
    });
    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: 'Error updating product' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id: Number(id) } });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Error deleting product' }, { status: 500 });
  }
}
