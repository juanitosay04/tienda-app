"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InventoryManager() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null); // id del producto que se está borrando

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({ name: '', category: '', price: '', stock: '', minStock: '5' });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await fetch('/api/products?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: '', category: '', price: '', stock: '', minStock: '5' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      category: p.category,
      price: String(p.price),
      stock: String(p.stock),
      minStock: String(p.minStock)
    });
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

      if (!res.ok) {
        alert('❌ Error al guardar: ' + (data.error || 'Error desconocido'));
        setSaving(false);
        return;
      }

      setShowModal(false);
      await fetchProducts();
    } catch (err) {
      alert('❌ Error de conexión: ' + err.message);
    }

    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Seguro que deseas eliminar "${name}"?\n\nEsta acción también borrará el historial de ventas de este producto.`)) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        alert('❌ Error al eliminar: ' + (data.error || 'Error desconocido'));
      } else {
        await fetchProducts();
      }
    } catch (err) {
      alert('❌ Error de conexión: ' + err.message);
    }
    setDeleting(null);
  };

  const categories = [...new Set(products.map(p => p.category))].sort();

  return (
    <div className="animate-fade-in" style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <button className="btn" onClick={() => router.push('/admin')} style={{ background: 'var(--border-color)', color: 'var(--text-main)', marginRight: '15px' }}>← Volver</button>
          <h1 style={{ display: 'inline-block', verticalAlign: 'middle' }}>Gestión de Inventario</h1>
        </div>
        <div>
          <button className="btn" onClick={() => window.print()} style={{ background: 'var(--success)', color: 'white', marginRight: '10px' }}>🖨️ Imprimir Lista</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Añadir Producto</button>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando catálogo...</p>
      ) : products.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.2rem' }}>No hay productos todavía.</p>
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: '20px' }}>+ Añadir primer producto</button>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflowX: 'auto', background: 'var(--bg-panel)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '15px' }}>Producto</th>
                <th style={{ padding: '15px' }}>Categoría</th>
                <th style={{ padding: '15px' }}>Precio</th>
                <th style={{ padding: '15px' }}>Stock</th>
                <th style={{ padding: '15px' }}>Mín.</th>
                <th className="no-print" style={{ padding: '15px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    opacity: deleting === p.id ? 0.4 : 1,
                    transition: 'opacity 0.3s'
                  }}
                >
                  <td style={{ padding: '15px', fontWeight: '500' }}>{p.name}</td>
                  <td style={{ padding: '15px' }}>
                    <span style={{ background: 'var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{p.category}</span>
                  </td>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>${Number(p.price).toLocaleString('es-CO')}</td>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: p.stock <= p.minStock ? 'var(--danger)' : 'var(--success)' }}>
                    {p.stock}
                    {p.stock <= p.minStock && <span style={{ marginLeft: '6px', fontSize: '0.75rem', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>⚠ Bajo</span>}
                  </td>
                  <td style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.minStock}</td>
                  <td className="no-print" style={{ padding: '15px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn"
                      onClick={() => openEdit(p)}
                      disabled={deleting === p.id}
                      style={{ padding: '6px 14px', background: 'var(--primary)', color: 'white', marginRight: '8px' }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      className="btn"
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={deleting === p.id}
                      style={{ padding: '6px 14px', background: 'var(--danger)', color: 'white' }}
                    >
                      {deleting === p.id ? 'Borrando...' : '🗑 Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: SIEMPRE centrado en pantalla usando position:fixed */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(3px)'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="glass-panel"
            style={{
              padding: '32px',
              width: '100%',
              maxWidth: '520px',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, color: '#0f172a' }}>
                {editingId ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}
              >×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre del Producto *</label>
                <input
                  required
                  autoFocus
                  className="input"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Leche Entera 1L"
                  style={{ fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoría *</label>
                <input
                  required
                  list="categories-list"
                  className="input"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Eje: Lácteos, Fruver, Aseo..."
                />
                <datalist id="categories-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Precio de Venta ($) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    className="input"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Ej: 2500"
                    style={{ fontSize: '1.1rem', fontWeight: 'bold' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock Actual *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    className="input"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="Ej: 30"
                    style={{ fontSize: '1.1rem', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock Mínimo (alerta)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={formData.minStock}
                  onChange={e => setFormData({ ...formData, minStock: e.target.value })}
                  placeholder="Ej: 5"
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Cuando el stock baje de este número, te aparecerá una alerta roja.</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '12px 28px', borderRadius: '8px', border: 'none', background: saving ? '#94a3b8' : 'var(--primary)', color: 'white', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', minWidth: '130px' }}
                >
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
