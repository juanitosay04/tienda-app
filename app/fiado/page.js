"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const normalizeText = (str = '') =>
  String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function FiadoPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [filter, setFilter] = useState('todos'); // 'todos' | 'con-deuda' | 'al-dia'

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const res = await fetch('/api/customers?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const normSearch = normalizeText(search).trim();
    return customers
      .filter(c => {
        const matchSearch = normalizeText(c.name).includes(normSearch) ||
          (c.phone && c.phone.includes(search));
        const matchFilter = filter === 'todos' || (filter === 'con-deuda' ? c.balance > 0 : c.balance <= 0);
        return matchSearch && matchFilter;
      })
      .sort((a, b) => b.balance - a.balance); // los que más deben primero
  }, [customers, search, filter]);

  const totalDeuda = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);
  const conDeuda = customers.filter(c => c.balance > 0).length;

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setShowModal(false);
      setForm({ name: '', phone: '', notes: '' });
      await fetchCustomers();
    } else {
      const d = await res.json();
      alert('Error: ' + (d.error || 'No se pudo crear el cliente'));
    }
    setSaving(false);
  };

  const fmtDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem', fontWeight: '500', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>← Inicio</button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>🏪 Tienda Donde Juancho</h1>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Libro de Fiados · {customers.length} clientes ({conDeuda} con deuda)</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}>
          + Nuevo Cliente
        </button>
      </div>

      {/* ── Resumen ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px 24px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ padding: '14px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💳 Total Fiado</p>
          <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#7f1d1d' }}>${totalDeuda.toLocaleString('es-CO')}</p>
        </div>
        <div style={{ padding: '14px', background: '#fff7ed', borderRadius: '10px', border: '1px solid #fed7aa' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>👥 Con Deuda</p>
          <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#7c2d12' }}>{conDeuda} clientes</p>
        </div>
        <div style={{ padding: '14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✅ Al Día</p>
          <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#14532d' }}>{customers.length - conDeuda} clientes</p>
        </div>
      </div>

      {/* ── Buscador y filtros ── */}
      <div style={{ padding: '14px 24px', display: 'flex', gap: '12px', alignItems: 'center', background: 'white', borderBottom: '1px solid #f1f5f9' }}>
        <input
          className="input"
          placeholder="🔍 Buscar por nombre o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          style={{ flex: 1, maxWidth: '400px', fontSize: '0.9rem', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '8px' }}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          {[['todos', 'Todos'], ['con-deuda', 'Con Deuda'], ['al-dia', 'Al Día']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              style={{ padding: '7px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', fontFamily: 'inherit', transition: 'all 0.15s',
                background: filter === val ? '#3b82f6' : '#f1f5f9',
                color: filter === val ? 'white' : '#64748b'
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista de clientes ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Cargando clientes...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <p style={{ fontSize: '2rem', marginBottom: '12px' }}>📒</p>
            <p style={{ fontWeight: '500' }}>{search ? 'No se encontró ese cliente' : 'No hay clientes aún'}</p>
            {!search && <button onClick={() => setShowModal(true)} style={{ marginTop: '12px', padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>+ Agregar primer cliente</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(c => (
              <div key={c.id}
                onClick={() => router.push(`/fiado/${c.id}`)}
                style={{ background: 'white', borderRadius: '12px', padding: '16px 20px', cursor: 'pointer', border: c.balance > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}>

                {/* Avatar */}
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: c.balance > 0 ? '#fef2f2' : '#f0fdf4', border: c.balance > 0 ? '2px solid #fca5a5' : '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '700', color: c.balance > 0 ? '#dc2626' : '#16a34a', flexShrink: 0 }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px', display: 'flex', gap: '10px' }}>
                    {c.phone && <span>📞 {c.phone}</span>}
                    {c.lastTransaction && <span>Último mov: {fmtDate(c.lastTransaction.date)}</span>}
                  </div>
                </div>

                {/* Balance */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {c.balance > 0 ? (
                    <>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#dc2626' }}>
                        ${c.balance.toLocaleString('es-CO')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: '600' }}>DEBE</div>
                    </>
                  ) : c.balance < 0 ? (
                    <>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#16a34a' }}>
                        +${Math.abs(c.balance).toLocaleString('es-CO')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600' }}>A FAVOR</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#94a3b8' }}>$0</div>
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600' }}>AL DÍA ✓</div>
                    </>
                  )}
                </div>

                <span style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal nuevo cliente ── */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>👤 Nuevo Cliente</h2>
              <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', color: '#64748b', fontSize: '1.1rem' }}>×</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre *</label>
                <input autoFocus required className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: María González" style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teléfono (opcional)</label>
                <input type="tel" className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Ej: 3001234567" style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nota (opcional)</label>
                <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ej: Vive en la esquina" style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: saving ? '#94a3b8' : '#3b82f6', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Guardando...' : '✅ Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
