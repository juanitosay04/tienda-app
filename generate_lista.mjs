import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }]
  });

  let md = '# 📋 Lista de Precios Oficial\n\n> [!NOTE]\n> Esta lista está estructurada en tablas por sección para que al exportarla a PDF o imprimirla, se vea completamente ordenada.\n\n';
  
  const categories = [...new Set(products.map(p => p.category))];
  
  for (const cat of categories) {
    md += `## ${cat}\n\n`;
    md += `| Producto | Precio |\n`;
    md += `| :--- | :--- |\n`;
    
    const catProducts = products.filter(p => p.category === cat);
    for (const p of catProducts) {
      md += `| ${p.name} | $${p.price.toLocaleString('es-CO')} |\n`;
    }
    md += '\n<br/>\n\n';
  }
  
  fs.writeFileSync('C:/Users/juane/.gemini/antigravity/brain/93a0e437-aa9c-4913-a498-256ce0a5ce3e/lista_precios.md', md);
  console.log('Markdown generado.');
}
main().catch(console.error);
