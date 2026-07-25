"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Convierte una fecha a clave local YYYY-MM-DD (usa hora del navegador, no UTC)
const toLocalKey = (dateStr) => {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fmtDay = (localKey) => {
  const [y, m, d] = localKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long' });
};

const fmtTime = (dateStr) => new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

export default function VentasHistory() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState(new Set());

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  useEffect(() => {
    const t = Date.now();
    Promise.all([
      fetch(`/api/transactions?t=${t}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/expenses?t=${t}`, { cache: 'no-store' }).then(r => r.json()),
    ]).then(([txData, expData]) => {
      setTransactions(Array.isArray(txData) ? txData.filter(tx => tx.type === 'VENTA') : []);
      setExpenses(Array.isArray(expData) ? expData : []);
      setLoading(false);
    });
  }, []);

  // Navegar entre meses
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const isCurrentMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear();

  // Filtrar transacciones del mes seleccionado
  const monthTxs = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      // Usar getMonth/getFullYear para comparar en hora local del navegador
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });
  }, [transactions, viewMonth, viewYear]);

  const monthExp = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });
  }, [expenses, viewMonth, viewYear]);

  // Agrupar por día
  const byDay = useMemo(() => {
    const groups = {};
    monthTxs.forEach(tx => {
      const key = toLocalKey(tx.date); // hora local, no UTC
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return Object.entries(groups)
      .map(([date, txs]) => {
        const efectivo = txs.filter(t => t.paymentMethod === 'EFECTIVO').reduce((s, t) => s + t.total, 0);
        const transferencia = txs.filter(t => t.paymentMethod === 'TRANSFERENCIA').reduce((s, t) => s + t.total, 0);
        return { date, txs, efectivo, transferencia, total: efectivo + transferencia };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTxs]);

  // Totales del mes
  const monthTotal = byDay.reduce((s, d) => s + d.total, 0);
  const monthEfectivo = byDay.reduce((s, d) => s + d.efectivo, 0);
  const monthTransfer = byDay.reduce((s, d) => s + d.transferencia, 0);
  const monthExpTotal = monthExp.filter(e => e.paymentMethod !== 'CAPITAL').reduce((s, e) => s + e.amount, 0);
  const bestDay = byDay.reduce((best, d) => (!best || d.total > best.total) ? d : best, null);

  // Meses disponibles (que tienen ventas)
  const availableMonths = useMemo(() => {
    const set = new Set();
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      set.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    return set;
  }, [transactions]);

  const toggleDay = (date) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: 'white', padding: '16px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: '500' }}>← Administración</button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>📈 Historial de Ventas</h1>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>{transactions.length} ventas registradas en total</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Navegador de mes ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: 'white', borderRadius: '14px', padding: '16px 24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <button onClick={prevMonth}
            style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
            ‹
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>{MONTHS[viewMonth]}</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>{viewYear} {isCurrentMonth && <span style={{ color: '#3b82f6', fontWeight: '700' }}>· Mes actual</span>}</div>
          </div>

          <button onClick={nextMonth} disabled={isCurrentMonth}
            style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #e2e8f0', background: 'white', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCurrentMonth ? '#cbd5e1' : '#475569', transition: 'all 0.15s' }}
            onMouseEnter={e => { if (!isCurrentMonth) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
            ›
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Cargando historial...</div>
        ) : (
          <>
            {/* ── Resumen del mes ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💰 Total Ventas</p>
                <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#16a34a' }}>${monthTotal.toLocaleString('es-CO')}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{byDay.length} días con ventas</p>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💵 Efectivo</p>
                <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#0f172a' }}>${monthEfectivo.toLocaleString('es-CO')}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{monthTotal > 0 ? ((monthEfectivo/monthTotal)*100).toFixed(0) : 0}% del total</p>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📱 Nequi/Banco</p>
                <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#0f172a' }}>${monthTransfer.toLocaleString('es-CO')}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{monthTotal > 0 ? ((monthTransfer/monthTotal)*100).toFixed(0) : 0}% del total</p>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏆 Mejor Día</p>
                {bestDay ? (
                  <>
                    <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#3b82f6' }}>${bestDay.total.toLocaleString('es-CO')}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(bestDay.date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</p>
                  </>
                ) : <p style={{ margin: '6px 0 0', fontSize: '1rem', color: '#94a3b8' }}>Sin ventas</p>}
              </div>
              <div style={{ background: 'linear-gradient(135deg,#fef2f2,#fff5f5)', borderRadius: '12px', padding: '18px 20px', border: '1px solid #fecaca', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💸 Gastos del Mes</p>
                <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#7f1d1d' }}>${monthExpTotal.toLocaleString('es-CO')}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#fca5a5', fontWeight: '600' }}>Neto: ${(monthTotal - monthExpTotal).toLocaleString('es-CO')}</p>
              </div>
              <div style={{ background: monthTotal > 0 ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'white', borderRadius: '12px', padding: '18px 20px', border: `1px solid ${monthTotal > 0 ? '#bbf7d0' : '#e2e8f0'}` }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🧾 # Ventas</p>
                <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#16a34a' }}>{monthTxs.length}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{byDay.length > 0 ? Math.round(monthTxs.length / byDay.length) : 0} promedio/día</p>
              </div>
            </div>

            {/* ── Lista de días ── */}
            {byDay.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '14px', padding: '60px 20px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</p>
                <p style={{ fontWeight: '500', fontSize: '1rem' }}>Sin ventas en {MONTHS[viewMonth]} {viewYear}</p>
                <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Navega a otro mes para ver el historial</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {byDay.map(({ date, txs, efectivo, transferencia, total }) => {
                  const expanded = expandedDays.has(date);
                  const dayLabel = fmtDay(date);

                  return (
                    <div key={date} style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s' }}>
                      {/* Fila resumen del día */}
                      <div onClick={() => toggleDay(date)}
                        style={{ padding: '16px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>

                        {/* Indicador día */}
                        <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#16a34a', lineHeight: 1 }}>
                            {date.split('-')[2]}
                          </span>
                          <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
                            {new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short' })}
                          </span>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem', textTransform: 'capitalize' }}>{dayLabel}</div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: '#64748b', flexWrap: 'wrap' }}>
                            <span>🧾 {txs.length} {txs.length === 1 ? 'venta' : 'ventas'}</span>
                            {efectivo > 0 && <span>💵 ${efectivo.toLocaleString('es-CO')}</span>}
                            {transferencia > 0 && <span>📱 ${transferencia.toLocaleString('es-CO')}</span>}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#16a34a' }}>${total.toLocaleString('es-CO')}</div>
                        </div>

                        <span style={{ color: '#cbd5e1', fontSize: '1.1rem', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}>›</span>
                      </div>

                      {/* Detalle de transacciones del día */}
                      {expanded && (
                        <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                          {txs.sort((a, b) => new Date(b.date) - new Date(a.date)).map((tx, i) => (
                            <div key={tx.id} style={{ padding: '11px 22px 11px 84px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: i < txs.length - 1 ? '1px solid #f1f5f9' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: tx.paymentMethod === 'EFECTIVO' ? '#dcfce7' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>
                                {tx.paymentMethod === 'EFECTIVO' ? '💵' : '📱'}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {tx.product?.name || 'Producto eliminado'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                                  {fmtTime(tx.date)} · {tx.quantity !== undefined ? `${typeof tx.quantity === 'number' && !Number.isInteger(tx.quantity) ? tx.quantity.toFixed(2) : tx.quantity} und` : ''}
                                  {' · '}{tx.paymentMethod === 'EFECTIVO' ? 'Efectivo' : 'Nequi/Banco'}
                                </div>
                              </div>
                              <div style={{ fontWeight: '700', color: '#16a34a', fontSize: '0.9rem', flexShrink: 0 }}>
                                ${tx.total.toLocaleString('es-CO')}
                              </div>
                            </div>
                          ))}

                          {/* Subtotales del día */}
                          <div style={{ padding: '10px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '20px', fontSize: '0.78rem', fontWeight: '700', color: '#64748b' }}>
                            {efectivo > 0 && <span>Efectivo: <span style={{ color: '#16a34a' }}>${efectivo.toLocaleString('es-CO')}</span></span>}
                            {transferencia > 0 && <span>Nequi: <span style={{ color: '#3b82f6' }}>${transferencia.toLocaleString('es-CO')}</span></span>}
                            <span style={{ color: '#0f172a', fontSize: '0.85rem' }}>Total: <span style={{ color: '#16a34a' }}>${total.toLocaleString('es-CO')}</span></span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
