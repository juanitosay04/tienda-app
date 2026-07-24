"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = Date.now();
    Promise.all([
      fetch(`/api/products?t=${t}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/transactions?t=${t}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/expenses?t=${t}`, { cache: 'no-store' }).then(r => r.json())
    ]).then(([prodData, txData, expData]) => {
      setProducts(Array.isArray(prodData) ? prodData : []);
      setTransactions(Array.isArray(txData) ? txData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
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
        <h1>Panel de Administración</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => router.push('/admin/ventas')}>📈 Historial de Ventas</button>
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
        </>
      )}
    </div>
  );
}
