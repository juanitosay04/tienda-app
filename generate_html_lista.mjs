import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }]
  });

  const categories = [...new Set(products.map(p => p.category))];

  // Configurar iconos para categorías
  const icons = {
    'Panadería': '🥐',
    'Fruver': '🥬',
    'Lácteos y Jugos': '🥛',
    'Arepas y Embutidos': '🫓',
    'Aseo del Hogar': '🫧',
    'Despensa y Abarrotes': '🛒',
    'Dulces y Paquetes': '🍬',
    'Pulpas de Fruta': '🍓',
    'Gaseosas e Hidratantes': '🥤',
    'Aseo Personal': '🧴'
  };

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lista de Precios Oficial</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&display=swap');
  
  :root {
    --primary: #4f46e5;
    --secondary: #10b981;
    --bg: #f8fafc;
    --card-bg: #ffffff;
    --text: #1e293b;
    --border: #e2e8f0;
  }
  body {
    font-family: 'Outfit', sans-serif;
    background-color: var(--bg);
    color: var(--text);
    margin: 0;
    padding: 40px;
    line-height: 1.5;
  }
  .header {
    text-align: center;
    margin-bottom: 50px;
  }
  h1 {
    color: var(--primary);
    font-size: 3.5rem;
    font-weight: 800;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: -1px;
    display: inline-block;
    padding-bottom: 10px;
    border-bottom: 5px solid var(--secondary);
  }
  .container {
    max-width: 1400px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 30px;
  }
  .category {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 25px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
    break-inside: avoid;
  }
  .category h2 {
    color: #fff;
    background: linear-gradient(135deg, var(--primary) 0%, #3730a3 100%);
    margin: -25px -25px 20px -25px;
    padding: 15px 25px;
    border-radius: 20px 20px 0 0;
    font-size: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  .item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px dashed var(--border);
  }
  .item:last-child {
    border-bottom: none;
  }
  .name {
    font-weight: 500;
    font-size: 1.1rem;
    color: var(--text);
  }
  .price {
    font-weight: 700;
    font-size: 1.2rem;
    color: var(--primary);
    background: #e0e7ff;
    padding: 4px 12px;
    border-radius: 8px;
  }

  /* Fruver specific styling */
  .fruver-category h2 {
    background: linear-gradient(135deg, #10b981 0%, #047857 100%) !important;
  }
  .fruver-category .price {
    color: #047857 !important;
    background: #d1fae5 !important;
  }
  
  @media print {
    @page { 
      size: A4;
      margin: 15mm;
    }
    body {
      background: #fff;
      padding: 0;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      margin-bottom: 20px;
      page-break-after: avoid;
      break-after: avoid;
    }
    h1 {
      font-size: 24pt;
      border-bottom: 4px solid var(--secondary);
    }
    .container {
      display: block; 
      column-count: 2; 
      column-gap: 30px;
    }
    .category {
      box-shadow: none;
      border: 2px solid #e2e8f0;
      padding: 15px;
      border-radius: 12px;
      margin: 0 0 20px 0;
      break-inside: avoid;
      page-break-inside: avoid;
      display: block; 
      width: 100%;
      box-sizing: border-box;
    }
    .category h2 {
      margin: -15px -15px 12px -15px;
      padding: 8px 15px;
      border-radius: 10px 10px 0 0;
      font-size: 12pt;
    }
    .item {
      padding: 5px 0;
    }
    .name {
      font-size: 10pt;
    }
    .price {
      font-size: 10pt;
    }
    .page-break {
      page-break-before: always;
      break-before: always;
      column-span: all;
    }
    .fruver-page {
      display: block;
      column-count: 2;
    }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>Lista de Precios</h1>
  </div>
  <div class="container">
`;

  // Agrupar las categorías que no son Fruver
  for (const cat of categories.filter(c => c !== 'Fruver')) {
    const icon = icons[cat] || '📦';
    html += `    <div class="category">
      <h2>${icon} ${cat}</h2>\n`;
      
    const catProducts = products.filter(p => p.category === cat);
    for (const p of catProducts) {
      html += `      <div class="item"><span class="name">${p.name}</span><span class="price">$${p.price.toLocaleString('es-CO')}</span></div>\n`;
    }
    html += `    </div>\n`;
  }

  html += `  </div>\n\n`;

  // Página separada para Verduras (Fruver)
  if (categories.includes('Fruver')) {
    html += `  <div class="page-break"></div>
  <div class="header" style="margin-top: 40px;">
    <h1>Precios de Verduras</h1>
  </div>
  <div class="container fruver-page">
    <div class="category fruver-category">
      <h2>🥬 Fruver (Precios por Kilo)</h2>\n`;
      
    const fruverProducts = products.filter(p => p.category === 'Fruver');
    for (const p of fruverProducts) {
      html += `      <div class="item"><span class="name">${p.name}</span><span class="price">$${p.price.toLocaleString('es-CO')}</span></div>\n`;
    }
    
    html += `    </div>\n  </div>\n`;
  }

  html += `</body>\n</html>`;
  
  fs.writeFileSync('C:/Users/juane/.gemini/antigravity/scratch/lista_de_precios_imprimible.html', html);
  console.log('HTML generado exitosamente.');
}

main().catch(console.error);
