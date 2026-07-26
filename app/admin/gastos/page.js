"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Convierte una fecha a clave local YYYY-MM-DD
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

export default function GastosHistory() {
  const router = useRouter();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedDays, setExpandedDays] = useState(new Set());

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const fetchExpenses = async () => {
    const t = Date.now();
    const res = await fetch(`/api/expenses?t=${t}`, { cache: 'no-store' });
    const expData = await res.json();
    setExpenses(Array.isArray(expData) ? expData : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Evitar que expanda el día
    if (!confirm('¿Estás seguro de eliminar este gasto? Si fue pagado con Capital, el dinero volverá a la caja.')) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert('Error: ' + (data.error || 'Error desconocido'));
      } else {
        await fetchExpenses();
      }
    } catch (err) {
      alert('Error de conexión: ' + err.message);
    }
    setDeletingId(null);
  };

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

  // Filtrar gastos del mes seleccionado
  const monthExp = useMemo(() => {
    return expenses.filter(exp => {
      const d = new Date(exp.date);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });
  }, [expenses, viewMonth, viewYear]);

  // Agrupar por día
  const byDay = useMemo(() => {
    const groups = {};
    monthExp.forEach(exp => {
      const key = toLocalKey(exp.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(exp);
    });
    return Object.entries(groups)
      .map(([date, exps]) => {
        const efectivo = exps.filter(t => t.paymentMethod === 'EFECTIVO').reduce((s, t) => s + t.amount, 0);
        const transferencia = exps.filter(t => t.paymentMethod === 'TRANSFERENCIA').reduce((s, t) => s + t.amount, 0);
        const capital = exps.filter(t => t.paymentMethod === 'CAPITAL').reduce((s, t) => s + t.amount, 0);
        return { date, exps, efectivo, transferencia, capital, total: efectivo + transferencia + capital };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthExp]);

  // Totales del mes
  const monthTotal = byDay.reduce((s, d) => s + d.total, 0);
  const monthEfectivo = byDay.reduce((s, d) => s + d.efectivo, 0);
  const monthTransfer = byDay.reduce((s, d) => s + d.transferencia, 0);
  const monthCapital = byDay.reduce((s, d) => s + d.capital, 0);
  const worstDay = byDay.reduce((worst, d) => (!worst || d.total > worst.total) ? d : worst, null);

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
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>💸 Historial de Gastos</h1>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>{expenses.length} gastos registrados en total</p>
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
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💸 Total Gastos</p>
                <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#dc2626' }}>${monthTotal.toLocaleString('es-CO')}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{byDay.length} días con gastos</p>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💵 Efectivo Caja</p>
                <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#0f172a' }}>${monthEfectivo.toLocaleString('es-CO')}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{monthTotal > 0 ? ((monthEfectivo/monthTotal)*100).toFixed(0) : 0}% del total</p>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📱 Transferencia</p>
                <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#0f172a' }}>${monthTransfer.toLocaleString('es-CO')}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{monthTotal > 0 ? ((monthTransfer/monthTotal)*100).toFixed(0) : 0}% del total</p>
              </div>
              <div style={{ background: 'linear-gradient(135deg,#eff6ff,#f4f6ff)', borderRadius: '12px', padding: '18px 20px', border: '1px solid #bfdbfe', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏢 Capital Empresa</p>
                <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#1e3a8a' }}>${monthCapital.toLocaleString('es-CO')}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#60a5fa', fontWeight: '600' }}>No afecta el cuadre</p>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🚨 Día más costoso</p>
                {worstDay ? (
                  <>
                    <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#ef4444' }}>${worstDay.total.toLocaleString('es-CO')}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(worstDay.date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</p>
                  </>
                ) : <p style={{ margin: '6px 0 0', fontSize: '1rem', color: '#94a3b8' }}>Sin gastos</p>}
              </div>
              <div style={{ background: monthTotal > 0 ? 'linear-gradient(135deg,#fef2f2,#fee2e2)' : 'white', borderRadius: '12px', padding: '18px 20px', border: `1px solid ${monthTotal > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🧾 # Gastos</p>
                <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#dc2626' }}>{monthExp.length}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{byDay.length > 0 ? Math.round(monthExp.length / byDay.length) : 0} promedio/día</p>
              </div>
            </div>

            {/* ── Lista de días ── */}
            {byDay.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '14px', padding: '60px 20px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</p>
                <p style={{ fontWeight: '500', fontSize: '1rem' }}>Sin gastos en {MONTHS[viewMonth]} {viewYear}</p>
                <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Navega a otro mes para ver el historial</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {byDay.map(({ date, exps, efectivo, transferencia, capital, total }) => {
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
                        <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#dc2626', lineHeight: 1 }}>
                            {date.split('-')[2]}
                          </span>
                          <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
                            {new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short' })}
                          </span>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem', textTransform: 'capitalize' }}>{dayLabel}</div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: '#64748b', flexWrap: 'wrap' }}>
                            <span>🧾 {exps.length} {exps.length === 1 ? 'gasto' : 'gastos'}</span>
                            {efectivo > 0 && <span>💵 Efe: ${efectivo.toLocaleString('es-CO')}</span>}
                            {transferencia > 0 && <span>📱 Tra: ${transferencia.toLocaleString('es-CO')}</span>}
                            {capital > 0 && <span>🏢 Cap: ${capital.toLocaleString('es-CO')}</span>}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#dc2626' }}>${total.toLocaleString('es-CO')}</div>
                        </div>

                        <span style={{ color: '#cbd5e1', fontSize: '1.1rem', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}>›</span>
                      </div>

                      {/* Detalle de gastos del día */}
                      {expanded && (
                        <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                          {exps.sort((a, b) => new Date(b.date) - new Date(a.date)).map((exp, i) => (
                            <div key={exp.id} style={{ padding: '11px 22px 11px 84px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: i < exps.length - 1 ? '1px solid #f1f5f9' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)', opacity: deletingId === exp.id ? 0.5 : 1 }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: exp.paymentMethod === 'EFECTIVO' ? '#dcfce7' : exp.paymentMethod === 'CAPITAL' ? '#dbeafe' : '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>
                                {exp.paymentMethod === 'EFECTIVO' ? '💵' : exp.paymentMethod === 'CAPITAL' ? '🏢' : '📱'}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {exp.description}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                                  {fmtTime(exp.date)}
                                  {' · '}{exp.paymentMethod === 'EFECTIVO' ? 'Efectivo' : exp.paymentMethod === 'CAPITAL' ? 'Capital' : 'Transferencia'}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ fontWeight: '700', color: '#dc2626', fontSize: '0.9rem', flexShrink: 0 }}>
                                  ${exp.amount.toLocaleString('es-CO')}
                                </div>
                                <button onClick={(e) => handleDelete(exp.id, e)} disabled={deletingId === exp.id}
                                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>
                                  {deletingId === exp.id ? '...' : '🗑'}
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Subtotales del día */}
                          <div style={{ padding: '10px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '20px', fontSize: '0.78rem', fontWeight: '700', color: '#64748b', flexWrap: 'wrap' }}>
                            {efectivo > 0 && <span>Efectivo: <span style={{ color: '#0f172a' }}>${efectivo.toLocaleString('es-CO')}</span></span>}
                            {transferencia > 0 && <span>Transferencia: <span style={{ color: '#0f172a' }}>${transferencia.toLocaleString('es-CO')}</span></span>}
                            {capital > 0 && <span>Capital: <span style={{ color: '#3b82f6' }}>${capital.toLocaleString('es-CO')}</span></span>}
                            <span style={{ color: '#0f172a', fontSize: '0.85rem' }}>Total: <span style={{ color: '#dc2626' }}>${total.toLocaleString('es-CO')}</span></span>
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
