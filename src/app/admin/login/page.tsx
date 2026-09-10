'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/admin');
    } else {
      setError('Contraseña incorrecta');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f1629' }}>
      <div style={{ width: '100%', maxWidth: 360, padding: '0 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, letterSpacing: 3, color: '#6b7280', textTransform: 'uppercase' }}>Teatro AEC Rosario</p>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: 'Georgia, serif' }}>Panel de Gestión</h1>
        </div>

        <form onSubmit={login} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6, letterSpacing: 1 }}>CONTRASEÑA</label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="Ingresá la contraseña"
              autoFocus
              style={{ width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: '#ef4444', textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !pass}
            style={{ padding: '11px', background: loading || !pass ? '#374151' : '#162264', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading || !pass ? 'default' : 'pointer', transition: 'background .2s' }}
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
