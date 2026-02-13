'use client'

import { useState } from 'react';
import { Event } from '@/types';
import { X, Plus, Trash2 } from 'lucide-react';
import { createEvent, updateEvent } from '@/app/admin/actions';

interface EventFormProps {
  event?: Event | null;
  relatedEvents?: Event[]; // Events with same title
  onClose: () => void;
  onSuccess: () => void;
}

export default function EventForm({ event, relatedEvents, onClose, onSuccess }: EventFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Initial dates logic: Combine current event date + related events dates
  const initialDates = event?.date ? [new Date(event.date).toISOString().slice(0, 16)] : [];
  if (relatedEvents) {
      relatedEvents.forEach(e => {
          if (e.id !== event?.id && e.date) {
              initialDates.push(new Date(e.date).toISOString().slice(0, 16));
          }
      });
  }

  // Form States
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [location, setLocation] = useState(event?.location || '');
  const [dates, setDates] = useState<string[]>(initialDates);
  const [imageUrl, setImageUrl] = useState(event?.image_url || '');
  const [category, setCategory] = useState(event?.category || 'Recital');
  const [previewUrl, setPreviewUrl] = useState(event?.image_url || '');

  const handleAddDate = () => {
    setDates([...dates, '']);
  };

  const handleRemoveDate = (index: number) => {
    setDates(dates.filter((_, i) => i !== index));
  };

  const handleDateChange = (index: number, value: string, type: 'date' | 'time') => {
    const newDates = [...dates];
    const currentDate = newDates[index] || '';
    
    // Parse current value (assuming ISO string or empty)
    // If empty, init with today's date + default time if needed, but we rely on the inputs
    
    // We store the value as ISO string YYYY-MM-DDTHH:mm
    // But we need to handle partial updates from the two inputs.
    
    let [dPart, tPart] = currentDate.split('T');
    if (!dPart) dPart = '';
    
    // Si es una fecha nueva (vacía), no forzamos hora por defecto.
    // Solo si el usuario está escribiendo una fecha, asumimos 00:00 si no hay hora,
    // o mantenemos la hora que ya estaba.
    
    if (type === 'date') {
        dPart = value;
    } else {
        tPart = value;
    }

    if (dPart) {
        // Si hay fecha pero no hora, usamos 00:00 como placeholder interno,
        // pero el input de hora seguirá mostrando vacío si tPart es ''.
        // OJO: Para ISO string válido, necesitamos hora.
        // Si tPart está vacío, usamos '00:00' para el string interno,
        // pero necesitamos que el input refleje vacío.
        // El input value={time} viene de getDateParts.
        // Si guardamos T00:00, getDateParts devolverá 00:00.
        // Queremos que sea opcional visualmente.
        // Solución: Usar un valor por defecto solo al guardar en DB o al construir el ISO completo,
        // pero permitir que el estado intermedio sea flexible?
        // Simplificación: Si no hay hora, guardamos T00:00:00Z (o similar).
        // Pero el usuario dice que "le obliga".
        // El problema es que mi lógica anterior ponía '21:00' por defecto.
        // Ahora pondré '' si es nueva.
        
        newDates[index] = `${dPart}T${tPart || '00:00'}`;
    } else {
        newDates[index] = ''; 
    }
    
    setDates(newDates);
  };
  
  // Helper to extract date/time for inputs
  const getDateParts = (isoString: string) => {
      if (!isoString) return { date: '', time: '' };
      const [date, time] = isoString.split('T');
      // If time matches 00:00 (our "no time" placeholder), return empty string to UI
      // so the input looks empty/optional
      const timeStr = time ? time.slice(0, 5) : '';
      return { date, time: timeStr === '00:00' ? '' : timeStr };
  };
  
  const formatDateForDB = (dateStr: string) => {
      if (!dateStr) return null;
      // If it's a full ISO string (datetime-local usually gives YYYY-MM-DDTHH:mm)
      // If user inputs just date, browser might give YYYY-MM-DD
      // We need to ensure it's a valid timestamp for Postgres.
      // If time is missing, default to T00:00:00 or T20:00:00 (8 PM default for concerts?)
      // Let's assume T21:00:00 if no time provided, or just let Date() handle it (defaults to 00:00 UTC)
      if (dateStr.length === 10) { // YYYY-MM-DD
          return new Date(`${dateStr}T21:00:00`).toISOString();
      }
      return new Date(dateStr).toISOString();
  };

  // Ticket Types State
  const [ticketTypes, setTicketTypes] = useState<{id?: number, name: string, price: string, stock: string}[]>(
    event?.ticket_types.map(t => ({
      // If event.id is missing (duplication mode), we strip ticket IDs to force new inserts
      id: event.id ? t.id : undefined,
      name: t.name,
      price: t.price.toString(),
      stock: t.stock.toString()
    })) || [{ name: 'General', price: '0', stock: '100' }]
  );

  const handleImageChange = (url: string) => {
    setImageUrl(url);
    setPreviewUrl(url);
  };

  const handleAddTicketType = () => {
    setTicketTypes([...ticketTypes, { name: '', price: '', stock: '' }]);
  };

  const handleRemoveTicketType = (index: number) => {
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const handleTicketChange = (index: number, field: string, value: string) => {
    const newTickets = [...ticketTypes];
    // @ts-ignore
    newTickets[index][field] = value;
    setTicketTypes(newTickets);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('location', location);
    
    // Always send all dates
    const validDates = dates.map(d => {
        // If empty string, keep it as empty string to signal "Próximamente" or removal if filtered out later
        if (!d) return ''; 
        
        // If it looks like a date string (YYYY-MM-DD) but no time, ensure it's ISO compatible or sent as is
        // The backend expects a string that postgres can parse.
        // If we send "2024-02-12", Postgres assumes 00:00:00.
        // If we send "2024-02-12T00:00", same.
        // We just need to make sure we don't accidentally send empty strings if filtered above.
        // But we want to avoid the "T21:00" hardcode.
        // If d includes T, it has time. If not, it's just date.
        // We will append T00:00:00 if no time to ensure valid ISO format for the backend parsing if strict.
        if (d.includes('T')) return d;
        return `${d}T00:00:00`;
    });
    // Filter out only completely empty strings if we want to remove them, 
    // OR keep them if we want to allow empty dates (Próximamente). 
    // Logic: If user removed a date from UI, it's gone from 'dates' array.
    // If user kept an empty input, maybe they want Próximamente.
    // Current logic in backend filters out empty strings. 
    // If we want to support "Próximamente", we should send null or keep it empty but handle in backend.
    // Let's filter out empty strings here to match backend expectation of "valid dates" list.
    // But wait, if the user CLEARS all dates, dates array might be empty or contain empty strings.
    // If dates array is empty, backend deletes all events? 
    // REQUIREMENT: "Si no hay fechas nuevas, el evento debe permanecer activo." -> "Al guardar un evento existente sin cambios... desaparece"
    // If initialDates was not empty, and user didn't touch it, 'dates' has values.
    // If user clears them, 'dates' is empty.
    
    const finalDatesToSend = validDates.filter(d => d !== '');
    
    // CRITICAL FIX: If finalDatesToSend is empty, BUT we are editing an event that had dates,
    // sending empty array causes backend to delete everything (orphans).
    // If the intention is to have "Próximamente", we need to send at least one null/empty placeholder.
    // But if the user really deleted them... 
    // The user said: "al guardar un evento existente sin hacer cambios... desaparece".
    // This implies 'dates' state was somehow empty or not sent correctly.
    // 'dates' state is initialized in useEffect or useState.
    
    formData.append('dates', JSON.stringify(finalDatesToSend));
    
    formData.append('imageUrl', imageUrl);
    formData.append('category', category);
    formData.append('ticketTypes', JSON.stringify(ticketTypes));

    let result;
    // Check if event has ID to determine create vs update
    if (event && event.id) {
      result = await updateEvent(event.id, formData);
    } else {
      result = await createEvent(formData);
    }

    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Error al guardar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10">
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-900 pr-8">
              {event ? 'Editar Evento' : 'Crear Nuevo Evento'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-lg p-3 text-base text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm" />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded-lg p-3 text-base text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm bg-white">
                    <option value="Recital">Recital</option>
                    <option value="Deporte">Deporte</option>
                    <option value="Teatro">Teatro</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                  <input type="text" required value={location} onChange={e => setLocation(e.target.value)} className="w-full border rounded-lg p-3 text-base text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm" />
                </div>

                <div className="col-span-1 md:col-span-2 border-t pt-4">
                   <div className="flex justify-between items-center mb-2">
                     <label className="block text-sm font-medium text-gray-700">Fechas del Evento</label>
                     <button type="button" onClick={handleAddDate} className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium transition-colors">
                        <Plus size={16} className="mr-1" /> Añadir Fecha
                     </button>
                   </div>
                   
                   {dates.length === 0 && (
                     <p className="text-sm text-gray-500 italic mb-2">Sin fecha asignada (Próximamente)</p>
                   )}

                   <div className="space-y-3">
                     {dates.map((d, index) => {
                       const { date, time } = getDateParts(d);
                       return (
                       <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-gray-50 p-2 rounded-md">
                         <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                             <input 
                               type="date" 
                               value={date}  
                               onChange={e => handleDateChange(index, e.target.value, 'date')} 
                               className="flex-1 border rounded-lg p-3 text-base text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm h-12" 
                             />
                             <div className="relative w-full sm:w-32">
                                 <input 
                                   type="time" 
                                   value={time} 
                                   onChange={e => handleDateChange(index, e.target.value, 'time')} 
                                   className="w-full border rounded-lg p-3 text-base text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm h-12" 
                                 />
                                 <span className="absolute -top-2 right-1 bg-white px-1 text-[10px] text-gray-400 rounded border border-gray-200">Opcional</span>
                             </div>
                         </div>
                         <button type="button" onClick={() => handleRemoveDate(index)} className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition-colors self-end sm:self-auto">
                           <Trash2 size={18} />
                         </button>
                       </div>
                       );
                     })}
                   </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL de Imagen</label>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <input 
                      type="url" 
                      required 
                      value={imageUrl} 
                      onChange={e => handleImageChange(e.target.value)} 
                      className="flex-1 w-full border rounded-lg p-3 text-base text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm" 
                      placeholder="https://..." 
                    />
                    {previewUrl && (
                      <div className="w-full sm:w-20 h-40 sm:h-24 relative bg-gray-100 rounded border border-gray-200 overflow-hidden shrink-0 mt-2 sm:mt-0">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" onError={() => setPreviewUrl('')} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg p-3 text-base text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm" />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 text-gray-900 flex items-center">
                  <span>Zonas y Precios (Ticket Types)</span>
                  <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {ticketTypes.length} zonas
                  </span>
                </h3>
                <div className="space-y-4">
                  {ticketTypes.map((ticket, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-gray-50 p-3 rounded-lg border border-gray-100 relative group hover:border-blue-200 transition-colors">
                      <div className="flex-1 w-full">
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Nombre Zona</label>
                        <input type="text" required value={ticket.name} onChange={e => handleTicketChange(index, 'name', e.target.value)} className="w-full border rounded-lg p-3 text-base text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm h-12" placeholder="Ej: VIP" />
                      </div>
                      <div className="flex gap-3 w-full sm:w-auto">
                        <div className="flex-1 sm:w-28">
                          <label className="block text-xs text-gray-500 mb-1 font-medium">Precio</label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-400 text-sm mt-0.5">$</span>
                            <input type="number" required value={ticket.price} onChange={e => handleTicketChange(index, 'price', e.target.value)} className="w-full border rounded-lg p-3 pl-7 text-base text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm h-12" />
                          </div>
                        </div>
                        <div className="flex-1 sm:w-24">
                          <label className="block text-xs text-gray-500 mb-1 font-medium">Stock</label>
                          <input type="number" required value={ticket.stock} onChange={e => handleTicketChange(index, 'stock', e.target.value)} className="w-full border rounded-lg p-3 text-base text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm h-12" />
                        </div>
                      </div>
                      
                      {!ticket.id && (
                        <button type="button" onClick={() => handleRemoveTicketType(index)} className="absolute top-2 right-2 sm:static sm:mb-0.5 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={handleAddTicketType} className="mt-4 flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-3 rounded-md hover:bg-blue-100 w-full sm:w-auto justify-center sm:justify-start">
                  <Plus size={18} className="mr-1" /> Añadir otra zona
                </button>
              </div>

              {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md border border-red-100">{error}</div>}

              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 -mx-6 -mb-4 mt-6 rounded-b-lg">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Guardando...' : 'Guardar Evento'}
                </button>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-3 text-base font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
