import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json()
  // body = { type: 'VENTA' | 'COMPRA', items: [{ productId, quantity, total }], paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' }
  const { type, items, paymentMethod } = body
  
  try {
    const transactions = []
    
    for (const item of items) {
      // Registrar transaccion
      const tx = await prisma.transaction.create({
        data: {
          type,
          paymentMethod: paymentMethod || 'EFECTIVO',
          quantity: item.quantity,
          total: item.total,
          productId: item.productId
        }
      })
      
      // Descontar o aumentar el stock
      if (type === 'VENTA') {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        })
      } else if (type === 'COMPRA') {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        })
      }
      transactions.push(tx)
    }
    
    return Response.json({ success: true, transactions })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Error processing transactions' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const txs = await prisma.transaction.findMany({
      include: { product: true },
      orderBy: { date: 'desc' }
    })
    return Response.json(txs)
  } catch (error) {
    return Response.json({ error: 'Error fetching transactions' }, { status: 500 })
  }
}
