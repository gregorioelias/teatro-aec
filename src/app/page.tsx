'use client';
import { useEffect, useState, useCallback } from 'react';

type Funcion = { id: number; fecha: string; hora: string; capacidad: number };
type Obra = {
  id: number; titulo: string; genero: string; descripcion: string;
  duracion: string; precio: number; ocupacion_base: number; funciones: Funcion[];
};

const ROWS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','BB','CC','DD'];
const COLS = 15, AISLE = 8;
const SW = 13, SH = 18, AH = 8, HS = 17, VS = 24, AG = 18, LW = 22, TH = 18;

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}
function seatX(s: number) { return LW + (s - 1) * HS + (s > AISLE ? AG : 0); }
function seatY(r: number) { return TH + r * VS; }
function svgW() { return seatX(COLS) + SW / 2 + LW + 6; }
function svgH() { return seatY(ROWS.length - 1) + SH / 2 + 12; }

function h(s: string) {
  let v = 5381;
  for (let i = 0; i < s.length; i++) { v = ((v << 5) + v) + s.charCodeAt(i); v |= 0; }
  return Math.abs(v);
}

export default function Home() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [step, setStep] = useState(1);
  const [curObra, setCurObra] = useState<Obra | null>(null);
  const [curFuncion, setCurFuncion] = useState<Funcion | null>(null);
  const [ocupadas, setOcupadas] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [confirmacion, setConfirmacion] = useState<{ codigo: string; total: number; butacas: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [comprador, setComprador] = useState({ nombre: '', email: '' });

  useEffect(() => {
    fetch('/api/init').then(() => fetch('/api/obras').then(r => r.json()).then(setObras));
  }, []);

  const cargarButacas = useCallback(async (funcionId: number) => {
    const res = await fetch(`/api/butacas?funcion_id=${funcionId}`);
    const data: string[] = await res.json();
    setOcupadas(new Set(data));
  }, []);

  const irAMapa = async (obra: Obra, funcion: Funcion) => {
    setCurObra(obra);
    setCurFuncion(funcion);
    setSel(new Set());
    await cargarButacas(funcion.id);
    setStep(2);
  };

  const toggleSeat = (id: string) => {
    if (ocupadas.has(id)) return;
    setSel(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const confirmar = async () => {
    if (!curFuncion || !sel.size) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcion_id: curFuncion.id, butacas: Array.from(sel), nombre: comprador.nombre || null, email: comprador.email || null }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Error al reservar'); return; }
      setConfirmacion(data);
      setModalOpen(false);
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1); setCurObra(null); setCurFuncion(null);
    setSel(new Set()); setConfirmacion(null); setPicked({});
    setComprador({ nombre: '', email: '' }); setModalOpen(false);
    fetch('/api/obras').then(r => r.json()).then(setObras);
  };

  // SVG seat map
  const renderMap = () => {
    const W = svgW(), H = svgH();
    const elements: React.ReactNode[] = [];

    [1, AISLE, AISLE + 1, COLS].forEach(s => {
      elements.push(<text key={`nh-${s}`} x={seatX(s)} y={TH - 5} style={{ fontFamily: 'monospace', fontSize: 8, fill: 'var(--ink3)', textAnchor: 'middle' }}>{s}</text>);
    });

    ROWS.forEach((row, ri) => {
      const cy = seatY(ri);
      elements.push(
        <text key={`rl-${row}`} x={LW - 4} y={cy + SH / 2 - 3} style={{ fontFamily: 'monospace', fontSize: 8, fill: 'var(--ink3)', textAnchor: 'end' }}>{row}</text>,
        <text key={`rr-${row}`} x={W - 3} y={cy + SH / 2 - 3} style={{ fontFamily: 'monospace', fontSize: 8, fill: 'var(--ink3)', textAnchor: 'start' }}>{row}</text>,
      );

      for (let s = 1; s <= COLS; s++) {
        const id = `${row}-${s}`;
        const occ = ocupadas.has(id) || (curObra && h(String(curObra.id) + String(curFuncion?.id) + id) % 100 < Math.round(curObra.ocupacion_base * 100));
        const selected = sel.has(id);
        const state = occ ? 'occupied' : selected ? 'selected' : 'available';
        const cx = seatX(s);
        const x0 = cx - SW / 2, y0 = cy - SH / 2;
        const pd = `M ${x0},${y0 + SH} L ${x0},${y0 + AH} C ${x0},${y0} ${x0 + SW},${y0} ${x0 + SW},${y0 + AH} L ${x0 + SW},${y0 + SH} Z`;

        const colors = {
          occupied: { bk: 'var(--ob)', bt: 'var(--os)', sk: 'var(--ok)' },
          selected: { bk: 'var(--xb)', bt: 'var(--xs)', sk: 'var(--xk)' },
          available: { bk: 'var(--sb)', bt: 'var(--ss)', sk: 'var(--sk)' },
        }[state];

        elements.push(
          <g key={id} onClick={() => !occ && toggleSeat(id)} style={{ cursor: occ ? 'not-allowed' : 'pointer' }}>
            <title>Fila {row}, asiento {s} — {state === 'occupied' ? 'ocupado' : state === 'selected' ? 'seleccionado' : 'disponible'}</title>
            <path d={pd} fill={colors.bk} stroke={colors.sk} strokeWidth={0.8} style={{ transition: 'fill .1s' }} />
            <rect x={x0} y={y0 + AH} width={SW} height={SH - AH} fill={colors.bt} stroke={colors.sk} strokeWidth={0.8} style={{ transition: 'fill .1s' }} />
          </g>
        );
      }
    });

    return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>{elements}</svg>;
  };

  const selArr = Array.from(sel).sort((a, b) => {
    const [ar, an] = a.split('-'); const [br, bn] = b.split('-');
    return ar.localeCompare(br) || Number(an) - Number(bn);
  });

  const avail = ROWS.length * COLS - ocupadas.size - sel.size;

  if (showAdmin) return <AdminPanel onBack={() => setShowAdmin(false)} />;

  const modalInp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bd)', borderRadius: 8, fontSize: 14, background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'inherit' };

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '24px 18px 56px' }}>
      {/* header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ background: '#162264', color: '#fff', padding: '8px 18px', margin: '-24px -18px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', opacity: .9 }}>AEC Rosario</span>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,.3)' }} />
          <span style={{ fontSize: 11, opacity: .65, letterSpacing: '.06em' }}>Asociación Empleados de Comercio · Corrientes 450</span>
          <button onClick={() => setShowAdmin(true)} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.35)', borderRadius: 5, padding: '4px 12px', cursor: 'pointer' }}>
            Panel Admin
          </button>
        </div>
        <div style={{ paddingBottom: 18, borderBottom: '1px solid var(--bd)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 5 }}>Teatro · Reservas en línea</div>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(18px,2.4vw,24px)', fontWeight: 600, letterSpacing: '-.02em', color: 'var(--red)' }}>Reservá tu butaca</div>
        </div>
      </div>

      {/* progress */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 26 }}>
        {[1, 2, 3].map((n, i) => (
          <>
            {i > 0 && <div key={`conn-${n}`} style={{ flex: 1, height: 1, background: 'var(--bd)', maxWidth: 32 }} />}
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: step === n ? 'var(--red)' : step > n ? 'var(--gold)' : 'var(--ink3)', padding: '5px 13px 5px 8px', borderRadius: 99, border: `1px solid ${step === n ? 'var(--red)' : step > n ? 'var(--gold)' : 'var(--bd)'}`, background: 'var(--bg-c)', fontWeight: step === n ? 600 : 400, whiteSpace: 'nowrap' }}>
              <span style={{ width: 19, height: 19, borderRadius: '50%', background: step === n ? 'var(--red)' : step > n ? 'var(--gold)' : 'var(--bd)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: step >= n ? '#fff' : 'inherit', flexShrink: 0 }}>{n}</span>
              {['Elegir función', 'Seleccionar butacas', 'Confirmación'][n - 1]}
            </div>
          </>
        ))}
      </div>

      {/* step 1 */}
      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 18 }}>
          {obras.map(obra => (
            <div key={obra.id} style={{ background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: 12, padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--red)' }}>{obra.genero}</div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 19, fontWeight: 600, lineHeight: 1.2 }}>{obra.titulo}</div>
              <div style={{ fontSize: 13, color: 'var(--ink2)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span>⏱ {obra.duracion}</span><span>📍 Corrientes 450, Rosario</span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink2)' }}>{obra.descripcion}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(obra.precio)} / entrada</div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 7 }}>Elegí una fecha</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {obra.funciones.map(f => (
                  <button key={f.id} onClick={() => setPicked(p => ({ ...p, [obra.id]: f.id }))}
                    style={{ fontFamily: 'inherit', fontSize: 13, border: `1px solid ${picked[obra.id] === f.id ? 'var(--red)' : 'var(--bd)'}`, borderRadius: 6, padding: '6px 10px', background: picked[obra.id] === f.id ? 'color-mix(in srgb,var(--red) 8%,var(--bg))' : 'var(--bg)', color: picked[obra.id] === f.id ? 'var(--red)' : 'var(--ink2)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontWeight: 600, color: picked[obra.id] === f.id ? 'var(--red)' : 'var(--ink)' }}>{f.fecha}</span>
                    <span style={{ fontSize: 11, color: picked[obra.id] === f.id ? 'var(--red)' : 'var(--ink3)' }}>{f.hora}</span>
                  </button>
                ))}
              </div>
              <button disabled={!picked[obra.id]} onClick={() => { const f = obra.funciones.find(fn => fn.id === picked[obra.id])!; irAMapa(obra, f); }}
                style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, padding: 11, cursor: picked[obra.id] ? 'pointer' : 'not-allowed', opacity: picked[obra.id] ? 1 : .35, marginTop: 4 }}>
                Ver mapa de butacas →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* step 2 */}
      {step === 2 && curObra && curFuncion && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) 272px', gap: 18, alignItems: 'start' }}>
          <div style={{ background: 'var(--bg-m)', border: '1px solid var(--bd)', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{curObra.titulo}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink2)', marginTop: 2 }}>{curFuncion.fecha} — {curFuncion.hora} hs · {fmt(curObra.precio)} por butaca</div>
              </div>
              <button onClick={() => { setSel(new Set()); setStep(1); }} style={{ fontFamily: 'inherit', fontSize: 13, color: 'var(--red)', background: 'none', border: '1px solid var(--red)', borderRadius: 6, padding: '5px 11px', cursor: 'pointer' }}>← Volver</button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#fff', padding: 7, borderRadius: '5px 5px 0 0', background: '#162264' }}>Escenario</div>
            <div style={{ overflow: 'auto', maxHeight: 490, padding: '10px 6px 6px', border: '1px solid var(--bd)', borderTop: 'none', borderRadius: '0 0 6px 6px', background: 'var(--bg-m)' }}>
              {renderMap()}
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--bd)' }}>
              {[['a', 'Disponible', 'var(--ss)', 'var(--sk)'], ['s', 'Seleccionada', 'var(--xs)', 'var(--xk)'], ['o', 'Ocupada', 'var(--os)', 'var(--ok)']].map(([, label, bg, border]) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink2)' }}>
                  <span style={{ width: 11, height: 13, borderRadius: 2, background: bg, border: `1px solid ${border}`, flexShrink: 0 }} />{label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 14 }}>
            <div style={{ background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: 12, padding: 18 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Mis butacas</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 26, marginBottom: 14 }}>
                {sel.size === 0 ? <span style={{ fontSize: 13, color: 'var(--ink3)' }}>Hacé clic en una butaca.</span>
                  : selArr.map(id => (
                    <button key={id} onClick={() => toggleSeat(id)} style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', color: 'var(--ink2)' }}>
                      {id} ×
                    </button>
                  ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 12, borderTop: '1px solid var(--bd)', marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: 'var(--ink2)' }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontFamily: 'Georgia,serif' }}>{fmt(sel.size * curObra.precio)}</span>
              </div>
              <button disabled={!sel.size} onClick={() => setModalOpen(true)}
                style={{ width: '100%', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, padding: 11, cursor: sel.size ? 'pointer' : 'not-allowed', opacity: sel.size ? 1 : .35 }}>
                Confirmar reserva
              </button>
            </div>
            <div style={{ background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[['Disponibles', avail], ['Seleccionadas', sel.size], ['Ocupadas', ocupadas.size]].map(([label, val]) => (
                  <div key={label as string} style={{ fontSize: 12.5, color: 'var(--ink3)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{label}</span><span style={{ fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* modal datos comprador */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 18 }}>
          <div style={{ background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 }}>
            <h3 style={{ fontFamily: 'Georgia,serif', fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Datos del comprador</h3>
            <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 22 }}>Opcional — para enviarte la confirmación.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <input
                placeholder="Nombre completo"
                value={comprador.nombre}
                onChange={e => setComprador(c => ({ ...c, nombre: e.target.value }))}
                style={modalInp}
              />
              <input
                type="email"
                placeholder="Email"
                value={comprador.email}
                onChange={e => setComprador(c => ({ ...c, email: e.target.value }))}
                style={modalInp}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: 11, background: 'transparent', color: 'var(--ink3)', border: '1px solid var(--bd)', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={confirmar} disabled={loading} style={{ flex: 2, padding: 11, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .5 : 1, fontFamily: 'inherit' }}>
                {loading ? 'Procesando...' : 'Confirmar reserva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* step 3 */}
      {step === 3 && confirmacion && (
        <div style={{ maxWidth: 460, margin: '0 auto', background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: 16, padding: 36 }}>
          <span style={{ fontSize: 38, display: 'block', marginBottom: 16, color: '#2CB356' }}>✓</span>
          <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 21, fontWeight: 600, marginBottom: 5 }}>¡Reserva realizada!</h2>
          <p style={{ fontSize: 13.5, color: 'var(--ink2)', marginBottom: 22, lineHeight: 1.5 }}>Esta es tu confirmación. Presentá tu DNI en boletería el día de la función.</p>
          <div style={{ border: '1px solid var(--bd)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
            {([
              ['Código', confirmacion.codigo],
              ...(comprador.nombre ? [['Nombre', comprador.nombre]] : []),
              ['Obra', curObra?.titulo ?? ''],
              ['Fecha', `${curFuncion?.fecha} — ${curFuncion?.hora} hs`],
              ['Butacas', confirmacion.butacas.join(' · ')],
              ['Cantidad', `${confirmacion.butacas.length} butaca${confirmacion.butacas.length !== 1 ? 's' : ''}`],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 15px', borderBottom: '1px solid var(--bd)', gap: 14 }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink3)', flexShrink: 0 }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 15px', background: 'color-mix(in srgb,var(--red) 6%,var(--bg-c))' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Total</span>
              <span style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontFamily: 'Georgia,serif', color: 'var(--red)' }}>{fmt(confirmacion.total)}</span>
            </div>
          </div>
          <button onClick={reset} style={{ width: '100%', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: 'transparent', color: 'var(--red)', border: '1.5px solid var(--red)', borderRadius: 8, padding: 11, cursor: 'pointer' }}>
            Hacer otra reserva
          </button>
        </div>
      )}
    </div>
  );
}

function AdminPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'metricas' | 'obras' | 'nueva'>('metricas');
  const [pass, setPass] = useState('');
  const [authed, setAuthed] = useState(false);
  const [metricas, setMetricas] = useState<Record<string, unknown> | null>(null);
  const [obras, setObras] = useState<Obra[]>([]);
  const [form, setForm] = useState({ titulo: '', genero: '', descripcion: '', duracion: '', precio: '', funciones: [{ fecha: '', hora: '', capacidad: '450' }] });
  const [msg, setMsg] = useState('');

  const login = async () => {
    const res = await fetch('/api/admin/metricas', { headers: { 'x-admin-password': pass } });
    if (res.ok) { setMetricas(await res.json()); setAuthed(true); }
    else alert('Contraseña incorrecta');
  };

  const cargarMetricas = useCallback(async () => {
    const res = await fetch('/api/admin/metricas', { headers: { 'x-admin-password': pass } });
    if (res.ok) setMetricas(await res.json());
  }, [pass]);

  const cargarObras = useCallback(async () => {
    const res = await fetch('/api/obras');
    setObras(await res.json());
  }, []);

  useEffect(() => {
    if (authed) { cargarMetricas(); cargarObras(); }
  }, [authed, tab, cargarMetricas, cargarObras]);

  const crearObra = async () => {
    const res = await fetch('/api/admin/obras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pass },
      body: JSON.stringify({ ...form, precio: Number(form.precio), funciones: form.funciones.map(f => ({ ...f, capacidad: Number(f.capacidad) })) }),
    });
    if (res.ok) { setMsg('Obra creada exitosamente'); setForm({ titulo: '', genero: '', descripcion: '', duracion: '', precio: '', funciones: [{ fecha: '', hora: '', capacidad: '450' }] }); cargarObras(); }
    else setMsg('Error al crear la obra');
  };

  const eliminarObra = async (id: number) => {
    if (!confirm('¿Eliminar esta obra?')) return;
    await fetch(`/api/admin/obras?id=${id}`, { method: 'DELETE', headers: { 'x-admin-password': pass } });
    cargarObras();
  };

  if (!authed) return (
    <div style={{ maxWidth: 360, margin: '80px auto', background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: 16, padding: 36 }}>
      <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 20, marginBottom: 20 }}>Panel Admin</h2>
      <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bd)', borderRadius: 8, fontSize: 14, background: 'var(--bg)', color: 'var(--ink)', marginBottom: 12 }} />
      <button onClick={login} style={{ width: '100%', padding: 11, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Ingresar</button>
      <button onClick={onBack} style={{ width: '100%', marginTop: 10, padding: 11, background: 'transparent', color: 'var(--ink3)', border: '1px solid var(--bd)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>← Volver</button>
    </div>
  );

  const T = metricas?.totales as Record<string, number> | undefined;

  const inp = (style?: React.CSSProperties) => ({
    padding: '9px 12px', border: '1px solid var(--bd)', borderRadius: 8, fontSize: 13,
    background: 'var(--bg)', color: 'var(--ink)', width: '100%', ...style,
  });

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '24px 18px 56px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 600, color: 'var(--red)' }}>Panel de Gestión — Teatro AEC</h2>
        <button onClick={onBack} style={{ fontSize: 13, color: 'var(--gold)', background: 'none', border: '1px solid var(--gold)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>← Volver al sistema de reservas</button>
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid var(--bd)', marginBottom: 24, overflowX: 'auto' }}>
        {(['metricas', 'obras', 'nueva'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ fontSize: 13.5, fontWeight: tab === t ? 600 : 500, color: tab === t ? 'var(--red)' : 'var(--ink3)', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--red)' : '2px solid transparent', padding: '10px 18px', cursor: 'pointer', marginBottom: -2, whiteSpace: 'nowrap' }}>
            {t === 'metricas' ? 'Métricas' : t === 'obras' ? 'Obras activas' : 'Nueva obra'}
          </button>
        ))}
      </div>

      {tab === 'metricas' && metricas && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 22 }}>
            {[
              ['Reservas totales', T?.total_reservas ?? 0, ''],
              ['Entradas vendidas', T?.total_entradas ?? 0, ''],
              ['Ingresos totales', T?.total_ingresos ? fmt(T.total_ingresos) : '$0', 'ac'],
            ].map(([label, val, cls]) => (
              <div key={label as string} style={{ background: 'var(--bg-c)', border: `1px solid ${cls === 'ac' ? 'var(--gold)' : 'var(--bd)'}`, borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Georgia,serif', color: cls === 'ac' ? 'var(--gold)' : 'var(--red)' }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--bd)', borderRadius: 10, marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['Función', 'Fecha', 'Hora', 'Cap.', 'Vendidas', 'Ocupación'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)', padding: '11px 14px', background: 'var(--bg-m)', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {(metricas.porFuncion as Record<string, unknown>[])?.map((f, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', fontWeight: 600 }}>{f.titulo as string}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', color: 'var(--ink2)' }}>{f.fecha as string}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', color: 'var(--ink2)' }}>{f.hora as string}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', color: 'var(--ink2)' }}>{f.capacidad as number}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', color: 'var(--ink2)' }}>{f.vendidas as number}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', color: 'var(--ink2)' }}>{f.ocupacion as number}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--bd)', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['Código', 'Hora', 'Obra', 'Función', 'Butacas', 'Total'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)', padding: '11px 14px', background: 'var(--bg-m)', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {(metricas.ultimasReservas as Record<string, unknown>[])?.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', fontFamily: 'monospace', fontSize: 12, color: 'var(--ink3)' }}>{r.codigo as string}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', color: 'var(--ink2)' }}>{(r.creado_en as string)?.slice(11, 16)}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', fontWeight: 600 }}>{r.titulo as string}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', color: 'var(--ink2)' }}>{r.fecha as string}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', fontFamily: 'monospace', fontSize: 12 }}>{r.butacas as string}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', fontWeight: 600, color: 'var(--red)', fontFamily: 'Georgia,serif' }}>{fmt(r.total as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'obras' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {obras.map(o => (
            <div key={o.id} style={{ background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 4 }}>{o.genero}</div>
                <div style={{ fontFamily: 'Georgia,serif', fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{o.titulo}</div>
                <div style={{ fontSize: 13, color: 'var(--ink2)' }}>{o.funciones.length} función{o.funciones.length !== 1 ? 'es' : ''} · {fmt(o.precio)} por entrada</div>
              </div>
              <button onClick={() => eliminarObra(o.id)} style={{ fontSize: 13, color: '#C0392B', background: 'none', border: '1px solid #C0392B', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', flexShrink: 0 }}>Eliminar</button>
            </div>
          ))}
          {obras.length === 0 && <p style={{ color: 'var(--ink3)', textAlign: 'center', padding: 40 }}>No hay obras activas.</p>}
        </div>
      )}

      {tab === 'nueva' && (
        <div style={{ maxWidth: 560 }}>
          {msg && <div style={{ padding: '12px 16px', background: msg.includes('Error') ? '#FEE2E2' : '#D1FAE5', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{msg}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input placeholder="Título de la obra" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} style={inp()} />
            <input placeholder="Género (ej: Teatro · Drama)" value={form.genero} onChange={e => setForm(f => ({ ...f, genero: e.target.value }))} style={inp()} />
            <textarea placeholder="Descripción" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} style={{ ...inp(), height: 80, resize: 'vertical' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input placeholder="Duración (ej: 90 min)" value={form.duracion} onChange={e => setForm(f => ({ ...f, duracion: e.target.value }))} style={inp()} />
              <input placeholder="Precio por entrada" type="number" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} style={inp()} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Funciones</div>
            {form.funciones.map((fn, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                <input placeholder="Fecha (ej: Sáb 15 ago)" value={fn.fecha} onChange={e => setForm(f => { const fs = [...f.funciones]; fs[i] = { ...fs[i], fecha: e.target.value }; return { ...f, funciones: fs }; })} style={inp()} />
                <input placeholder="Hora (ej: 20:00)" value={fn.hora} onChange={e => setForm(f => { const fs = [...f.funciones]; fs[i] = { ...fs[i], hora: e.target.value }; return { ...f, funciones: fs }; })} style={inp()} />
                <input placeholder="Capacidad" type="number" value={fn.capacidad} onChange={e => setForm(f => { const fs = [...f.funciones]; fs[i] = { ...fs[i], capacidad: e.target.value }; return { ...f, funciones: fs }; })} style={inp()} />
                {form.funciones.length > 1 && <button onClick={() => setForm(f => ({ ...f, funciones: f.funciones.filter((_, j) => j !== i) }))} style={{ padding: '9px 12px', border: '1px solid var(--bd)', borderRadius: 8, cursor: 'pointer', background: 'var(--bg)', color: 'var(--ink3)' }}>×</button>}
              </div>
            ))}
            <button onClick={() => setForm(f => ({ ...f, funciones: [...f.funciones, { fecha: '', hora: '', capacidad: '450' }] }))}
              style={{ padding: '8px 16px', border: '1px dashed var(--bd)', borderRadius: 8, cursor: 'pointer', background: 'transparent', color: 'var(--ink3)', fontSize: 13 }}>
              + Agregar función
            </button>
            <button onClick={crearObra} style={{ padding: 12, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
              Crear obra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
