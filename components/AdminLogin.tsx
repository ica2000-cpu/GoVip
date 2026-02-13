'use client'

import { useState } from 'react';
import { Lock, Mail } from 'lucide-react';

export default function AdminLogin({ onLogin }: { onLogin: (email: string, password: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onLogin(email, password);
    // We don't verify success here immediately as it's a server action redirect
    // But if it fails, the parent might not easily callback. 
    // Ideally onLogin should return a promise.
    // For now, simple UX.
    setTimeout(() => setLoading(false), 2000); 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-[#111] border border-gray-800 p-4 sm:p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-900/20 p-4 rounded-full text-blue-500 border border-blue-500/20">
            <Lock size={32} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2 text-white">GoVip Admin</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">Ingresa tus credenciales de propietario</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Email</label>
            <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-600" size={18} />
                <input
                type="email"
                value={email}
                onChange={(e) => {
                    setEmail(e.target.value);
                    setError(false);
                }}
                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-white placeholder-gray-700 transition-all h-12"
                placeholder="admin@govip.com"
                required
                />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Contraseña</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-600" size={18} />
                <input
                type="password"
                value={password}
                onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                }}
                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-white placeholder-gray-700 transition-all h-12"
                placeholder="••••••••"
                required
                />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center bg-red-900/10 py-2 rounded border border-red-900/20">Credenciales inválidas</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-500 transition-all font-bold shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2 h-12"
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
