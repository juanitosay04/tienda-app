import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { category: 'asc' }
    })
    return Response.json(products)
  } catch (error) {
    return Response.json({ error: 'Error fetching products' }, { status: 500 })
  }
}

export async function POST(request) {
  const body = await request.json()
  try {
    const newProduct = await prisma.product.create({
      data: {
        name: body.name,
        category: body.category,
        price: Number(body.price),
        stock: Number(body.stock),
        minStock: Number(body.minStock || 5)
      }
    })
    return Response.json(newProduct)
  } catch (error) {
    return Response.json({ error: 'Error creating product' }, { status: 500 })
  }
}
