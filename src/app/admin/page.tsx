'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Totales = { total_reservas: number; total_entradas: number; total_ingresos: number };
type ObraMetrica = { id: number; titulo: string; precio: number; funciones: number; entradas: number; ingresos: number; ocupacion: number };
type FuncionMetrica = { id: number; fecha: string; hora: string; capacidad: number; titulo: string; vendidas: number; ingresos: number; ocupacion: number };
type Reserva = { id: number; codigo: string; creado_en: string; butacas: string; cantidad: number; total: number; nombre: string | null; email: string | null; estado: string; titulo: string; fecha: string; hora: string };
type DiaMetrica = { dia: string; reservas: number; entradas: number; ingresos: number };
type FormFuncion = { fecha: string; hora: string; capacidad: string };
type Form = { titulo: string; genero: string; descripcion: string; duracion: string; precio: string; funciones: FormFuncion[] };

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
}
function fmtFecha(s: string) {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return s;
}
function fmtDia(s: string) {
  const d = new Date(s + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}
function fmtTs(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 24, ...extra,
});
const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11, letterSpacing: 1.5, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #1f2937', whiteSpace: 'nowrap' };
const td = (extra?: React.CSSProperties): React.CSSProperties => ({ padding: '11px 12px', fontSize: 13, color: '#d1d5db', borderBottom: '1px solid #111827', ...extra });

function OcupacionBar({ pct }: { pct: number }) {
  const p = Math.min(pct || 0, 100);
  const color = p >= 80 ? '#22c55e' : p >= 50 ? '#f59e0b' : '#6b7280';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .5s' }} />
      </div>
      <span style={{ fontSize: 12, color, minWidth: 36, textAlign: 'right' }}>{p.toFixed(0)}%</span>
    </div>
  );
}

function BarChart({ data }: { data: DiaMetrica[] }) {
  if (!data.length) return <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Sin datos aún</p>;
  const max = Math.max(...data.map(d => d.ingresos), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, paddingTop: 8 }}>
      {data.map(d => {
        const h = Math.max((d.ingresos / max) * 100, 2);
        return (
          <div key={d.dia} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}
            title={`${fmtDia(d.dia)}\n${fmt(d.ingresos)}\n${d.entradas} entradas`}>
            <div style={{ width: '100%', height: `${h}%`, background: '#162264', borderRadius: '3px 3px 0 0', transition: 'height .4s' }} />
            {data.length <= 14 && (
              <span style={{ fontSize: 9, color: '#4b5563', transform: 'rotate(-45deg)', whiteSpace: 'nowrap', transformOrigin: 'top left', marginLeft: 4 }}>
                {fmtDia(d.dia)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const emptyForm = (): Form => ({ titulo: '', genero: '', descripcion: '', duracion: '', precio: '', funciones: [{ fecha: '', hora: '', capacidad: '450' }] });
const inp = (): React.CSSProperties => ({ padding: '9px 13px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' });

export default function AdminPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard' | 'funciones' | 'reservas' | 'nueva'>('dashboard');
  const [totales, setTotales] = useState<Totales | null>(null);
  const [porObra, setPorObra] = useState<ObraMetrica[]>([]);
  const [porFuncion, setPorFuncion] = useState<FuncionMetrica[]>([]);
  const [ultimasReservas, setUltimasReservas] = useState<Reserva[]>([]);
  const [porDia, setPorDia] = useState<DiaMetrica[]>([]);
  const [form, setForm] = useState<Form>(emptyForm());
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/metricas');
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    setTotales(data.totales);
    setPorObra(data.porObra || []);
    setPorFuncion(data.porFuncion || []);
    setUltimasReservas(data.ultimasReservas || []);
    setPorDia(data.porDia || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { cargar(); }, [cargar]);

  const confirmarReserva = async (id: number) => {
    await fetch('/api/admin/confirmar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reserva_id: id }) });
    cargar();
  };

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const crearObra = async () => {
    if (!form.titulo || !form.precio) { setMsg('error:Completá título y precio'); return; }
    if (form.funciones.some(f => !f.fecha || !f.hora)) { setMsg('error:Completá fecha y hora de todas las funciones'); return; }
    try {
      const res = await fetch('/api/admin/obras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, precio: Number(form.precio), funciones: form.funciones.map(f => ({ ...f, capacidad: Number(f.capacidad) })) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('ok:Obra creada correctamente');
        setForm(emptyForm());
        cargar();
      } else {
        setMsg('error:' + (data.error || 'No se pudo crear la obra'));
      }
    } catch (e) {
      setMsg('error:Error de red — ' + String(e));
    }
  };

  const desactivarObra = async (id: number, titulo: string) => {
    if (!confirm(`¿Desactivar "${titulo}"? Las reservas existentes no se afectan.`)) return;
    await fetch(`/api/admin/obras?id=${id}`, { method: 'DELETE' });
    cargar();
  };

  const isErr = msg.startsWith('error:');
  const msgTxt = msg.replace(/^(ok|error):/, '');

  const TABS = [
    { k: 'dashboard', label: 'Dashboard' },
    { k: 'funciones', label: 'Funciones' },
    { k: 'reservas', label: 'Reservas' },
    { k: 'nueva', label: '+ Nueva obra' },
  ] as const;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f1629' }}>
      <p style={{ color: '#6b7280', fontSize: 14 }}>Cargando...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0f1629', color: '#fff' }}>
      {/* Header */}
      <div style={{ background: '#0d1117', borderBottom: '1px solid #1f2937', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div>
            <span style={{ fontSize: 11, letterSpacing: 2, color: '#6b7280', textTransform: 'uppercase' }}>Teatro AEC &nbsp;/&nbsp;</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Panel de Gestión</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a href="/" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>← Reservas</a>
            <button onClick={logout} style={{ fontSize: 12, color: '#ef4444', background: 'transparent', border: '1px solid #374151', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>Salir</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid #1f2937', paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.k} onClick={() => { setTab(t.k); setMsg(''); }}
              style={{ padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: tab === t.k ? '2px solid #4f6ef7' : '2px solid transparent', color: tab === t.k ? '#a5b4fc' : '#6b7280', fontSize: 14, cursor: 'pointer', fontWeight: tab === t.k ? 600 : 400, marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { label: 'Ingresos confirmados', value: fmt(totales?.total_ingresos || 0), sub: 'Solo pagos aprobados', color: '#22c55e' },
                { label: 'Entradas vendidas', value: String(totales?.total_entradas || 0), sub: 'Reservas confirmadas', color: '#a5b4fc' },
                { label: 'Reservas totales', value: String(totales?.total_reservas || 0), sub: 'Confirmadas este período', color: '#f59e0b' },
              ].map(k => (
                <div key={k.label} style={card()}>
                  <p style={{ margin: '0 0 8px', fontSize: 11, letterSpacing: 1.5, color: '#6b7280', textTransform: 'uppercase' }}>{k.label}</p>
                  <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#4b5563' }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Gráfico ingresos por día */}
            <div style={card()}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#fff' }}>Ingresos por día</p>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: '#6b7280' }}>Últimos 30 días — solo pagos confirmados</p>
              <BarChart data={porDia} />
              {porDia.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Total período: <strong style={{ color: '#fff' }}>{fmt(porDia.reduce((s, d) => s + d.ingresos, 0))}</strong></span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Entradas: <strong style={{ color: '#fff' }}>{porDia.reduce((s, d) => s + d.entradas, 0)}</strong></span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Días con ventas: <strong style={{ color: '#fff' }}>{porDia.length}</strong></span>
                </div>
              )}
            </div>

            {/* Por obra */}
            <div style={card({ padding: 0 })}>
              <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid #1f2937' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>Rendimiento por obra</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0d1117' }}>
                      <th style={th}>Obra</th>
                      <th style={{ ...th, textAlign: 'right' }}>Precio</th>
                      <th style={{ ...th, textAlign: 'right' }}>Funciones</th>
                      <th style={{ ...th, textAlign: 'right' }}>Entradas</th>
                      <th style={{ ...th, textAlign: 'right' }}>Ingresos</th>
                      <th style={{ ...th, minWidth: 140 }}>Ocupación prom.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porObra.map(o => (
                      <tr key={o.id} style={{ background: '#111827' }}>
                        <td style={td({ color: '#fff', fontWeight: 600 })}>{o.titulo}</td>
                        <td style={td({ textAlign: 'right' })}>{fmt(o.precio)}</td>
                        <td style={td({ textAlign: 'right' })}>{o.funciones}</td>
                        <td style={td({ textAlign: 'right' })}>{o.entradas}</td>
                        <td style={td({ textAlign: 'right', color: '#22c55e', fontWeight: 600 })}>{fmt(o.ingresos)}</td>
                        <td style={td({ minWidth: 140 })}><OcupacionBar pct={o.ocupacion} /></td>
                      </tr>
                    ))}
                    {!porObra.length && (
                      <tr><td colSpan={6} style={{ ...td(), textAlign: 'center', color: '#4b5563', padding: '24px 12px' }}>Sin obras activas</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FUNCIONES */}
        {tab === 'funciones' && (
          <div style={card({ padding: 0 })}>
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid #1f2937' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>Estado de funciones</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0d1117' }}>
                    <th style={th}>Obra</th>
                    <th style={th}>Fecha</th>
                    <th style={th}>Hora</th>
                    <th style={{ ...th, textAlign: 'right' }}>Capacidad</th>
                    <th style={{ ...th, textAlign: 'right' }}>Vendidas</th>
                    <th style={{ ...th, textAlign: 'right' }}>Disponibles</th>
                    <th style={{ ...th, textAlign: 'right' }}>Ingresos</th>
                    <th style={{ ...th, minWidth: 130 }}>Ocupación</th>
                  </tr>
                </thead>
                <tbody>
                  {porFuncion.map(f => (
                    <tr key={f.id} style={{ background: '#111827' }}>
                      <td style={td({ color: '#fff', fontWeight: 600 })}>{f.titulo}</td>
                      <td style={td()}>{fmtFecha(f.fecha)}</td>
                      <td style={td()}>{f.hora} hs</td>
                      <td style={td({ textAlign: 'right' })}>{f.capacidad}</td>
                      <td style={td({ textAlign: 'right', color: '#a5b4fc' })}>{f.vendidas}</td>
                      <td style={td({ textAlign: 'right' })}>{f.capacidad - f.vendidas}</td>
                      <td style={td({ textAlign: 'right', color: '#22c55e', fontWeight: 600 })}>{fmt(f.ingresos)}</td>
                      <td style={td({ minWidth: 130 })}><OcupacionBar pct={f.ocupacion} /></td>
                    </tr>
                  ))}
                  {!porFuncion.length && (
                    <tr><td colSpan={8} style={{ ...td(), textAlign: 'center', color: '#4b5563', padding: '24px 12px' }}>Sin funciones activas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RESERVAS */}
        {tab === 'reservas' && (
          <div style={card({ padding: 0 })}>
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>Últimas 30 reservas</p>
              <button onClick={cargar} style={{ fontSize: 12, color: '#6b7280', background: 'transparent', border: '1px solid #374151', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Actualizar</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0d1117' }}>
                    <th style={th}>Código</th>
                    <th style={th}>Obra / Función</th>
                    <th style={th}>Comprador</th>
                    <th style={th}>Butacas</th>
                    <th style={{ ...th, textAlign: 'right' }}>Total</th>
                    <th style={th}>Estado</th>
                    <th style={th}>Fecha reserva</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {ultimasReservas.map(r => {
                    const estadoColor = r.estado === 'confirmada' ? '#22c55e' : r.estado === 'cancelada' ? '#ef4444' : '#f59e0b';
                    return (
                      <tr key={r.codigo} style={{ background: '#111827' }}>
                        <td style={td({ fontFamily: 'monospace', fontSize: 12, color: '#a5b4fc' })}>{r.codigo}</td>
                        <td style={td()}>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{r.titulo}</span>
                          <br /><span style={{ fontSize: 11, color: '#6b7280' }}>{fmtFecha(r.fecha)} · {r.hora} hs</span>
                        </td>
                        <td style={td()}>
                          {r.nombre || <span style={{ color: '#4b5563' }}>—</span>}
                          {r.email && <><br /><span style={{ fontSize: 11, color: '#6b7280' }}>{r.email}</span></>}
                        </td>
                        <td style={td({ fontSize: 12 })}>{r.butacas}</td>
                        <td style={td({ textAlign: 'right', fontWeight: 600 })}>{fmt(r.total)}</td>
                        <td style={td()}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: estadoColor, background: estadoColor + '22', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {r.estado}
                          </span>
                        </td>
                        <td style={td({ fontSize: 12, color: '#6b7280' })}>{fmtTs(r.creado_en)}</td>
                        <td style={td()}>
                          {r.estado === 'pendiente' && (
                            <button onClick={() => confirmarReserva(r.id)}
                              style={{ fontSize: 11, color: '#22c55e', background: 'transparent', border: '1px solid #22c55e', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              ✓ Confirmar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!ultimasReservas.length && (
                    <tr><td colSpan={8} style={{ ...td(), textAlign: 'center', color: '#4b5563', padding: '24px 12px' }}>Sin reservas aún</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NUEVA OBRA */}
        {tab === 'nueva' && (
          <div style={{ maxWidth: 600 }}>
            {msg && (
              <div style={{ padding: '12px 16px', marginBottom: 20, borderRadius: 8, background: isErr ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isErr ? '#fecaca' : '#bbf7d0'}`, color: isErr ? '#991b1b' : '#166534', fontSize: 13, fontWeight: 500 }}>
                {msgTxt}
              </div>
            )}
            <div style={card({ display: 'flex', flexDirection: 'column', gap: 16 })}>
              <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#fff' }}>Nueva obra</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 5, letterSpacing: 1 }}>TÍTULO *</label>
                  <input style={inp()} placeholder="Nombre de la obra" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 5, letterSpacing: 1 }}>GÉNERO</label>
                  <input style={inp()} placeholder="Drama, Comedia..." value={form.genero} onChange={e => setForm(f => ({ ...f, genero: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 5, letterSpacing: 1 }}>DURACIÓN</label>
                  <input style={inp()} placeholder="ej: 90 min" value={form.duracion} onChange={e => setForm(f => ({ ...f, duracion: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 5, letterSpacing: 1 }}>DESCRIPCIÓN</label>
                  <textarea style={{ ...inp(), resize: 'vertical', minHeight: 80 }} placeholder="Sinopsis breve..." value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 5, letterSpacing: 1 }}>PRECIO POR BUTACA (ARS) *</label>
                  <input style={inp()} type="number" placeholder="5000" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: '#9ca3af', letterSpacing: 1 }}>FUNCIONES *</label>
                  <button onClick={() => setForm(f => ({ ...f, funciones: [...f.funciones, { fecha: '', hora: '', capacidad: '450' }] }))}
                    style={{ fontSize: 12, color: '#a5b4fc', background: 'transparent', border: '1px solid #374151', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                    + Agregar función
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {form.funciones.map((fn, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px auto', gap: 8, alignItems: 'center' }}>
                      <input type="date" style={inp()} value={fn.fecha} onChange={e => setForm(f => ({ ...f, funciones: f.funciones.map((x, j) => j === i ? { ...x, fecha: e.target.value } : x) }))} />
                      <input type="time" style={inp()} value={fn.hora} onChange={e => setForm(f => ({ ...f, funciones: f.funciones.map((x, j) => j === i ? { ...x, hora: e.target.value } : x) }))} />
                      <input type="number" style={inp()} placeholder="Cap." value={fn.capacidad} onChange={e => setForm(f => ({ ...f, funciones: f.funciones.map((x, j) => j === i ? { ...x, capacidad: e.target.value } : x) }))} />
                      {form.funciones.length > 1 && (
                        <button onClick={() => setForm(f => ({ ...f, funciones: f.funciones.filter((_, j) => j !== i) }))}
                          style={{ color: '#ef4444', background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={crearObra}
                style={{ padding: '12px', background: '#162264', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
                Crear obra
              </button>
            </div>

            {/* Lista obras activas */}
            {porObra.length > 0 && (
              <div style={{ ...card({ padding: 0, marginTop: 24 }) }}>
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #1f2937' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>Obras activas</p>
                </div>
                {porObra.map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #1f2937' }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: '#fff' }}>{o.titulo}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{o.funciones} función{o.funciones !== 1 ? 'es' : ''} · {fmt(o.precio)} por butaca · {o.entradas} vendidas</p>
                    </div>
                    <button onClick={() => desactivarObra(o.id, o.titulo)}
                      style={{ fontSize: 12, color: '#ef4444', background: 'transparent', border: '1px solid #374151', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
                      Desactivar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
