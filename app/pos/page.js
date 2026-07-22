"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Extrae la unidad del nombre: "Papa (Kilo)" → "Kilo", "Cilantro (Atado)" → "Atado"
const getUnit = (name) => {
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1] : 'Und';
};

// Productos que se venden por peso/cantidad variable (categoría Fruver)
const isWeightProduct = (product) => product.category === 'Fruver';

// Mostrar cantidad limpia: 1.00 → "1", 0.50 → "0.5", 1.25 → "1.25"
const fmtQty = (qty) => parseFloat(qty.toFixed(3)).toString();

export default function POS() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // Modal de peso/cantidad para Fruver
  const [weightModal, setWeightModal] = useState({ open: false, product: null, amount: '' });
  const weightInputRef = useRef(null);

  // Modal Cuadre de Caja
  const [showCaja, setShowCaja] = useState(false);
  const [cajaStats, setCajaStats] = useState(null);
  const [actualCash, setActualCash] = useState('');

  // Modal Registrar Gasto
  const [showExpense, setShowExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', paymentMethod: 'EFECTIVO' });

  useEffect(() => {
    fetch('/api/products?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => { setProducts(data); setLoading(false); });
  }, []);

  // Focus automático en el input de peso cuando abre el modal
  useEffect(() => {
    if (weightModal.open && weightInputRef.current) {
      setTimeout(() => weightInputRef.current?.focus(), 80);
    }
  }, [weightModal.open]);

  // ── Manejo del carrito ──
  const handleProductClick = (product) => {
    if (isWeightProduct(product)) {
      setWeightModal({ open: true, product, amount: '' });
    } else {
      addToCart(product, 1);
    }
  };

  const addToCart = (product, qty = 1) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: parseFloat((item.quantity + qty).toFixed(3)) }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: qty }]);
    }
  };

  const confirmWeightAdd = () => {
    const qty = parseFloat(weightModal.amount.replace(',', '.'));
    if (!qty || qty <= 0) return;
    addToCart(weightModal.product, qty);
    setWeightModal({ open: false, product: null, amount: '' });
  };

  const removeFromCart = (productId) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;
    if (isWeightProduct(item.product)) {
      // Para fruver: restar 0.5 o eliminar si es ≤ 0.5
      if (item.quantity <= 0.5) {
        setCart(cart.filter(i => i.product.id !== productId));
      } else {
        setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: parseFloat((i.quantity - 0.5).toFixed(3)) } : i));
      }
    } else {
      if (item.quantity > 1) {
        setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i));
      } else {
        setCart(cart.filter(i => i.product.id !== productId));
      }
    }
  };

  const deleteFromCart = (productId) => setCart(cart.filter(i => i.product.id !== productId));

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // ── Cobrar ──
  const handleCobrar = async (method) => {
    if (cart.length === 0) return;
    setProcessing(true);

    const items = cart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      total: Math.round(item.product.price * item.quantity)
    }));

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'VENTA', items, paymentMethod: method })
    });

    if (res.ok) {
      alert('¡Venta registrada con éxito!');
      setCart([]);
      const newData = await fetch('/api/products?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
      setProducts(newData);
    } else {
      alert('Error al registrar la venta');
    }
    setProcessing(false);
  };

  // ── Cuadre de Caja ──
  const openCierreCaja = async () => {
    const res = await fetch('/api/caja?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    setCajaStats(data);
    setActualCash('');
    setShowCaja(true);
  };

  const submitCierreCaja = async (e) => {
    e.preventDefault();
    if (!cajaStats) return;
    setProcessing(true);
    const res = await fetch('/api/caja', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedCash: cajaStats.expectedCash,
        actualCash: actualCash,
        totalTransfers: cajaStats.totalTransfers,
        salesCount: cajaStats.salesCount,
        totalExpensesEfectivo: cajaStats.totalExpensesEfectivo
      })
    });
    if (res.ok) { alert('Cierre de caja registrado exitosamente.'); setShowCaja(false); }
    else { alert('Error al cerrar caja'); }
    setProcessing(false);
  };

  // ── Gastos ──
  const submitExpense = async (e) => {
    e.preventDefault();
    setProcessing(true);
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseForm)
    });
    if (res.ok) { alert('Gasto registrado exitosamente'); setShowExpense(false); setExpenseForm({ description: '', amount: '', paymentMethod: 'EFECTIVO' }); }
    else { alert('Error al registrar gasto'); }
    setProcessing(false);
  };

  // ── Filtros ──
  const categories = ['Todas', ...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f0f2f5' }}>

      {/* ── Panel Izquierdo: Productos ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'white', padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>🛒 Terminal POS</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={() => setShowExpense(true)} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', fontSize: '0.85rem' }}>💸 Gasto</button>
            <button className="btn" onClick={openCierreCaja} style={{ background: '#fffbeb', color: '#f59e0b', border: '1px solid #fcd34d', fontSize: '0.85rem' }}>💰 Cuadrar Caja</button>
            <button className="btn" onClick={() => router.push('/')} style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>Salir</button>
          </div>
        </div>

        {/* Buscador + Categorías */}
        <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <input
            type="text"
            className="input"
            placeholder="🔍 Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{ marginBottom: '12px', maxWidth: '500px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          />
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
                padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: '500', cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'all 0.15s', fontSize: '0.85rem',
                backgroundColor: selectedCategory === cat ? 'var(--primary)' : '#e2e8f0',
                color: selectedCategory === cat ? 'white' : '#475569',
                boxShadow: selectedCategory === cat ? '0 3px 8px rgba(59,130,246,0.25)' : 'none'
              }}>
                {cat === 'Fruver' ? '🥦 ' : ''}{cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grilla de Productos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Cargando inventario...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {filteredProducts.map(product => {
                const isFruver = isWeightProduct(product);
                const unit = getUnit(product.name);
                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    style={{
                      background: 'white', borderRadius: '10px', padding: '14px', cursor: 'pointer',
                      border: isFruver ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                      transition: 'all 0.1s ease-in-out', display: 'flex', flexDirection: 'column',
                      justifyContent: 'space-between', minHeight: '110px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      backgroundColor: isFruver ? '#f0fdf4' : 'white'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.08)';
                      e.currentTarget.style.borderColor = isFruver ? '#16a34a' : 'var(--primary)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                      e.currentTarget.style.borderColor = isFruver ? '#bbf7d0' : '#e2e8f0';
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  >
                    <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#1e293b', lineHeight: '1.3' }}>
                      {product.name}
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: isFruver ? '#16a34a' : 'var(--primary)' }}>
                        ${product.price.toLocaleString('es-CO')}
                        {isFruver && <span style={{ fontSize: '0.72rem', fontWeight: '500', color: '#64748b' }}>/{unit}</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        {isFruver && <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '600' }}>⚖ Por peso</span>}
                        <span style={{ fontSize: '0.72rem', fontWeight: '600', padding: '1px 5px', borderRadius: '4px', marginLeft: 'auto',
                          backgroundColor: product.stock <= product.minStock ? '#fee2e2' : '#dcfce7',
                          color: product.stock <= product.minStock ? '#ef4444' : '#16a34a'
                        }}>
                          {product.stock} {isFruver ? unit : 'und'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  No se encontraron productos.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Panel Derecho: Ticket ── */}
      <div style={{ width: '360px', background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '-3px 0 12px rgba(0,0,0,0.05)', zIndex: 10 }}>
        <div style={{ padding: '18px 20px', borderBottom: '2px dashed #cbd5e1', backgroundColor: '#f8fafc' }}>
          <h3 style={{ margin: 0, textAlign: 'center', color: '#334155', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.95rem' }}>Tirilla de Venta</h3>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {cart.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', gap: '8px' }}>
              <span style={{ fontSize: '2.5rem' }}>🛒</span>
              <p style={{ fontSize: '0.9rem' }}>Agrega productos para cobrar</p>
            </div>
          ) : (
            cart.map(item => {
              const fruver = isWeightProduct(item.product);
              const unit = getUnit(item.product.name);
              const subtotal = Math.round(item.product.price * item.quantity);
              return (
                <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '10px', backgroundColor: fruver ? '#f0fdf4' : '#f8fafc', borderRadius: '8px', border: `1px solid ${fruver ? '#bbf7d0' : '#e2e8f0'}` }}>
                  <div style={{ flex: 1, paddingRight: '8px', minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
                      {fmtQty(item.quantity)} {fruver ? unit : 'x'} × ${item.product.price.toLocaleString('es-CO')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {fruver ? (
                      // Fruver: botón para volver a poner peso + eliminar
                      <>
                        <button onClick={() => setWeightModal({ open: true, product: item.product, amount: '' })}
                          style={{ padding: '4px 8px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>
                          ⚖ Editar
                        </button>
                        <button onClick={() => deleteFromCart(item.product.id)}
                          style={{ padding: '4px 8px', background: '#fee2e2', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', color: '#ef4444' }}>
                          ×
                        </button>
                      </>
                    ) : (
                      // Normal: botones - y +
                      <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                        <button onClick={() => removeFromCart(item.product.id)} style={{ padding: '5px 10px', background: 'transparent', border: 'none', borderRight: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>-</button>
                        <span style={{ padding: '0 10px', fontWeight: 'bold', minWidth: '30px', textAlign: 'center', fontSize: '0.9rem' }}>{item.quantity}</span>
                        <button onClick={() => addToCart(item.product, 1)} style={{ padding: '5px 10px', background: 'transparent', border: 'none', borderLeft: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>+</button>
                      </div>
                    )}
                    <span style={{ fontWeight: 'bold', minWidth: '65px', textAlign: 'right', color: '#0f172a', fontSize: '0.88rem' }}>
                      ${subtotal.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Total y botones */}
        <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderTop: '2px dashed #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.6rem', fontWeight: '900', marginBottom: '14px', color: '#0f172a' }}>
            <span>TOTAL</span>
            <span style={{ color: 'var(--primary)' }}>${total.toLocaleString('es-CO')}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => handleCobrar('EFECTIVO')} disabled={processing || cart.length === 0}
              style={{ width: '100%', padding: '14px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', background: cart.length === 0 ? '#cbd5e1' : '#10b981', color: 'white', boxShadow: cart.length === 0 ? 'none' : '0 4px 8px rgba(16,185,129,0.3)', transition: 'all 0.2s' }}>
              💵 COBRAR EN EFECTIVO
            </button>
            <button onClick={() => handleCobrar('TRANSFERENCIA')} disabled={processing || cart.length === 0}
              style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #94a3b8', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', background: cart.length === 0 ? '#f1f5f9' : 'white', color: cart.length === 0 ? '#94a3b8' : '#334155', transition: 'all 0.2s' }}>
              📱 PAGO POR NEQUI/BANCO
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal de Peso/Cantidad (Fruver) ── */}
      {weightModal.open && weightModal.product && (
        <div onClick={e => { if (e.target === e.currentTarget) setWeightModal({ open: false, product: null, amount: '' }); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '380px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderBottom: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚖ Fruver — Venta por Peso</p>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: '700' }}>{weightModal.product.name}</h3>
                </div>
                <button onClick={() => setWeightModal({ open: false, product: null, amount: '' })}
                  style={{ background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', fontSize: '1.1rem', color: '#64748b' }}>×</button>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#16a34a', fontWeight: '600' }}>
                ${weightModal.product.price.toLocaleString('es-CO')} / {getUnit(weightModal.product.name)}
              </p>
            </div>

            {/* Cuerpo */}
            <div style={{ padding: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Cantidad / Peso ({getUnit(weightModal.product.name)})
              </label>
              <input
                ref={weightInputRef}
                type="number"
                step="0.1"
                min="0.1"
                className="input"
                value={weightModal.amount}
                onChange={e => setWeightModal(m => ({ ...m, amount: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') confirmWeightAdd(); if (e.key === 'Escape') setWeightModal({ open: false, product: null, amount: '' }); }}
                placeholder={`Ej: 0.5  |  1  |  2.3`}
                style={{ fontSize: '1.8rem', fontWeight: '700', textAlign: 'center', borderRadius: '10px', border: '2px solid #bbf7d0', padding: '14px', letterSpacing: '2px' }}
              />

              {/* Preview del precio */}
              {weightModal.amount && parseFloat(weightModal.amount.replace(',', '.')) > 0 && (
                <div style={{ marginTop: '14px', padding: '14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    {fmtQty(parseFloat(weightModal.amount.replace(',', '.')))} {getUnit(weightModal.product.name)} × ${weightModal.product.price.toLocaleString('es-CO')}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#16a34a' }}>
                    = ${Math.round(parseFloat(weightModal.amount.replace(',', '.')) * weightModal.product.price).toLocaleString('es-CO')}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setWeightModal({ open: false, product: null, amount: '' })}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button type="button" onClick={confirmWeightAdd}
                  disabled={!weightModal.amount || parseFloat(weightModal.amount.replace(',', '.')) <= 0}
                  style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: (!weightModal.amount || parseFloat(weightModal.amount.replace(',', '.')) <= 0) ? '#cbd5e1' : '#16a34a', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}>
                  ✅ Agregar al Ticket
                </button>
              </div>
              <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>Presiona Enter para agregar rápido</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Cuadre de Caja ── */}
      {showCaja && cajaStats && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ padding: '28px', width: '100%', maxWidth: '430px', background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#0f172a' }}>💰 Cuadre de Caja</h2>
            <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#475569', fontSize: '0.9rem' }}><span>Ventas:</span><strong>{cajaStats.salesCount}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#475569', fontSize: '0.9rem' }}><span>Nequi/Banco:</span><strong>${cajaStats.totalTransfers.toLocaleString('es-CO')}</strong></div>
              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>Efectivo Esperado:</span>
                <span style={{ fontSize: '1.4rem', color: 'var(--primary)', fontWeight: 'bold' }}>${cajaStats.expectedCash.toLocaleString('es-CO')}</span>
              </div>
            </div>
            <form onSubmit={submitCierreCaja} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '6px', fontWeight: '600' }}>¿Cuánto efectivo físico hay en caja?</label>
                <input required type="number" className="input" value={actualCash} onChange={e => setActualCash(e.target.value)} placeholder="Ej: 150000" style={{ fontSize: '1.3rem', fontWeight: 'bold' }} autoFocus />
              </div>
              {actualCash !== '' && (
                <div style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', borderRadius: '8px', backgroundColor: (Number(actualCash) - cajaStats.expectedCash) < 0 ? '#fef2f2' : '#f0fdf4', color: (Number(actualCash) - cajaStats.expectedCash) < 0 ? '#dc2626' : '#16a34a' }}>
                  {(Number(actualCash) - cajaStats.expectedCash) < 0 ? 'Faltan: ' : 'Sobran: '}${Math.abs(Number(actualCash) - cajaStats.expectedCash).toLocaleString('es-CO')}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCaja(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>Cancelar</button>
                <button type="submit" disabled={processing} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Confirmar Cierre</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Registrar Gasto ── */}
      {showExpense && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ padding: '28px', width: '100%', maxWidth: '380px', background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#dc2626' }}>💸 Registrar Gasto</h2>
            <form onSubmit={submitExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '5px', fontWeight: '600' }}>¿En qué se gastó?</label>
                <input required className="input" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="Ej: Pago Luz, Proveedor..." autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '5px', fontWeight: '600' }}>Monto ($)</label>
                <input required type="number" className="input" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="Ej: 50000" style={{ fontSize: '1.2rem', fontWeight: 'bold' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '5px', fontWeight: '600' }}>Método de Pago</label>
                <select className="input" value={expenseForm.paymentMethod} onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}>
                  <option value="EFECTIVO">💵 Efectivo (Sale de la Caja)</option>
                  <option value="TRANSFERENCIA">📱 Transferencia (Nequi/Banco)</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowExpense(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>Cancelar</button>
                <button type="submit" disabled={processing} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
