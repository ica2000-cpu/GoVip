import { supabase } from '@/lib/supabase';
import { Commerce, Category } from '@/types';
import HomeClient from '@/components/HomeClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  // Fetch all commerces, prioritized by es_destacado, WITH Categories
  const { data: commerces, error } = await supabase
    .from('comercios')
    .select('*, categorias(*)')
    .order('es_destacado', { ascending: false })
    .order('created_at', { ascending: false });

  // Fetch active categories
  const { data: categories } = await supabase
    .from('categorias')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true });

  const safeCommerces = (commerces as Commerce[]) || [];
  const safeCategories = (categories as Category[]) || [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-gray-900 to-black py-24 px-4 overflow-hidden border-b border-gray-800">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-800/50 px-4 py-1.5 rounded-full mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-sm font-medium text-blue-300 tracking-wide uppercase">Plataforma Oficial</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500">
            GoVip
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
            Descubre y reserva tus entradas para los mejores eventos, conciertos y experiencias exclusivas.
          </p>
        </div>
        
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600 rounded-full blur-[128px]"></div>
            <div className="absolute top-1/2 right-0 w-64 h-64 bg-purple-600 rounded-full blur-[128px]"></div>
        </div>
      </div>

      {/* Client Side Grid & Filtering */}
      <HomeClient initialCommerces={safeCommerces} categories={safeCategories} />

      <footer className="border-t border-gray-800 bg-[#050505] py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} GoVip. Plataforma de Gestión de Eventos.
            </p>
        </div>
      </footer>
    </div>
  );
}
