'use client'

import { useState } from 'react';
import { Search, Star, Filter } from 'lucide-react';
import Link from 'next/link';
import { Commerce, Category } from '@/types';

export default function HomeClient({ 
  initialCommerces, 
  categories 
}: { 
  initialCommerces: Commerce[], 
  categories: Category[] 
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter Logic
  const filteredCommerces = initialCommerces.filter(commerce => {
    // 1. Filter by Category
    const matchesCategory = selectedCategory === 'all' 
        ? true 
        : commerce.categoria_id === selectedCategory;
    
    // 2. Filter by Search Term (Name or Category Name)
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
        commerce.nombre.toLowerCase().includes(term) ||
        commerce.slug.toLowerCase().includes(term) ||
        (commerce.categorias?.nombre || '').toLowerCase().includes(term);

    return matchesCategory && matchesSearch;
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-16">
        
        {/* Search & Filter Section */}
        <div className="mb-12 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Explora GoVip</h2>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-500" />
                </div>
                <input
                    type="text"
                    className="block w-full bg-[#111] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    placeholder="Buscar boliches, bares, eventos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Categories Scroll */}
            <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar mask-gradient">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                        selectedCategory === 'all'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20'
                            : 'bg-[#111] text-gray-400 border-gray-800 hover:border-gray-600 hover:text-white'
                    }`}
                >
                    <Filter size={14} />
                    Todos
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                            selectedCategory === cat.id
                                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20'
                                : 'bg-[#111] text-gray-400 border-gray-800 hover:border-gray-600 hover:text-white'
                        }`}
                    >
                        <span>{cat.icono}</span>
                        {cat.nombre}
                    </button>
                ))}
            </div>
        </div>

        {/* Results Grid */}
        {filteredCommerces.length === 0 ? (
            <div className="text-center py-20 bg-[#111] rounded-2xl border border-gray-800 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 text-gray-600">
                    <Search size={32} />
                </div>
                <p className="text-gray-400 text-lg font-medium">No encontramos resultados</p>
                <p className="text-gray-600 text-sm mt-2">Intenta con otros filtros o términos de búsqueda.</p>
                <button 
                    onClick={() => { setSelectedCategory('all'); setSearchTerm(''); }}
                    className="mt-6 text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                    Limpiar Filtros
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
                {filteredCommerces.map((commerce) => (
                    <Link 
                        key={commerce.id} 
                        href={`/${commerce.slug}`}
                        className="group relative bg-[#111] border border-gray-800 rounded-2xl p-6 hover:border-blue-600/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col items-center text-center overflow-hidden"
                    >
                        {/* Featured Badge */}
                        {commerce.es_destacado && (
                            <div className="absolute top-4 right-4 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20 flex items-center gap-1 shadow-sm z-10">
                                <Star size={12} fill="currentColor" />
                                <span>TOP</span>
                            </div>
                        )}

                        {/* Category Badge (New) */}
                        {commerce.categorias && (
                            <div className="absolute top-4 left-4 bg-gray-800/80 backdrop-blur-sm text-gray-300 px-3 py-1 rounded-full text-xs font-medium border border-gray-700 flex items-center gap-1 z-10">
                                <span>{commerce.categorias.icono}</span>
                                <span>{commerce.categorias.nombre}</span>
                            </div>
                        )}

                        <div className="mb-6 relative w-full flex justify-center pt-4">
                            {/* Glow Effect behind logo */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                            
                            {commerce.logo_url ? (
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-700 group-hover:border-blue-500 transition-colors bg-black shadow-xl relative z-10">
                                    <img src={commerce.logo_url} alt={commerce.nombre} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-2xl font-bold text-gray-500 border-2 border-gray-700 group-hover:border-blue-500 transition-colors relative z-10">
                                    {commerce.nombre.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                            {commerce.nombre}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            {commerce.slug}
                        </p>

                        <div className="w-full mt-auto">
                            <span className="block w-full py-3 bg-gray-900 text-gray-300 rounded-lg text-sm font-medium group-hover:bg-blue-600 group-hover:text-white transition-all border border-gray-800 group-hover:border-blue-500">
                                Ver Cartelera
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        )}
    </main>
  );
}
