"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeConfig, setStoreConfig] = useState({});
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ caja_base: '', capital_inicial: '' });
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    const t = Date.now();
    Promise.all([
      fetch(`/api/products?t=${t}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/transactions?t=${t}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/expenses?t=${t}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/config?t=${t}`, { cache: 'no-store' }).then(r => r.json()),
    ]).then(([prodData, txData, expData, cfgData]) => {
      setProducts(Array.isArray(prodData) ? prodData : []);
      setTransactions(Array.isArray(txData) ? txData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
      const cfg = cfgData && !cfgData.error ? cfgData : {};
      setStoreConfig(cfg);
      setConfigForm({
        caja_base: cfg.caja_base?.value || '',
        capital_inicial: cfg.capital_inicial?.value || '',
      });
      setLoading(false);
    });
  }, []);

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);
  const salesEfectivo = transactions.filter(t => t.type === 'VENTA' && t.paymentMethod === 'EFECTIVO').reduce((sum, t) => sum + t.total, 0);
  const salesTransfer = transactions.filter(t => t.type === 'VENTA' && t.paymentMethod === 'TRANSFERENCIA').reduce((sum, t) => sum + t.total, 0);
  const salesToday = salesEfectivo + salesTransfer;

  const expensesEfectivo = expenses.filter(e => e.paymentMethod === 'EFECTIVO').reduce((sum, e) => sum + e.amount, 0);
  const expensesTransfer = expenses.filter(e => e.paymentMethod === 'TRANSFERENCIA').reduce((sum, e) => sum + e.amount, 0);
  const expensesToday = expensesEfectivo + expensesTransfer;
  
  const netBalance = salesToday - expensesToday;

  // Valor total del inventario = suma de (precio × stock) por producto
  const inventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);

  // Desglose por categoría
  const byCategory = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = { value: 0, units: 0 };
    acc[p.category].value += p.price * p.stock;
    acc[p.category].units += p.stock;
    return acc;
  }, {});
  const categoryList = Object.entries(byCategory)
    .map(([cat, d]) => ({ cat, ...d }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="animate-fade-in" style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0 }}>🏪 Tienda Donde Juancho</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Panel de Administración y Control</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => router.push('/admin/ventas')}>📈 Historial de Ventas</button>
          <button className="btn btn-primary" onClick={() => router.push('/admin/gastos')} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>💸 Historial de Gastos</button>
          <button className="btn btn-primary" onClick={() => router.push('/admin/inventory')}>📦 Gestor de Inventario</button>
          <button className="btn" onClick={() => router.push('/')} style={{ background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>Cerrar Sesión</button>
        </div>

      </div>

      {loading ? <p>Cargando datos del negocio...</p> : (
        <>
          {/* ── Tarjetas operativas del día ── */}
          <div className="grid-cards" style={{ marginBottom: '30px' }}>
            <div className="glass-panel" style={{ padding: '26px' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📈 Ventas Hoy</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)', marginTop: '8px' }}>
                ${salesToday.toLocaleString('es-CO')}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                💵 Efectivo: ${salesEfectivo.toLocaleString('es-CO')}<br />
                📱 Nequi/Banco: ${salesTransfer.toLocaleString('es-CO')}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '26px' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💸 Gastos Hoy</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)', marginTop: '8px' }}>
                -${expensesToday.toLocaleString('es-CO')}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                💵 Efectivo: ${expensesEfectivo.toLocaleString('es-CO')}<br />
                📱 Transferencia: ${expensesTransfer.toLocaleString('es-CO')}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '26px', background: netBalance >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${netBalance >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
              <h3 style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💰 Balance Neto Hoy</h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: netBalance >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '8px' }}>
                ${netBalance.toLocaleString('es-CO')}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {netBalance >= 0 ? '✅ Día positivo' : '⚠ Gastos mayores a ventas'}
              </div>
            </div>
          </div>

          {/* ── Tarjetas de Inventario ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>

            {/* Valor total */}
            <div className="glass-panel" style={{ padding: '26px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.06))', border: '1px solid rgba(59,130,246,0.2)' }}>
              <h3 style={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>📦 Valor Total del Inventario</h3>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1e293b' }}>
                ${inventoryValue.toLocaleString('es-CO')}
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.83rem', color: '#64748b', display: 'flex', gap: '16px' }}>
                <span>🏷 {totalProducts} productos</span>
                <span>📊 {totalUnits.toLocaleString('es-CO')} unidades</span>
              </div>
            </div>

            {/* Alertas stock bajo */}
            <div className="glass-panel" style={{ padding: '26px', background: lowStockProducts.length > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)', border: `1px solid ${lowStockProducts.length > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
              <h3 style={{ color: lowStockProducts.length > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                {lowStockProducts.length > 0 ? '🚨 Stock Bajo' : '✅ Stock OK'}
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: lowStockProducts.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {lowStockProducts.length} <span style={{ fontSize: '1rem', fontWeight: '500' }}>productos</span>
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.83rem', color: '#64748b' }}>
                {lowStockProducts.length > 0 ? lowStockProducts.slice(0, 2).map(p => p.name).join(', ') + (lowStockProducts.length > 2 ? ` y ${lowStockProducts.length - 2} más...` : '') : 'Todo el inventario en niveles óptimos'}
              </div>
            </div>

            {/* Desglose por categoría - top 3 */}
            <div className="glass-panel" style={{ padding: '26px' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>🏆 Top Categorías (Valor)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {categoryList.slice(0, 4).map(({ cat, value, units }) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>{cat}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{units} und</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#3b82f6' }}>${Math.round(value).toLocaleString('es-CO')}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{inventoryValue > 0 ? ((value / inventoryValue) * 100).toFixed(1) : 0}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
            {/* Inventario Critico */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h2 style={{ marginBottom: '20px', color: 'var(--danger)' }}>🚨 Productos por Agotarse</h2>
              {lowStockProducts.length === 0 ? (
                <p style={{ color: 'var(--success)' }}>¡Todo el inventario está en niveles óptimos!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {lowStockProducts.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                      <span><strong>{p.name}</strong> ({p.category})</span>
                      <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Quedan: {p.stock}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                className="btn btn-primary" 
                style={{ marginTop: '20px', width: '100%' }}
                onClick={() => alert('Función de "Pedir a Proveedor" en desarrollo.')}
              >
                📝 Crear Pedido de Surtido
              </button>
            </div>

            {/* Ultimas Transacciones */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h2 style={{ marginBottom: '20px' }}>🧾 Últimas Ventas</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                {transactions.slice(0, 20).map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ background: t.type === 'VENTA' ? 'var(--success)' : 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', marginRight: '10px', color: 'white', fontWeight: 'bold' }}>{t.type}</span>
                      <span style={{ background: t.paymentMethod === 'TRANSFERENCIA' ? 'var(--secondary)' : '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', marginRight: '10px', color: 'white', fontWeight: 'bold' }}>
                        {t.paymentMethod === 'TRANSFERENCIA' ? '📱 Nequi/Transf.' : '💵 Efectivo'}
                      </span>
                      {t.quantity}x {t.product?.name}
                    </div>
                    <span style={{ fontWeight: 'bold' }}>${t.total.toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Gastos de Hoy */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h2 style={{ marginBottom: '20px', color: 'var(--danger)' }}>💸 Gastos Registrados</h2>
              {expenses.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No se han registrado gastos hoy.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                  {expenses.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{e.description}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Pagado con: {e.paymentMethod === 'EFECTIVO' ? '💵 Efectivo (Salió de Caja)' : '📱 Transferencia'}
                        </div>
                      </div>
                      <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>-${e.amount.toLocaleString('es-CO')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Panel de Capital y Caja Base ── */}
          <div className="glass-panel" style={{ padding: '28px', marginTop: '30px', background: 'linear-gradient(135deg,rgba(59,130,246,0.04),rgba(99,102,241,0.04))', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1e293b' }}>🏦 Capital y Saldo de Caja</h2>
              {!editingConfig ? (
                <button onClick={() => setEditingConfig(true)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569', fontSize: '0.85rem', fontFamily: 'inherit' }}>✏️ Editar</button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setEditingConfig(false)}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569', fontFamily: 'inherit', fontSize: '0.85rem' }}>Cancelar</button>
                  <button onClick={async () => {
                    setSavingConfig(true);
                    await Promise.all([
                      fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'caja_base', value: configForm.caja_base, label: 'Saldo Base de Caja (arranque diario)' }) }),
                      fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'capital_inicial', value: configForm.capital_inicial, label: 'Capital Total de la Tienda' }) }),
                    ]);
                    const updated = await fetch('/api/config?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
                    setStoreConfig(updated);
                    setEditingConfig(false);
                    setSavingConfig(false);
                  }} disabled={savingConfig}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>
                    {savingConfig ? 'Guardando...' : '✅ Guardar'}
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {/* Capital total */}
              <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💰 Capital Total de la Tienda</p>
                {editingConfig ? (
                  <input type="number" className="input" value={configForm.capital_inicial}
                    onChange={e => setConfigForm(f => ({ ...f, capital_inicial: e.target.value }))}
                    style={{ marginTop: '8px', fontSize: '1.3rem', fontWeight: '800', border: '2px solid #bfdbfe', borderRadius: '8px' }} />
                ) : (
                  <p style={{ margin: '8px 0 0', fontSize: '1.8rem', fontWeight: '900', color: '#1e293b' }}>
                    ${(storeConfig.capital_inicial?.value || 0).toLocaleString('es-CO')}
                  </p>
                )}
                <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>Dinero total disponible de la tienda</p>
              </div>

              {/* Saldo base de caja */}
              <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏦 Saldo Base de Caja</p>
                {editingConfig ? (
                  <input type="number" className="input" value={configForm.caja_base}
                    onChange={e => setConfigForm(f => ({ ...f, caja_base: e.target.value }))}
                    style={{ marginTop: '8px', fontSize: '1.3rem', fontWeight: '800', border: '2px solid #bfdbfe', borderRadius: '8px' }} />
                ) : (
                  <p style={{ margin: '8px 0 0', fontSize: '1.8rem', fontWeight: '900', color: '#3b82f6' }}>
                    ${(storeConfig.caja_base?.value || 0).toLocaleString('es-CO')}
                  </p>
                )}
                <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>Arranca el día con este dinero en caja</p>
              </div>

              {/* Nota explicativa */}
              <div style={{ padding: '20px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fef08a' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📌 Cómo funciona</p>
                <p style={{ margin: '8px 0 0', fontSize: '0.83rem', color: '#78350f', lineHeight: '1.5' }}>
                  El <strong>saldo base</strong> se suma automáticamente al efectivo esperado en el <strong>Cuadre de Caja</strong>.<br/>
                  Fórmula: <em>Base + Ventas en efectivo − Gastos en efectivo</em>
                </p>
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
