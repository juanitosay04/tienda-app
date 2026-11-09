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

// Normalizar texto sin tildes/diacríticos para búsqueda flexible
const normalizeText = (str = '') =>
  String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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

  // Modal de cambio/vuelto
  const [cambioModal, setCambioModal] = useState({ open: false, received: '' });
  const cambioInputRef = useRef(null);
  useEffect(() => { if (cambioModal.open && cambioInputRef.current) setTimeout(() => cambioInputRef.current?.focus(), 80); }, [cambioModal.open]);

  // Modal Miniarqueo (solo lectura, sin guardar)
  const [showMiniarqueo, setShowMiniarqueo] = useState(false);
  // Modal Cierre de Día (guarda en BD)
  const [showCaja, setShowCaja] = useState(false);
  const [cierrePaso, setCierrePaso] = useState(1); // 1=confirmacion, 2=formulario
  const [cajaStats, setCajaStats] = useState(null);
  const [actualCash, setActualCash] = useState('');

  // Modal Registrar Gasto
  const [showExpense, setShowExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', paymentMethod: 'EFECTIVO' });

  // Alerta de stock insuficiente
  const [stockWarning, setStockWarning] = useState('');
  const showStockAlert = (msg) => {
    setStockWarning(msg);
    setTimeout(() => setStockWarning(''), 3000);
  };

  // ── Cola de Tickets Pendientes ──
  const [openTickets, setOpenTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null); // { id, name } si se cargó una cuenta pendiente
  const [pendingNameModal, setPendingNameModal] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [pendingListModal, setPendingListModal] = useState(false);
  const pendingInputRef = useRef(null);

  // Cargar tickets de la cola al iniciar (desde localStorage)
  useEffect(() => {
    const saved = localStorage.getItem('tienda_open_tickets');
    if (saved) {
      try { setOpenTickets(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  // Guardar en localStorage cada vez que cambia la cola
  useEffect(() => {
    localStorage.setItem('tienda_open_tickets', JSON.stringify(openTickets));
  }, [openTickets]);

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
    const currentQty = existing ? existing.quantity : 0;
    const newQty = parseFloat((currentQty + qty).toFixed(3));

    // Validar stock disponible
    if (newQty > product.stock) {
      const unit = isWeightProduct(product) ? getUnit(product.name) : 'und';
      showStockAlert(`⚠ Stock insuficiente: solo hay ${product.stock} ${unit} de "${product.name}"`);
      return;
    }

    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: newQty }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: qty }]);
    }
  };

  const confirmWeightAdd = () => {
    const qty = parseFloat(weightModal.amount.replace(',', '.'));
    if (!qty || qty <= 0) return;

    // Validar stock para fruver
    const existing = cart.find(i => i.product.id === weightModal.product.id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + qty > weightModal.product.stock) {
      const unit = getUnit(weightModal.product.name);
      showStockAlert(`⚠ Stock insuficiente: solo hay ${weightModal.product.stock} ${unit} de "${weightModal.product.name}"`);
      return;
    }

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
      const currentQty = Number(item.quantity) || 1;
      if (currentQty > 1) {
        setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: currentQty - 1 } : i));
      } else {
        setCart(cart.filter(i => i.product.id !== productId));
      }
    }
  };

  // Edición directa de cantidad por teclado
  const handleQuantityChange = (productId, val) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    if (val === '') {
      setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: '' } : i));
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num)) return;

    if (num > item.product.stock) {
      const unit = isWeightProduct(item.product) ? getUnit(item.product.name) : 'und';
      showStockAlert(`⚠ Stock máximo disponible: ${item.product.stock} ${unit}`);
      setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: item.product.stock } : i));
      return;
    }

    setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: num } : i));
  };

  const handleQuantityBlur = (productId, val) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const num = parseFloat(val);
    if (!num || num <= 0 || isNaN(num)) {
      setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: 1 } : i));
    }
  };

  const deleteFromCart = (productId) => setCart(cart.filter(i => i.product.id !== productId));

  const total = cart.reduce((sum, item) => sum + (item.product.price * (Number(item.quantity) || 0)), 0);

  // ── Cobrar ──
  const handleCobrar = async (method) => {
    if (cart.length === 0) return;
    // Para efectivo → abrir modal de cambio primero
    if (method === 'EFECTIVO') {
      setCambioModal({ open: true, received: '' });
      return;
    }
    await procesarVenta(method);
  };

  const procesarVenta = async (paymentMethod) => {
    if (cart.length === 0 || processing) return;
    setProcessing(true);

    const items = cart
      .filter(i => (Number(i.quantity) || 0) > 0)
      .map(i => {
        const qty = Number(i.quantity) || 1;
        return {
          productId: i.product.id, 
          quantity: qty,
          total: Math.round(i.product.price * qty)
        };
      });

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'VENTA', items, paymentMethod })
    });

    if (res.ok) {
      setCambioModal({ open: false, received: '' });
      setCart([]);
      setActiveTicket(null);
      const newData = await fetch('/api/products?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
      setProducts(newData);
    } else {
      alert('Error al registrar la venta');
    }
    setProcessing(false);
  };

  // ── Lógica de Tickets Pendientes ──
  const handleSavePending = (e) => {
    if (e) e.preventDefault();
    const nameToUse = (pendingName.trim() || activeTicket?.name || '').trim();
    if (!nameToUse || cart.length === 0) return;
    
    const newTicket = {
      id: activeTicket?.id || Date.now().toString(),
      name: nameToUse,
      cart: [...cart],
      timestamp: new Date().toISOString()
    };
    
    // Si ya existía, se actualiza manteniendo la lista limpia
    const otherTickets = openTickets.filter(t => t.id !== newTicket.id);
    setOpenTickets([...otherTickets, newTicket]);
    setCart([]);
    setActiveTicket(null);
    setPendingName('');
    setPendingNameModal(false);
  };

  // Click en el botón Dejar Pendiente del carrito
  const handlePendingBtnClick = () => {
    if (cart.length === 0) return;
    if (activeTicket) {
      // Si ya tiene cuenta asignada, se actualiza directamente sin volver a pedir nombre
      handleSavePending();
    } else {
      setPendingName('');
      setPendingNameModal(true);
    }
  };

  const handleLoadPending = (ticket) => {
    if (cart.length > 0) {
      if (!confirm(`¿Cargar "${ticket.name}"? El carrito actual se reemplazará (guárdalo primero si lo necesitas).`)) return;
    }
    setCart(ticket.cart);
    setActiveTicket({ id: ticket.id, name: ticket.name });
    // Retirar de la lista de espera mientras se está atendiendo
    setOpenTickets(openTickets.filter(t => t.id !== ticket.id));
    setPendingListModal(false);
  };

  const handleDeletePending = (ticketId, e) => {
    e.stopPropagation(); // Evitar que cargue el ticket al hacer clic en eliminar
    if (confirm('¿Eliminar este ticket pendiente permanentemente?')) {
      setOpenTickets(openTickets.filter(t => t.id !== ticketId));
      if (activeTicket?.id === ticketId) setActiveTicket(null);
    }
  };

  // ── Miniarqueo (solo lectura) ──
  const openMiniarqueo = async () => {
    const res = await fetch('/api/caja?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    setCajaStats(data);
    setActualCash('');
    setShowMiniarqueo(true);
  };

  // ── Cierre de Día ──
  const openCierreCaja = async () => {
    const res = await fetch('/api/caja?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    setCajaStats(data);
    setActualCash('');
    setCierrePaso(1);
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
    const searchWords = normalizeText(search).trim().split(/\s+/);
    const productName = normalizeText(p.name);
    const matchSearch = searchWords.every(word => productName.includes(word));
    const matchCat = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f0f2f5' }}>

      {/* ── Panel Izquierdo: Productos ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'white', padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: '800' }}>🏪 Tienda Donde Juancho · POS</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={() => setPendingListModal(true)} style={{ background: openTickets.length > 0 ? '#eff6ff' : '#f8fafc', color: openTickets.length > 0 ? '#2563eb' : '#64748b', border: `1px solid ${openTickets.length > 0 ? '#bfdbfe' : '#cbd5e1'}`, fontSize: '0.85rem', fontWeight: openTickets.length > 0 ? '700' : 'normal' }}>
              📋 Pendientes {openTickets.length > 0 && `(${openTickets.length})`}
            </button>
            <button className="btn" onClick={() => setShowExpense(true)} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', fontSize: '0.85rem' }}>💸 Gasto</button>
            <button className="btn" onClick={openMiniarqueo} style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fcd34d', fontSize: '0.85rem' }}>🔍 Miniarqueo</button>
            <button className="btn" onClick={openCierreCaja} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', fontSize: '0.85rem', fontWeight: '700' }}>🔒 Cerrar Día</button>
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

        {/* Toast alerta stock insuficiente */}
        {stockWarning && (
          <div style={{
            position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 2000, background: '#1e293b', color: 'white',
            padding: '12px 22px', borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: '10px',
            fontSize: '0.9rem', fontWeight: '600', fontFamily: 'inherit',
            animation: 'fadeIn 0.2s ease',
            borderLeft: '4px solid #ef4444'
          }}>
            <span style={{ fontSize: '1.1rem' }}>🚫</span>
            {stockWarning}
          </div>
        )}

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
        <div style={{ padding: '16px 20px', borderBottom: '2px dashed #cbd5e1', backgroundColor: '#f8fafc' }}>
          <h3 style={{ margin: 0, textAlign: 'center', color: '#334155', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.95rem' }}>Tirilla de Venta</h3>
        </div>

        {/* Banner de Cuenta Pendiente Activa */}
        {activeTicket && (
          <div style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderBottom: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🏷️ Editando: <strong style={{ color: '#1d4ed8', background: 'white', padding: '2px 8px', borderRadius: '5px', border: '1px solid #bfdbfe' }}>{activeTicket.name}</strong></span>
            </div>
            <button
              onClick={() => { setPendingName(activeTicket.name); setPendingNameModal(true); }}
              title="Cambiar nombre de la cuenta"
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', textDecoration: 'underline', padding: '2px 4px' }}
            >
              Renombrar
            </button>
          </div>
        )}

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
              const qtyNum = Number(item.quantity) || 0;
              const subtotal = Math.round(item.product.price * qtyNum);
              return (
                <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '10px', backgroundColor: fruver ? '#f0fdf4' : '#f8fafc', borderRadius: '8px', border: `1px solid ${fruver ? '#bbf7d0' : '#e2e8f0'}` }}>
                  <div style={{ flex: 1, paddingRight: '8px', minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
                      {fmtQty(qtyNum)} {fruver ? unit : 'x'} × ${item.product.price.toLocaleString('es-CO')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {fruver ? (
                      // Fruver: botón para volver a poner peso + eliminar
                      <>
                        <button onClick={() => setWeightModal({ open: true, product: item.product, amount: item.quantity.toString() })}
                          style={{ padding: '4px 8px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>
                          ⚖ Editar
                        </button>
                        <button onClick={() => deleteFromCart(item.product.id)} title="Eliminar del carrito"
                          style={{ padding: '4px 8px', background: '#fee2e2', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', color: '#ef4444' }}>
                          ×
                        </button>
                      </>
                    ) : (
                      // Normal: botones - / input de cantidad directa / + y botón ×
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                          <button onClick={() => removeFromCart(item.product.id)} style={{ padding: '4px 8px', background: 'transparent', border: 'none', borderRight: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold', color: '#475569', fontSize: '1rem', lineHeight: 1 }}>-</button>
                          <input
                            type="number"
                            min="1"
                            max={item.product.stock}
                            step="1"
                            value={item.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleQuantityChange(item.product.id, e.target.value)}
                            onBlur={(e) => handleQuantityBlur(item.product.id, e.target.value)}
                            style={{ width: '44px', textAlign: 'center', border: 'none', fontWeight: 'bold', fontSize: '0.95rem', outline: 'none', background: 'transparent', padding: '4px 0', MozAppearance: 'textfield' }}
                          />
                          <button onClick={() => addToCart(item.product, 1)} style={{ padding: '4px 8px', background: 'transparent', border: 'none', borderLeft: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold', color: '#475569', fontSize: '1rem', lineHeight: 1 }}>+</button>
                        </div>
                        <button onClick={() => deleteFromCart(item.product.id)} title="Eliminar del carrito"
                          style={{ padding: '4px 7px', background: '#fee2e2', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold' }}>
                          ×
                        </button>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handlePendingBtnClick} disabled={cart.length === 0}
                style={{
                  flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: 'bold', borderRadius: '8px',
                  border: activeTicket ? '1px solid #3b82f6' : '1px solid #94a3b8',
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                  background: cart.length === 0 ? '#f8fafc' : activeTicket ? '#eff6ff' : 'white',
                  color: cart.length === 0 ? '#94a3b8' : activeTicket ? '#1d4ed8' : '#334155'
                }}>
                {activeTicket ? `💾 Guardar (${activeTicket.name})` : '🕒 Dejar Pendiente'}
              </button>
              <button onClick={() => { setCart([]); setActiveTicket(null); }} disabled={cart.length === 0}
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #fca5a5', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', background: cart.length === 0 ? '#fef2f2' : 'white', color: cart.length === 0 ? '#fca5a5' : '#ef4444' }}>
                🗑 Limpiar
              </button>
            </div>
            <button onClick={() => handleCobrar('EFECTIVO')} disabled={processing || cart.length === 0}
              style={{ width: '100%', padding: '14px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', background: cart.length === 0 ? '#cbd5e1' : '#10b981', color: 'white', boxShadow: cart.length === 0 ? 'none' : '0 4px 8px rgba(16,185,129,0.3)', transition: 'all 0.2s' }}>
              💵 COBRAR EN EFECTIVO
            </button>
            <button onClick={() => procesarVenta('TRANSFERENCIA')} disabled={processing || cart.length === 0}
              style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #94a3b8', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', background: cart.length === 0 ? '#f1f5f9' : 'white', color: cart.length === 0 ? '#94a3b8' : '#334155', transition: 'all 0.2s' }}>
              📱 PAGO POR NEQUI/BANCO
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal de Cambio / Vuelto ── */}
      {cambioModal.open && (
        <div onClick={e => { if (e.target === e.currentTarget) setCambioModal({ open: false, received: '' }); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}>

            {/* Header verde */}
            <div style={{ padding: '22px 28px 18px', background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderBottom: '1px solid #a7f3d0' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.07em' }}>💵 Cobro en Efectivo</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#374151', fontWeight: '600' }}>Total a cobrar:</span>
                <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#065f46' }}>${Math.round(total).toLocaleString('es-CO')}</span>
              </div>
            </div>

            {/* Input de recibido */}
            <div style={{ padding: '24px 28px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>¿Con cuánto paga el cliente?</label>
              <input
                ref={cambioInputRef}
                type="number"
                step="100"
                min="0"
                className="input"
                value={cambioModal.received}
                onChange={e => setCambioModal(m => ({ ...m, received: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && parseFloat(cambioModal.received) >= Math.round(total)) procesarVenta('EFECTIVO');
                  if (e.key === 'Escape') setCambioModal({ open: false, received: '' });
                }}
                placeholder="Ej: 50000"
                style={{ fontSize: '2rem', fontWeight: '900', textAlign: 'center', border: '2px solid #a7f3d0', borderRadius: '12px', padding: '14px', letterSpacing: '1px' }}
              />

              {/* Cambio calculado */}
              {(() => {
                const received = parseFloat(cambioModal.received) || 0;
                const cambio = received - Math.round(total);
                if (!cambioModal.received) return (
                  <div style={{ marginTop: '16px', padding: '14px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Ingresa el monto recibido</div>
                );
                if (cambio < 0) return (
                  <div style={{ marginTop: '16px', padding: '16px', background: '#fef2f2', borderRadius: '12px', border: '2px solid #fecaca', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: '700', color: '#dc2626' }}>⚠ FALTA POR PAGAR</p>
                    <p style={{ margin: '4px 0 0', fontSize: '2rem', fontWeight: '900', color: '#dc2626' }}>${Math.abs(cambio).toLocaleString('es-CO')}</p>
                  </div>
                );
                return (
                  <div style={{ marginTop: '16px', padding: '16px', background: cambio === 0 ? '#f0fdf4' : 'linear-gradient(135deg,#ecfdf5,#d1fae5)', borderRadius: '12px', border: `2px solid ${cambio === 0 ? '#86efac' : '#6ee7b7'}`, textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: '700', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🪙 {cambio === 0 ? 'Pago exacto ✓' : 'Cambio a devolver'}</p>
                    {cambio > 0 && <p style={{ margin: '6px 0 0', fontSize: '2.8rem', fontWeight: '900', color: '#065f46', lineHeight: 1 }}>${cambio.toLocaleString('es-CO')}</p>}
                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#6ee7b7' }}>Recibido: ${received.toLocaleString('es-CO')} · Total: ${Math.round(total).toLocaleString('es-CO')}</p>
                  </div>
                );
              })()}

              {/* Botones */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setCambioModal({ open: false, received: '' })}
                  style={{ flex: 1, padding: '13px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', color: '#475569', fontSize: '0.9rem' }}>Cancelar</button>
                <button
                  onClick={() => procesarVenta('EFECTIVO')}
                  disabled={processing || !cambioModal.received || parseFloat(cambioModal.received) < Math.round(total)}
                  style={{ flex: 2, padding: '13px', borderRadius: '10px', border: 'none', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', transition: 'all 0.2s',
                    background: (processing || !cambioModal.received || parseFloat(cambioModal.received) < Math.round(total)) ? '#e2e8f0' : '#10b981',
                    color: (processing || !cambioModal.received || parseFloat(cambioModal.received) < Math.round(total)) ? '#94a3b8' : 'white',
                    boxShadow: (processing || !cambioModal.received || parseFloat(cambioModal.received) < Math.round(total)) ? 'none' : '0 4px 12px rgba(16,185,129,0.35)'
                  }}>
                  {processing ? 'Procesando...' : '✅ Confirmar Cobro'}
                </button>
              </div>
              <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: '0.74rem', color: '#94a3b8' }}>Presiona Enter para confirmar cuando el monto sea suficiente</p>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Modal MINIARQUEO (solo lectura, sin guardar) ── */}
      {showMiniarqueo && cajaStats && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowMiniarqueo(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ padding: '28px', width: '100%', maxWidth: '460px', background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ margin: 0, color: '#d97706' }}>🔍 Miniarqueo</h2>
              <span style={{ fontSize: '0.75rem', background: '#fffbeb', color: '#d97706', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', border: '1px solid #fcd34d' }}>Solo lectura — no cierra el día</span>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '0.83rem', color: '#94a3b8' }}>Verifica en cualquier momento si la caja va cuadrando.</p>

            <div style={{ padding: '16px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fcd34d', marginBottom: '16px' }}>
              {cajaStats.cajaBase > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', color: '#78350f', fontSize: '0.88rem' }}>
                  <span>🏦 Saldo base (arranque):</span><strong style={{ color: '#3b82f6' }}>${cajaStats.cajaBase.toLocaleString('es-CO')}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', color: '#78350f', fontSize: '0.88rem' }}>
                <span>💵 Ventas efectivo POS:</span><strong style={{ color: '#16a34a' }}>+${(cajaStats.salesEfectivo || 0).toLocaleString('es-CO')}</strong>
              </div>
              {(cajaStats.abonosEfectivo > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', color: '#78350f', fontSize: '0.88rem' }}>
                  <span>📒 Abonos fiados (efectivo):</span><strong style={{ color: '#16a34a' }}>+${cajaStats.abonosEfectivo.toLocaleString('es-CO')}</strong>
                </div>
              )}
              {cajaStats.totalExpensesEfectivo > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', color: '#78350f', fontSize: '0.88rem' }}>
                  <span>💸 Gastos en efectivo:</span><strong style={{ color: '#dc2626' }}>-${cajaStats.totalExpensesEfectivo.toLocaleString('es-CO')}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', color: '#78350f', fontSize: '0.88rem' }}>
                <span>📱 Nequi/Transferencias:</span><strong>${(cajaStats.totalTransfers || 0).toLocaleString('es-CO')}</strong>
              </div>
              {cajaStats.abonosTransfer > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', color: '#64748b', fontSize: '0.78rem', paddingLeft: '10px' }}>
                  <span>↳ Incluye abonos transfer:</span><span>${cajaStats.abonosTransfer.toLocaleString('es-CO')}</span>
                </div>
              )}
              <div style={{ borderTop: '2px dashed #fcd34d', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', color: '#78350f' }}>Efectivo esperado en caja:</span>
                <span style={{ fontSize: '1.5rem', color: '#d97706', fontWeight: '900' }}>${cajaStats.expectedCash.toLocaleString('es-CO')}</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '6px', fontWeight: '600' }}>¿Cuánto cuenta en caja ahora? (opcional)</label>
              <input type="number" className="input" value={actualCash} onChange={e => setActualCash(e.target.value)} placeholder="Cuenta el efectivo y escribe aquí..." style={{ fontSize: '1.2rem', fontWeight: 'bold', border: '2px solid #fcd34d', borderRadius: '10px' }} autoFocus />
            </div>

            {actualCash !== '' && (() => {
              const diff = Number(actualCash) - cajaStats.expectedCash;
              return (
                <div style={{ padding: '14px', textAlign: 'center', fontWeight: '700', borderRadius: '10px', fontSize: '1.05rem', marginBottom: '16px',
                  backgroundColor: diff < 0 ? '#fef2f2' : '#f0fdf4',
                  color: diff < 0 ? '#dc2626' : '#16a34a',
                  border: `1px solid ${diff < 0 ? '#fecaca' : '#bbf7d0'}` }}>
                  {diff < 0 ? '⚠ Faltan: ' : diff === 0 ? '✅ Cuadra perfecto' : '✅ Sobran: '}
                  {diff !== 0 && `$${Math.abs(diff).toLocaleString('es-CO')}`}
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMiniarqueo(false)} style={{ padding: '11px 28px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569', fontFamily: 'inherit', fontSize: '0.95rem' }}>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal CIERRE DE DÍA (guarda en BD) ── */}
      {showCaja && cajaStats && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
          <div style={{ width: '100%', maxWidth: '470px', background: 'white', borderRadius: '18px', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>

            {/* ── Paso 1: Confirmación ── */}
            {cierrePaso === 1 && (
              <>
                <div style={{ padding: '24px 28px 18px', background: 'linear-gradient(135deg,#fef2f2,#fff5f5)', borderBottom: '1px solid #fecaca' }}>
                  <h2 style={{ margin: 0, color: '#991b1b', fontSize: '1.15rem' }}>🔒 Cerrar el Día</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Esta acción registra el cierre definitivo de la jornada</p>
                </div>
                <div style={{ padding: '24px 28px' }}>
                  <div style={{ padding: '16px', background: '#fef9c3', borderRadius: '10px', border: '1px solid #fde047', marginBottom: '20px' }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#713f12', fontWeight: '500', lineHeight: '1.5' }}>
                      ⚠️ <strong>¿Ya terminaste el día?</strong><br/>
                      El cierre de caja es para cuando <strong>ya no vas a atender más clientes</strong> en el día.<br/>
                      Si quieres solo verificar cómo va la caja, usa <strong>🔍 Miniarqueo</strong>.
                    </p>
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#475569', marginBottom: '6px' }}>
                      <span># Movimientos atendidos:</span><strong>{cajaStats.salesCount} ventas {cajaStats.abonosCount > 0 && `+ ${cajaStats.abonosCount} abonos`}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#475569', marginBottom: '6px' }}>
                      <span>Ventas efectivo:</span><strong style={{ color: '#16a34a' }}>${(cajaStats.salesEfectivo || 0).toLocaleString('es-CO')}</strong>
                    </div>
                    {cajaStats.abonosEfectivo > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#475569', marginBottom: '6px' }}>
                        <span>Abonos fiados (efectivo):</span><strong style={{ color: '#16a34a' }}>+${cajaStats.abonosEfectivo.toLocaleString('es-CO')}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#475569' }}>
                      <span>Nequi/Banco:</span><strong>${(cajaStats.totalTransfers || 0).toLocaleString('es-CO')}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowCaja(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}>
                      Cancelar
                    </button>
                    <button onClick={() => setCierrePaso(2)} style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem', boxShadow: '0 4px 10px rgba(220,38,38,0.3)' }}>
                      Sí, cerrar el día →
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Paso 2: Conteo de caja ── */}
            {cierrePaso === 2 && (
              <>
                <div style={{ padding: '20px 28px 16px', background: 'linear-gradient(135deg,#fef2f2,#fff5f5)', borderBottom: '1px solid #fecaca' }}>
                  <h2 style={{ margin: 0, color: '#991b1b', fontSize: '1.05rem' }}>🔒 Cierre de Día — Conteo Final</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>Este registro queda guardado en el historial y se envía reporte</p>
                </div>
                <div style={{ padding: '22px 28px' }}>
                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    {cajaStats.cajaBase > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#475569', fontSize: '0.85rem' }}>
                        <span>🏦 Base:</span><strong style={{ color: '#3b82f6' }}>${cajaStats.cajaBase.toLocaleString('es-CO')}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#475569', fontSize: '0.85rem' }}>
                      <span>💵 Ventas efectivo:</span><strong style={{ color: '#16a34a' }}>+${(cajaStats.salesEfectivo || 0).toLocaleString('es-CO')}</strong>
                    </div>
                    {cajaStats.abonosEfectivo > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#475569', fontSize: '0.85rem' }}>
                        <span>📒 Abonos fiados (efectivo):</span><strong style={{ color: '#16a34a' }}>+${cajaStats.abonosEfectivo.toLocaleString('es-CO')}</strong>
                      </div>
                    )}
                    {cajaStats.totalExpensesEfectivo > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#475569', fontSize: '0.85rem' }}>
                        <span>💸 Gastos efectivo:</span><strong style={{ color: '#dc2626' }}>-${cajaStats.totalExpensesEfectivo.toLocaleString('es-CO')}</strong>
                      </div>
                    )}
                    <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', color: '#1e293b' }}>Efectivo esperado en caja:</span>
                      <span style={{ fontSize: '1.4rem', color: '#dc2626', fontWeight: '900' }}>${cajaStats.expectedCash.toLocaleString('es-CO')}</span>
                    </div>
                  </div>

                  <form onSubmit={submitCierreCaja} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '6px', fontWeight: '600' }}>¿Cuánto efectivo físico hay en caja?</label>
                      <input required type="number" className="input" value={actualCash} onChange={e => setActualCash(e.target.value)} placeholder="Cuenta el efectivo y escríbelo aquí" style={{ fontSize: '1.3rem', fontWeight: 'bold', border: '2px solid #fca5a5', borderRadius: '10px' }} autoFocus />
                    </div>
                    {actualCash !== '' && (() => {
                      const diff = Number(actualCash) - cajaStats.expectedCash;
                      return (
                        <div style={{ padding: '12px', textAlign: 'center', fontWeight: '700', borderRadius: '8px', fontSize: '1rem',
                          backgroundColor: diff < 0 ? '#fef2f2' : '#f0fdf4',
                          color: diff < 0 ? '#dc2626' : '#16a34a' }}>
                          {diff < 0 ? '⚠ Faltan: ' : '✅ Sobran: '}${Math.abs(diff).toLocaleString('es-CO')}
                          {diff === 0 && ' — Cuadra perfecto ✓'}
                        </div>
                      );
                    })()}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" onClick={() => setCierrePaso(1)} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}>← Atrás</button>
                      <button type="submit" disabled={processing} style={{ flex: 2, padding: '11px', borderRadius: '8px', border: 'none', background: processing ? '#94a3b8' : '#dc2626', color: 'white', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem' }}>
                        {processing ? 'Cerrando...' : '🔒 Confirmar Cierre Definitivo'}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
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
                  <option value="CAPITAL">🏢 Capital de la Empresa</option>
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

      {/* ── Modal Nombrar Ticket Pendiente ── */}
      {pendingNameModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setPendingNameModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '14px', width: '100%', maxWidth: '350px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 16px', color: '#0f172a' }}>🕒 Guardar Ticket Pendiente</h3>
            <form onSubmit={handleSavePending}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '8px', fontWeight: '600' }}>Nombre o Referencia (ej. Mesa 3)</label>
              <input
                ref={pendingInputRef}
                autoFocus
                required
                type="text"
                className="input"
                value={pendingName}
                onChange={e => setPendingName(e.target.value)}
                placeholder="Mesa 1, Juan..."
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setPendingNameModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>Cancelar</button>
                <button type="submit" disabled={!pendingName.trim()} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Lista de Tickets Pendientes ── */}
      {pendingListModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setPendingListModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, color: '#0f172a' }}>📋 Tickets Pendientes</h2>
              <button onClick={() => setPendingListModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {openTickets.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>No hay tickets en cola.</p>
              ) : (
                openTickets.map(ticket => {
                  const itemsCount = ticket.cart.reduce((s, i) => s + (isWeightProduct(i.product) ? 1 : i.quantity), 0);
                  const ticketTotal = ticket.cart.reduce((s, i) => s + (i.product.price * i.quantity), 0);
                  
                  return (
                    <div key={ticket.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => handleLoadPending(ticket)}>
                        <h4 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: '1rem' }}>{ticket.name}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'} · <strong style={{ color: '#0f172a' }}>${Math.round(ticketTotal).toLocaleString('es-CO')}</strong>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={(e) => handleDeletePending(ticket.id, e)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>🗑</button>
                        <button onClick={() => handleLoadPending(ticket)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Cargar</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
