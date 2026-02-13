'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Calendar, Music, Plus, Edit, Trash2, Copy, CreditCard, Save, XCircle, RotateCcw, Settings, Home, Users, UserPlus, Check, LogOut, Share2, Globe, Crown, RefreshCw, Menu, X, Star } from 'lucide-react';
import { Event } from '@/types';
import EventForm from './EventForm';
import { deleteEvent, deleteReservation, deleteAllReservations, resetEventStock, resetAllEventStock, updateCommerceSettings, createNewCommerce, updateAdminPassword, deleteCommerce, logout, syncWebCache, distributeEvent, toggleCommerceFeatured } from '@/app/admin/actions';
import { deployToVercel } from '@/app/admin/deploy';
import { COUNTRIES } from '@/lib/constants';

export default function AdminDashboard({ 
  initialReservations, 
  initialStock,
  initialEvents,
  initialPaymentSettings,
  commerceName = 'GoVip Admin', // Default
  commerceLogo,
  initialCommerces, // New prop for clients list
  isSuperAdmin = false // New prop
}: { 
  initialReservations: any[], 
  initialStock: any[],
  initialEvents: Event[],
  initialPaymentSettings: any,
  commerceName?: string,
  commerceLogo?: string,
  initialCommerces?: any[] | null,
  isSuperAdmin?: boolean
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'reservations' | 'events' | 'settings' | 'clients' | 'master_events'>('events');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false); // New state for client form
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [newClientCredentials, setNewClientCredentials] = useState<any>(null); // To show credentials after creation

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [eventToReset, setEventToReset] = useState<number | null>(null);
  const [resetMode, setResetMode] = useState<'single' | 'all'>('single'); // New state for reset mode
  const [reservationToDelete, setReservationToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'all'>('single');
  
  const [showDeleteCommerceModal, setShowDeleteCommerceModal] = useState(false);
  const [commerceToDelete, setCommerceToDelete] = useState<{id: string, name: string} | null>(null);

  // Distribution State
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [eventToDistribute, setEventToDistribute] = useState<Event | null>(null);
  const [selectedCommerces, setSelectedCommerces] = useState<string[]>([]);
  const [isDistributing, setIsDistributing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Payment Settings State
  const [country, setCountry] = useState(initialPaymentSettings?.payment_data?.country || 'AR');

  // ... (rest of filtering logic)
  const relatedEvents = editingEvent 
    ? initialEvents.filter(e => e.title === editingEvent.title && e.id !== editingEvent.id)
    : [];

  const filteredReservations = initialReservations.filter((res) => 
    res.ticket_types.events.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (res.reservation_code && res.reservation_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredEvents = initialEvents.filter((evt) => 
    evt.title.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteEvent = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este evento? Esta acción no se puede deshacer.')) {
      const result = await deleteEvent(id);
      if (result.success) {
        showSuccess('Evento eliminado exitosamente');
        // Reload data after successful deletion
        router.refresh();
      }
    }
  };

  const initiateDeleteSingle = (id: number) => {
    setReservationToDelete(id);
    setDeleteMode('single');
    setShowDeleteModal(true);
  };

  const initiateDeleteAll = () => {
    setDeleteMode('all');
    setShowDeleteModal(true);
  };

  const initiateResetStock = (id: number) => {
    setEventToReset(id);
    setResetMode('single');
    setShowResetModal(true);
  };

  const initiateResetAllStock = () => {
    setResetMode('all');
    setShowResetModal(true);
  };

  const confirmResetStock = async () => {
    setIsResetting(true);
    let result;

    if (resetMode === 'single' && eventToReset) {
        result = await resetEventStock(eventToReset);
    } else if (resetMode === 'all') {
        result = await resetAllEventStock();
    }
    
    setIsResetting(false);
    setShowResetModal(false);
    setEventToReset(null);

    if (result?.success) {
        showSuccess(resetMode === 'all' ? 'Stock de TODOS los eventos restablecido' : 'Stock restablecido exitosamente');
        router.refresh();
    } else {
        alert('Error al restablecer stock: ' + result?.error);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    let result;

    if (showDeleteCommerceModal && commerceToDelete) {
        result = await deleteCommerce(commerceToDelete.id);
        setShowDeleteCommerceModal(false);
        setCommerceToDelete(null);
        if (result?.success) {
            showSuccess('Cliente eliminado exitosamente');
            router.refresh();
        } else {
            alert('Error al eliminar cliente: ' + result?.error);
        }
        setIsDeleting(false);
        return;
    }

    if (deleteMode === 'single' && reservationToDelete) {
        result = await deleteReservation(reservationToDelete);
    } else if (deleteMode === 'all') {
        result = await deleteAllReservations();
    }

    setIsDeleting(false);
    setShowDeleteModal(false);
    setReservationToDelete(null);

    if (result?.success) {
        showSuccess(deleteMode === 'all' ? 'Todas las reservas eliminadas' : 'Reserva eliminada exitosamente');
        router.refresh();
    } else {
        alert('Error al eliminar: ' + result?.error);
    }
  };

  const initiateDeleteCommerce = (client: any) => {
    // Prevent deleting the main GoVip account (assuming slug 'govip' or checking ID if available in client object)
    // The backend also protects this, but UI should also prevent it.
    if (client.slug === 'govip' || client.slug === 'govip-admin') { // Adjust based on actual master slug
        alert('No se puede eliminar el comercio principal.');
        return;
    }
    setCommerceToDelete({ id: client.id, name: client.nombre });
    setShowDeleteCommerceModal(true);
  };

  const initiateDistributeEvent = (event: Event) => {
    setEventToDistribute(event);
    setSelectedCommerces([]);
    setShowDistributeModal(true);
  };

  const toggleCommerceSelection = (commerceId: string) => {
    setSelectedCommerces(prev => 
        prev.includes(commerceId) 
            ? prev.filter(id => id !== commerceId)
            : [...prev, commerceId]
    );
  };

  const handleDistribute = async () => {
    if (!eventToDistribute || selectedCommerces.length === 0) return;
    
    setIsDistributing(true);
    const result = await distributeEvent(eventToDistribute.id, selectedCommerces);
    setIsDistributing(false);
    
    if (result.success && result.results) {
        const { success, skipped, failed } = result.results;
        
        let message = `Proceso finalizado.`;
        if (success.length > 0) message += ` ✅ ${success.length} distribuidos.`;
        if (skipped.length > 0) message += ` ⚠️ ${skipped.length} omitidos (ya existen).`;
        if (failed.length > 0) message += ` ❌ ${failed.length} fallidos.`;
        
        setShowDistributeModal(false);
        setEventToDistribute(null);
        setSelectedCommerces([]);
        showSuccess(message);
        router.refresh();
    } else {
        alert('Error al distribuir evento: ' + result.error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    const result = await syncWebCache();
    setIsSyncing(false);
    
    if (result.success) {
        showSuccess('Web actualizada con los últimos datos de la base de datos');
    } else {
        alert('Error al sincronizar: ' + result.error);
    }
  };

  const handleDeploy = async () => {
    if (!confirm('¿Iniciar despliegue a producción? Esto compilará y subirá los cambios locales.')) return;
    
    setIsDeploying(true);
    try {
        const result = await deployToVercel();
        if (result.success) {
            showSuccess(`¡Desplegado! Disponible en: ${result.url}`);
            // Optional: Open in new tab
            if (result.url) window.open(result.url, '_blank');
        } else {
            alert('Error en el despliegue: ' + result.message);
        }
    } catch (e) {
        alert('Error inesperado al desplegar');
    } finally {
        setIsDeploying(false);
    }
  };

  const handleToggleFeatured = async (id: string, currentStatus: boolean) => {
    const result = await toggleCommerceFeatured(id, !currentStatus);
    if (result.success) {
        showSuccess(!currentStatus ? 'Comercio destacado' : 'Comercio quitado de destacados');
        router.refresh();
    } else {
        alert('Error: ' + result.error);
    }
  };

  const handleDuplicateEvent = (event: Event) => {
    // Clone event but remove ID and Date to force creation of new entry
    const duplicatedEvent = {
      ...event,
      id: 0, // 0 or undefined signals "New Event" to the form
      title: `${event.title} (Copia)`,
      date: '', // Force user to pick new date
    };
    // @ts-ignore
    setEditingEvent(duplicatedEvent);
    setShowEventForm(true);
  };

  // Group events by title
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const title = event.title;
    if (!acc[title]) {
      acc[title] = [];
    }
    acc[title].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="bg-[#111] border-b border-gray-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {commerceLogo ? (
                <img src={commerceLogo} alt="Logo" className="h-10 w-auto mr-3 object-contain" />
              ) : (
                <img src="/logo-govip.png" alt="GoVip Admin" className="h-10 w-auto mr-3 object-contain" />
              )}
              <div className="flex flex-col">
                 <span className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    {commerceName}
                    {isSuperAdmin && (
                        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 uppercase tracking-widest">
                            Super Admin
                        </span>
                    )}
                 </span>
                 <span className="text-xs text-gray-500 uppercase tracking-widest">Panel de Control</span>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'events' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                Eventos
              </button>
              {isSuperAdmin && (
                <button 
                  onClick={() => setActiveTab('master_events')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 ${activeTab === 'master_events' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <Crown size={16} className="mr-2" />
                  Eventos Maestros
                </button>
              )}
              <button 
                onClick={() => setActiveTab('reservations')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'reservations' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                Reservas
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Settings size={16} className="mr-2" />
                Mi Comercio
              </button>
              {isSuperAdmin && (
                <button 
                  onClick={() => setActiveTab('clients')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 ${activeTab === 'clients' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <Globe size={16} className="mr-2" />
                  Clientes
                </button>
              )}
              <button 
                onClick={handleDeploy}
                disabled={isDeploying}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all duration-200 border border-transparent shadow-lg ${
                    isDeploying 
                        ? 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30' 
                        : 'text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
                }`}
                title="Desplegar a Producción"
              >
                {isDeploying ? (
                    <>
                        <RefreshCw size={18} className="mr-2 animate-spin" />
                        Desplegando...
                    </>
                ) : (
                    <>
                        <Globe size={18} className="mr-2" />
                        Publicar Cambios
                    </>
                )}
              </button>
              <button 
                onClick={handleSync}
                disabled={isSyncing}
                className={`p-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 border border-transparent ${isSyncing ? 'text-blue-400 bg-blue-900/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                title="Sincronizar Web"
              >
                <RefreshCw size={18} className={`${isSyncing ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={async () => {
                    await logout();
                    window.location.href = '/admin';
                }}
                className="p-2 rounded-lg text-sm font-medium flex items-center text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200"
                title="Cerrar Sesión"
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="text-gray-300 hover:text-white p-2"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
            <div className="md:hidden bg-[#0a0a0a] border-b border-gray-800 absolute top-16 left-0 right-0 z-50 shadow-2xl">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    <button 
                        onClick={() => { setActiveTab('events'); setIsMobileMenuOpen(false); }}
                        className={`block w-full text-left px-3 py-4 rounded-md text-lg font-medium ${activeTab === 'events' ? 'bg-blue-900/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}
                    >
                        Eventos
                    </button>
                    {isSuperAdmin && (
                        <button 
                            onClick={() => { setActiveTab('master_events'); setIsMobileMenuOpen(false); }}
                            className={`block w-full text-left px-3 py-4 rounded-md text-lg font-medium ${activeTab === 'master_events' ? 'bg-blue-900/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}
                        >
                            <span className="flex items-center"><Crown size={20} className="mr-3 text-amber-500" /> Eventos Maestros</span>
                        </button>
                    )}
                    <button 
                        onClick={() => { setActiveTab('reservations'); setIsMobileMenuOpen(false); }}
                        className={`block w-full text-left px-3 py-4 rounded-md text-lg font-medium ${activeTab === 'reservations' ? 'bg-blue-900/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}
                    >
                        Reservas
                    </button>
                    <button 
                        onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                        className={`block w-full text-left px-3 py-4 rounded-md text-lg font-medium ${activeTab === 'settings' ? 'bg-blue-900/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}
                    >
                        <span className="flex items-center"><Settings size={20} className="mr-3" /> Mi Comercio</span>
                    </button>
                    {isSuperAdmin && (
                        <button 
                            onClick={() => { setActiveTab('clients'); setIsMobileMenuOpen(false); }}
                            className={`block w-full text-left px-3 py-4 rounded-md text-lg font-medium ${activeTab === 'clients' ? 'bg-blue-900/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}
                        >
                             <span className="flex items-center"><Globe size={20} className="mr-3" /> Gestión de Clientes</span>
                        </button>
                    )}
                    
                    <div className="border-t border-gray-800 my-2 pt-2 flex flex-col gap-2">
                        <button 
                            onClick={handleDeploy}
                            className={`flex items-center justify-center px-3 py-4 rounded-md text-base font-bold transition-all ${
                                isDeploying ? 'bg-yellow-900/20 text-yellow-400' : 'bg-gradient-to-r from-purple-900/50 to-indigo-900/50 text-white border border-indigo-500/30'
                            }`}
                        >
                            {isDeploying ? (
                                <><RefreshCw size={20} className="mr-2 animate-spin" /> Desplegando...</>
                            ) : (
                                <><Globe size={20} className="mr-2" /> Publicar Cambios</>
                            )}
                        </button>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSync}
                            className="flex-1 flex items-center justify-center px-3 py-4 rounded-md text-base font-medium text-gray-300 hover:bg-white/5 bg-gray-900/50"
                        >
                            <RefreshCw size={20} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar
                        </button>
                        <button 
                            onClick={async () => { await logout(); window.location.href = '/admin'; }}
                            className="flex-1 flex items-center justify-center px-3 py-4 rounded-md text-base font-medium text-red-400 hover:bg-red-900/10 bg-red-900/5"
                        >
                            <LogOut size={20} className="mr-2" /> Salir
                        </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </nav>

      <main className="max-w-[1200px] mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-900/20 border border-green-500/50 text-green-400 rounded-lg flex items-center justify-between">
            <span className="font-medium">{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage('')}
              className="text-green-400 hover:text-green-300"
            >
              ×
            </button>
          </div>
        )}
        
        {/* Events Management Tab */}
        {activeTab === 'events' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Music className="mr-2" /> Cartelera de Eventos
              </h2>
              <button 
                onClick={() => { setEditingEvent(null); setShowEventForm(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500 flex items-center shadow-lg"
              >
                <Plus size={20} className="mr-2" /> Crear Nuevo Evento
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(groupedEvents).map((group) => {
                const event = group[0];
                const sortedGroup = group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                return (
                <div key={event.id} className="bg-[#0a0a0a] rounded-xl shadow-lg border border-gray-800 overflow-hidden flex flex-col group hover:border-blue-600/50 transition-all">
                  <div className="w-full aspect-[3/4] relative bg-gray-900">
                    <img src={event.image_url} alt={event.title} className="w-full h-full object-cover object-top" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      {isSuperAdmin && (
                          <button 
                            onClick={() => initiateDistributeEvent(event)}
                            className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-indigo-600 text-indigo-300 hover:text-white border border-white/10"
                            title="Distribuir Evento"
                          >
                            <Share2 size={16} />
                          </button>
                      )}
                      <button 
                        onClick={() => handleDuplicateEvent(event)}
                        className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black text-gray-300 hover:text-white border border-white/10"
                        title="Duplicar Evento"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => initiateResetStock(event.id)}
                        className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black text-green-400 hover:text-green-300 border border-white/10"
                        title="Restablecer Stock"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button 
                        onClick={() => { setEditingEvent(event); setShowEventForm(true); }}
                        className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black text-blue-400 hover:text-blue-300 border border-white/10"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black text-red-400 hover:text-red-300 border border-white/10"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {event.ticket_types.reduce((sum, t) => sum + t.stock, 0) === 0 && (
                      <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                        SOLD OUT
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1">
                    <h3 className="font-bold text-lg text-white mb-1">{event.title}</h3>
                    <div className="mb-2">
                        {sortedGroup.map(e => (
                            <span key={e.id} className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded mr-1 inline-block border border-blue-800/50">
                                {new Date(e.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                            </span>
                        ))}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{event.location}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {event.ticket_types.map(t => (
                        <span key={t.id} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">
                          {t.name}: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(t.price)} ({t.stock})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* Master Events Tab (Super Admin) */}
        {activeTab === 'master_events' && isSuperAdmin && (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <Crown className="mr-2 text-amber-500" /> Eventos Maestros
                    </h2>
                    <button 
                        onClick={() => { setEditingEvent(null); setShowEventForm(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500 flex items-center shadow-lg"
                    >
                        <Plus size={20} className="mr-2" /> Crear Evento Maestro
                    </button>
                </div>

                <div className="bg-[#050505] shadow-xl rounded-lg overflow-hidden border border-gray-800">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-800">
                            <thead className="bg-black/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Evento</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Categoría</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800 bg-[#050505]">
                                {filteredEvents.map((event) => (
                                    <tr key={event.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden mr-3 border border-gray-700">
                                                    <img className="h-full w-full object-cover" src={event.image_url} alt="" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white">{event.title}</div>
                                                    <div className="text-xs text-gray-500">{event.location}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-300 bg-gray-900 px-2 py-1 rounded border border-gray-800">
                                                {new Date(event.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900/20 text-blue-400 border border-blue-800/30">
                                                {event.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {event.ticket_types.reduce((sum, t) => sum + t.stock, 0) > 0 ? (
                                                <span className="text-green-500 flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                    En Venta
                                                </span>
                                            ) : (
                                                <span className="text-red-500 flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                    Sold Out
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => initiateDistributeEvent(event)}
                                                className="text-indigo-400 hover:text-white bg-indigo-900/20 hover:bg-indigo-600 px-3 py-1.5 rounded-md transition-all border border-indigo-500/30 flex items-center gap-2 ml-auto"
                                            >
                                                <Copy size={14} />
                                                Distribuir
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards for Master Events */}
                    <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                        {filteredEvents.map((event) => (
                            <div key={event.id} className="bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
                                <div className="flex items-start gap-3">
                                    <img src={event.image_url} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-700" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold truncate">{event.title}</h3>
                                        <p className="text-sm text-gray-500 truncate">{event.location}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-gray-900 text-gray-300 px-2 py-0.5 rounded border border-gray-800">
                                                {new Date(event.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                            </span>
                                            <span className="text-xs bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded border border-blue-800/30">
                                                {event.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between border-t border-gray-800 pt-3 mt-1">
                                    <div className="text-xs">
                                        {event.ticket_types.reduce((sum, t) => sum + t.stock, 0) > 0 ? (
                                            <span className="text-green-500 flex items-center gap-1 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> En Venta
                                            </span>
                                        ) : (
                                            <span className="text-red-500 flex items-center gap-1 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Sold Out
                                            </span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => initiateDistributeEvent(event)}
                                        className="text-indigo-400 hover:text-white bg-indigo-900/20 hover:bg-indigo-600 px-3 py-2 rounded-lg transition-all border border-indigo-500/30 flex items-center gap-2 text-sm font-medium"
                                    >
                                        <Copy size={16} /> Distribuir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <>
            {/* Stock Overview */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Package className="mr-2" size={20} />
                  Estado del Stock
                </h2>
                <button 
                  onClick={initiateResetAllStock}
                  className="flex items-center text-green-500 hover:text-green-400 text-sm font-medium border border-green-500/30 hover:border-green-500/80 px-3 py-1.5 rounded transition-all"
                  title="Restablecer stock de TODOS los eventos"
                >
                  <RotateCcw size={16} className="mr-2" />
                  Restablecer Todo
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {initialStock.map((item) => (
                  <div key={item.id} className="bg-[#0a0a0a] overflow-hidden shadow-lg rounded-xl border border-gray-800">
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-400 truncate">
                            {item.events.title}
                          </p>
                          <p className="text-md font-semibold text-white">
                            {item.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => initiateResetStock(item.event_id)}
                            className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-900/20 rounded-full transition-colors"
                            title="Restablecer Stock del Evento"
                          >
                            <RotateCcw size={18} />
                          </button>
                          <div className={`p-2 rounded-full ${item.stock < 20 ? 'bg-red-900/20 text-red-400' : 'bg-blue-900/20 text-blue-400'}`}>
                            <span className="text-lg font-bold">{item.stock}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${item.stock < 20 ? 'bg-red-500' : 'bg-blue-500'}`} 
                            style={{ width: `${Math.min(100, item.stock)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reservations Table */}
            <div className="bg-[#111] shadow rounded-lg overflow-hidden border border-gray-800">
              <div className="p-4 border-b border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Calendar className="mr-2" size={20} />
                  Últimas Reservas
                </h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button 
                    onClick={initiateDeleteAll}
                    className="flex items-center justify-center text-red-500 hover:text-red-400 text-sm font-medium border border-red-500/30 hover:border-red-500/80 px-3 py-2.5 rounded transition-all w-full sm:w-auto"
                    title="Borrar todas las reservas"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Eliminar Todo
                  </button>
                  <div className="relative w-full sm:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                      type="text"
                      className="pl-10 block w-full sm:w-64 bg-black border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm border p-2.5 text-white placeholder-gray-500"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-black">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Código Reserva
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Evento
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Zona / Tipo
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Fecha Reserva
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#111] divide-y divide-gray-800">
                    {filteredReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-gray-900/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold bg-white/5 text-gray-300 px-2 py-1 rounded border border-white/10">
                            {res.reservation_code || `#${res.id}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{res.customer_name}</div>
                          <div className="text-sm text-gray-500">{res.customer_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{res.ticket_types.events.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900/30 text-blue-300 border border-blue-800/50">
                            {res.ticket_types.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {res.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(res.created_at).toLocaleDateString('es-AR')} {new Date(res.created_at).toLocaleTimeString('es-AR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => initiateDeleteSingle(res.id)}
                            className="text-red-500 hover:text-red-400 p-2 hover:bg-red-900/20 rounded-full transition-colors"
                            title="Eliminar Reserva"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards for Reservations */}
              <div className="md:hidden grid grid-cols-1 gap-3 p-4">
                  {filteredReservations.map((res) => (
                      <div key={res.id} className="bg-[#111] border border-gray-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                              <div>
                                  <div className="font-mono text-xs font-bold bg-white/5 text-gray-400 px-2 py-0.5 rounded border border-white/10 w-fit mb-1">
                                      {res.reservation_code || `#${res.id}`}
                                  </div>
                                  <h3 className="text-white font-bold">{res.customer_name}</h3>
                                  <p className="text-sm text-gray-500">{res.customer_email}</p>
                              </div>
                              <div className="text-right">
                                  <span className="block text-2xl font-bold text-white">{res.quantity}</span>
                                  <span className="text-xs text-gray-500 uppercase">Tickets</span>
                              </div>
                          </div>
                          
                          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800/50">
                              <div className="flex items-center gap-2 mb-1">
                                  <Music size={14} className="text-blue-400" />
                                  <span className="text-sm text-gray-300 font-medium">{res.ticket_types.events.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <div className="w-3.5 h-3.5 flex items-center justify-center">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                  </div>
                                  <span className="text-sm text-gray-400">{res.ticket_types.name}</span>
                              </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-gray-800 pt-3 mt-1">
                              <span className="text-xs text-gray-600">
                                  {new Date(res.created_at).toLocaleDateString('es-AR')} • {new Date(res.created_at).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              <button 
                                  onClick={() => initiateDeleteSingle(res.id)}
                                  className="text-red-400 bg-red-900/10 hover:bg-red-900/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium text-sm border border-red-500/20"
                              >
                                  <Trash2 size={16} /> Eliminar
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
            </div>
          </>
        )}

        {/* Commerce Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
             <div className="bg-[#111] shadow rounded-lg border border-gray-800 p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center border-b border-gray-800 pb-4">
                  <Settings className="mr-3" /> Mi Comercio
                </h2>
                
                <form action={async (formData) => {
                    // Inject dynamic payment data
                    const pData: any = { country };
                    
                    if (country === 'AR') {
                        pData.cbu = formData.get('cbu');
                        pData.alias = formData.get('alias');
                    } else if (country === 'ES') {
                        pData.iban = formData.get('iban');
                        pData.bic = formData.get('bic');
                    } else if (country === 'MX') {
                        pData.clabe = formData.get('clabe');
                    } else if (country === 'CO') {
                        pData.account_number = formData.get('account_number');
                        pData.account_type = formData.get('account_type');
                    } else {
                        // Generic / International
                        pData.account_number = formData.get('account_number');
                        pData.bank_name = formData.get('bank_name');
                        pData.swift = formData.get('swift');
                    }

                    formData.set('payment_data', JSON.stringify(pData));

                    const result = await updateCommerceSettings(formData);
                    if (result.success) {
                        showSuccess('Configuración actualizada correctamente');
                        router.refresh();
                    } else {
                        alert('Error al guardar: ' + result.error);
                    }
                }}>
                    <div className="space-y-6">
                        {/* Branding Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-300">Identidad</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Comercio</label>
                                <input 
                                    type="text" 
                                    name="nombre" 
                                    defaultValue={commerceName}
                                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                    required
                                />
                                <p className="text-xs text-gray-600 mt-1">Este nombre aparecerá en tu cartelera y en el panel.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">URL del Logo</label>
                                <input 
                                    type="text" 
                                    name="logo_url" 
                                    defaultValue={commerceLogo || ''}
                                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        {/* Payment Section */}
                        <div className="space-y-4 pt-6 border-t border-gray-800">
                             <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-300 flex items-center">
                                    <CreditCard size={18} className="mr-2" /> Datos de Cobro
                                </h3>
                                <select 
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    className="bg-[#0a0a0a] border border-gray-800 rounded-lg px-3 py-1 text-sm text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                >
                                    {COUNTRIES.map(c => (
                                        <option key={c.code} value={c.code}>
                                            {c.flag} {c.name}
                                        </option>
                                    ))}
                                </select>
                             </div>
                             <p className="text-sm text-gray-500 mb-2">Estos datos se mostrarán a tus clientes al reservar.</p>
                             
                             {/* Dynamic Fields based on Country */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {country === 'AR' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">CBU / CVU</label>
                                            <input 
                                                type="text" 
                                                name="cbu" 
                                                defaultValue={initialPaymentSettings?.cbu || initialPaymentSettings?.payment_data?.cbu}
                                                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                                placeholder="0000000000000000000000"
                                                minLength={22}
                                                maxLength={22}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Alias</label>
                                            <input 
                                                type="text" 
                                                name="alias" 
                                                defaultValue={initialPaymentSettings?.alias || initialPaymentSettings?.payment_data?.alias}
                                                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                                placeholder="mi.alias.mp"
                                            />
                                        </div>
                                    </>
                                )}

                                {country === 'ES' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">IBAN</label>
                                            <input 
                                                type="text" 
                                                name="iban" 
                                                defaultValue={initialPaymentSettings?.payment_data?.iban}
                                                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                                placeholder="ES00 0000 0000 0000 0000 0000"
                                                pattern="^ES\d{22}$"
                                                title="Formato IBAN español: ES seguido de 22 dígitos"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Código BIC / SWIFT</label>
                                            <input 
                                                type="text" 
                                                name="bic" 
                                                defaultValue={initialPaymentSettings?.payment_data?.bic}
                                                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                                placeholder="AAAAESMMXXX"
                                            />
                                        </div>
                                    </>
                                )}

                                {country === 'MX' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-400 mb-1">CLABE Interbancaria</label>
                                        <input 
                                            type="text" 
                                            name="clabe" 
                                            defaultValue={initialPaymentSettings?.payment_data?.clabe}
                                            className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                            placeholder="18 dígitos"
                                            minLength={18}
                                            maxLength={18}
                                        />
                                    </div>
                                )}

                                {country === 'CO' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Número de Cuenta</label>
                                            <input 
                                                type="text" 
                                                name="account_number" 
                                                defaultValue={initialPaymentSettings?.payment_data?.account_number}
                                                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Tipo de Cuenta</label>
                                            <select 
                                                name="account_type" 
                                                defaultValue={initialPaymentSettings?.payment_data?.account_type}
                                                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-white transition-all"
                                            >
                                                <option value="ahorros">Ahorros</option>
                                                <option value="corriente">Corriente</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {/* Generic / International Fields */}
                                 {!['AR', 'ES', 'MX', 'CO'].includes(country) && (
                                     <>
                                         <div className="md:col-span-2">
                                             <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Banco</label>
                                             <input 
                                                 type="text" 
                                                 name="bank_name" 
                                                 defaultValue={initialPaymentSettings?.payment_data?.bank_name}
                                                 className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-white transition-all focus:bg-black"
                                             />
                                         </div>
                                         <div>
                                             <label className="block text-sm font-medium text-gray-400 mb-1">Número de Cuenta / IBAN</label>
                                             <input 
                                                 type="text" 
                                                 name="account_number" 
                                                 defaultValue={initialPaymentSettings?.payment_data?.account_number}
                                                 className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                             />
                                         </div>
                                         <div>
                                             <label className="block text-sm font-medium text-gray-400 mb-1">Código SWIFT / BIC</label>
                                             <input 
                                                 type="text" 
                                                 name="swift" 
                                                 defaultValue={initialPaymentSettings?.payment_data?.swift}
                                                 className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                             />
                                         </div>
                                     </>
                                 )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Titular</label>
                                <input 
                                    type="text" 
                                    name="nombre_titular" 
                                    defaultValue={initialPaymentSettings?.account_number}
                                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">WhatsApp de Recepción</label>
                                <input 
                                    type="text" 
                                    name="whatsapp_number" 
                                    defaultValue={initialPaymentSettings?.whatsapp_number}
                                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                    placeholder="5491112345678"
                                />
                                <p className="text-xs text-gray-600 mt-1">Ingresar con código de país (ej: 549...). Aquí se enviarán los comprobantes.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-gray-800 flex justify-end">
                        <button 
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-500 flex items-center font-medium shadow-lg h-12"
                        >
                            <Save size={18} className="mr-2" /> Guardar Configuración
                        </button>
                    </div>
                </form>

                {/* Security Section (Change Password) */}
                <div className="mt-12 pt-6 border-t border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-300 mb-6 flex items-center">
                         Seguridad de la Cuenta
                    </h3>
                    <form action={async (formData) => {
                        const result = await updateAdminPassword(formData);
                        if (result.success) {
                            alert('Contraseña actualizada correctamente. Por favor, inicia sesión nuevamente.');
                            window.location.href = '/admin'; // Force reload/redirect to login
                        } else {
                            alert('Error al cambiar contraseña: ' + result.error);
                        }
                    }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nueva Contraseña</label>
                                <input 
                                    type="password" 
                                    name="password" 
                                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Confirmar Contraseña</label>
                                <input 
                                    type="password" 
                                    name="confirm_password" 
                                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-white transition-all focus:bg-black"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                             <button 
                                type="submit"
                                className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center font-medium border border-gray-700 h-12"
                             >
                                Actualizar Contraseña
                            </button>
                        </div>
                    </form>
                </div>

             </div>
          </div>
        )}

        {/* Clients Management Tab (Super Admin Only) */}
        {activeTab === 'clients' && isSuperAdmin && initialCommerces && (
          <div>
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Users className="mr-2" /> Gestión de Clientes
              </h2>
              <button 
                onClick={() => setShowClientForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500 flex items-center shadow-lg"
              >
                <UserPlus size={20} className="mr-2" /> Crear Nuevo Cliente
              </button>
            </div>

            <div className="bg-[#0a0a0a] shadow-lg rounded-xl overflow-hidden border border-gray-800">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-800">
                        <thead className="bg-black">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Slug (URL)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha Alta</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[#111] divide-y divide-gray-800">
                            {initialCommerces.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-900/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {client.logo_url && <img src={client.logo_url} className="h-8 w-8 rounded-full mr-3 object-cover" />}
                                            <div className="text-sm font-medium text-white">{client.nombre}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                                        /{client.slug}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(client.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900/30 text-green-300 border border-green-800/50">
                                                Activo
                                            </span>
                                            <button
                                                onClick={() => handleToggleFeatured(client.id, client.es_destacado)}
                                                className={`p-1 rounded-full transition-colors ${client.es_destacado ? 'text-amber-400 hover:text-amber-300' : 'text-gray-600 hover:text-gray-400'}`}
                                                title={client.es_destacado ? 'Quitar Destacado' : 'Destacar'}
                                            >
                                                <Star size={16} fill={client.es_destacado ? "currentColor" : "none"} />
                                            </button>
                                            {client.slug !== 'govip' && (
                                                <button 
                                                    onClick={() => initiateDeleteCommerce(client)}
                                                    className="text-red-500 hover:text-red-400 p-1 hover:bg-red-900/20 rounded-full transition-colors ml-2"
                                                    title="Eliminar Cliente"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards for Clients */}
                <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                     {initialCommerces.map((client) => (
                         <div key={client.id} className="bg-[#111] border border-gray-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
                             <div className="flex items-center gap-3">
                                 {client.logo_url ? (
                                     <img src={client.logo_url} className="h-12 w-12 rounded-full object-cover border border-gray-700" />
                                 ) : (
                                     <div className="h-12 w-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 font-bold border border-gray-700">
                                         {client.nombre.substring(0, 2).toUpperCase()}
                                     </div>
                                 )}
                                 <div className="flex-1 min-w-0">
                                     <h3 className="text-white font-bold text-lg truncate">{client.nombre}</h3>
                                     <p className="text-blue-400 text-sm">/{client.slug}</p>
                                 </div>
                                 <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900/30 text-green-300 border border-green-800/50">
                                     Activo
                                 </span>
                             </div>

                             <div className="text-xs text-gray-500 border-t border-gray-800 pt-3 mt-1 flex justify-between items-center">
                                 <span>Alta: {new Date(client.created_at).toLocaleDateString()}</span>
                                 
                                 <div className="flex items-center gap-2">
                                     <button 
                                         onClick={() => handleToggleFeatured(client.id, client.es_destacado)}
                                         className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 font-medium border ${client.es_destacado ? 'bg-amber-900/20 text-amber-400 border-amber-500/30' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
                                     >
                                         <Star size={14} fill={client.es_destacado ? "currentColor" : "none"} />
                                         {client.es_destacado ? 'Destacado' : 'Destacar'}
                                     </button>

                                     {client.slug !== 'govip' && (
                                         <button 
                                             onClick={() => initiateDeleteCommerce(client)}
                                             className="text-red-400 bg-red-900/10 hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 font-medium border border-red-500/20"
                                         >
                                             <Trash2 size={14} /> Eliminar
                                         </button>
                                     )}
                                 </div>
                             </div>
                         </div>
                     ))}
                </div>
            </div>
          </div>
        )}

        {showEventForm && (
          <EventForm 
            event={editingEvent} 
            relatedEvents={relatedEvents}
            onClose={() => setShowEventForm(false)} 
            onSuccess={() => { 
              setShowEventForm(false); 
              showSuccess(editingEvent ? 'Evento actualizado exitosamente' : 'Evento creado exitosamente');
              router.refresh();
            }} 
          />
        )}

        {/* Create Client Form Modal */}
        {showClientForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
            <div className="bg-[#111] border border-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
              <button 
                onClick={() => setShowClientForm(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
              
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <UserPlus className="mr-2" /> Nuevo Cliente
              </h3>

              <form action={async (formData) => {
                  const result = await createNewCommerce(formData);
                  if (result.success) {
                      setShowClientForm(false);
                      setNewClientCredentials(result.credentials);
                      router.refresh();
                  } else {
                      alert('Error: ' + result.error);
                  }
              }}>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Comercio <span className="text-gray-600 text-xs">(Opcional - El cliente puede cambiarlo)</span></label>
                          <input type="text" name="name" className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-600" placeholder="Ej: Nuevo Cliente" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Slug (URL) <span className="text-gray-600 text-xs">(Opcional - Se generará auto)</span></label>
                          <input type="text" name="slug" className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-600" placeholder="ej: nuevo-cliente" />
                          <p className="text-xs text-gray-600 mt-1">Será accesible en govip.com/slug</p>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Email del Administrador</label>
                          <input type="email" name="email" className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-600" required placeholder="admin@cliente.com" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Contraseña Inicial</label>
                          <input type="text" name="password" className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-600" required defaultValue={Math.random().toString(36).slice(-8)} />
                          <p className="text-xs text-gray-600 mt-1">Generada automáticamente. Puedes cambiarla.</p>
                      </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                      <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-500 font-bold shadow-lg w-full h-12">
                          Crear Cliente
                      </button>
                  </div>
              </form>
            </div>
          </div>
        )}

        {/* Credentials Success Modal */}
        {newClientCredentials && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <div className="bg-[#111] border border-green-900 rounded-xl shadow-2xl max-w-md w-full p-8 relative text-center">
                    <div className="w-16 h-16 bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mb-6 mx-auto border border-green-500/20">
                        <Check size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">¡Cliente Creado!</h3>
                    <p className="text-gray-400 mb-6">Comparte estas credenciales con el nuevo administrador de forma segura.</p>
                    
                    <div className="bg-black border border-gray-800 rounded-lg p-4 text-left mb-6 font-mono text-sm">
                        <div className="mb-2">
                            <span className="text-gray-500 block text-xs uppercase tracking-wider">URL Acceso</span>
                            <span className="text-blue-400">govip.com/admin</span>
                        </div>
                        <div className="mb-2">
                            <span className="text-gray-500 block text-xs uppercase tracking-wider">Email</span>
                            <span className="text-white select-all">{newClientCredentials.email}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs uppercase tracking-wider">Contraseña</span>
                            <span className="text-white select-all font-bold">{newClientCredentials.password}</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => setNewClientCredentials(null)}
                        className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-500 font-bold shadow-lg"
                    >
                        Entendido, Cerrar
                    </button>
                </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {(showDeleteModal || showDeleteCommerceModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
            <div className="bg-[#111] border border-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative transform transition-all scale-100">
              <button 
                onClick={() => { setShowDeleteModal(false); setShowDeleteCommerceModal(false); }}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                disabled={isDeleting}
              >
                <XCircle size={24} />
              </button>
              
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {showDeleteCommerceModal 
                    ? `¿Eliminar Cliente "${commerceToDelete?.name}"?`
                    : deleteMode === 'all' ? '¿Eliminar TODAS las reservas?' : '¿Eliminar reserva?'
                  }
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {showDeleteCommerceModal
                    ? 'Esta acción eliminará permanentemente el comercio, su usuario administrador y todos sus datos asociados (eventos, reservas, etc.). Esta acción NO se puede deshacer.'
                    : deleteMode === 'all' 
                        ? 'Esta acción borrará permanentemente todo el historial de reservas y restaurará el stock completo de todos los eventos. Esta acción es irreversible.'
                        : '¿Estás seguro de eliminar esta reserva? Esta acción devolverá los cupos al stock del evento.'
                  }
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setShowDeleteCommerceModal(false); }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-700 text-gray-300 font-medium hover:bg-gray-800 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 shadow-lg shadow-red-900/20 transition-all flex justify-center items-center"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </>
                  ) : (
                    showDeleteCommerceModal ? 'Sí, Eliminar Cliente' :
                    deleteMode === 'all' ? 'Sí, Eliminar Todo' : 'Sí, Eliminar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Stock Confirmation Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
            <div className="bg-[#111] border border-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative transform transition-all scale-100">
              <button 
                onClick={() => setShowResetModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                disabled={isResetting}
              >
                <XCircle size={24} />
              </button>
              
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mb-4 border border-green-500/20">
                  <RotateCcw size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {resetMode === 'all' ? '¿Restablecer TODO el stock?' : '¿Restablecer Stock?'}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {resetMode === 'all'
                    ? 'Esta acción restablecerá el stock de TODOS tus eventos a su capacidad original (200). Esta acción es masiva y no se puede deshacer individualmente.'
                    : 'Esta acción actualizará el stock disponible de todas las entradas de este evento a su capacidad original (200). Las reservas existentes no se verán afectadas, pero el contador se reiniciará.'
                  }
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-700 text-gray-300 font-medium hover:bg-gray-800 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmResetStock}
                  disabled={isResetting}
                  className="flex-1 px-4 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 shadow-lg shadow-green-900/20 transition-all flex justify-center items-center"
                >
                  {isResetting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Restableciendo...
                    </>
                  ) : (
                    resetMode === 'all' ? 'Sí, Restablecer Todo' : 'Sí, Restablecer'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Distribute Event Modal */}
        {showDistributeModal && eventToDistribute && isSuperAdmin && initialCommerces && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-opacity">
                <div className="bg-[#050505] border border-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 relative flex flex-col max-h-[90vh]">
                    <button 
                        onClick={() => setShowDistributeModal(false)}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        disabled={isDistributing}
                    >
                        <XCircle size={24} />
                    </button>
                    
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center">
                        <Share2 className="mr-2 text-indigo-500" /> Distribuir Evento
                    </h3>
                    <p className="text-gray-400 text-sm mb-6">
                        Selecciona los comercios donde deseas clonar el evento <span className="text-white font-medium">"{eventToDistribute.title}"</span>.
                    </p>

                    <div className="flex-1 overflow-y-auto pr-2 mb-6 custom-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {initialCommerces
                                .filter(c => c.slug !== 'govip' && c.slug !== 'govip-admin') // Filter out master if needed, though master can distribute to master too technically
                                .map(commerce => (
                                <div 
                                    key={commerce.id}
                                    onClick={() => toggleCommerceSelection(commerce.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                                        selectedCommerces.includes(commerce.id)
                                            ? 'bg-indigo-900/20 border-indigo-500/50'
                                            : 'bg-[#111] border-gray-800 hover:border-gray-600'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                        selectedCommerces.includes(commerce.id)
                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                            : 'border-gray-600'
                                    }`}>
                                        {selectedCommerces.includes(commerce.id) && <Check size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">{commerce.nombre}</div>
                                        <div className="text-xs text-gray-500 truncate">/{commerce.slug}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
                         <button
                            onClick={() => setShowDistributeModal(false)}
                            disabled={isDistributing}
                            className="px-4 py-3 rounded-lg text-gray-400 hover:text-white font-medium transition-colors h-12"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleDistribute}
                            disabled={isDistributing || selectedCommerces.length === 0}
                            className={`px-6 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center h-12 ${
                                isDistributing || selectedCommerces.length === 0
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/20'
                            }`}
                        >
                            {isDistributing ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Distribuyendo...
                                </>
                            ) : (
                                <>
                                    <Share2 size={18} className="mr-2" />
                                    Distribuir a {selectedCommerces.length} {selectedCommerces.length === 1 ? 'Comercio' : 'Comercios'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
