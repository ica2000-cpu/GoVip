'use client'

import { useState, useEffect } from 'react';
import { Event } from '@/types';
import ReservationModal from './ReservationModal';
import EventCard from './EventCard';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EventList({ 
  events: initialEvents, 
  paymentSettings 
}: { 
  events: Event[], 
  paymentSettings: { cbu: string; alias: string; account_number: string; payment_data?: any; whatsapp_number?: string; commerce_logo?: string; commerce_name?: string } | null 
}) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedEventDates, setSelectedEventDates] = useState<Event[] | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    // Real-time subscription to events table
    const channel = supabase
      .channel('events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        (payload: any) => {
          console.log('Realtime change received!', payload);
          router.refresh(); // Soft refresh to fetch latest data from server
        }
      )
      .subscribe();

    // Also subscribe to ticket_types changes (e.g. price updates, stock)
    const ticketsChannel = supabase
      .channel('ticket_types_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_types',
        },
        (payload: any) => {
            console.log('Ticket update received!', payload);
            router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(ticketsChannel);
    };
  }, [router]);

  // Group events by title
  const groupedEvents = events.reduce((acc, event) => {
    const title = event.title;
    if (!acc[title]) {
      acc[title] = [];
    }
    acc[title].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  const handleEventClick = (event: Event, relatedEvents?: Event[]) => {
    setSelectedEvent(event);
    setSelectedEventDates(relatedEvents);
    setIsModalOpen(true);
  };

  if (!events || !Array.isArray(events) || events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No hay eventos programados en este momento.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
        {Object.values(groupedEvents).map((group, index) => {
          // Sort group by date
          const sortedGroup = group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const mainEvent = sortedGroup[0];
          
          return (
            <EventCard 
              key={mainEvent.id} 
              event={mainEvent}
              relatedEvents={sortedGroup.length > 1 ? sortedGroup : undefined}
              onReserveClick={handleEventClick}
              priority={index < 4}
            />
          );
        })}
      </div>

      <ReservationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={selectedEvent}
        relatedEvents={selectedEventDates}
        paymentSettings={paymentSettings}
      />
    </>
  );
}
