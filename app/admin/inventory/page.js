"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORY_COLORS = {
  'Fruver': '#16a34a',
  'Panadería': '#d97706',
  'Lácteos': '#0284c7',
  'Aseo': '#7c3aed',
  'Bebidas': '#db2777',
  'Granos': '#b45309',
  'Carnes': '#dc2626',
  'Snacks': '#ea580c',
};
const getCategoryColor = (cat) => CATEGORY_COLORS[cat] || '#475569';

// Normalizar texto sin tildes/diacríticos para búsqueda flexible
const normalizeText = (str = '') =>
  String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function InventoryManager() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'zero' | 'low'
  const [copiedList, setCopiedList] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: '', price: '', stock: '', minStock: '5' });

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await fetch('/api/products?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const zeroStockProducts = useMemo(() => products.filter(p => Number(p.stock) <= 0), [products]);
  const lowStockProducts = useMemo(() => products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.minStock)), [products]);

  const categories = useMemo(() => ['Todas', ...new Set(products.map(p => p.category))].sort((a, b) => a === 'Todas' ? -1 : a.localeCompare(b)), [products]);

  const filtered = useMemo(() => products.filter(p => {
    const searchWords = normalizeText(search).trim().split(/\s+/);
    const productName = normalizeText(p.name);
    const productCat = normalizeText(p.category);
    
    // Filtro por estado de Stock
    if (stockFilter === 'zero' && Number(p.stock) > 0) return false;
    if (stockFilter === 'low' && (Number(p.stock) <= 0 || Number(p.stock) > Number(p.minStock))) return false;

    // Filtro por categoría
    const matchCat = selectedCategory === 'Todas' || p.category === selectedCategory;
    
    // Filtro por texto
    const matchSearch = searchWords.every(word => productName.includes(word) || productCat.includes(word));
    return matchCat && matchSearch;
  }), [products, selectedCategory, search, stockFilter]);

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: '', category: selectedCategory !== 'Todas' ? selectedCategory : '', price: '', stock: '', minStock: '5' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setFormData({ name: p.name, category: p.category, price: String(p.price), stock: String(p.stock), minStock: String(p.minStock) });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const url = editingId ? `/api/products/${editingId}` : '/api/products';
    const method = editingId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category.trim(),
          price: Number(formData.price),
          stock: Number(formData.stock),
          minStock: Number(formData.minStock || 5),
        })
      });
      const data = await res.json();
      if (!res.ok) { alert('Error: ' + (data.error || 'Error desconocido')); setSaving(false); return; }
      setShowModal(false);
      await fetchProducts();
    } catch (err) { alert('Error de conexión: ' + err.message); }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar "${name}"?\nEsto también borrará su historial de ventas.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); alert('Error: ' + (d.error || 'Error desconocido')); }
      else await fetchProducts();
    } catch (err) { alert('Error: ' + err.message); }
    setDeleting(null);
  };

  const copyZeroStockList = () => {
    if (zeroStockProducts.length === 0) return;
    const text = `📋 *PRODUCTOS AGOTADOS - TIENDA DONDE JUANCHO*\n\n` +
      zeroStockProducts.map((p, i) => `${i + 1}. ${p.name} (${p.category}) - Stock actual: ${p.stock}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedList(true);
    setTimeout(() => setCopiedList(false), 2500);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Sidebar ── */}
      <div style={{ width: '240px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid #e2e8f0' }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontFamily: 'inherit' }}>
            ← Volver al Panel
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>🏪 Inventario</h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>Tienda Donde Juancho</p>
        </div>

        {/* Filtros rápidos de Stock */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
            Estado de Stock
          </div>

          <button onClick={() => setStockFilter('all')} style={{
            width: '100%', padding: '8px 12px', borderRadius: '8px', border: 'none',
            background: stockFilter === 'all' ? '#eff6ff' : 'transparent',
            color: stockFilter === 'all' ? '#1d4ed8' : '#475569',
            fontWeight: stockFilter === 'all' ? '700' : '500',
            cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s'
          }}>
            <span>📦 Todos los productos</span>
            <span style={{ fontSize: '0.75rem', background: stockFilter === 'all' ? '#dbeafe' : '#f1f5f9', color: stockFilter === 'all' ? '#1d4ed8' : '#64748b', padding: '2px 7px', borderRadius: '10px', fontWeight: '700' }}>
              {products.length}
            </span>
          </button>

          <button onClick={() => setStockFilter('zero')} style={{
            width: '100%', padding: '8px 12px', borderRadius: '8px', border: 'none',
            background: stockFilter === 'zero' ? '#fef2f2' : (zeroStockProducts.length > 0 ? '#fff1f2' : 'transparent'),
            color: stockFilter === 'zero' ? '#b91c1c' : (zeroStockProducts.length > 0 ? '#dc2626' : '#64748b'),
            fontWeight: stockFilter === 'zero' ? '800' : '600',
            cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s',
            boxShadow: stockFilter === 'zero' ? 'inset 0 0 0 1.5px #f87171' : 'none'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔴</span>
              <span>Sin Stock (0)</span>
            </span>
            <span style={{ fontSize: '0.75rem', background: stockFilter === 'zero' ? '#dc2626' : '#fee2e2', color: stockFilter === 'zero' ? 'white' : '#b91c1c', padding: '2px 7px', borderRadius: '10px', fontWeight: '800' }}>
              {zeroStockProducts.length}
            </span>
          </button>

          <button onClick={() => setStockFilter('low')} style={{
            width: '100%', padding: '8px 12px', borderRadius: '8px', border: 'none',
            background: stockFilter === 'low' ? '#fefce8' : 'transparent',
            color: stockFilter === 'low' ? '#854d0e' : '#64748b',
            fontWeight: stockFilter === 'low' ? '700' : '500',
            cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span>
              <span>Stock Bajo</span>
            </span>
            <span style={{ fontSize: '0.75rem', background: stockFilter === 'low' ? '#fef08a' : '#f1f5f9', color: stockFilter === 'low' ? '#854d0e' : '#64748b', padding: '2px 7px', borderRadius: '10px', fontWeight: '700' }}>
              {lowStockProducts.length}
            </span>
          </button>
        </div>

        {/* Categorías */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          <div style={{ padding: '0 18px 6px', fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Categorías
          </div>
          {categories.map(cat => {
            const count = cat === 'Todas' 
              ? products.length 
              : products.filter(p => p.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
                width: '100%', padding: '9px 18px', border: 'none', background: isActive ? '#f1f5f9' : 'transparent',
                borderRight: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                color: isActive ? '#0f172a' : '#475569', cursor: 'pointer', textAlign: 'left',
                fontSize: '0.88rem', fontWeight: isActive ? '700' : '400', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.15s', fontFamily: 'inherit'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {cat !== 'Todas' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getCategoryColor(cat), flexShrink: 0 }} />}
                  {cat}
                </span>
                <span style={{ fontSize: '0.72rem', background: isActive ? '#cbd5e1' : '#f8fafc', color: isActive ? '#0f172a' : '#94a3b8', padding: '2px 6px', borderRadius: '8px', fontWeight: '600' }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Panel principal ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'white', padding: '16px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: '800', color: stockFilter === 'zero' ? '#dc2626' : '#0f172a', margin: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {stockFilter === 'zero' ? (
                <><span>🔴</span> Productos Sin Stock (Agotados)</>
              ) : stockFilter === 'low' ? (
                <><span>⚠️</span> Productos con Stock Bajo</>
              ) : (
                selectedCategory === 'Todas' ? 'Todos los Productos' : selectedCategory
              )}
            </h1>

            {/* Buscador */}
            <div style={{ position: 'relative', maxWidth: '340px', width: '100%' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }}>🔍</span>
              <input
                className="input"
                type="text"
                placeholder="Buscar por nombre o categoría..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '36px', height: '38px', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid #e2e8f0', background: '#f8fafc' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
            {stockFilter === 'zero' && zeroStockProducts.length > 0 && (
              <button onClick={copyZeroStockList} style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: copiedList ? '#10b981' : '#fef2f2', color: copiedList ? 'white' : '#b91c1c', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                {copiedList ? '✓ Copiado al portapapeles' : '📋 Copiar Lista Agotados'}
              </button>
            )}

            <button onClick={() => window.print()} className="no-print" style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', fontFamily: 'inherit' }}>
              🖨️ Imprimir
            </button>
            <button onClick={openAdd} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem', fontFamily: 'inherit', boxShadow: '0 2px 6px rgba(59,130,246,0.3)' }}>
              + Nuevo Producto
            </button>
          </div>
        </div>

        {/* Barra de Filtro Activo Banner */}
        {stockFilter === 'zero' && (
          <div style={{ padding: '10px 28px', background: '#fef2f2', borderBottom: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🚨 Mostrando únicamente productos agotados con stock en 0.
            </span>
            <button onClick={() => setStockFilter('all')} style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline' }}>
              Ver todos los productos
            </button>
          </div>
        )}

        {/* Tabla de productos */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>Cargando inventario...</div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '320px', color: '#64748b', gap: '12px', padding: '20px' }}>
              <span style={{ fontSize: '3rem' }}>
                {stockFilter === 'zero' ? '🎉' : '📦'}
              </span>
              <p style={{ fontWeight: '700', fontSize: '1.05rem', color: '#0f172a', margin: 0 }}>
                {stockFilter === 'zero' 
                  ? '¡Excelente! No hay ningún producto sin stock actualmente.' 
                  : search 
                    ? 'No se encontraron productos coincidentes' 
                    : 'No hay productos en esta selección'}
              </p>
              {stockFilter === 'zero' ? (
                <button onClick={() => setStockFilter('all')} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}>
                  Volver al listado general
                </button>
              ) : (
                <button onClick={openAdd} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}>
                  + Agregar producto
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '12px 28px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Producto</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoría</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Precio</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stock</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mín.</th>
                  <th className="no-print" style={{ padding: '12px 28px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const isZero = Number(p.stock) <= 0;
                  const isLow = !isZero && Number(p.stock) <= Number(p.minStock);
                  const isDel = deleting === p.id;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: isDel ? '#fff5f5' : isZero ? '#fff1f2' : (i % 2 === 0 ? 'white' : '#fafafa'), opacity: isDel ? 0.5 : 1, transition: 'all 0.2s' }}
                      onMouseEnter={e => { if (!isDel) e.currentTarget.style.background = isZero ? '#fee2e2' : '#eff6ff'; }}
                      onMouseLeave={e => { if (!isDel) e.currentTarget.style.background = isZero ? '#fff1f2' : (i % 2 === 0 ? 'white' : '#fafafa'); }}>
                      <td style={{ padding: '13px 28px', fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isZero && <span style={{ color: '#dc2626', fontSize: '1rem' }} title="Sin Stock">🚫</span>}
                          {p.name}
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', background: getCategoryColor(p.category) + '18', color: getCategoryColor(p.category) }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getCategoryColor(p.category) }} />
                          {p.category}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>${Number(p.price).toLocaleString('es-CO')}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                        {isZero ? (
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontWeight: '800', fontSize: '0.82rem', background: '#dc2626', color: 'white' }}>
                            0 · AGOTADO
                          </span>
                        ) : (
                          <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '0.9rem', background: isLow ? '#fef3c7' : '#f0fdf4', color: isLow ? '#b45309' : '#16a34a' }}>
                            {p.stock} {isLow && '⚠️'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>{p.minStock}</td>
                      <td className="no-print" style={{ padding: '13px 28px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => openEdit(p)} disabled={isDel}
                            style={{
                              padding: '6px 14px', borderRadius: '6px',
                              border: isZero ? '1px solid #f87171' : '1px solid #e2e8f0',
                              background: isZero ? '#fee2e2' : 'white',
                              color: isZero ? '#991b1b' : '#3b82f6',
                              cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'inherit', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = isZero ? '#fecaca' : '#eff6ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isZero ? '#fee2e2' : 'white'; }}>
                            {isZero ? '⚡ Reabastecer' : '✏️ Editar'}
                          </button>
                          <button onClick={() => handleDelete(p.id, p.name)} disabled={isDel}
                            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', fontFamily: 'inherit', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; }}>
                            {isDel ? '...' : '🗑 Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer con conteo */}
        <div style={{ padding: '12px 28px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
            {stockFilter === 'zero' 
              ? `🔴 Mostrando ${filtered.length} productos sin stock de un total de ${products.length}`
              : `Mostrando ${filtered.length} de ${products.length} productos`}
          </span>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            {zeroStockProducts.length > 0 && (
              <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: '700' }}>
                🔴 {zeroStockProducts.length} agotados
              </span>
            )}
            {lowStockProducts.length > 0 && (
              <span style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: '600' }}>
                ⚠️ {lowStockProducts.length} stock bajo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Editar / Crear ── */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            {/* Header modal */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{editingId ? 'Modifica los datos o reabastece el stock' : 'Agrega un nuevo producto al inventario'}</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>×</button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre del Producto *</label>
                <input required className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Leche Entera 1L" style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoría *</label>
                <input required list="cats" className="input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Ej: Lácteos, Fruver, Aseo..." style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem' }} />
                <datalist id="cats">{categories.filter(c => c !== 'Todas').map(c => <option key={c} value={c} />)}</datalist>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Precio ($) *</label>
                  <input required type="number" min="0" className="input" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="0" style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0', fontWeight: '700', fontSize: '1rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock *</label>
                  <input autoFocus={editingId ? true : false} required type="number" min="0" className="input" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} placeholder="0" style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0', fontWeight: '700', fontSize: '1rem', background: Number(formData.stock) <= 0 ? '#fef2f2' : 'white', color: Number(formData.stock) <= 0 ? '#dc2626' : '#0f172a' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mín.</label>
                  <input type="number" min="0" className="input" value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: e.target.value })} placeholder="5" style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0', fontWeight: '700', fontSize: '1rem' }} />
                </div>
              </div>

              {/* Botones modal */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569', fontFamily: 'inherit', fontSize: '0.9rem' }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', background: saving ? '#94a3b8' : '#3b82f6', color: 'white', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', minWidth: '140px' }}>
                  {saving ? 'Guardando...' : (editingId ? '✅ Guardar Cambios' : '✅ Crear Producto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

