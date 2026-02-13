import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GoVip - Plataforma de Eventos',
  description: 'Descubre y reserva tus entradas para los mejores eventos y experiencias.',
  keywords: ['eventos', 'entradas', 'tickets', 'reservas', 'conciertos'],
  authors: [{ name: 'GoVip' }],
  robots: {
    index: true,
    follow: true,
  },
};

export default function Robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: 'https://govip.com.ar/sitemap.xml',
  };
}
