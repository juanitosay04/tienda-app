import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  let id;
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
  } catch(e) {
    return Response.json({ error: 'Error leyendo parámetros', detail: String(e) }, { status: 400 });
  }

  const productId = Number(id);
  if (isNaN(productId)) {
    return Response.json({ error: 'ID inválido', id }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch(e) {
    return Response.json({ error: 'Error leyendo cuerpo de la solicitud', detail: String(e) }, { status: 400 });
  }

  try {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: String(body.name || '').trim(),
        category: String(body.category || '').trim(),
        price: Number(body.price),
        stock: Number(body.stock),
        minStock: Number(body.minStock ?? 5),
      }
    });
    return Response.json(updated);
  } catch (error) {
    console.error('PUT /api/products/[id] error:', JSON.stringify({
      message: error.message,
      code: error.code,
      name: error.name,
    }));
    return Response.json({
      error: error.message || String(error),
      code: error.code,
      name: error.name,
      productId,
      receivedBody: body,
    }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  let id;
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
  } catch(e) {
    return Response.json({ error: 'Error leyendo parámetros', detail: String(e) }, { status: 400 });
  }

  const productId = Number(id);
  if (isNaN(productId)) {
    return Response.json({ error: 'ID inválido', id }, { status: 400 });
  }

  try {
    await prisma.transaction.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', JSON.stringify({
      message: error.message,
      code: error.code,
      name: error.name,
    }));
    return Response.json({
      error: error.message || String(error),
      code: error.code,
      name: error.name,
      productId,
    }, { status: 500 });
  }
}
