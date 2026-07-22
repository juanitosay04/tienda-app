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

export default function InventoryManager() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

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

  const categories = useMemo(() => ['Todas', ...new Set(products.map(p => p.category))].sort((a, b) => a === 'Todas' ? -1 : a.localeCompare(b)), [products]);

  const filtered = useMemo(() => products.filter(p => {
    const matchCat = selectedCategory === 'Todas' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [products, selectedCategory, search]);

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

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Sidebar de Categorías ── */}
      <div style={{ width: '220px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', fontFamily: 'inherit' }}>
            ← Volver al Panel
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>Inventario</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0' }}>{products.length} productos</p>
        </div>

        {/* Categorías */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {categories.map(cat => {
            const count = cat === 'Todas' ? products.length : products.filter(p => p.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
                width: '100%', padding: '10px 20px', border: 'none', background: isActive ? '#eff6ff' : 'transparent',
                borderRight: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                color: isActive ? '#1d4ed8' : '#475569', cursor: 'pointer', textAlign: 'left',
                fontSize: '0.9rem', fontWeight: isActive ? '600' : '400', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.15s', fontFamily: 'inherit'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {cat !== 'Todas' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getCategoryColor(cat), flexShrink: 0 }} />}
                  {cat}
                </span>
                <span style={{ fontSize: '0.75rem', background: isActive ? '#dbeafe' : '#f1f5f9', color: isActive ? '#1d4ed8' : '#94a3b8', padding: '2px 7px', borderRadius: '10px', fontWeight: '600' }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Alertas stock bajo */}
        {lowStockCount > 0 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#fef2f2' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#dc2626', margin: 0 }}>⚠ {lowStockCount} productos con stock bajo</p>
          </div>
        )}
      </div>

      {/* ── Panel principal ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'white', padding: '16px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', margin: 0, whiteSpace: 'nowrap' }}>
              {selectedCategory === 'Todas' ? 'Todos los Productos' : selectedCategory}
            </h1>
            {/* Buscador */}
            <div style={{ position: 'relative', maxWidth: '380px', width: '100%' }}>
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
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <button onClick={() => window.print()} className="no-print" style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem', fontFamily: 'inherit' }}>
              🖨️ Imprimir
            </button>
            <button onClick={openAdd} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', fontFamily: 'inherit' }}>
              + Nuevo Producto
            </button>
          </div>
        </div>

        {/* Tabla de productos */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>Cargando inventario...</div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#94a3b8', gap: '12px' }}>
              <span style={{ fontSize: '2.5rem' }}>📦</span>
              <p style={{ fontWeight: '500' }}>{search ? 'No se encontraron productos' : 'No hay productos en esta categoría'}</p>
              <button onClick={openAdd} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}>+ Agregar producto</button>
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
                  const isLow = p.stock <= p.minStock;
                  const isDel = deleting === p.id;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: isDel ? '#fff5f5' : (i % 2 === 0 ? 'white' : '#fafafa'), opacity: isDel ? 0.5 : 1, transition: 'all 0.2s' }}
                      onMouseEnter={e => { if (!isDel) e.currentTarget.style.background = '#eff6ff'; }}
                      onMouseLeave={e => { if (!isDel) e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa'; }}>
                      <td style={{ padding: '13px 28px', fontWeight: '500', color: '#0f172a', fontSize: '0.9rem' }}>{p.name}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', background: getCategoryColor(p.category) + '18', color: getCategoryColor(p.category) }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getCategoryColor(p.category) }} />
                          {p.category}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>${Number(p.price).toLocaleString('es-CO')}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '0.9rem', background: isLow ? '#fef2f2' : '#f0fdf4', color: isLow ? '#dc2626' : '#16a34a' }}>
                          {p.stock} {isLow && '⚠'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>{p.minStock}</td>
                      <td className="no-print" style={{ padding: '13px 28px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => openEdit(p)} disabled={isDel}
                            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', color: '#3b82f6', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', fontFamily: 'inherit', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                            ✏️ Editar
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
        <div style={{ padding: '10px 28px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Mostrando {filtered.length} de {products.length} productos</span>
          {lowStockCount > 0 && <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: '600' }}>⚠ {lowStockCount} con stock bajo</span>}
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
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{editingId ? 'Modifica los datos del producto' : 'Agrega un nuevo producto al inventario'}</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>×</button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre del Producto *</label>
                <input autoFocus required className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Leche Entera 1L" style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem' }} />
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
                  <input required type="number" min="0" className="input" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} placeholder="0" style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0', fontWeight: '700', fontSize: '1rem' }} />
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
