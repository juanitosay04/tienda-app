"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function POS() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [showCaja, setShowCaja] = useState(false);
  const [cajaStats, setCajaStats] = useState(null);
  const [actualCash, setActualCash] = useState('');

  const [showExpense, setShowExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', paymentMethod: 'EFECTIVO' });

  // Nuevo estado para la categoría seleccionada
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  useEffect(() => {
    fetch('/api/products?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      });
  }, []);

  const addToCart = (product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    const existing = cart.find(item => item.product.id === productId);
    if (existing.quantity > 1) {
      setCart(cart.map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item));
    } else {
      setCart(cart.filter(item => item.product.id !== productId));
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleCobrar = async (method) => {
    if (cart.length === 0) return;
    setProcessing(true);
    
    const items = cart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      total: item.product.price * item.quantity
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
    
    if (res.ok) {
      alert('Cierre de caja registrado exitosamente.');
      setShowCaja(false);
    } else {
      alert('Error al cerrar caja');
    }
    setProcessing(false);
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    setProcessing(true);
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseForm)
    });
    if (res.ok) {
      alert('Gasto registrado exitosamente');
      setShowExpense(false);
      setExpenseForm({ description: '', amount: '', paymentMethod: 'EFECTIVO' });
    } else {
      alert('Error al registrar gasto');
    }
    setProcessing(false);
  };

  // Obtener categorías únicas
  const categories = ['Todas', ...new Set(products.map(p => p.category))];

  // Filtrar productos por búsqueda Y por categoría
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f0f2f5' }}>
      {/* Panel Izquierdo: Productos y Filtros */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header del POS */}
        <div style={{ background: 'white', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem' }}>🛒 Terminal POS</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn" onClick={() => setShowExpense(true)} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }}>💸 Registrar Gasto</button>
            <button className="btn" onClick={openCierreCaja} style={{ background: '#fffbeb', color: '#f59e0b', border: '1px solid #fcd34d' }}>💰 Cuadrar Caja</button>
            <button className="btn" onClick={() => router.push('/')} style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1' }}>Salir</button>
          </div>
        </div>
        
        {/* Buscador y Categorías */}
        <div style={{ padding: '20px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <input 
            type="text" 
            className="input" 
            placeholder="🔍 Buscar producto por nombre (PC)..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{ marginBottom: '15px', maxWidth: '500px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}
          />

          {/* Botones de Categoría (Pills) */}
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  fontWeight: '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  backgroundColor: selectedCategory === cat ? 'var(--primary)' : '#e2e8f0',
                  color: selectedCategory === cat ? 'white' : '#475569',
                  boxShadow: selectedCategory === cat ? '0 4px 6px rgba(79, 70, 229, 0.2)' : 'none'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grilla de Productos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><p>Cargando inventario...</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
              {filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  style={{ 
                    background: 'white', 
                    borderRadius: '12px', 
                    padding: '15px', 
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.1s ease-in-out',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '120px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onClick={() => addToCart(product)}
                >
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b', lineHeight: '1.2' }}>
                    {product.name}
                  </div>
                  <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                      ${product.price.toLocaleString('es-CO')}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 6px', borderRadius: '4px', backgroundColor: product.stock <= product.minStock ? '#fee2e2' : '#dcfce7', color: product.stock <= product.minStock ? '#ef4444' : '#16a34a' }}>
                      {product.stock}
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No se encontraron productos en esta categoría o búsqueda.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Panel Derecho: Ticket de Venta (Carrito) */}
      <div style={{ width: '380px', background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 15px rgba(0,0,0,0.05)', zIndex: 10 }}>
        
        {/* Header Ticket */}
        <div style={{ padding: '20px', borderBottom: '2px dashed #cbd5e1', backgroundColor: '#f8fafc' }}>
          <h3 style={{ margin: 0, textAlign: 'center', color: '#334155', textTransform: 'uppercase', letterSpacing: '1px' }}>Tirilla de Venta</h3>
        </div>
        
        {/* Items del Ticket */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
          {cart.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' }}>
              <span style={{ fontSize: '3rem', marginBottom: '10px' }}>🛒</span>
              <p>Agrega productos para cobrar</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1, paddingRight: '10px' }}>
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>{item.product.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>${item.product.price.toLocaleString('es-CO')} c/u</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                  <button onClick={() => removeFromCart(item.product.id)} style={{ padding: '6px 12px', background: 'transparent', border: 'none', borderRight: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>-</button>
                  <span style={{ padding: '0 12px', fontWeight: 'bold', minWidth: '35px', textAlign: 'center', fontSize: '0.95rem' }}>{item.quantity}</span>
                  <button onClick={() => addToCart(item.product)} style={{ padding: '6px 12px', background: 'transparent', border: 'none', borderLeft: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>+</button>
                </div>
                <div style={{ fontWeight: 'bold', marginLeft: '15px', minWidth: '70px', textAlign: 'right', color: '#0f172a' }}>
                  ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totales y Botones de Pago */}
        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderTop: '2px dashed #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.8rem', fontWeight: '900', marginBottom: '20px', color: '#0f172a' }}>
            <span>TOTAL</span>
            <span style={{ color: 'var(--primary)' }}>${total.toLocaleString('es-CO')}</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={() => handleCobrar('EFECTIVO')}
              disabled={processing || cart.length === 0}
              style={{ 
                width: '100%', padding: '16px', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                background: cart.length === 0 ? '#cbd5e1' : '#10b981', color: 'white',
                boxShadow: cart.length === 0 ? 'none' : '0 4px 6px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              💵 COBRAR EN EFECTIVO
            </button>
            <button 
              onClick={() => handleCobrar('TRANSFERENCIA')}
              disabled={processing || cart.length === 0}
              style={{ 
                width: '100%', padding: '14px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #94a3b8', cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                background: cart.length === 0 ? '#f1f5f9' : 'white', color: cart.length === 0 ? '#94a3b8' : '#334155',
                transition: 'all 0.2s'
              }}
            >
              📱 PAGO POR NEQUI/BANCO
            </button>
          </div>
        </div>
      </div>

      {/* Modales (Caja y Gastos) */}
      {showCaja && cajaStats && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ padding: '30px', width: '100%', maxWidth: '450px', background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#0f172a' }}>💰 Cuadre de Caja</h2>
            
            <div style={{ marginBottom: '25px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#475569' }}>
                <span>Ventas realizadas:</span>
                <strong>{cajaStats.salesCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#475569' }}>
                <span>Nequi/Transferencias:</span>
                <strong>${cajaStats.totalTransfers.toLocaleString('es-CO')}</strong>
              </div>
              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: '600' }}>Efectivo Esperado:</span>
                <span style={{ fontSize: '1.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>${cajaStats.expectedCash.toLocaleString('es-CO')}</span>
              </div>
            </div>

            <form onSubmit={submitCierreCaja} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.95rem', color: '#475569', marginBottom: '8px', fontWeight: '500' }}>¿Cuánto efectivo físico hay en caja (billetes y monedas)?</label>
                <input required type="number" className="input" value={actualCash} onChange={e => setActualCash(e.target.value)} placeholder="Ej: 150000" style={{ fontSize: '1.4rem', fontWeight: 'bold', padding: '12px' }} autoFocus />
              </div>
              
              {actualCash !== '' && (
                <div style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', borderRadius: '8px', backgroundColor: (Number(actualCash) - cajaStats.expectedCash) < 0 ? '#fef2f2' : '#f0fdf4', color: (Number(actualCash) - cajaStats.expectedCash) < 0 ? '#dc2626' : '#16a34a' }}>
                  {(Number(actualCash) - cajaStats.expectedCash) < 0 ? 'Faltan: ' : 'Sobran: '} 
                  ${Math.abs(Number(actualCash) - cajaStats.expectedCash).toLocaleString('es-CO')}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '5px' }}>
                <button type="button" onClick={() => setShowCaja(false)} style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>Cancelar</button>
                <button type="submit" disabled={processing} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)' }}>Confirmar Cierre</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExpense && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ padding: '30px', width: '100%', maxWidth: '400px', background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#dc2626' }}>💸 Registrar Gasto</h2>
            
            <form onSubmit={submitExpense} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: '5px', fontWeight: '500' }}>¿En qué se gastó?</label>
                <input required className="input" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="Ej: Pago de Luz, Proveedor..." autoFocus />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: '5px', fontWeight: '500' }}>Monto Total ($)</label>
                <input required type="number" className="input" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} placeholder="Ej: 50000" style={{ fontSize: '1.2rem', fontWeight: 'bold' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: '5px', fontWeight: '500' }}>Método de Pago</label>
                <select className="input" value={expenseForm.paymentMethod} onChange={e => setExpenseForm({...expenseForm, paymentMethod: e.target.value})} style={{ fontWeight: '500' }}>
                  <option value="EFECTIVO">💵 Efectivo (Sale de la Caja Física)</option>
                  <option value="TRANSFERENCIA">📱 Transferencia (Nequi/Banco)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '15px' }}>
                <button type="button" onClick={() => setShowExpense(false)} style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>Cancelar</button>
                <button type="submit" disabled={processing} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(220, 38, 38, 0.2)' }}>Confirmar Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
