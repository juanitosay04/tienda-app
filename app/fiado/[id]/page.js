"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

const fmtDate = (d) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const getUnit = (name) => { const m = name.match(/\(([^)]+)\)/); return m ? m[1] : 'Und'; };
const isFruver = (p) => p.category === 'Fruver';
const fmtQty = (q) => parseFloat(q.toFixed(3)).toString();

export default function CustomerDetail() {
  const router = useRouter();
  const { id } = useParams();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Modal fiado manual / abono
  const [modal, setModal] = useState(null); // null | 'FIADO' | 'ABONO'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const amountRef = useRef(null);

  // Mini-POS para fiado con productos
  const [posModal, setPosModal] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('Todas');
  const [cart, setCart] = useState([]);
  const [weightModal, setWeightModal] = useState({ open: false, product: null, amount: '' });
  const weightRef = useRef(null);

  // Tirilla de confirmación
  const [tiraModal, setTiraModal] = useState(false);

  // Modal editar cliente
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '' });

  useEffect(() => { fetchCustomer(); }, [id]);
  useEffect(() => { if (modal && amountRef.current) setTimeout(() => amountRef.current?.focus(), 80); }, [modal]);
  useEffect(() => { if (weightModal.open && weightRef.current) setTimeout(() => weightRef.current?.focus(), 80); }, [weightModal.open]);

  useEffect(() => {
    if (posModal && allProducts.length === 0) {
      fetch('/api/products?t=' + Date.now(), { cache: 'no-store' })
        .then(r => r.json()).then(d => setAllProducts(Array.isArray(d) ? d : []));
    }
  }, [posModal]);

  const fetchCustomer = async () => {
    setLoading(true);
    const res = await fetch(`/api/customers/${id}?t=` + Date.now(), { cache: 'no-store' });
    if (!res.ok) { router.push('/fiado'); return; }
    const data = await res.json();
    setCustomer(data);
    setEditForm({ name: data.name, phone: data.phone || '', notes: data.notes || '' });
    setLoading(false);
  };

  // ── Carrito mini-POS ──
  const handleProductClick = (product) => {
    if (isFruver(product)) {
      setWeightModal({ open: true, product, amount: '' });
    } else {
      addToCart(product, 1);
    }
  };

  const addToCart = (product, qty = 1) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: parseFloat((i.quantity + qty).toFixed(3)) } : i);
      return [...prev, { product, quantity: qty }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (!item) return prev;
      if (isFruver(item.product)) {
        return item.quantity <= 0.5 ? prev.filter(i => i.product.id !== productId) : prev.map(i => i.product.id === productId ? { ...i, quantity: parseFloat((i.quantity - 0.5).toFixed(3)) } : i);
      }
      return item.quantity <= 1 ? prev.filter(i => i.product.id !== productId) : prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const confirmWeight = () => {
    const qty = parseFloat(weightModal.amount.replace(',', '.'));
    if (!qty || qty <= 0) return;
    addToCart(weightModal.product, qty);
    setWeightModal({ open: false, product: null, amount: '' });
  };

  const cartTotal = cart.reduce((s, i) => s + Math.round(i.product.price * i.quantity), 0);

  // ── Confirmar fiado con productos ──
  const handleConfirmProductFiado = async () => {
    if (cart.length === 0 || saving) return;
    setSaving(true);

    const desc = cart.map(i => {
      const q = isFruver(i.product) ? `${fmtQty(i.quantity)} ${getUnit(i.product.name)}` : `x${i.quantity}`;
      return `${i.product.name} ${q}`;
    }).join(' | ');

    const items = cart.map(i => ({ productId: i.product.id, quantity: i.quantity }));

    const res = await fetch('/api/fiado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: id, type: 'FIADO', amount: cartTotal, description: desc, items })
    });

    if (res.ok) {
      setTiraModal(false);
      setPosModal(false);
      setCart([]);
      setPosSearch('');
      setPosCategory('Todas');
      setAllProducts([]);
      await fetchCustomer();
    } else {
      const d = await res.json();
      alert('Error: ' + (d.error || 'No se pudo guardar'));
    }
    setSaving(false);
  };

  // ── Fiado / Abono manual ──
  const handleTransaction = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(',', '.'));
    if (!val || val <= 0) return;
    setSaving(true);
    const res = await fetch('/api/fiado', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: id, type: modal, amount: val, description })
    });
    if (res.ok) { setModal(null); await fetchCustomer(); }
    else { const d = await res.json(); alert('Error: ' + (d.error || 'No se pudo guardar')); }
    setSaving(false);
  };

  const handleDelete = async (txId) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    setDeleting(txId);
    await fetch(`/api/fiado/${txId}`, { method: 'DELETE' });
    await fetchCustomer();
    setDeleting(null);
  };

  const handleDeleteCustomer = async () => {
    if (!confirm(`¿Eliminar a "${customer?.name}" y todo su historial?`)) return;
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/fiado');
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`/api/customers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
    if (res.ok) { setEditModal(false); await fetchCustomer(); }
    setSaving(false);
  };

  // Filtros mini-POS
  const categories = allProducts.length ? ['Todas', ...new Set(allProducts.map(p => p.category))] : [];
  const filteredProducts = allProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(posSearch.toLowerCase());
    const matchCat = posCategory === 'Todas' || p.category === posCategory;
    return matchSearch && matchCat && p.stock > 0;
  });

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
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: balance > 0 ? '#fef2f2' : '#f0fdf4', border: `2px solid ${balance > 0 ? '#fca5a5' : '#86efac'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: '800', color: balance > 0 ? '#dc2626' : '#16a34a' }}>
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>{customer.name}</h1>
              {customer.phone && <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>📞 {customer.phone}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setEditModal(true)} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}>✏️ Editar</button>
            <button onClick={handleDeleteCustomer} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fff5f5', color: '#dc2626', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}>🗑 Eliminar</button>
          </div>
        </div>

        {/* Saldo */}
        <div style={{ marginTop: '16px', padding: '18px 20px', borderRadius: '12px', background: balance > 0 ? 'linear-gradient(135deg,#fef2f2,#fff5f5)' : 'linear-gradient(135deg,#f0fdf4,#f7fef7)', border: `1px solid ${balance > 0 ? '#fecaca' : '#bbf7d0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: '700', color: balance > 0 ? '#dc2626' : '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {balance > 0 ? '💳 Deuda Pendiente' : balance < 0 ? '✅ Saldo a Favor' : '✅ Al Día'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '2rem', fontWeight: '900', color: balance > 0 ? '#991b1b' : '#14532d' }}>
              ${Math.abs(balance).toLocaleString('es-CO')}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Fiado: ${customer.totalFiado.toLocaleString('es-CO')} · Abonado: ${customer.totalAbono.toLocaleString('es-CO')}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Fiado con productos (principal) */}
            <button onClick={() => { setPosModal(true); setCart([]); }}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              🛒 Fiado con Productos
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setModal('FIADO'); setAmount(''); setDescription(''); }}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #fca5a5', background: 'white', color: '#dc2626', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                💳 Fiado Manual
              </button>
              <button onClick={() => { setModal('ABONO'); setAmount(''); setDescription(''); }} disabled={balance <= 0}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none', background: balance <= 0 ? '#e2e8f0' : '#16a34a', color: balance <= 0 ? '#94a3b8' : 'white', fontWeight: '700', cursor: balance <= 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                💵 Registrar Abono
              </button>
            </div>
          </div>
        </div>
        {customer.notes && <p style={{ margin: '10px 0 0', fontSize: '0.83rem', color: '#64748b', padding: '8px 12px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fef08a' }}>📝 {customer.notes}</p>}
      </div>

      {/* ── Historial ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '0.82rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Historial de Movimientos</h3>
        {customer.transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <p>Sin movimientos aún.</p>
            <button onClick={() => { setPosModal(true); setCart([]); }} style={{ marginTop: '10px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>🛒 Registrar primer fiado</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {customer.transactions.map(tx => (
              <div key={tx.id} style={{ background: 'white', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '14px', border: `1px solid ${tx.type === 'FIADO' ? '#fecaca' : '#bbf7d0'}`, opacity: deleting === tx.id ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: tx.type === 'FIADO' ? '#fef2f2' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, marginTop: '2px' }}>
                  {tx.type === 'FIADO' ? '🛒' : '💵'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1e293b', lineHeight: '1.4' }}>
                    {tx.description || (tx.type === 'FIADO' ? 'Fiado registrado' : 'Abono recibido')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>{fmtDate(tx.date)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: tx.type === 'FIADO' ? '#dc2626' : '#16a34a' }}>
                      {tx.type === 'FIADO' ? '+' : '-'}${tx.amount.toLocaleString('es-CO')}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: tx.type === 'FIADO' ? '#ef4444' : '#22c55e', textTransform: 'uppercase' }}>
                      {tx.type}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(tx.id)} disabled={deleting === tx.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '1.1rem', padding: '4px', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          MINI-POS MODAL (Fiado con Productos)
      ════════════════════════════════════════ */}
      {posModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '16px', width: '100%', maxWidth: '960px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}>

            {/* Header mini-POS */}
            <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>🛒 Seleccionar Productos para Fiar</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Cliente: <strong>{customer.name}</strong> · Deuda actual: <strong style={{ color: '#dc2626' }}>${balance.toLocaleString('es-CO')}</strong></p>
              </div>
              <button onClick={() => { setPosModal(false); setCart([]); }}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer', color: '#475569', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* ── Panel izquierdo: Productos ── */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #e2e8f0' }}>
                {/* Buscador y categorías */}
                <div style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid #f1f5f9' }}>
                  <input autoFocus className="input" placeholder="🔍 Buscar producto..." value={posSearch} onChange={e => setPosSearch(e.target.value)}
                    style={{ marginBottom: '10px', fontSize: '0.88rem', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '8px' }} />
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {categories.map(cat => (
                      <button key={cat} onClick={() => setPosCategory(cat)}
                        style={{ padding: '5px 12px', borderRadius: '16px', border: 'none', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.78rem', fontFamily: 'inherit', transition: 'all 0.12s',
                          background: posCategory === cat ? '#dc2626' : '#f1f5f9',
                          color: posCategory === cat ? 'white' : '#64748b'
                        }}>
                        {cat === 'Fruver' ? '🥦 ' : ''}{cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grilla de productos */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                  {allProducts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando productos...</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                      {filteredProducts.map(product => {
                        const fruver = isFruver(product);
                        const unit = getUnit(product.name);
                        const inCart = cart.find(i => i.product.id === product.id);
                        return (
                          <div key={product.id} onClick={() => handleProductClick(product)}
                            style={{ background: 'white', borderRadius: '10px', padding: '12px', cursor: 'pointer', minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                              border: inCart ? '2px solid #dc2626' : (fruver ? '1px solid #bbf7d0' : '1px solid #e2e8f0'),
                              backgroundColor: inCart ? '#fff5f5' : (fruver ? '#f0fdf4' : 'white'),
                              transition: 'all 0.1s', boxShadow: inCart ? '0 0 0 1px rgba(220,38,38,0.1)' : 'none'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = inCart ? '0 0 0 1px rgba(220,38,38,0.1)' : 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#1e293b', lineHeight: '1.3' }}>{product.name}</div>
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: fruver ? '#16a34a' : '#dc2626' }}>
                                ${product.price.toLocaleString('es-CO')}{fruver && <span style={{ fontSize: '0.7rem', color: '#64748b' }}>/{unit}</span>}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                {fruver && <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: '700' }}>⚖ Peso</span>}
                                <span style={{ fontSize: '0.68rem', fontWeight: '600', padding: '1px 5px', borderRadius: '4px', marginLeft: 'auto',
                                  backgroundColor: product.stock <= product.minStock ? '#fee2e2' : '#dcfce7',
                                  color: product.stock <= product.minStock ? '#ef4444' : '#16a34a'
                                }}>{product.stock} und</span>
                              </div>
                              {inCart && <div style={{ marginTop: '4px', fontSize: '0.68rem', fontWeight: '700', color: '#dc2626' }}>✓ {fmtQty(inCart.quantity)} en cuenta</div>}
                            </div>
                          </div>
                        );
                      })}
                      {filteredProducts.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Sin resultados</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Panel derecho: Cuenta del fiado ── */}
              <div style={{ width: '300px', display: 'flex', flexDirection: 'column', background: 'white', flexShrink: 0 }}>
                <div style={{ padding: '14px 16px', borderBottom: '2px dashed #e2e8f0', background: '#fafafa' }}>
                  <h3 style={{ margin: 0, textAlign: 'center', fontSize: '0.82rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cuenta de {customer.name}</h3>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8' }}>
                      <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🛒</p>
                      <p style={{ fontSize: '0.82rem' }}>Selecciona productos de la lista</p>
                    </div>
                  ) : (
                    cart.map(item => {
                      const fruver = isFruver(item.product);
                      const unit = getUnit(item.product.name);
                      const subtotal = Math.round(item.product.price * item.quantity);
                      return (
                        <div key={item.product.id} style={{ padding: '10px', marginBottom: '6px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                          <div style={{ fontWeight: '600', fontSize: '0.82rem', color: '#1e293b', marginBottom: '6px', lineHeight: '1.3' }}>{item.product.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {fruver ? (
                                <button onClick={() => setWeightModal({ open: true, product: item.product, amount: '' })}
                                  style={{ padding: '3px 8px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '5px', cursor: 'pointer', fontSize: '0.72rem', color: '#16a34a', fontWeight: '600', fontFamily: 'inherit' }}>
                                  ⚖ {fmtQty(item.quantity)} {unit}
                                </button>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #fecaca', borderRadius: '6px', overflow: 'hidden' }}>
                                  <button onClick={() => removeFromCart(item.product.id)} style={{ padding: '3px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#dc2626', fontFamily: 'inherit' }}>-</button>
                                  <span style={{ padding: '0 8px', fontWeight: 'bold', fontSize: '0.85rem' }}>{item.quantity}</span>
                                  <button onClick={() => addToCart(item.product, 1)} style={{ padding: '3px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#dc2626', fontFamily: 'inherit' }}>+</button>
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: '700', color: '#dc2626', fontSize: '0.88rem' }}>${subtotal.toLocaleString('es-CO')}</span>
                              <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', fontSize: '1rem', padding: '2px', fontFamily: 'inherit' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                                onMouseLeave={e => e.currentTarget.style.color = '#fca5a5'}>×</button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Total y botón confirmar */}
                <div style={{ padding: '14px 16px', borderTop: '2px dashed #e2e8f0', background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '900', marginBottom: '10px', color: '#0f172a' }}>
                    <span>TOTAL FIADO</span>
                    <span style={{ color: '#dc2626' }}>${cartTotal.toLocaleString('es-CO')}</span>
                  </div>
                  {cartTotal > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '10px', textAlign: 'center' }}>
                      Deuda total quedaría: <strong style={{ color: '#dc2626' }}>${(balance + cartTotal).toLocaleString('es-CO')}</strong>
                    </div>
                  )}
                  <button onClick={() => setTiraModal(true)} disabled={cart.length === 0}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.92rem', transition: 'all 0.2s',
                      background: cart.length === 0 ? '#e2e8f0' : '#dc2626',
                      color: cart.length === 0 ? '#94a3b8' : 'white',
                      boxShadow: cart.length === 0 ? 'none' : '0 4px 8px rgba(220,38,38,0.25)'
                    }}>
                    🧾 Ver Tirilla y Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de peso (Fruver dentro del POS) ── */}
      {weightModal.open && weightModal.product && (
        <div onClick={e => { if (e.target === e.currentTarget) setWeightModal({ open: false, product: null, amount: '' }); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '340px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '18px 22px 14px', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderBottom: '1px solid #bbf7d0' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>⚖ Fruver — Por Peso</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '1rem', color: '#0f172a', fontWeight: '700' }}>{weightModal.product.name}</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#16a34a', fontWeight: '600' }}>${weightModal.product.price.toLocaleString('es-CO')} / {getUnit(weightModal.product.name)}</p>
            </div>
            <div style={{ padding: '18px 22px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>Cantidad ({getUnit(weightModal.product.name)})</label>
              <input ref={weightRef} type="number" step="0.1" min="0.1" className="input"
                value={weightModal.amount} onChange={e => setWeightModal(m => ({ ...m, amount: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') confirmWeight(); if (e.key === 'Escape') setWeightModal({ open: false, product: null, amount: '' }); }}
                placeholder="Ej: 1.5" style={{ fontSize: '1.6rem', fontWeight: '700', textAlign: 'center', border: '2px solid #bbf7d0', borderRadius: '10px', padding: '12px' }} />
              {weightModal.amount && parseFloat(weightModal.amount) > 0 && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{parseFloat(weightModal.amount)} {getUnit(weightModal.product.name)} × ${weightModal.product.price.toLocaleString('es-CO')}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '1.3rem', fontWeight: '900', color: '#16a34a' }}>= ${Math.round(parseFloat(weightModal.amount) * weightModal.product.price).toLocaleString('es-CO')}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button onClick={() => setWeightModal({ open: false, product: null, amount: '' })} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', color: '#475569' }}>Cancelar</button>
                <button onClick={confirmWeight} disabled={!weightModal.amount || parseFloat(weightModal.amount) <= 0}
                  style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: '#16a34a', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>✅ Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tirilla de confirmación ── */}
      {tiraModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setTiraModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001, backdropFilter: 'blur(6px)', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '380px', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.35)' }}>
            <div style={{ padding: '20px 24px 14px', background: 'linear-gradient(135deg,#fef2f2,#fff5f5)', borderBottom: '1px solid #fecaca', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📒 Tirilla de Fiado</p>
              <h2 style={{ margin: '6px 0 4px', fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>{customer.name}</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
            </div>

            <div style={{ padding: '16px 24px', borderBottom: '2px dashed #e2e8f0', maxHeight: '280px', overflowY: 'auto' }}>
              {cart.map(item => {
                const fruver = isFruver(item.product);
                const unit = getUnit(item.product.name);
                const subtotal = Math.round(item.product.price * item.quantity);
                return (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dotted #e2e8f0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#1e293b' }}>{item.product.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {fmtQty(item.quantity)} {fruver ? unit : 'und'} × ${item.product.price.toLocaleString('es-CO')}
                      </div>
                    </div>
                    <div style={{ fontWeight: '700', color: '#dc2626', marginLeft: '12px' }}>${subtotal.toLocaleString('es-CO')}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '14px 24px', borderBottom: '2px dashed #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>
                <span>Deuda anterior:</span><span>${balance.toLocaleString('es-CO')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#dc2626', fontWeight: '600', marginBottom: '8px' }}>
                <span>Este fiado:</span><span>+${cartTotal.toLocaleString('es-CO')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: '900', color: '#7f1d1d', borderTop: '1px solid #fecaca', paddingTop: '8px' }}>
                <span>TOTAL DEBE:</span><span>${(balance + cartTotal).toLocaleString('es-CO')}</span>
              </div>
            </div>

            <div style={{ padding: '16px 24px', display: 'flex', gap: '10px' }}>
              <button onClick={() => setTiraModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}>← Editar</button>
              <button onClick={handleConfirmProductFiado} disabled={saving}
                style={{ flex: 2, padding: '11px', borderRadius: '8px', border: 'none', background: saving ? '#94a3b8' : '#dc2626', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}>
                {saving ? 'Guardando...' : '✅ Confirmar Fiado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal fiado manual / abono ── */}
      {modal && (
        <div onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px 16px', background: modal === 'FIADO' ? 'linear-gradient(135deg,#fef2f2,#fff5f5)' : 'linear-gradient(135deg,#f0fdf4,#f7fef7)', borderBottom: `1px solid ${modal === 'FIADO' ? '#fecaca' : '#bbf7d0'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                    {modal === 'FIADO' ? '💳 Fiado Manual' : '💵 Registrar Abono'}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>Cliente: <strong>{customer.name}</strong></p>
                </div>
                <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', color: '#64748b', fontSize: '1.1rem' }}>×</button>
              </div>
              {modal === 'ABONO' && balance > 0 && <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#dc2626', fontWeight: '600' }}>Deuda actual: ${balance.toLocaleString('es-CO')}</p>}
            </div>
            <form onSubmit={handleTransaction} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>Monto ($) *</label>
                <input ref={amountRef} required type="number" step="100" min="1" className="input" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Escape' && setModal(null)} placeholder="Ej: 15000"
                  style={{ fontSize: '1.6rem', fontWeight: '800', textAlign: 'center', borderRadius: '10px', border: `2px solid ${modal === 'FIADO' ? '#fca5a5' : '#86efac'}`, padding: '12px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>Descripción (opcional)</label>
                <input className="input" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder={modal === 'FIADO' ? 'Ej: 1kg carne, 2 leches...' : 'Ej: Pagó con billete de 50mil'}
                  style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
              </div>
              {modal === 'ABONO' && amount && parseFloat(amount) > 0 && balance > 0 && (
                <div style={{ padding: '10px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center', fontSize: '0.85rem', color: '#16a34a', fontWeight: '600' }}>
                  Quedaría debiendo: ${Math.max(0, balance - parseFloat(amount)).toLocaleString('es-CO')}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <button type="button" onClick={() => setModal(null)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: saving ? '#94a3b8' : (modal === 'FIADO' ? '#dc2626' : '#16a34a'), color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Guardando...' : (modal === 'FIADO' ? '✅ Registrar' : '✅ Abonar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal editar cliente ── */}
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
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>Nombre *</label>
                <input autoFocus required className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>Teléfono</label>
                <input type="tel" className="input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>Nota</label>
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
