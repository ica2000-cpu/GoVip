export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute animate-ping inline-flex h-full w-full rounded-full bg-blue-400 opacity-20"></div>
          <div className="relative inline-flex rounded-full h-12 w-12 border-4 border-gray-800 border-t-blue-500 animate-spin"></div>
        </div>
        <p className="text-gray-400 text-sm font-medium animate-pulse">Cargando experiencia...</p>
      </div>
    </div>
  );
}
