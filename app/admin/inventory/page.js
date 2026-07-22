"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InventoryManager() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', category: '', price: '', stock: '', minStock: '5' });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: '', category: '', price: '', stock: '', minStock: '5' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setFormData({ name: p.name, category: p.category, price: p.price, stock: p.stock, minStock: p.minStock });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingId ? `/api/products/${editingId}` : '/api/products';
    const method = editingId ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    setShowModal(false);
    fetchProducts();
  };

  const handleDelete = async (id) => {
    if (confirm('¿Seguro que deseas eliminar este producto?')) {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    }
  };

  const categories = [...new Set(products.map(p => p.category))];

  return (
    <div className="animate-fade-in" style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
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

      {loading ? <p>Cargando catálogo...</p> : (
        <div className="glass-panel" style={{ overflowX: 'auto', background: 'var(--bg-panel)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '15px' }}>Producto</th>
                <th style={{ padding: '15px' }}>Categoría</th>
                <th style={{ padding: '15px' }}>Precio</th>
                <th style={{ padding: '15px' }}>Stock</th>
                <th className="no-print" style={{ padding: '15px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px' }}>{p.name}</td>
                  <td style={{ padding: '15px' }}><span style={{ background: 'var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{p.category}</span></td>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>${p.price.toLocaleString('es-CO')}</td>
                  <td style={{ padding: '15px', color: p.stock <= p.minStock ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                    {p.stock}
                  </td>
                  <td className="no-print" style={{ padding: '15px', textAlign: 'right' }}>
                    <button className="btn" onClick={() => openEdit(p)} style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', marginRight: '5px' }}>Editar</button>
                    <button className="btn" onClick={() => handleDelete(p.id)} style={{ padding: '6px 12px', background: 'var(--danger)', color: 'white' }}>Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '30px', width: '100%', maxWidth: '500px', background: '#f8fafc' }}>
            <h2 style={{ marginBottom: '20px' }}>{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nombre</label>
                <input required className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Categoría (Elige o escribe una nueva)</label>
                <input required list="categories" className="input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                <datalist id="categories">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Precio ($)</label>
                  <input required type="number" className="input" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Stock</label>
                  <input required type="number" className="input" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ background: 'var(--border-color)', color: 'var(--text-main)' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Guardar Cambios' : 'Crear Producto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
