import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface TicketData {
  nombre: string | null;
  email: string;
  titulo: string;
  fecha: string;
  hora: string;
  butacas: string[];
  codigo: string;
  total: number;
}

function formatFecha(s: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  return s;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export async function sendTicketEmail(data: TicketData) {
  const { nombre, email, titulo, fecha, hora, butacas, codigo, total } = data;
  const fechaLegible = formatFecha(fecha);
  const nombreDisplay = nombre || 'Espectador/a';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu entrada — ${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#0f1629;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1629;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#162264;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:3px;color:#a0aec0;text-transform:uppercase;">Teatro AEC Rosario</p>
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;font-family:Georgia,serif;">${titulo}</h1>
            </td>
          </tr>

          <!-- Fecha y hora -->
          <tr>
            <td style="background:#1a2a70;padding:18px 32px;text-align:center;border-bottom:1px solid #2d3a8c;">
              <p style="margin:0;font-size:16px;color:#c3ceff;">
                📅 ${fechaLegible} &nbsp;·&nbsp; 🕐 ${hora} hs
              </p>
            </td>
          </tr>

          <!-- Butacas -->
          <tr>
            <td style="background:#111827;padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;">Butacas</p>
                    <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:1px;">
                      ${butacas.join(' &nbsp;·&nbsp; ')}
                    </p>
                    <p style="margin:6px 0 0 0;font-size:13px;color:#9ca3af;">${butacas.length} butaca${butacas.length !== 1 ? 's' : ''}</p>
                  </td>
                  <td style="padding-bottom:20px;text-align:right;vertical-align:top;">
                    <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;">Total pagado</p>
                    <p style="margin:0;font-size:22px;font-weight:700;color:#2CB356;">${fmt(total)}</p>
                  </td>
                </tr>
              </table>

              <!-- Código de reserva -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1f2937;border:1px solid #374151;border-radius:8px;padding:16px 20px;">
                    <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;">Código de reserva</p>
                    <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;font-family:monospace;letter-spacing:3px;">${codigo}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0 0;font-size:13px;color:#6b7280;text-align:center;">
                Presentá este mail o tu DNI en boletería el día de la función.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d1117;border-radius:0 0 12px 12px;padding:18px 32px;text-align:center;border-top:1px solid #1f2937;">
              <p style="margin:0;font-size:12px;color:#4b5563;">
                Teatro AEC Rosario &nbsp;·&nbsp; Reservas en línea
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await resend.emails.send({
    from: 'Teatro AEC <onboarding@resend.dev>',
    to: email,
    subject: `Tu entrada — ${titulo} · ${fechaLegible}`,
    html,
  });
}
