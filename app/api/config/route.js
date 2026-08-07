import prisma from '../../../lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configs = await prisma.storeConfig.findMany({ orderBy: { key: 'asc' } });
    // Devolver como objeto clave→valor para fácil consumo
    const obj = {};
    configs.forEach(c => { obj[c.key] = { value: Number(c.value), label: c.label, updatedAt: c.updatedAt }; });
    return Response.json(obj);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { key, value, label } = body;
    if (!key || value === undefined) return Response.json({ error: 'key y value requeridos' }, { status: 400 });

    const updated = await prisma.storeConfig.upsert({
      where: { key },
      update: { value: String(value), ...(label && { label }) },
      create: { key, value: String(value), label: label || key },
    });
    return Response.json(updated);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
