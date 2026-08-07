"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (role === 'tendero' && pin === '1234') {
      router.push('/pos');
    } else if (role === 'admin' && pin === '0000') {
      router.push('/admin');
    } else {
      setError('PIN incorrecto. Intenta de nuevo.');
      setPin('');
    }
  };

  if (role) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="glass-panel" style={{ padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <h2>Ingreso {role === 'admin' ? 'Administrador' : 'Tendero'}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
            {role === 'admin' ? 'PIN por defecto: 0000' : 'PIN por defecto: 1234'}
          </p>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              className="input" 
              placeholder="Ingresa tu PIN" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem', marginBottom: '20px' }}
            />
            {error && <p style={{ color: 'var(--danger)', marginBottom: '20px' }}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>Ingresar</button>
          </form>
          <button 
            className="btn" 
            onClick={() => { setRole(null); setError(''); setPin(''); }}
            style={{ marginTop: '20px', color: 'var(--text-muted)', background: 'transparent' }}
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>🏪 Tienda Donde Juancho</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Sistema de Ventas, Fiados e Inventario</p>
      </div>

      <div className="grid-cards" style={{ maxWidth: '900px', width: '100%' }}>
        <div
          className="glass-panel"
          style={{ padding: '40px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
          onClick={() => setRole('tendero')}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏪</div>
          <h2>Punto de Venta</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Registrar ventas diarias rápidamente</p>
        </div>

        <div
          className="glass-panel"
          style={{ padding: '40px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
          onClick={() => setRole('admin')}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📊</div>
          <h2>Administración</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Control de inventario y ganancias</p>
        </div>

        <div
          className="glass-panel"
          style={{ padding: '40px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid #fecaca', background: 'rgba(254,242,242,0.6)' }}
          onClick={() => router.push('/fiado')}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📒</div>
          <h2>Libro de Fiados</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Clientes con cuentas pendientes</p>
        </div>
      </div>
    </div>

  );
}
