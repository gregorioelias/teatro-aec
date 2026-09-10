'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function PagoContent() {
  const params = useSearchParams();
  const estado = params.get('estado');
  const reserva = params.get('reserva');

  const config = {
    aprobado: { icon: '✓', color: '#2CB356', titulo: '¡Pago aprobado!', msg: 'Tu reserva está confirmada. Presentá tu DNI en boletería el día de la función.' },
    rechazado: { icon: '✕', color: '#E03030', titulo: 'Pago rechazado', msg: 'No se pudo procesar el pago. Podés intentar nuevamente.' },
    pendiente: { icon: '⏳', color: '#E09020', titulo: 'Pago pendiente', msg: 'Tu pago está siendo procesado. Te avisaremos cuando se acredite.' },
  }[estado || 'pendiente'] ?? { icon: '⏳', color: '#E09020', titulo: 'Procesando...', msg: 'Verificando tu pago.' };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 420, width: '100%', background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: 16, padding: 36, textAlign: 'center' }}>
        <span style={{ fontSize: 48, color: config.color, display: 'block', marginBottom: 16 }}>{config.icon}</span>
        <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 22, fontWeight: 600, marginBottom: 10, color: 'var(--ink)' }}>{config.titulo}</h2>
        <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 24 }}>{config.msg}</p>
        {reserva && (
          <div style={{ background: 'var(--bg-m)', borderRadius: 8, padding: '10px 16px', marginBottom: 24, fontSize: 13, color: 'var(--ink3)' }}>
            Código de reserva: <strong style={{ color: 'var(--ink)', fontFamily: 'monospace' }}>{reserva}</strong>
          </div>
        )}
        <a href="/" style={{ display: 'block', padding: 12, background: '#162264', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          Volver al inicio
        </a>
        {estado === 'rechazado' && (
          <a href="/" style={{ display: 'block', marginTop: 10, padding: 12, background: 'transparent', color: 'var(--red)', border: '1.5px solid var(--red)', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Intentar de nuevo
          </a>
        )}
      </div>
    </div>
  );
}

export default function PagoPage() {
  return <Suspense><PagoContent /></Suspense>;
}
