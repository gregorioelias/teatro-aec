import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Teatro AEC Rosario — Reservas',
  description: 'Sistema de reservas de butacas del Teatro AEC Rosario',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
