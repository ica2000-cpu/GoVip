'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Calendar, Music, Plus, Edit, Trash2, Copy, CreditCard, Save, XCircle, RotateCcw, Settings, Home, Users, UserPlus, Check, LogOut, Share2, Globe, Crown, RefreshCw, Menu, X, Star, Eye, EyeOff, ExternalLink, Filter, AlertTriangle, ChevronRight, Download, Activity, LogIn, CheckSquare, Square, Tag, Layers, Power, Ban } from 'lucide-react';
import { Event } from '@/types';
import EventForm from './EventForm';
import { deleteEvent, deleteReservation, deleteAllReservations, resetEventStock, resetAllEventStock, updateCommerceSettings, createNewCommerce, updateAdminPassword, deleteCommerce, logout, syncWebCache, distributeEvent, toggleCommerceFeatured, toggleCommerceStatus, toggleEventStatus, bulkDeleteEvents, bulkToggleEventStatus, impersonateCommerce, getAuditLogs, getExportData, createCategory, updateCategory, deleteCategory, getCategories } from '@/app/admin/actions';
import { COUNTRIES } from '@/lib/constants';

export default function AdminDashboard({ 
  initialReservations, 
  initialStock,
  initialEvents,
  initialPaymentSettings,
  commerceName = 'GoVip Admin', // Default
  commerceLogo,
  commerceSlug,
  initialCommerces, // New prop for clients list
  initialCategories, // New prop for categories list
  isSuperAdmin = false // New prop
}: { 
  initialReservations: any[], 
  initialStock: any[],
  initialEvents: Event[],
  initialPaymentSettings: any,
  commerceName?: string,
  commerceLogo?: string,
  commerceSlug?: string,
  initialCommerces?: any[] | null,
  initialCategories?: any[] | null,
  isSuperAdmin?: boolean
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'reservations' | 'events' | 'settings' | 'clients' | 'master_events' | 'logs' | 'categories'>('events');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Bulk Actions State
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [categories, setCategories] = useState<any[]>(initialCategories || []);

  const [showEventForm, setShowEventForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false); // New state for client form
  const [showCategoryForm, setShowCategoryForm] = useState(false); // New state for category form
  const [editingCategory, setEditingCategory] = useState<any>(null); // New state for editing category
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
    (res.reservation_code && res.reservation_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (isSuperAdmin && res.comercios?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())) // Master Search
  );

  const filteredEvents = initialEvents.filter((evt) => {
    const matchesSearch = evt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (isSuperAdmin && evt.comercios?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())); // Master Search
    
    const matchesCategory = filterCategory === 'all' || evt.category === filterCategory;
    const matchesStatus = filterStatus === 'all' 
        ? true 
        : filterStatus === 'active' 
            ? (evt.is_active !== false) 
            : (evt.is_active === false);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const uniqueCategories = Array.from(new Set(initialEvents.map(e => e.category)));

  // Load Logs when tab changes
  useEffect(() => {
    if (activeTab === 'logs' && isSuperAdmin) {
        loadLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    if ((!categories || categories.length === 0) && isSuperAdmin) {
        // Fetch categories if not passed initially
        getCategories().then(res => {
            if (res.success && res.categories) {
                setCategories(res.categories);
            }
        });
    }
  }, [isSuperAdmin]);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    const result = await getAuditLogs();
    if (result.success) {
        setLogs(result.logs || []);
    }
    setIsLoadingLogs(false);
  };

  const handleExport = async (type: 'clients' | 'reservations') => {
    const result = await getExportData(type);
    if (result.success && result.data) {
        // Convert JSON to CSV
        const items = result.data;
        if (items.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        const replacer = (key: string, value: any) => value === null ? '' : value; 
        const header = Object.keys(items[0]);
        const csv = [
            header.join(','), // header row first
            ...items.map((row: any) => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
        ].join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `govip_${type}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        alert('Error al exportar: ' + result.error);
    }
  };

  const handleImpersonate = async (commerceId: string) => {
      if (!confirm('¿Entrar al panel de este cliente?')) return;
      const result = await impersonateCommerce(commerceId);
      if (result.success) {
          window.location.reload(); // Reload to apply new session
      } else {
          alert('Error: ' + result.error);
      }
  };

  const toggleEventSelection = (id: number) => {
    setSelectedEvents(prev => 
        prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: 'delete' | 'activate' | 'pause') => {
      if (selectedEvents.length === 0) return;
      if (!confirm(`¿Estás seguro de aplicar esta acción a ${selectedEvents.length} eventos?`)) return;

      setIsBulkProcessing(true);
      let result;

      if (action === 'delete') {
          result = await bulkDeleteEvents(selectedEvents);
      } else if (action === 'activate') {
          result = await bulkToggleEventStatus(selectedEvents, true);
      } else if (action === 'pause') {
          result = await bulkToggleEventStatus(selectedEvents, false);
      }

      setIsBulkProcessing(false);
      setSelectedEvents([]);

      if (result?.success) {
          showSuccess('Acción masiva completada');
          router.refresh();
      } else {
          alert('Error: ' + result?.error);
      }
  };

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // ... existing useEffects ...

  const SkeletonCard = () => (
    <div className="bg-[#0a0a0a] rounded-2xl shadow-xl border border-gray-800 overflow-hidden flex flex-col h-[400px] animate-pulse">
        <div className="h-3/4 bg-gray-900"></div>
        <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-900 rounded w-3/4"></div>
            <div className="h-3 bg-gray-900 rounded w-1/2"></div>
        </div>
    </div>
  );

  const SkeletonRow = () => (
    <div className="border-b border-gray-800 p-4 animate-pulse flex items-center justify-between">
        <div className="space-y-2 w-1/3">
            <div className="h-4 bg-gray-900 rounded w-full"></div>
            <div className="h-3 bg-gray-900 rounded w-2/3"></div>
        </div>
        <div className="h-8 w-24 bg-gray-900 rounded"></div>
    </div>
  );

  const EmptyState = ({ message, icon: Icon }: { message: string, icon: any }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-gray-800 rounded-2xl bg-white/5">
        <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 text-gray-500">
            <Icon size={32} />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">Sin resultados</h3>
        <p className="text-gray-500 text-sm max-w-sm">{message}</p>
    </div>
  );

  const Tooltip = ({ children, text }: { children: React.ReactNode, text: string }) => (
    <div className="relative group/tooltip">
        {children}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-gray-700 shadow-xl z-50">
            {text}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
    </div>
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

  const handleToggleFeatured = async (id: string, currentStatus: boolean) => {
    const result = await toggleCommerceFeatured(id, !currentStatus);
    if (result.success) {
        showSuccess(!currentStatus ? 'Comercio destacado' : 'Comercio quitado de destacados');
        router.refresh();
    } else {
        alert('Error: ' + result.error);
    }
  };

  const handleToggleCommerceStatus = async (id: string, currentStatus: boolean) => {
    if (!confirm(currentStatus ? '¿Suspender cuenta de este cliente? No podrá acceder al panel.' : '¿Reactivar cuenta de este cliente?')) return;
    
    const result = await toggleCommerceStatus(id, !currentStatus);
    if (result.success) {
        showSuccess(!currentStatus ? 'Cliente activado' : 'Cliente suspendido');
        router.refresh();
    } else {
        alert('Error: ' + result.error);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean = true) => {
    const result = await toggleEventStatus(id, !currentStatus);
    if (result.success) {
        showSuccess(!currentStatus ? 'Evento activado' : 'Evento pausado');
        router.refresh();
    } else {
        alert('Error: ' + result.error);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    let result;
    if (editingCategory) {
        result = await updateCategory(editingCategory.id, formData);
    } else {
        result = await createCategory(formData);
    }

    if (result.success) {
        showSuccess(editingCategory ? 'Categoría actualizada' : 'Categoría creada');
        setShowCategoryForm(false);
        setEditingCategory(null);
        router.refresh();
    } else {
        alert('Error: ' + result.error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
      if (!confirm('¿Seguro que quieres borrar esta categoría?')) return;
      const result = await deleteCategory(id);
      if (result.success) {
          showSuccess('Categoría eliminada');
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

  // Breadcrumbs Helper
  const renderBreadcrumbs = () => {
    const path = [
        { name: 'Inicio', icon: <Home size={14} /> },
        { 
            name: activeTab === 'events' ? 'Cartelera' :
                  activeTab === 'reservations' ? 'Reservas' :
                  activeTab === 'settings' ? 'Mi Comercio' :
                  activeTab === 'clients' ? 'Clientes' : 'Maestros',
            icon: null 
        }
    ];

    return (
        <div className="flex items-center text-sm text-gray-500 mb-6 bg-gray-900/30 px-4 py-2 rounded-lg border border-gray-800/50 w-fit">
            {path.map((item, index) => (
                <div key={item.name} className="flex items-center">
                    {index > 0 && <ChevronRight size={14} className="mx-2 text-gray-600" />}
                    <span className={`flex items-center gap-2 ${index === path.length - 1 ? 'text-white font-medium' : 'hover:text-gray-300 transition-colors'}`}>
                        {item.icon}
                        {item.name}
                    </span>
                </div>
            ))}
        </div>
    );
  };

  // Super Admin Alerts
  const renderSuperAdminAlerts = () => {
    if (!isSuperAdmin || !initialCommerces) return null;
    
    const incompleteCommerces = initialCommerces.filter(c => !c.logo_url || !c.payment_data);
    
    if (incompleteCommerces.length === 0) return null;

    return (
        <div className="mb-6 p-4 bg-amber-900/10 border border-amber-500/20 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
                <h4 className="text-amber-500 font-bold text-sm mb-1">Atención Requerida</h4>
                <p className="text-amber-200/80 text-sm">
                    Hay {incompleteCommerces.length} comercios con información incompleta (Logo o Datos de Pago).
                    <button onClick={() => setActiveTab('clients')} className="ml-2 underline hover:text-white">Ver Clientes</button>
                </p>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex justify-between items-center p-4 bg-[#050505] border-b border-gray-800 sticky top-0 z-50">
          <div className="flex items-center gap-2">
              {commerceLogo ? (
                  <img src={commerceLogo} alt="Logo" className="h-8 w-auto object-contain" />
              ) : (
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-xs">
                      GV
                  </div>
              )}
              <span className="font-bold text-lg tracking-tight">{commerceName}</span>
          </div>
          <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-400 hover:text-white"
          >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
          fixed md:sticky top-0 left-0 h-screen w-64 bg-[#050505] border-r border-gray-800/50 flex flex-col z-40 transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
          <div className="p-6 border-b border-gray-800/50 hidden md:flex items-center gap-3">
              {commerceLogo ? (
                  <img src={commerceLogo} alt="Logo" className="h-8 w-auto object-contain" />
              ) : (
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-lg shadow-blue-900/20">
                      GV
                  </div>
              )}
              <div>
                  <h1 className="font-bold text-sm tracking-wide text-white">{commerceName}</h1>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium block">Panel de Control</span>
              </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
              <div className="px-3 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Principal</div>
              
              <button 
                  onClick={() => { setActiveTab('events'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      activeTab === 'events' 
                          ? 'bg-white/5 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                  <Music size={18} className={activeTab === 'events' ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'} />
                  Cartelera
              </button>

              <button 
                  onClick={() => { setActiveTab('reservations'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      activeTab === 'reservations' 
                          ? 'bg-white/5 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                  <Calendar size={18} className={activeTab === 'reservations' ? 'text-green-400' : 'text-gray-500 group-hover:text-gray-300'} />
                  Reservas
              </button>

              {isSuperAdmin && (
                  <>
                      <div className="px-3 mt-6 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Administración</div>
                      <button 
                          onClick={() => { setActiveTab('master_events'); setIsMobileMenuOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                              activeTab === 'master_events' 
                                  ? 'bg-white/5 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5' 
                                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                      >
                          <Crown size={18} className={activeTab === 'master_events' ? 'text-amber-400' : 'text-gray-500 group-hover:text-gray-300'} />
                          Maestros
                      </button>
                      <button 
                          onClick={() => { setActiveTab('clients'); setIsMobileMenuOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                              activeTab === 'clients' 
                                  ? 'bg-white/5 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5' 
                                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                      >
                          <Globe size={18} className={activeTab === 'clients' ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'} />
                          Clientes
                      </button>
                      <button 
                          onClick={() => { setActiveTab('categories'); setIsMobileMenuOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                              activeTab === 'categories' 
                                  ? 'bg-white/5 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5' 
                                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                      >
                          <Layers size={18} className={activeTab === 'categories' ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-300'} />
                          Categorías
                      </button>
                      <button 
                          onClick={() => { setActiveTab('logs'); setIsMobileMenuOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                              activeTab === 'logs' 
                                  ? 'bg-white/5 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5' 
                                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                      >
                          <Activity size={18} className={activeTab === 'logs' ? 'text-teal-400' : 'text-gray-500 group-hover:text-gray-300'} />
                          Auditoría
                      </button>
                  </>
              )}

              <div className="px-3 mt-6 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Configuración</div>
              
              <button 
                  onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      activeTab === 'settings' 
                          ? 'bg-white/5 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                  <Settings size={18} className={activeTab === 'settings' ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} />
                  Mi Comercio
              </button>
          </nav>

          <div className="p-4 border-t border-gray-800/50 space-y-2">
              <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin text-blue-400' : ''} />
                  Sincronizar Web
              </button>
              <button 
                  onClick={async () => { await logout(); window.location.href = '/admin'; }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-900/10 hover:text-red-300 transition-colors"
              >
                  <LogOut size={14} />
                  Cerrar Sesión
              </button>
          </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-black">
        {/* Top Header / Breadcrumbs */}
        <header className="border-b border-gray-800/50 bg-black/50 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center text-sm">
                <span className="text-gray-500 font-light">Panel</span>
                <ChevronRight size={14} className="mx-2 text-gray-700" />
                <span className="text-white font-medium tracking-wide">
                    {activeTab === 'events' ? 'Cartelera de Eventos' :
                     activeTab === 'reservations' ? 'Gestión de Reservas' :
                     activeTab === 'settings' ? 'Configuración' :
                     activeTab === 'clients' ? 'Directorio de Clientes' :
                     activeTab === 'master_events' ? 'Eventos Maestros' :
                     activeTab === 'categories' ? 'Categorías' : 'Logs del Sistema'}
                </span>
            </div>
            
            {/* Quick Actions or User Status could go here */}
            {isSuperAdmin && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest">
                    Super Admin
                </span>
            )}
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {renderSuperAdminAlerts()}
        
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Music className="mr-2" /> Cartelera de Eventos
              </h2>
              
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                 {/* Filters */}
                 <div className="relative">
                    <input
                      type="text"
                      className="pl-8 block w-full md:w-48 bg-[#111] border-gray-800 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm border p-2 text-white placeholder-gray-500"
                      placeholder={isSuperAdmin ? "Buscar Evento o Comercio..." : "Buscar Evento..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                     <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-500" />
                    </div>
                 </div>

                 <div className="relative group">
                    <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md p-1.5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200">
                        <Filter size={16} className="text-gray-400 ml-2" />
                        <select 
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="bg-transparent border-none text-sm text-gray-200 focus:ring-0 cursor-pointer py-1 pr-8 font-medium appearance-none min-w-[140px]"
                        >
                            <option value="all" className="bg-gray-900">Todas las Categorías</option>
                            {uniqueCategories.map(cat => (
                                <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                            ))}
                        </select>
                        <ChevronRight size={14} className="text-gray-500 absolute right-3 pointer-events-none rotate-90" />
                    </div>
                 </div>

                 <div className="relative group">
                    <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md p-1.5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200">
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-transparent border-none text-sm text-gray-200 focus:ring-0 cursor-pointer py-1 pl-4 pr-8 font-medium appearance-none min-w-[140px]"
                        >
                            <option value="all" className="bg-gray-900">Todos los Estados</option>
                            <option value="active" className="bg-gray-900">Activos</option>
                            <option value="inactive" className="bg-gray-900">Pausados</option>
                        </select>
                        <ChevronRight size={14} className="text-gray-500 absolute right-3 pointer-events-none rotate-90" />
                    </div>
                 </div>

                 <button 
                    onClick={() => { setEditingEvent(null); setShowEventForm(true); }}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-500 flex items-center shadow-lg shadow-blue-900/20 ml-auto md:ml-0 font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus size={20} className="mr-2" /> Nuevo Evento
                  </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(groupedEvents).map((group) => {
                const event = group[0];
                const sortedGroup = group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                return (
                <div key={event.id} className={`bg-[#0a0a0a] rounded-2xl shadow-xl border overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 relative ${selectedEvents.includes(event.id) ? 'ring-2 ring-blue-500 border-blue-500' : ''} ${event.is_active === false ? 'border-red-900/30 opacity-75 grayscale-[0.5]' : 'border-gray-800 hover:border-blue-600/30'}`}>
                  
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2 z-30">
                     <button
                        onClick={(e) => { e.stopPropagation(); toggleEventSelection(event.id); }}
                        className={`p-1.5 rounded-lg border transition-all ${selectedEvents.includes(event.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-black/50 border-white/20 text-transparent hover:border-white/50'}`}
                     >
                        <Check size={16} />
                     </button>
                  </div>

                  <div className="w-full aspect-[3/4] relative bg-gray-900 group">
                    <img src={event.image_url} alt={event.title} className="w-full h-full object-cover object-top" />
                    
                    {/* Status Badge */}
                    {event.is_active === false && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10 pointer-events-none">
                            <span className="bg-red-600 text-white px-3 py-1 rounded font-bold uppercase tracking-wider text-sm transform -rotate-12 border border-white/20 shadow-xl">
                                Pausado
                            </span>
                        </div>
                    )}
                    
                    {/* Commerce Badge (Super Admin) */}
                    {isSuperAdmin && event.comercios && (
                        <div className="absolute bottom-2 right-2 z-20 pointer-events-none">
                            <span className="bg-black/80 backdrop-blur-md text-xs font-bold px-2 py-1 rounded border border-white/20 text-gray-300">
                                {event.comercios.nombre}
                            </span>
                        </div>
                    )}

                    <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
                      {isSuperAdmin && (
                          <button 
                            onClick={() => initiateDistributeEvent(event)}
                            className="p-2 bg-black/70 backdrop-blur-sm rounded-full hover:bg-indigo-600 text-indigo-300 hover:text-white border border-white/10 transition-colors shadow-lg"
                            title="Distribuir Evento"
                            aria-label="Distribuir Evento"
                          >
                            <Share2 size={16} />
                          </button>
                      )}
                      <button 
                        onClick={() => handleDuplicateEvent(event)}
                        className="p-2 bg-black/70 backdrop-blur-sm rounded-full hover:bg-white text-gray-300 hover:text-black border border-white/10 transition-colors shadow-lg"
                        title="Duplicar Evento"
                        aria-label="Duplicar Evento"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(event.id, event.is_active !== false)}
                        className={`p-2 backdrop-blur-sm rounded-full border border-white/10 transition-colors shadow-lg ${event.is_active === false ? 'bg-green-900/80 text-green-400 hover:bg-green-600 hover:text-white' : 'bg-black/70 text-gray-300 hover:text-white hover:bg-black'}`}
                        title={event.is_active === false ? 'Activar Ventas' : 'Pausar Ventas'}
                        aria-label="Toggle Status"
                      >
                        {event.is_active === false ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button 
                        onClick={() => { setEditingEvent(event); setShowEventForm(true); }}
                        className="p-2 bg-black/70 backdrop-blur-sm rounded-full hover:bg-blue-600 text-blue-400 hover:text-white border border-white/10 transition-colors shadow-lg"
                        title="Editar"
                        aria-label="Editar Evento"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 bg-black/70 backdrop-blur-sm rounded-full hover:bg-red-600 text-red-400 hover:text-white border border-white/10 transition-colors shadow-lg"
                        title="Eliminar"
                        aria-label="Eliminar Evento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {event.ticket_types.reduce((sum, t) => sum + t.stock, 0) === 0 && (
                      <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm z-20">
                        SOLD OUT
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-white leading-tight">{event.title}</h3>
                        <a 
                            href={`/${commerceSlug || 'govip'}#${event.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-white transition-colors"
                            title="Ver en la Web"
                        >
                            <ExternalLink size={16} />
                        </a>
                    </div>
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
                    {isLoading ? (
                        <div className="space-y-4 p-4">
                            {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <EmptyState 
                            message="No hay eventos maestros disponibles."
                            icon={Crown}
                        />
                    ) : (
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
                                            <Tooltip text="Distribuir a comercios">
                                                <button 
                                                    onClick={() => initiateDistributeEvent(event)}
                                                    className="text-indigo-400 hover:text-white bg-indigo-900/20 hover:bg-indigo-600 px-3 py-1.5 rounded-md transition-all border border-indigo-500/30 flex items-center gap-2 ml-auto"
                                                >
                                                    <Copy size={14} />
                                                    Distribuir
                                                </button>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    )}


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
                <div className="flex gap-2">
                    <button 
                      onClick={() => handleExport('reservations')}
                      className="flex items-center text-blue-400 hover:text-blue-300 text-sm font-medium border border-blue-500/30 hover:border-blue-500/80 px-3 py-1.5 rounded transition-all"
                      title="Exportar Reservas a CSV"
                    >
                      <Download size={16} className="mr-2" />
                      Exportar
                    </button>
                    <button 
                      onClick={initiateResetAllStock}
                      className="flex items-center text-green-500 hover:text-green-400 text-sm font-medium border border-green-500/30 hover:border-green-500/80 px-3 py-1.5 rounded transition-all"
                      title="Restablecer stock de TODOS los eventos"
                    >
                      <RotateCcw size={16} className="mr-2" />
                      Restablecer Todo
                    </button>
                </div>
              </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isLoading ? (
                    [1, 2, 3].map(i => <div key={i} className="bg-[#0a0a0a] rounded-xl shadow-lg border border-gray-800 h-32 animate-pulse"></div>)
                  ) : initialStock.length === 0 ? (
                    <div className="col-span-full">
                         <EmptyState message="No hay información de stock disponible." icon={Package} />
                    </div>
                  ) : (
                    initialStock.map((item) => (
                      <div key={item.id} className="bg-[#0a0a0a] overflow-hidden shadow-lg rounded-xl border border-gray-800 hover:border-blue-500/30 transition-colors">
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
                            <div className={`flex flex-col items-end ${
                              item.stock < 10 ? 'text-red-500' : 
                              item.stock < 50 ? 'text-amber-500' : 'text-green-500'
                            }`}>
                              <span className="text-3xl font-bold tracking-tight">{item.stock}</span>
                              <span className="text-[10px] uppercase tracking-wider font-medium">Disponibles</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-[#111] px-6 py-3 border-t border-gray-800 flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-500">
                             ID: #{item.id}
                          </span>
                          <Tooltip text="Restablecer Stock">
                          <button
                            onClick={() => initiateResetStock(item.events.id)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center transition-colors"
                          >
                            <RotateCcw size={14} className="mr-1" /> Restablecer
                          </button>
                          </Tooltip>
                        </div>
                      </div>
                    ))
                  )}
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
                      placeholder={isSuperAdmin ? "Buscar Reserva o Comercio..." : "Buscar Reserva..."}
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
                          {isSuperAdmin && res.comercios && (
                            <div className="text-xs text-blue-400 mt-0.5">{res.comercios.nombre}</div>
                          )}
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
                            aria-label="Eliminar Reserva"
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
                              {isSuperAdmin && res.comercios && (
                                <div className="text-xs text-blue-400 mb-1 pl-5">
                                    {res.comercios.nombre}
                                </div>
                              )}
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
              <div className="flex gap-2">
                  <button 
                    onClick={() => handleExport('clients')}
                    className="bg-[#111] text-gray-300 border border-gray-700 px-4 py-2 rounded-md hover:text-white hover:border-gray-500 flex items-center shadow-lg transition-colors"
                  >
                    <Download size={20} className="mr-2" /> Exportar Lista
                  </button>
                  <button 
                    onClick={() => setShowClientForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500 flex items-center shadow-lg"
                  >
                    <UserPlus size={20} className="mr-2" /> Crear Nuevo Cliente
                  </button>
              </div>
            </div>

            <div className="bg-[#0a0a0a] shadow-lg rounded-xl overflow-hidden border border-gray-800">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-800">
                        <thead className="bg-black">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Slug (URL)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Categoría</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha Alta</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {client.categorias ? (
                                            <span className="flex items-center gap-2">
                                                <span>{client.categorias.icono}</span>
                                                <span>{client.categorias.nombre}</span>
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(client.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${client.activo !== false ? 'bg-green-900/30 text-green-300 border-green-800/50' : 'bg-red-900/30 text-red-300 border-red-800/50'}`}>
                                            {client.activo !== false ? 'Activo' : 'Suspendido'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            {client.slug !== 'govip' && (
                                                <button 
                                                    onClick={() => handleImpersonate(client.id)}
                                                    className="p-1.5 rounded-full transition-colors text-indigo-400 hover:text-white hover:bg-indigo-900/30"
                                                    title="Entrar como este Cliente"
                                                >
                                                    <LogIn size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleToggleFeatured(client.id, client.es_destacado)}
                                                className={`p-1.5 rounded-full transition-colors ${client.es_destacado ? 'text-amber-400 hover:text-amber-300' : 'text-gray-600 hover:text-gray-400'}`}
                                                title={client.es_destacado ? 'Quitar Destacado' : 'Destacar'}
                                                aria-label={client.es_destacado ? 'Quitar Destacado' : 'Destacar'}
                                            >
                                                <Star size={16} fill={client.es_destacado ? "currentColor" : "none"} />
                                            </button>
                                            {client.slug !== 'govip' && (
                                              <>
                                                <button
                                                    onClick={() => handleToggleCommerceStatus(client.id, client.activo !== false)}
                                                    className={`p-1.5 rounded-full transition-colors ${client.activo !== false ? 'text-green-400 hover:text-red-400' : 'text-red-400 hover:text-green-400'}`}
                                                    title={client.activo !== false ? 'Suspender Cuenta' : 'Activar Cuenta'}
                                                >
                                                    {client.activo !== false ? <Power size={16} /> : <Ban size={16} />}
                                                </button>
                                                <button 
                                                    onClick={() => initiateDeleteCommerce(client)}
                                                    className="text-red-500 hover:text-red-400 p-1.5 hover:bg-red-900/20 rounded-full transition-colors"
                                                    title="Eliminar Cliente"
                                                    aria-label="Eliminar Cliente"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                              </>
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
                                     {client.categorias && (
                                        <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                                            <span>{client.categorias.icono}</span>
                                            <span>{client.categorias.nombre}</span>
                                        </p>
                                     )}
                                 </div>
                                 <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${client.activo !== false ? 'bg-green-900/30 text-green-300 border-green-800/50' : 'bg-red-900/30 text-red-300 border-red-800/50'}`}>
                                     {client.activo !== false ? 'Activo' : 'Susp.'}
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
                                     </button>

                                     {client.slug !== 'govip' && (
                                        <>
                                         <button
                                            onClick={() => handleToggleCommerceStatus(client.id, client.activo !== false)}
                                            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 font-medium border ${client.activo !== false ? 'bg-gray-800 text-green-400 border-gray-700' : 'bg-red-900/20 text-red-400 border-red-500/30'}`}
                                         >
                                            {client.activo !== false ? <Power size={14} /> : <Ban size={14} />}
                                         </button>
                                         <button 
                                             onClick={() => initiateDeleteCommerce(client)}
                                             className="text-red-400 bg-red-900/10 hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 font-medium border border-red-500/20"
                                         >
                                             <Trash2 size={14} />
                                         </button>
                                        </>
                                     )}
                                 </div>
                             </div>
                         </div>
                     ))}
                </div>
            </div>
          </div>
        )}

        {/* Logs Tab (Super Admin Only) */}
        {activeTab === 'logs' && isSuperAdmin && (
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <Activity className="mr-2" /> Registro de Actividad
                    </h2>
                    <button 
                        onClick={loadLogs}
                        disabled={isLoadingLogs}
                        className="p-2 rounded-lg bg-[#111] border border-gray-800 text-gray-400 hover:text-white transition-colors"
                    >
                        <RefreshCw size={18} className={isLoadingLogs ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="bg-[#0a0a0a] shadow-lg rounded-xl overflow-hidden border border-gray-800">
                    {isLoadingLogs ? (
                        <div className="p-8 text-center text-gray-500">Cargando logs...</div>
                    ) : logs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No hay actividad registrada.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-800">
                                <thead className="bg-black">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Acción</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tabla / ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-[#111] divide-y divide-gray-800">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-900/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(log.created_at).toLocaleString('es-AR')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                                                    log.action.includes('DELETE') ? 'bg-red-900/20 text-red-400 border-red-500/30' :
                                                    log.action.includes('UPDATE') ? 'bg-amber-900/20 text-amber-400 border-amber-500/30' :
                                                    'bg-blue-900/20 text-blue-400 border-blue-500/30'
                                                }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {log.table_name} <span className="text-gray-600">#{log.record_id}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                                {log.performed_by}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate font-mono">
                                                {JSON.stringify(log.new_data || log.old_data || {})}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Categories Tab (Super Admin Only) */}
        {activeTab === 'categories' && isSuperAdmin && initialCategories && (
          <div>
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Layers className="mr-2" /> Gestión de Categorías
              </h2>
              <button 
                onClick={() => { setEditingCategory(null); setShowCategoryForm(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500 flex items-center shadow-lg"
              >
                <Plus size={20} className="mr-2" /> Nueva Categoría
              </button>
            </div>

            <div className="bg-[#0a0a0a] shadow-lg rounded-xl overflow-hidden border border-gray-800">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-800">
                        <thead className="bg-black">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Icono</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[#111] divide-y divide-gray-800">
                            {initialCategories.map((category) => (
                                <tr key={category.id} className="hover:bg-gray-900/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-white">{category.nombre}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {category.icono || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            category.activo 
                                            ? 'bg-green-900/30 text-green-300 border border-green-800/50' 
                                            : 'bg-red-900/30 text-red-300 border border-red-800/50'
                                        }`}>
                                            {category.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => { setEditingCategory(category); setShowCategoryForm(true); }}
                                                className="p-1.5 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black text-blue-400 hover:text-blue-300 border border-white/10"
                                                title="Editar"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteCategory(category.id)}
                                                className="p-1.5 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black text-red-400 hover:text-red-300 border border-white/10"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                          <label className="block text-sm font-medium text-gray-400 mb-1">Categoría del Comercio <span className="text-red-500">*</span></label>
                          <div className="relative">
                              <Layers className="absolute left-3 top-3 text-gray-500" size={18} />
                              <select 
                                  name="categoria_id" 
                                  required
                                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-blue-600 appearance-none"
                              >
                                  <option value="">Seleccionar Categoría...</option>
                                  {categories.filter(c => c.activo).map(cat => (
                                      <option key={cat.id} value={cat.id}>
                                          {cat.icono} {cat.nombre}
                                      </option>
                                  ))}
                              </select>
                          </div>
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

        {showCategoryForm && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <div className="bg-[#111] rounded-xl max-w-md w-full border border-gray-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {editingCategory ? <Edit size={20} className="text-blue-500" /> : <Plus size={20} className="text-blue-500" />}
                            {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                        </h2>
                        <button onClick={() => { setShowCategoryForm(false); setEditingCategory(null); }} className="text-gray-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                            <input 
                                name="nombre" 
                                type="text" 
                                required 
                                defaultValue={editingCategory?.nombre}
                                placeholder="Ej: Discoteca, Bar, Evento Privado"
                                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Icono (Emoji o Lucide Name)</label>
                            <input 
                                name="icono" 
                                type="text" 
                                defaultValue={editingCategory?.icono}
                                placeholder="Ej: 🍷 o wine"
                                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        {editingCategory && (
                             <div className="flex items-center gap-2 mt-4">
                                <input 
                                    type="checkbox" 
                                    name="activo" 
                                    id="cat_activo"
                                    defaultChecked={editingCategory.activo}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                                />
                                <label htmlFor="cat_activo" className="text-sm font-medium text-gray-300 select-none cursor-pointer">
                                    Categoría Activa
                                </label>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 gap-3">
                            <button 
                                type="button"
                                onClick={() => { setShowCategoryForm(false); setEditingCategory(null); }}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all flex items-center"
                            >
                                <Save size={18} className="mr-2" />
                                {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {(showDeleteModal || showDeleteCommerceModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
            <div className="bg-[#111] border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative transform transition-all scale-100 hover:shadow-red-900/10 hover:border-red-900/30">
              <button 
                onClick={() => { setShowDeleteModal(false); setShowDeleteCommerceModal(false); }}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                disabled={isDeleting}
              >
                <XCircle size={24} />
              </button>
              
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-20 h-20 bg-red-900/10 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                  <Trash2 size={36} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                  {showDeleteCommerceModal 
                    ? `¿Eliminar Cliente "${commerceToDelete?.name}"?`
                    : deleteMode === 'all' ? '¿Eliminar TODAS las reservas?' : '¿Eliminar reserva?'
                  }
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                  {showDeleteCommerceModal
                    ? 'Esta acción eliminará permanentemente el comercio, su usuario administrador y todos sus datos asociados (eventos, reservas, etc.). Esta acción NO se puede deshacer.'
                    : deleteMode === 'all' 
                        ? 'Esta acción borrará permanentemente todo el historial de reservas y restaurará el stock completo de todos los eventos. Esta acción es irreversible.'
                        : '¿Estás seguro de eliminar esta reserva? Esta acción devolverá los cupos al stock del evento.'
                  }
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => { setShowDeleteModal(false); setShowDeleteCommerceModal(false); }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3.5 rounded-xl border border-gray-700 text-gray-300 font-medium hover:bg-gray-800 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 shadow-lg shadow-red-900/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center"
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
                    showDeleteCommerceModal ? 'Sí, Eliminar' :
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
            <div className="bg-[#111] border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative transform transition-all scale-100 hover:shadow-green-900/10 hover:border-green-900/30">
              <button 
                onClick={() => setShowResetModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                disabled={isResetting}
              >
                <XCircle size={24} />
              </button>
              
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-20 h-20 bg-green-900/10 text-green-500 rounded-full flex items-center justify-center mb-6 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                  <RotateCcw size={36} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                  {resetMode === 'all' ? '¿Restablecer TODO el stock?' : '¿Restablecer Stock?'}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                  {resetMode === 'all'
                    ? 'Esta acción restablecerá el stock de TODOS tus eventos a su capacidad original (200). Esta acción es masiva y no se puede deshacer individualmente.'
                    : 'Esta acción actualizará el stock disponible de todas las entradas de este evento a su capacidad original (200). Las reservas existentes no se verán afectadas, pero el contador se reiniciará.'
                  }
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                  className="flex-1 px-4 py-3.5 rounded-xl border border-gray-700 text-gray-300 font-medium hover:bg-gray-800 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
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
                {/* Floating Bulk Actions Bar */}
                {selectedEvents.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#111] border border-gray-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4">
                        <span className="text-white font-medium mr-2">{selectedEvents.length} seleccionados</span>
                        
                        <div className="h-6 w-px bg-gray-700"></div>

                        <button 
                            onClick={() => handleBulkAction('activate')}
                            disabled={isBulkProcessing}
                            className="text-gray-300 hover:text-green-400 flex items-center gap-2 transition-colors"
                            title="Activar seleccionados"
                        >
                            <Eye size={18} />
                        </button>
                        <button 
                            onClick={() => handleBulkAction('pause')}
                            disabled={isBulkProcessing}
                            className="text-gray-300 hover:text-amber-400 flex items-center gap-2 transition-colors"
                            title="Pausar seleccionados"
                        >
                            <EyeOff size={18} />
                        </button>
                        <button 
                            onClick={() => handleBulkAction('delete')}
                            disabled={isBulkProcessing}
                            className="text-gray-300 hover:text-red-400 flex items-center gap-2 transition-colors"
                            title="Eliminar seleccionados"
                        >
                            <Trash2 size={18} />
                        </button>

                        <div className="h-6 w-px bg-gray-700"></div>

                        <button 
                            onClick={() => setSelectedEvents([])}
                            className="text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
            </div>
          </main>
        </div>
    );
  }
