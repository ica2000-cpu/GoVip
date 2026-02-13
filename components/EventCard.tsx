'use client'

import { useState } from 'react';
import { Event } from '@/types';
import { MapPin, Calendar } from 'lucide-react';
import Image from 'next/image';

interface EventCardProps {
  event: Event;
  relatedEvents?: Event[]; // Array of all events in the group (different dates)
  onReserveClick: (event: Event, relatedEvents?: Event[]) => void;
}

export default function EventCard({ event, relatedEvents, onReserveClick }: EventCardProps) {
  const [imgSrc, setImgSrc] = useState(event.image_url);

  return (
    <div className="bg-[#111111] rounded-xl shadow-lg overflow-hidden border border-gray-800 flex flex-col hover:border-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300 h-full group">
      <div className="relative w-full aspect-[3/4] bg-gray-900 overflow-hidden">
        <Image 
          src={imgSrc} 
          alt={event.title} 
          fill
          className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setImgSrc('https://images.unsplash.com/photo-1459749411177-287ce3288b71?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')} // Fallback image
        />
        {relatedEvents && (
            <div className="absolute top-2 right-2 bg-black text-white text-xs font-bold px-3 py-1.5 rounded border border-gray-700 z-10">
                {relatedEvents.length} Fechas
            </div>
        )}
      </div>
      <div className="p-6 flex-1 flex flex-col bg-[#111111]">
        <div className="flex justify-between items-start mb-3">
          <span className="bg-blue-900 text-blue-200 text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wide">{event.category}</span>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-white tracking-tight">{event.title}</h2>
        <p className="text-gray-400 mb-6 line-clamp-2 text-sm font-medium">{event.description}</p>
        
        {relatedEvents && (
            <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                    {relatedEvents.map(evt => (
                        <span
                            key={evt.id}
                            className="bg-gray-800 text-gray-300 text-xs font-bold px-2.5 py-1 rounded border border-gray-700"
                        >
                            {new Date(evt.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </span>
                    ))}
                </div>
            </div>
        )}

        <div className="flex items-center text-sm text-gray-400 mb-6 font-medium">
          <MapPin size={16} className="mr-2 text-blue-500" />
          {event.location}
        </div>
        <div className="border-t border-gray-800 pt-4 mb-6 flex-1">
          <h3 className="font-bold mb-3 text-white text-sm uppercase tracking-wide">Entradas desde:</h3>
          <ul className="space-y-2">
            {event.ticket_types.map((ticket) => (
              <li key={ticket.id} className="flex justify-between text-sm text-gray-400">
                <span className="font-medium">{ticket.name}</span>
                <span className="font-bold text-white">
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(ticket.price)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <button 
          onClick={() => onReserveClick(event, relatedEvents)}
          className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-lg hover:bg-blue-500 hover:shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all mt-auto uppercase tracking-wide"
        >
          Reservar Entradas
        </button>
      </div>
    </div>
  );
}
