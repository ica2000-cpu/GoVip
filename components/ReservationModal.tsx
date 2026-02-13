'use client'

import { useState, useEffect } from 'react';
import { Event } from '@/types';
import { X, Check, Copy, AlertTriangle } from 'lucide-react';
import { createReservation } from '@/app/actions/public';
import PaymentInstructions from './PaymentInstructions';
import TicketPDF from './TicketPDF';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  relatedEvents?: Event[];
  paymentSettings: {
    cbu: string;
    alias: string;
    account_number: string;
    payment_data?: any;
    whatsapp_number?: string;
    commerce_logo?: string;
    commerce_name?: string;
  } | null;
}

export default function ReservationModal({ isOpen, onClose, event, relatedEvents, paymentSettings }: ReservationModalProps) {
  const [selectedEventId, setSelectedEventId] = useState<number>(event?.id || 0);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successReservationId, setSuccessReservationId] = useState<number | null>(null);
  const [successReservationCode, setSuccessReservationCode] = useState<string | null>(null);
  const [successPaymentReference, setSuccessPaymentReference] = useState<string | null>(null);
  
  // Removed internal state for paymentSettings since it is now a prop

  // Removed useEffect for fetching paymentSettings

  // Update selectedEventId when modal opens with a new event
  if (event && selectedEventId === 0) {
      setSelectedEventId(event.id);
  }

  // Derive current event based on selection
  const currentEvent = relatedEvents 
    ? relatedEvents.find(e => e.id === selectedEventId) || event 
    : event;

  if (!isOpen || !currentEvent) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!selectedTicketTypeId) {
      setError('Por favor selecciona un tipo de entrada');
      setLoading(false);
      return;
    }

    try {
      const result = await createReservation({
        ticketTypeId: Number(selectedTicketTypeId),
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        quantity: Number(quantity),
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al realizar la reserva');
      }

      setSuccessReservationId(result.reservationId);
      setSuccessPaymentReference(result.paymentReference);
      setSuccessReservationCode(result.reservationCode);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setSuccessReservationId(null);
    setSuccessPaymentReference(null);
    setSuccessReservationCode(null);
    setName('');
    setEmail('');
    setPhone('');
    setQuantity(1);
    setSelectedTicketTypeId('');
    setError('');
    setSelectedEventId(0); // Reset selection
    onClose();
  };

  const selectedTicketType = currentEvent.ticket_types.find(t => t.id === Number(selectedTicketTypeId));

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 transition-all">
      <div className="bg-[#0a0a0a] rounded-xl shadow-lg shadow-black max-w-[500px] w-full p-8 relative border border-gray-800">
        <button 
          onClick={handleClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {successReservationId ? (
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">¡Reserva Confirmada!</h2>
            <p className="text-gray-300 mb-8 flex items-center justify-center gap-3">
              Tu número de reserva es: 
              <span className="font-mono font-bold text-xl text-blue-400 tracking-wider">{successReservationCode}</span>
            </p>

            {paymentSettings && successPaymentReference && successReservationCode && (
               <>
                   <PaymentInstructions 
                      paymentSettings={paymentSettings}
                      reservationCode={successReservationCode}
                      paymentReference={successPaymentReference}
                      totalAmount={selectedTicketType ? selectedTicketType.price * quantity : 0}
                      eventName={currentEvent.title}
                   />
                   
                   <div className="mt-8 border-t border-gray-800 pt-8">
                       <h3 className="text-xl font-bold text-white mb-4 text-center">Tu Ticket</h3>
                       <TicketPDF 
                           eventName={currentEvent.title}
                           customerName={name}
                           reservationCode={successReservationCode}
                           quantity={quantity}
                           ticketType={selectedTicketType?.name || 'General'}
                           date={currentEvent.date}
                           location={currentEvent.location}
                           totalAmount={selectedTicketType ? selectedTicketType.price * quantity : 0}
                           commerceName={paymentSettings.commerce_name}
                           commerceLogo={paymentSettings.commerce_logo}
                        />
                   </div>
               </>
            )}

            <button
              onClick={handleClose}
              className="bg-gray-800 text-gray-300 px-8 py-4 rounded-xl hover:bg-gray-700 hover:text-white transition-all w-full font-bold tracking-wide text-lg mt-8 border border-gray-700"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-1 text-white tracking-tight">{currentEvent.title}</h2>
            <p className="text-gray-400 text-sm mb-8 font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                {currentEvent.location}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Date Selector */}
              {relatedEvents && relatedEvents.length > 1 && (
                <div className="relative group">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Fecha</label>
                    <select
                        value={selectedEventId}
                        onChange={(e) => {
                            setSelectedEventId(Number(e.target.value));
                            setSelectedTicketTypeId(''); // Reset ticket type when date changes
                        }}
                        className="w-full bg-[#111] border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all appearance-none font-medium"
                    >
                        {relatedEvents.map(evt => (
                            <option key={evt.id} value={evt.id} className="bg-black text-white">
                                {new Date(evt.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </option>
                        ))}
                    </select>
                </div>
              )}
              {!relatedEvents && (
                  <p className="text-sm text-gray-300 mb-2 border-b border-gray-800 pb-2">
                      <strong className="text-gray-500 uppercase text-xs tracking-wider mr-2 font-bold">Fecha:</strong> 
                      {new Date(currentEvent.date).toLocaleDateString()}
                  </p>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Tipo de Entrada</label>
                <select
                  value={selectedTicketTypeId}
                  onChange={(e) => setSelectedTicketTypeId(Number(e.target.value))}
                  className="w-full bg-[#111] border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all appearance-none font-medium"
                  required
                >
                  <option value="" className="bg-black text-gray-500">Selecciona una opción</option>
                  {currentEvent.ticket_types.map((ticket) => (
                    <option key={ticket.id} value={ticket.id} disabled={ticket.stock === 0} className="bg-black text-white">
                      {ticket.name} - {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(ticket.price)} ({ticket.stock} disponibles)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Nombre Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#111] border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder-gray-600 font-medium"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#111] border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder-gray-600 font-medium"
                  placeholder="juan@ejemplo.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">WhatsApp</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#111] border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder-gray-600 font-medium"
                  required
                  placeholder="+54 9 11..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  max={selectedTicketType ? Math.min(6, selectedTicketType.stock) : 6}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-[#111] border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all font-medium"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 font-medium">Máximo 6 entradas por persona</p>
              </div>

              {error && (
                <div className="bg-red-900/20 text-red-400 text-sm p-4 rounded-lg border border-red-900/50 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedTicketTypeId}
                className={`w-full py-4 px-6 rounded-lg text-white font-bold tracking-wide transition-all mt-4 uppercase ${
                  loading || !selectedTicketTypeId
                    ? 'bg-gray-800 cursor-not-allowed text-gray-500'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-lg'
                }`}
              >
                {loading ? 'Procesando...' : 'Confirmar Reserva'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
