import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <h1 className="text-9xl font-black text-gray-800 mb-4 tracking-tighter">404</h1>
        <h2 className="text-4xl font-bold mb-6 tracking-tight">Comercio No Encontrado</h2>
        <p className="text-gray-400 text-lg mb-10 leading-relaxed">
          Lo sentimos, no hemos podido encontrar el comercio que buscas. Es posible que la dirección sea incorrecta o que el comercio ya no esté disponible.
        </p>
        <Link 
          href="/govip"
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/20 inline-block uppercase tracking-wide"
        >
          Ir al Sitio Principal
        </Link>
      </div>
    </div>
  );
}
