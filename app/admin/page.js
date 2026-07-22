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
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/transactions').then(r => r.json()),
      fetch('/api/expenses').then(r => r.json())
    ]).then(([prodData, txData, expData]) => {
      setProducts(prodData);
      setTransactions(txData);
      setExpenses(expData);
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

  return (
    <div className="animate-fade-in" style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Panel de Administración</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => router.push('/admin/inventory')}>📦 Gestor de Inventario</button>
          <button className="btn" onClick={() => router.push('/')} style={{ background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>Cerrar Sesión</button>
        </div>
      </div>

      {loading ? <p>Cargando datos del negocio...</p> : (
        <>
          {/* Tarjetas de Resumen */}
          <div className="grid-cards" style={{ marginBottom: '40px' }}>
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h3 style={{ color: 'var(--text-muted)' }}>Ventas Hoy (Ingresos)</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)', marginTop: '10px' }}>
                ${salesToday.toLocaleString('es-CO')}
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Efectivo: ${salesEfectivo.toLocaleString('es-CO')} <br />
                Transferencias: ${salesTransfer.toLocaleString('es-CO')}
              </div>
            </div>
            
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h3 style={{ color: 'var(--text-muted)' }}>Gastos Hoy (Salidas)</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)', marginTop: '10px' }}>
                -${expensesToday.toLocaleString('es-CO')}
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Efectivo: ${expensesEfectivo.toLocaleString('es-CO')} <br />
                Transferencias: ${expensesTransfer.toLocaleString('es-CO')}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '30px', background: netBalance >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: netBalance >= 0 ? '1px solid var(--success)' : '1px solid var(--danger)' }}>
              <h3 style={{ color: 'var(--text-main)' }}>💰 Balance Neto Diario</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: netBalance >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '10px' }}>
                ${netBalance.toLocaleString('es-CO')}
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
