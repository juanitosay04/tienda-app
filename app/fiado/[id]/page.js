"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

const fmtDate = (d) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function CustomerDetail() {
  const router = useRouter();
  const { id } = useParams();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Modal de acción (fiado o abono)
  const [modal, setModal] = useState(null); // null | 'FIADO' | 'ABONO'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const amountRef = useRef(null);

  // Modal de editar cliente
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '' });

  useEffect(() => { fetchCustomer(); }, [id]);
  useEffect(() => { if (modal && amountRef.current) setTimeout(() => amountRef.current?.focus(), 80); }, [modal]);

  const fetchCustomer = async () => {
    setLoading(true);
    const res = await fetch(`/api/customers/${id}?t=` + Date.now(), { cache: 'no-store' });
    if (!res.ok) { router.push('/fiado'); return; }
    const data = await res.json();
    setCustomer(data);
    setEditForm({ name: data.name, phone: data.phone || '', notes: data.notes || '' });
    setLoading(false);
  };

  const openModal = (type) => { setModal(type); setAmount(''); setDescription(''); };

  const handleTransaction = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(',', '.'));
    if (!val || val <= 0) return;
    setSaving(true);

    const res = await fetch('/api/fiado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: id, type: modal, amount: val, description })
    });

    if (res.ok) { setModal(null); await fetchCustomer(); }
    else { const d = await res.json(); alert('Error: ' + (d.error || 'No se pudo guardar')); }
    setSaving(false);
  };

  const handleDelete = async (txId) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    setDeleting(txId);
    const res = await fetch(`/api/fiado/${txId}`, { method: 'DELETE' });
    if (res.ok) await fetchCustomer();
    else alert('No se pudo eliminar');
    setDeleting(null);
  };

  const handleDeleteCustomer = async () => {
    if (!confirm(`¿Eliminar a "${customer?.name}" y todo su historial de fiados?`)) return;
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/fiado');
    else alert('Error al eliminar cliente');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm)
    });
    if (res.ok) { setEditModal(false); await fetchCustomer(); }
    else { const d = await res.json(); alert('Error: ' + d.error); }
    setSaving(false);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: "'Outfit',sans-serif", color: '#94a3b8' }}>Cargando...</div>;
  if (!customer) return null;

  const balance = customer.balance;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={() => router.push('/fiado')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: '500' }}>← Fiados</button>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: balance > 0 ? '#fef2f2' : '#f0fdf4', border: `2px solid ${balance > 0 ? '#fca5a5' : '#86efac'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '800', color: balance > 0 ? '#dc2626' : '#16a34a' }}>
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>{customer.name}</h1>
              {customer.phone && <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>📞 {customer.phone}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setEditModal(true)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>✏️ Editar</button>
            <button onClick={handleDeleteCustomer} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fff5f5', color: '#dc2626', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>🗑 Eliminar</button>
          </div>
        </div>

        {/* Saldo */}
        <div style={{ marginTop: '16px', padding: '18px 20px', borderRadius: '12px', background: balance > 0 ? 'linear-gradient(135deg, #fef2f2, #fff5f5)' : 'linear-gradient(135deg, #f0fdf4, #f7fef7)', border: `1px solid ${balance > 0 ? '#fecaca' : '#bbf7d0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '700', color: balance > 0 ? '#dc2626' : '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {balance > 0 ? '💳 Deuda Pendiente' : balance < 0 ? '✅ Saldo a Favor' : '✅ Al Día'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '2rem', fontWeight: '900', color: balance > 0 ? '#991b1b' : '#14532d' }}>
              ${Math.abs(balance).toLocaleString('es-CO')}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Fiado total: ${customer.totalFiado.toLocaleString('es-CO')} · Abonado: ${customer.totalAbono.toLocaleString('es-CO')}
            </p>
          </div>
          {/* Botones de acción */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => openModal('FIADO')}
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              + Agregar Fiado
            </button>
            <button onClick={() => openModal('ABONO')} disabled={balance <= 0}
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: balance <= 0 ? '#e2e8f0' : '#16a34a', color: balance <= 0 ? '#94a3b8' : 'white', fontWeight: '700', cursor: balance <= 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              💵 Registrar Abono
            </button>
          </div>
        </div>

        {customer.notes && (
          <p style={{ margin: '10px 0 0', fontSize: '0.83rem', color: '#64748b', padding: '8px 12px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fef08a' }}>📝 {customer.notes}</p>
        )}
      </div>

      {/* ── Historial ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Historial de Movimientos
        </h3>

        {customer.transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <p>Sin movimientos aún.</p>
            <button onClick={() => openModal('FIADO')} style={{ marginTop: '10px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>+ Registrar primer fiado</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {customer.transactions.map(tx => (
              <div key={tx.id} style={{ background: 'white', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', border: `1px solid ${tx.type === 'FIADO' ? '#fecaca' : '#bbf7d0'}`, opacity: deleting === tx.id ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: tx.type === 'FIADO' ? '#fef2f2' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                  {tx.type === 'FIADO' ? '💳' : '💵'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1e293b' }}>
                    {tx.description || (tx.type === 'FIADO' ? 'Fiado registrado' : 'Abono recibido')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{fmtDate(tx.date)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: tx.type === 'FIADO' ? '#dc2626' : '#16a34a' }}>
                    {tx.type === 'FIADO' ? '+' : '-'}${tx.amount.toLocaleString('es-CO')}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '700', color: tx.type === 'FIADO' ? '#ef4444' : '#22c55e', textTransform: 'uppercase' }}>
                    {tx.type === 'FIADO' ? 'FIADO' : 'ABONO'}
                  </div>
                </div>
                <button onClick={() => handleDelete(tx.id)} disabled={deleting === tx.id}
                  style={{ marginLeft: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '1.1rem', padding: '4px', lineHeight: 1, borderRadius: '4px' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Fiado / Abono ── */}
      {modal && (
        <div onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px 16px', background: modal === 'FIADO' ? 'linear-gradient(135deg,#fef2f2,#fff5f5)' : 'linear-gradient(135deg,#f0fdf4,#f7fef7)', borderBottom: `1px solid ${modal === 'FIADO' ? '#fecaca' : '#bbf7d0'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                    {modal === 'FIADO' ? '💳 Agregar Fiado' : '💵 Registrar Abono'}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>Cliente: <strong>{customer.name}</strong></p>
                </div>
                <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', color: '#64748b', fontSize: '1.1rem' }}>×</button>
              </div>
              {modal === 'ABONO' && balance > 0 && (
                <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#dc2626', fontWeight: '600' }}>
                  Deuda actual: ${balance.toLocaleString('es-CO')}
                </p>
              )}
            </div>
            <form onSubmit={handleTransaction} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monto ($) *</label>
                <input
                  ref={amountRef}
                  required type="number" step="100" min="1"
                  className="input"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && setModal(null)}
                  placeholder="Ej: 15000"
                  style={{ fontSize: '1.6rem', fontWeight: '800', textAlign: 'center', borderRadius: '10px', border: `2px solid ${modal === 'FIADO' ? '#fca5a5' : '#86efac'}`, padding: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descripción (opcional)</label>
                <input className="input" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder={modal === 'FIADO' ? 'Ej: 1kg carne, 2 leches...' : 'Ej: Pagó con billete de 50mil'}
                  style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
              </div>
              {/* Preview para abono */}
              {modal === 'ABONO' && amount && parseFloat(amount) > 0 && balance > 0 && (
                <div style={{ padding: '12px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center', fontSize: '0.85rem', color: '#16a34a', fontWeight: '600' }}>
                  Quedaría debiendo: ${Math.max(0, balance - parseFloat(amount)).toLocaleString('es-CO')}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <button type="button" onClick={() => setModal(null)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={saving}
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: saving ? '#94a3b8' : (modal === 'FIADO' ? '#dc2626' : '#16a34a'), color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Guardando...' : (modal === 'FIADO' ? '✅ Registrar Fiado' : '✅ Registrar Abono')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Editar Cliente ── */}
      {editModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setEditModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>✏️ Editar Cliente</h2>
              <button onClick={() => setEditModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', color: '#64748b', fontSize: '1.1rem' }}>×</button>
            </div>
            <form onSubmit={handleEdit} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre *</label>
                <input autoFocus required className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teléfono</label>
                <input type="tel" className="input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nota</label>
                <input className="input" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <button type="button" onClick={() => setEditModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Guardando...' : '✅ Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
