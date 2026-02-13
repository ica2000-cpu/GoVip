import { supabase } from '@/lib/supabase';
import EventList from '@/components/EventList';
import { Event } from '@/types';
import { notFound } from 'next/navigation';
import { getPaymentSettings } from '@/app/actions/public';
import { Metadata, ResolvingMetadata } from 'next';

// Revalidate every 60 seconds (ISR) for better performance
export const revalidate = 60;
// export const dynamic = 'force-dynamic'; // Removed in favor of ISR

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  
  if (!slug || slug === 'undefined') {
    return {
      title: 'GoVip - Plataforma de Eventos',
    };
  }

  const { data: commerce } = await supabase
    .from('comercios')
    .select('nombre, logo_url')
    .eq('slug', slug)
    .single();

  if (!commerce) {
    return {
      title: 'Comercio No Encontrado - GoVip',
    };
  }

  return {
    title: `${commerce.nombre} | Entradas y Reservas - GoVip`,
    description: `Reserva tus entradas oficiales para los mejores eventos de ${commerce.nombre}. Gestión segura y rápida con GoVip.`,
    openGraph: {
      images: commerce.logo_url ? [commerce.logo_url] : [],
    },
  };
}

export default async function CommercePage({ params }: Props) {
  // Await params for Next.js 15+ compatibility
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  if (!slug || slug === 'undefined') {
      // Fallback to master commerce if slug is invalid or undefined (per user request)
      // This ensures we never show a 404 for this specific error case, but load the default store.
      // However, ideally we should redirect, but "cargar por defecto" implies rendering.
      // We will re-assign slug to 'govip' if it's missing.
      // But since 'const' is used, we need to handle this differently or change variable type.
  }
  
  const effectiveSlug = (!slug || slug === 'undefined') ? 'govip' : slug;

  // 1. Fetch Commerce by Slug
  const { data: commerce, error: commerceError } = await supabase
    .from('comercios')
    .select('*')
    .eq('slug', effectiveSlug)
    .single();

  if (commerceError || !commerce) {
    console.error('Commerce not found:', effectiveSlug, commerceError);
    return notFound();
  }

  // 2. Fetch Events for this Commerce
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('comercio_id', commerce.id)
    .order('date', { ascending: true });

  const safeEvents = events || [];

  if (eventsError) {
    console.error('Error fetching events:', eventsError);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-100 max-w-md">
          <div className="text-red-500 mb-4 text-5xl">⚠️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error de Conexión</h3>
          <p className="text-gray-600">{eventsError.message}</p>
        </div>
      </div>
    );
  }

  // 3. Get Payment Settings (using our helper which formats it nicely)
  // We can just pass the commerce data if we trust it, but getPaymentSettings maps fields.
  // We can reuse getPaymentSettings or just map manually here since we already have 'commerce' object.
  // Let's reuse getPaymentSettings to ensure consistency if logic changes, 
  // OR just map it here to avoid another DB call (since we already have the data!).
  // Optimization: Map manually.
  const paymentSettings = {
      cbu: commerce.cbu,
      alias: commerce.alias,
      account_number: commerce.nombre_titular, // Mapping as per previous logic
      payment_data: commerce.payment_data, // Include dynamic data
      whatsapp_number: commerce.whatsapp_number,
      commerce_logo: commerce.logo_url,
      commerce_name: commerce.nombre
  };

  console.log(`[Server] Payment Settings for ${effectiveSlug}:`, { 
      hasWhatsapp: !!paymentSettings.whatsapp_number, 
      number: paymentSettings.whatsapp_number 
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             {commerce.logo_url ? (
                 <img src={commerce.logo_url} alt={`${commerce.nombre} Logo`} className="h-12 w-auto object-contain" />
             ) : (
                 <span className="text-xl font-bold tracking-tighter">{commerce.nombre}</span>
             )}
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-light tracking-wide text-gray-300">
            {/* Nav Links could be dynamic too if needed */}
          </nav>
        </div>
      </header>

      {/* Dynamic Hero Section */}
      <div className="relative bg-gradient-to-b from-gray-900 to-black text-white py-24 overflow-hidden border-b border-gray-800">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white">
            {commerce.nombre}
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Reserva tus entradas para los mejores eventos de {commerce.nombre}.
          </p>
          <div className="flex justify-center gap-4">
            <a href="#events" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg">
              Ver Cartelera
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main id="events" className="container mx-auto px-4 py-20 bg-black">
        <div className="flex items-end justify-between mb-12 border-b border-gray-800 pb-6">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Próximos Eventos</h2>
            <p className="text-gray-400 text-lg font-medium">Cartelera Oficial</p>
          </div>
        </div>

        <EventList events={safeEvents as Event[]} paymentSettings={paymentSettings} />
      </main>

      {/* Dynamic Footer */}
      <footer className="bg-black border-t border-gray-800 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
               {commerce.logo_url && (
                  <img src={commerce.logo_url} alt="Logo" className="h-10 w-auto grayscale opacity-80 hover:opacity-100 transition-opacity" />
               )}
               <span className="text-gray-500 font-bold ml-2">{commerce.nombre}</span>
            </div>
            <div className="text-center md:text-right">
                <p className="text-sm text-gray-400 mb-1">¿Quieres impulsar tu marca?</p>
                <a href="mailto:goviporiginal@gmail.com" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                    Publicidad y Gestión Integral: goviporiginal@gmail.com
                </a>
            </div>
          </div>
          <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600">
            <div>
              &copy; {new Date().getFullYear()} {commerce.nombre}. Todos los derechos reservados.
            </div>
            <div className="mt-2 md:mt-0">
               Powered by <span className="text-gray-500 font-bold">GoVip</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
