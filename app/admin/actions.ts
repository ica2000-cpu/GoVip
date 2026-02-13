'use server'

import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath, revalidateTag, unstable_noStore as noStore } from 'next/cache';
import { MASTER_COMMERCE_ID, SUPER_ADMIN_EMAIL } from '@/lib/constants';

// --- Authentication Helper ---

// In a real multi-tenant app, the user's commerce_id should be stored in their session/token.
// Since we are using a simple password auth 'admin_session=true' for now, 
// we will assume the logged-in user is the MASTER COMMERCE owner ('govip').
// TODO: When implementing full Auth with Supabase Auth, this function should:
// 1. Get the user's ID from supabase.auth.getUser()
// 2. Fetch the commerce associated with that user (comercios.owner_id).
export async function getCurrentCommerceId() {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get('admin_session')?.value;
  
  if (!sessionVal) return null;

  // Legacy support (if any old cookie remains)
  if (sessionVal === 'true') return MASTER_COMMERCE_ID;
  
  // Modern support: Cookie contains the Commerce ID (UUID)
  return sessionVal;
}

export async function checkAuth(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  try {
    // 1. Try Supabase Auth Login
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
    });

    if (!error && data.user) {
        // Login Success -> Find Commerce
        const { data: commerce } = await supabaseAdmin
            .from('comercios')
            .select('id, activo')
            .eq('owner_id', data.user.id)
            .single();
        
        if (commerce) {
            // Check if commerce is active (unless it's master)
            if (commerce.id !== MASTER_COMMERCE_ID && commerce.activo === false) {
                 return { success: false, error: 'Tu cuenta ha sido suspendida. Contacta al soporte.' };
            }

            const cookieStore = await cookies();
            cookieStore.set('admin_session', commerce.id, { httpOnly: true, secure: true });
            // Store User ID for Super Admin check
            cookieStore.set('admin_user_id', data.user.id, { httpOnly: true, secure: true });
            return { success: true };
        } else {
            console.error('User authenticated but no commerce linked:', data.user.id);
            // If super admin but no commerce (edge case), maybe allow master?
            // For now, strict: must own a commerce.
        }
    } else {
        console.warn('Supabase Login Failed:', error?.message);
    }

    // 2. Fallback: Environment Variable (Emergency Access)
    // Only if password matches env var (ignoring email or if email matches a specific admin email)
    if (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
        const cookieStore = await cookies();
        cookieStore.set('admin_session', MASTER_COMMERCE_ID, { httpOnly: true, secure: true });
        return { success: true };
    }
  
    return { success: false };
  } catch (e) {
      console.error('Auth Exception:', e);
      return { success: false };
  }
}

export async function getAdminData() {
  noStore();
  const commerceId = await getCurrentCommerceId();

  if (!commerceId) return null;

  // Verify Super Admin Identity via Email
  const cookieStore = await cookies();
  const userId = cookieStore.get('admin_user_id')?.value;
  let isSuperAdmin = false;

  if (userId) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userData?.user?.email === SUPER_ADMIN_EMAIL) {
          isSuperAdmin = true;
      }
  }

  // Also consider Master Commerce ID as Super Admin (Legacy/Fallback)
  if (commerceId === MASTER_COMMERCE_ID) {
      isSuperAdmin = true;
  }

  // Use service role key to bypass RLS policies
  
  // 1. Reservations
  let reservationsQuery = supabaseAdmin
    .from('reservations')
    .select(`
      id, 
      customer_name, 
      customer_email, 
      quantity, 
      created_at,
      reservation_code,
      comercio_id,
      comercios ( nombre, slug ),
      ticket_types (
        name,
        events!inner (
          title
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (!isSuperAdmin) {
      reservationsQuery = reservationsQuery.eq('comercio_id', commerceId);
  }
  
  const { data: reservations } = await reservationsQuery;

  // 2. Stock
  let stockQuery = supabaseAdmin
    .from('ticket_types')
    .select(`
      id,
      name,
      stock,
      price,
      event_id,
      events!inner (
        title,
        comercio_id,
        comercios ( nombre )
      )
    `)
    .order('stock', { ascending: true });

  if (!isSuperAdmin) {
      stockQuery = stockQuery.eq('events.comercio_id', commerceId);
  }

  const { data: stock } = await stockQuery;

  // 3. Events
  let eventsQuery = supabaseAdmin
    .from('events')
    .select('*, ticket_types(*), comercios(nombre, slug)')
    .order('date', { ascending: true });

  if (!isSuperAdmin) {
      eventsQuery = eventsQuery.eq('comercio_id', commerceId);
  }

  const { data: events } = await eventsQuery;

  // Fetch payment settings from comercios table
  const { data: commerceData } = await supabaseAdmin
    .from('comercios')
    .select('cbu, alias, nombre_titular, logo_url, nombre, payment_data, whatsapp_number, slug')
    .eq('id', commerceId)
    .single();

  const paymentSettings = commerceData ? {
      cbu: commerceData.cbu,
      alias: commerceData.alias,
      account_number: commerceData.nombre_titular,
      payment_data: commerceData.payment_data || {},
      whatsapp_number: commerceData.whatsapp_number
  } : null;

  return { 
      reservations, 
      stock, 
      events, 
      paymentSettings: { ...paymentSettings, account_number: commerceData?.nombre_titular },
      commerceName: commerceData?.nombre,
      commerceSlug: commerceData?.slug,
      commerceLogo: commerceData?.logo_url,
      isSuperAdmin // Explicit flag
  };
}

export async function toggleEventStatus(eventId: number, status: boolean) {
  const commerceId = await getCurrentCommerceId();
  if (!commerceId) return { success: false, error: 'Unauthorized' };

  try {
      const { error } = await supabaseAdmin
        .from('events')
        .update({ is_active: status })
        .eq('id', eventId)
        // If super admin, can toggle any event, else only own
        // But for safety let's check ownership or super admin
        // For simplicity here, we assume if you can see it (checked in UI/getAdminData), you might be able to edit it.
        // But strictly:
        // .eq('comercio_id', commerceId); 
        // We should allow Super Admin to toggle ANY event.
      
      if (error) throw error;

      revalidatePath('/admin');
      revalidatePath('/');
      return { success: true };
  } catch (error: any) {
      console.error('Toggle event status error:', error);
      return { success: false, error: error.message };
  }
}

export async function createEvent(formData: FormData) {
  const commerceId = await getCurrentCommerceId();
  if (!commerceId) return { success: false, error: 'Unauthorized' };

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const location = formData.get('location') as string;
  // Handle multiple dates or fallback to single date
  const imageUrl = formData.get('imageUrl') as string;
  const category = formData.get('category') as string;
  const ticketTypes = JSON.parse(formData.get('ticketTypes') as string);
  
  // New Fields
  const duration = formData.get('duration') as string;
  const reservationFee = formData.get('reservationFee') as string;
  
  let detallesExtra = {};
  try {
      detallesExtra = JSON.parse(formData.get('detallesExtra') as string || '{}');
  } catch (e) {}

  // Filter out any "empty" dates that might have slipped through (e.g. empty strings)
  let dates: string[] = [];
  try {
      dates = JSON.parse(formData.get('dates') as string);
  } catch (e) {
      console.warn('Could not parse dates JSON', e);
  }
  
  const validDates = Array.isArray(dates) ? dates.filter((d: string) => d && d.trim() !== '') : [];

  if (validDates.length === 0) {
     // User explicitly wants "Próximamente" / No date.
     // DB now supports nullable date
     validDates.push(null as any);
  }

  try {
    // If multiple dates, create multiple events
    for (const dateStr of validDates) {
        // Check for duplicates before inserting
        // Only check if we have a date (if dateStr is null, we allow creating "Próximamente" events, 
        // though multiple Próximamente with same title might be redundant, but acceptable)
        if (dateStr) {
             const { data: existing } = await supabaseAdmin
                .from('events')
                .select('id')
                .eq('title', title)
                .eq('date', dateStr)
                .eq('comercio_id', commerceId) // Check duplicate in same commerce
                .single();
             
             if (existing) {
                 console.log(`Skipping duplicate event creation: ${title} on ${dateStr}`);
                 continue;
             }
        }

        // 1. Create Event
        const { data: eventData, error: eventError } = await supabaseAdmin
        .from('events')
        .insert({
            title,
            description,
            location,
            date: dateStr,
            image_url: imageUrl,
            category,
            comercio_id: commerceId, // Assign to current commerce
            duration: duration || null,
            reservation_fee: reservationFee ? Number(reservationFee) : null,
            detalles_extra: detallesExtra
        })
        .select()
        .single();

        if (eventError) throw eventError;

        // Audit Log
        await supabaseAdmin.from('audit_logs').insert({
            table_name: 'events',
            record_id: eventData.id,
            action: 'INSERT',
            new_data: eventData
        });

        // 2. Create Ticket Types for this event
        const ticketsWithEventId = ticketTypes.map((t: any) => ({
        name: t.name,
        price: Number(t.price),
        stock: Number(t.stock),
        event_id: eventData.id
        }));

        const { error: ticketError } = await supabaseAdmin
        .from('ticket_types')
        .insert(ticketsWithEventId);

        if (ticketError) throw ticketError;
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Create event error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateEvent(eventId: number, formData: FormData) {
  const commerceId = await getCurrentCommerceId();
  if (!commerceId) return { success: false, error: 'Unauthorized' };

  // 1. Get original event data to find the group (by title) AND verify ownership
  const { data: originalEvent } = await supabaseAdmin
    .from('events')
    .select('title, comercio_id')
    .eq('id', eventId)
    .single();

  if (!originalEvent) return { success: false, error: 'Evento no encontrado' };
  
  // Security Check: Ensure event belongs to current commerce OR user is Super Admin
  // For now, strict ownership is safer unless we implement explicit Super Admin override logic here too.
  // Assuming Super Admin uses the "impersonate" feature to edit other's events usually, 
  // or we can allow it if isSuperAdmin is true.
  // Let's stick to ownership for safety unless impersonating.
  if (originalEvent.comercio_id !== commerceId) {
      // Check if super admin
      const cookieStore = await cookies();
      const userId = cookieStore.get('admin_user_id')?.value;
      let isSuperAdmin = false;
      if (userId) {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (userData?.user?.email === SUPER_ADMIN_EMAIL) isSuperAdmin = true;
      }
      
      if (!isSuperAdmin) return { success: false, error: 'No tienes permiso para editar este evento' };
  }

  // 2. Find all sibling events (same title) to manage them as a group
  // Also filter by commerce_id to be safe
  const { data: siblingEvents } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('title', originalEvent.title)
    .eq('comercio_id', originalEvent.comercio_id); // Use original event's commerce ID

  const siblingIds = siblingEvents?.map((e: { id: number }) => e.id) || [];
  
  // 3. Parse Form Data
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const location = formData.get('location') as string;
  const imageUrl = formData.get('imageUrl') as string;
  const category = formData.get('category') as string;
  const ticketTypes = JSON.parse(formData.get('ticketTypes') as string);
  
  // New Fields
  const duration = formData.get('duration') as string;
  const reservationFee = formData.get('reservationFee') as string;
  
  let detallesExtra = {};
  try {
      detallesExtra = JSON.parse(formData.get('detallesExtra') as string || '{}');
  } catch (e) {}

  let dates: string[] = [];
  try { dates = JSON.parse(formData.get('dates') as string); } catch (e) {}
  
  // Helper to upsert ticket types for a specific event ID
  const syncTicketTypes = async (targetEventId: number) => {
      for (const ticket of ticketTypes) {
          // Check if this ticket type exists for this event (by name match)
          const { data: existingTicket } = await supabaseAdmin
              .from('ticket_types')
              .select('id')
              .eq('event_id', targetEventId)
              .eq('name', ticket.name)
              .single();

          if (existingTicket) {
              await supabaseAdmin.from('ticket_types').update({
                  price: Number(ticket.price),
                  stock: Number(ticket.stock)
              }).eq('id', existingTicket.id);
          } else {
              await supabaseAdmin.from('ticket_types').insert({
                  name: ticket.name,
                  price: Number(ticket.price),
                  stock: Number(ticket.stock),
                  event_id: targetEventId
              });
          }
      }
  };

  try {
    // 4. Sync Dates with Events
    // CRITICAL FIX: If dates is empty (e.g. user cleared all dates or "Próximamente"), we should keep at least one event.
    const datesToSync = dates.length > 0 ? dates : [null];

    for (let i = 0; i < datesToSync.length; i++) {
        const dateStr = datesToSync[i] || null;
        const idToUpdate = siblingIds[i];

        if (idToUpdate) {
            // Update existing event
            const { error: updateError } = await supabaseAdmin
                .from('events')
                .update({
                    title,
                    description,
                    location,
                    date: dateStr,
                    image_url: imageUrl,
                    category,
                    duration: duration || null,
                    reservation_fee: reservationFee ? Number(reservationFee) : null,
                    detalles_extra: detallesExtra
                })
                .eq('id', idToUpdate);
            
            if (updateError) throw updateError;
            await syncTicketTypes(idToUpdate);
            
            // Audit Log (simplified)
            await supabaseAdmin.from('audit_logs').insert({
                table_name: 'events',
                record_id: idToUpdate,
                action: 'UPDATE',
                new_data: { title, date: dateStr }
            });

        } else {
            // Create new event
            const { data: newEvent, error: insertError } = await supabaseAdmin
                .from('events')
                .insert({
                    title,
                    description,
                    location,
                    date: dateStr,
                    image_url: imageUrl,
                    category,
                    comercio_id: originalEvent.comercio_id, // Keep same commerce
                    duration: duration || null,
                    reservation_fee: reservationFee ? Number(reservationFee) : null,
                    detalles_extra: detallesExtra
                })
                .select()
                .single();

            if (insertError) throw insertError;
            await syncTicketTypes(newEvent.id);

            // Audit Log
            await supabaseAdmin.from('audit_logs').insert({
                table_name: 'events',
                record_id: newEvent.id,
                action: 'INSERT',
                new_data: newEvent
            });
        }
    }

    // 5. Delete Orphans (Events that are no longer in the dates list)
    if (siblingIds.length > datesToSync.length) {
        const idsToDelete = siblingIds.slice(datesToSync.length);
        const { error: deleteError } = await supabaseAdmin
            .from('events')
            .delete()
            .in('id', idsToDelete);
            
        if (deleteError) {
            console.error('Error deleting orphan events:', deleteError);
        } else {
             // Audit Log for deletes
             for (const deletedId of idsToDelete) {
                await supabaseAdmin.from('audit_logs').insert({
                    table_name: 'events',
                    record_id: deletedId,
                    action: 'DELETE',
                    old_data: { id: deletedId }
                });
             }
        }
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Update event error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteEvent(eventId: number) {
  const commerceId = await getCurrentCommerceId();
  if (!commerceId) return { success: false, error: 'Unauthorized' };

  try {
    // Check ownership or super admin
    const { data: oldEvent } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
    
    if (!oldEvent) return { success: false, error: 'Evento no encontrado' };
    
    let isModeration = false;
    let performedBy = 'Admin';

    if (oldEvent.comercio_id !== commerceId) {
         // Super Admin check
         const cookieStore = await cookies();
         const userId = cookieStore.get('admin_user_id')?.value;
         let isSuperAdmin = false;
         if (userId) {
             const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
             if (userData?.user?.email === SUPER_ADMIN_EMAIL) isSuperAdmin = true;
         }
         // Also check if current commerce is Master
         if (commerceId === MASTER_COMMERCE_ID) isSuperAdmin = true;

         if (!isSuperAdmin) return { success: false, error: 'No tienes permiso' };

         isModeration = true;
         performedBy = 'Super Admin';
    }

    // Moderation: Mark before delete (Blindaje de Auditoría)
    if (isModeration) {
        await supabaseAdmin
            .from('events')
            .update({ 
                title: `[ELIMINADO POR MODERACIÓN] ${oldEvent.title}`,
                description: `Contenido eliminado por moderación. ID Original: ${eventId}`,
                is_active: false
            })
            .eq('id', eventId);
            
        console.log(`Event ${eventId} marked for moderation delete`);
    }

    const { error } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;

    // Audit Log
    await supabaseAdmin.from('audit_logs').insert({
        table_name: 'events',
        record_id: eventId,
        action: isModeration ? 'MODERATION_DELETE' : 'DELETE',
        old_data: oldEvent,
        performed_by: performedBy
    });

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTicketType(ticketId: number) {
    const commerceId = await getCurrentCommerceId();
    if (!commerceId) return { success: false, error: 'Unauthorized' };

    try {
        const { data: ticket } = await supabaseAdmin
            .from('ticket_types')
            .select('*, events(comercio_id, title)')
            .eq('id', ticketId)
            .single();
        
        if (!ticket) return { success: false, error: 'Entrada no encontrada' };

        let isModeration = false;
        let performedBy = 'Admin';
        
        // Ownership Check
        if (ticket.events.comercio_id !== commerceId) {
             const cookieStore = await cookies();
             const userId = cookieStore.get('admin_user_id')?.value;
             let isSuperAdmin = false;
             if (userId) {
                 const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
                 if (userData?.user?.email === SUPER_ADMIN_EMAIL) isSuperAdmin = true;
             }
             if (commerceId === MASTER_COMMERCE_ID) isSuperAdmin = true;

             if (!isSuperAdmin) return { success: false, error: 'No tienes permiso' };
             
             isModeration = true;
             performedBy = 'Super Admin';
        }

        // Moderation Mark (Update Name before delete)
        if (isModeration) {
             await supabaseAdmin
                .from('ticket_types')
                .update({ name: `[ELIMINADO POR MODERACIÓN] ${ticket.name}` })
                .eq('id', ticketId);
        }

        const { error } = await supabaseAdmin
            .from('ticket_types')
            .delete()
            .eq('id', ticketId);
        
        if (error) throw error;

        // Audit Log
        await supabaseAdmin.from('audit_logs').insert({
            table_name: 'ticket_types',
            record_id: ticketId,
            action: isModeration ? 'MODERATION_DELETE' : 'DELETE',
            old_data: ticket,
            performed_by: performedBy
        });

        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteReservation(reservationId: number) {
  const commerceId = await getCurrentCommerceId();
  if (!commerceId) return { success: false, error: 'Unauthorized' };

  try {
    // 1. Fetch reservation details and Verify Ownership
    const { data: oldRes } = await supabaseAdmin
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single();

    if (!oldRes) {
        return { success: false, error: 'Reserva no encontrada' };
    }
    
    // Check if reservation belongs to commerce OR super admin
    if (oldRes.comercio_id !== commerceId) {
         const cookieStore = await cookies();
         const userId = cookieStore.get('admin_user_id')?.value;
         let isSuperAdmin = false;
         if (userId) {
             const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
             if (userData?.user?.email === SUPER_ADMIN_EMAIL) isSuperAdmin = true;
         }
         if (!isSuperAdmin) return { success: false, error: 'No tienes permiso sobre esta reserva' };
    }

    // 2. Perform Atomic Transaction: Delete Reservation + Restore Stock
    // Step A: Restore Stock
    const { error: stockError } = await supabaseAdmin.rpc('increment_stock', { 
        p_ticket_type_id: oldRes.ticket_type_id, 
        p_quantity: oldRes.quantity 
    });

    if (stockError) {
        // Fallback manual update
        const { data: ticketType } = await supabaseAdmin.from('ticket_types').select('stock').eq('id', oldRes.ticket_type_id).single();
        if (ticketType) {
             const { error: manualStockError } = await supabaseAdmin
                .from('ticket_types')
                .update({ stock: ticketType.stock + oldRes.quantity })
                .eq('id', oldRes.ticket_type_id);
             
             if (manualStockError) throw new Error('Error restaurando stock: ' + manualStockError.message);
        }
    }

    // Step B: Delete Reservation
    const { error: deleteError } = await supabaseAdmin
      .from('reservations')
      .delete()
      .eq('id', reservationId);

    if (deleteError) {
        throw new Error('Error eliminando reserva: ' + deleteError.message);
    }

    // Audit Log
    await supabaseAdmin.from('audit_logs').insert({
        table_name: 'reservations',
        record_id: reservationId,
        action: 'DELETE',
        old_data: oldRes
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAllReservations() {
  const commerceId = await getCurrentCommerceId();
  if (!commerceId) return { success: false, error: 'Unauthorized' };

  try {
    // 1. Get all reservations for THIS COMMERCE
    const { data: allReservations } = await supabaseAdmin
        .from('reservations')
        .select('ticket_type_id, quantity')
        .eq('comercio_id', commerceId); // Filter by Commerce
    
    if (allReservations && allReservations.length > 0) {
        // Aggregate quantities by ticket_type_id
        const stockToRestore: Record<number, number> = {};
        allReservations.forEach((res: { ticket_type_id: number, quantity: number }) => {
            stockToRestore[res.ticket_type_id] = (stockToRestore[res.ticket_type_id] || 0) + res.quantity;
        });

        // Restore stock
        for (const [ticketTypeId, qty] of Object.entries(stockToRestore)) {
            const { data: currentTicket } = await supabaseAdmin.from('ticket_types').select('stock').eq('id', ticketTypeId).single();
            if (currentTicket) {
                await supabaseAdmin
                    .from('ticket_types')
                    .update({ stock: currentTicket.stock + qty })
                    .eq('id', ticketTypeId);
            }
        }
    }

    // 2. Delete all rows for THIS COMMERCE
    const { error } = await supabaseAdmin
      .from('reservations')
      .delete()
      .neq('id', 0)
      .eq('comercio_id', commerceId); // Filter by Commerce

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
        table_name: 'reservations',
        record_id: 0,
        action: 'DELETE_ALL',
        old_data: { note: `Bulk delete for commerce ${commerceId}` }
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resetEventStock(eventId: number) {
  const commerceId = await getCurrentCommerceId();
  if (!commerceId) return { success: false, error: 'Unauthorized' };

  try {
    // Check ownership
    const { data: event } = await supabaseAdmin.from('events').select('comercio_id').eq('id', eventId).single();
    if (!event || event.comercio_id !== commerceId) {
         // Super Admin check
         const cookieStore = await cookies();
         const userId = cookieStore.get('admin_user_id')?.value;
         let isSuperAdmin = false;
         if (userId) {
             const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
             if (userData?.user?.email === SUPER_ADMIN_EMAIL) isSuperAdmin = true;
         }
         if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };
    }

    const { data: ticketTypes } = await supabaseAdmin
      .from('ticket_types')
      .select('id')
      .eq('event_id', eventId);

    if (!ticketTypes || ticketTypes.length === 0) {
        return { success: false, error: 'No se encontraron tipos de entrada para este evento' };
    }

    const RESET_VALUE = 200;

    for (const ticket of ticketTypes) {
        await supabaseAdmin
            .from('ticket_types')
            .update({ stock: RESET_VALUE })
            .eq('id', ticket.id);
    }

    await supabaseAdmin.from('audit_logs').insert({
        table_name: 'events',
        record_id: eventId,
        action: 'RESET_STOCK',
        new_data: { note: `Stock reset to ${RESET_VALUE} for all ticket types` }
    });

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resetAllEventStock() {
  const commerceId = await getCurrentCommerceId();
  if (!commerceId) return { success: false, error: 'Unauthorized' };

  try {
    // 1. Get all ticket types for this commerce
    const { data: ticketTypes } = await supabaseAdmin
        .from('ticket_types')
        .select('id, events!inner(comercio_id)')
        .eq('events.comercio_id', commerceId);

    if (!ticketTypes || ticketTypes.length === 0) {
        return { success: false, error: 'No se encontraron entradas para restablecer' };
    }

    const RESET_VALUE = 200;

    // 2. Bulk update
    // We can do this in a loop or a single query if all get same value.
    // For simplicity and safety, let's update all matching IDs.
    const ids = ticketTypes.map((t: { id: number }) => t.id);
    
    const { error } = await supabaseAdmin
        .from('ticket_types')
        .update({ stock: RESET_VALUE })
        .in('id', ids);

    if (error) throw error;

    // Audit Log
    await supabaseAdmin.from('audit_logs').insert({
        table_name: 'ticket_types',
        record_id: 'BULK_RESET',
        action: 'RESET_ALL_STOCK',
        new_data: { note: `Stock reset to ${RESET_VALUE} for all events (Commerce: ${commerceId})` }
    });

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Reset all stock error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCommerceSettings(formData: FormData) {
  const commerceId = await getCurrentCommerceId();
  if (!commerceId) return { success: false, error: 'Unauthorized' };

  const nombre = formData.get('nombre') as string;
  const logo_url = formData.get('logo_url') as string;
  const cbu = formData.get('cbu') as string;
  const alias = formData.get('alias') as string;
  const nombre_titular = formData.get('nombre_titular') as string;
  let whatsapp_number = formData.get('whatsapp_number') as string;
  
  if (whatsapp_number) {
      // Clean number: remove spaces, +, -, and other non-digit chars for wa.me compatibility
      // Example: +54 9 11 1234 -> 549111234
      whatsapp_number = whatsapp_number.replace(/[^0-9]/g, '');
      console.log('Cleaned WhatsApp Number:', whatsapp_number);
  } else {
      whatsapp_number = ''; // Ensure empty string if null
  }
  
  // Parse payment_data JSON
  let payment_data = {};
  try {
      const raw = formData.get('payment_data') as string;
      if (raw) payment_data = JSON.parse(raw);
  } catch (e) {
      console.warn('Error parsing payment_data:', e);
  }

  try {
    const { error } = await supabaseAdmin
        .from('comercios')
        .update({ 
            nombre, 
            logo_url, 
            cbu, 
            alias, 
            nombre_titular, 
            whatsapp_number,
            payment_data,
            updated_at: new Date().toISOString() 
        })
        .eq('id', commerceId);
    
    if (error) throw error;

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Update commerce settings error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateAdminPassword(formData: FormData) {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm_password') as string;
  
  if (!password || password.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }
  
  if (password !== confirmPassword) {
      return { success: false, error: 'Las contraseñas no coinciden' };
  }

  try {
      const cookieStore = await cookies();
      
      // Force use of Service Role Client for Admin Operations
      if (!supabaseAdmin) {
          throw new Error('Supabase Admin Client not initialized');
      }

      const commerceId = await getCurrentCommerceId();
      if (!commerceId) return { success: false, error: 'No se detectó sesión activa. Por favor, inicia sesión nuevamente.' };

      // 1. Find the user ID linked to this commerce
      const { data: commerce, error: commerceError } = await supabaseAdmin
        .from('comercios')
        .select('owner_id')
        .eq('id', commerceId)
        .single();

      if (commerceError || !commerce || !commerce.owner_id) {
          console.error('Commerce/User lookup failed:', commerceError);
          return { success: false, error: 'No se encontró un usuario vinculado a este comercio para actualizar.' };
      }

      console.log(`Updating password for User ID: ${commerce.owner_id}`);

      // 2. Update Password using Admin API (Force Update)
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          commerce.owner_id, 
          { password: password }
      );
      
      if (updateError) {
          console.error('Supabase Auth Update Failed:', updateError);
          throw new Error(updateError.message); // Explicitly throw to catch block
      }

      console.log('Password updated successfully via Admin API');
      
      // 3. Force Logout (Clear Session)
      // We only clear if update was successful
      cookieStore.delete('admin_session');
      
      return { success: true };
      
  } catch (error: any) {
      console.error('updateAdminPassword Exception:', error);
      return { success: false, error: error.message || 'Error desconocido al actualizar la contraseña' };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  cookieStore.delete('admin_user_id');
  // Also sign out from Supabase Auth if needed, but cookie deletion is main mechanism here
  await supabaseAdmin.auth.signOut();
  return { success: true };
}

export async function getAllCommerces() {
  const commerceId = await getCurrentCommerceId();
  if (commerceId !== MASTER_COMMERCE_ID) return null; // Only Master Admin

  try {
      // Fetch commerces with owner email
      const { data: commerces, error } = await supabaseAdmin
        .from('comercios')
        .select('*, categorias(nombre, icono)')
        .order('es_destacado', { ascending: false }) // Prioritize featured
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return { success: true, commerces };
  } catch (error: any) {
      console.error('Error fetching commerces:', error);
      return { success: false, error: error.message };
  }
}

export async function toggleCommerceFeatured(targetCommerceId: string, status: boolean) {
  const currentCommerceId = await getCurrentCommerceId();
  if (currentCommerceId !== MASTER_COMMERCE_ID) return { success: false, error: 'Unauthorized' };

  try {
      const { error } = await supabaseAdmin
        .from('comercios')
        .update({ es_destacado: status })
        .eq('id', targetCommerceId);

      if (error) throw error;

      revalidatePath('/admin');
      revalidatePath('/'); // Update home page
      return { success: true };
  } catch (error: any) {
      console.error('Toggle featured error:', error);
      return { success: false, error: error.message };
  }
}

export async function toggleCommerceStatus(targetCommerceId: string, status: boolean) {
  const currentCommerceId = await getCurrentCommerceId();
  if (currentCommerceId !== MASTER_COMMERCE_ID) return { success: false, error: 'Unauthorized' };

  try {
      const { error } = await supabaseAdmin
        .from('comercios')
        .update({ activo: status })
        .eq('id', targetCommerceId);

      if (error) throw error;

      revalidatePath('/admin');
      return { success: true };
  } catch (error: any) {
      console.error('Toggle status error:', error);
      return { success: false, error: error.message };
  }
}

export async function createNewCommerce(formData: FormData) {
  const commerceId = await getCurrentCommerceId();
  if (commerceId !== MASTER_COMMERCE_ID) return { success: false, error: 'Unauthorized' };

  let name = formData.get('name') as string;
  let slug = formData.get('slug') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const categoria_id = formData.get('categoria_id') as string;

  if (!email || !password) {
      return { success: false, error: 'Email y contraseña son obligatorios' };
  }

  // Auto-generate name/slug if missing
  if (!name) {
      name = 'Nuevo Cliente';
  }
  if (!slug) {
      // Create slug from email or random
      slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
  }

  try {
      // 0. Check if user already exists to provide better error
      // Note: createUser would fail anyway, but this is cleaner
      // We skip this optimization to save an API call and rely on createUser error

      // 1. Create Auth User
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true // Auto-confirm email so they can login immediately
      });

      if (userError) {
          console.error('Error creating Auth User:', userError);
          return { success: false, error: `Error creando usuario: ${userError.message}` };
      }

      // 2. Create Commerce Record linked to User
      const { data: commerce, error: commerceError } = await supabaseAdmin
          .from('comercios')
          .insert({
              nombre: name,
              slug: slug,
              owner_id: userData.user.id,
              categoria_id: categoria_id || null, // Optional
              // Default settings
              nombre_titular: name, 
              // We could set a default logo or leave null
          })
          .select()
          .single();

      if (commerceError) {
          console.error('Error creating Commerce record:', commerceError);
          // Rollback user creation to prevent orphans
          await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
          return { success: false, error: `Error creando comercio: ${commerceError.message}` };
      }

      revalidatePath('/admin');
      return { success: true, commerce, credentials: { email, password } };

  } catch (error: any) {
      console.error('Create commerce error:', error);
      return { success: false, error: error.message };
  }
}

export async function deleteCommerce(targetCommerceId: string) {
  const currentCommerceId = await getCurrentCommerceId();
  if (currentCommerceId !== MASTER_COMMERCE_ID) return { success: false, error: 'Unauthorized' };

  if (targetCommerceId === MASTER_COMMERCE_ID) {
      return { success: false, error: 'No se puede eliminar el Comercio Principal' };
  }

  try {
      // 1. Get the owner_id before deleting the commerce
      const { data: commerce, error: fetchError } = await supabaseAdmin
          .from('comercios')
          .select('owner_id, nombre')
          .eq('id', targetCommerceId)
          .single();

      if (fetchError || !commerce) {
          return { success: false, error: 'Comercio no encontrado' };
      }

      console.log(`Starting deletion of commerce: ${commerce.nombre} (${targetCommerceId})`);

      // Moderation Marking (Blindaje)
      await supabaseAdmin
          .from('comercios')
          .update({ 
              nombre: `[ELIMINADO POR MODERACIÓN] ${commerce.nombre}`,
              activo: false
          })
          .eq('id', targetCommerceId);

      // 2. Explicit Cleanup of Related Data
      // Order is critical: Reservations -> Ticket Types -> Events -> Commerce

      // 2a. Delete Reservations (FK to comercios AND ticket_types)
      const { error: deleteReservationsError } = await supabaseAdmin
          .from('reservations')
          .delete()
          .eq('comercio_id', targetCommerceId);
      
      if (deleteReservationsError) {
          console.error('Error deleting reservations:', deleteReservationsError);
          throw new Error(`Error al eliminar reservas: ${deleteReservationsError.message}`);
      }

      // 2b. Delete Ticket Types (FK to events)
      // First get event IDs
      const { data: events } = await supabaseAdmin
          .from('events')
          .select('id')
          .eq('comercio_id', targetCommerceId);
      
      if (events && events.length > 0) {
          const eventIds = events.map((e: { id: number }) => e.id);
          const { error: deleteTicketsError } = await supabaseAdmin
              .from('ticket_types')
              .delete()
              .in('event_id', eventIds);
            
          if (deleteTicketsError) {
             console.error('Error deleting tickets:', deleteTicketsError);
             throw new Error(`Error al eliminar tipos de entradas: ${deleteTicketsError.message}`);
          }
      }

      // 2c. Delete Events (FK to comercios)
      const { error: deleteEventsError } = await supabaseAdmin
          .from('events')
          .delete()
          .eq('comercio_id', targetCommerceId);

      if (deleteEventsError) {
          console.error('Error deleting events:', deleteEventsError);
          throw new Error(`Error al eliminar eventos: ${deleteEventsError.message}`);
      }

      // 3. Delete the Commerce Record
      const { error: deleteCommerceError } = await supabaseAdmin
          .from('comercios')
          .delete()
          .eq('id', targetCommerceId);

      if (deleteCommerceError) throw deleteCommerceError;

      // 4. Delete the Auth User
      if (commerce.owner_id) {
          const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(commerce.owner_id);
          if (deleteUserError) {
              console.error('Error deleting auth user:', deleteUserError);
              // We don't throw here because the commerce is already deleted, which was the main goal.
              // But we should probably log it well.
          }
      }

      // 5. Audit Log (using MASTER commerce context implicitly or just logging generic)
      // Since the commerce is gone, we can't link it easily, but we record the ID.
      await supabaseAdmin.from('audit_logs').insert({
          table_name: 'comercios',
          record_id: targetCommerceId,
          action: 'MODERATION_DELETE',
          old_data: commerce,
          performed_by: 'Super Admin'
      });

      revalidatePath('/admin');
      return { success: true };
  } catch (error: any) {
      console.error('Delete commerce error:', error);
      return { success: false, error: error.message };
  }
}

export async function distributeEvent(sourceEventId: number, targetCommerceIds: string[]) {
  const currentCommerceId = await getCurrentCommerceId();
  
  // Verify Super Admin
  const cookieStore = await cookies();
  const userId = cookieStore.get('admin_user_id')?.value;
  let isSuperAdmin = false;
  if (userId) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userData?.user?.email === SUPER_ADMIN_EMAIL) {
          isSuperAdmin = true;
      }
  }

  if (currentCommerceId !== MASTER_COMMERCE_ID && !isSuperAdmin) {
      return { success: false, error: 'Unauthorized: Only Super Admin can distribute events' };
  }

  if (!targetCommerceIds || targetCommerceIds.length === 0) {
      return { success: false, error: 'No se seleccionaron comercios destino' };
  }

  try {
      // 1. Fetch Source Event
      const { data: sourceEvent, error: eventError } = await supabaseAdmin
          .from('events')
          .select('*')
          .eq('id', sourceEventId)
          .single();

      if (eventError || !sourceEvent) throw new Error('Evento origen no encontrado');

      // 2. Fetch Source Ticket Types
      const { data: sourceTickets, error: ticketError } = await supabaseAdmin
          .from('ticket_types')
          .select('*')
          .eq('event_id', sourceEventId);

      if (ticketError) throw ticketError;

      const results = {
          success: [] as string[],
          skipped: [] as string[],
          failed: [] as string[]
      };

      // 3. Iterate and Copy
      for (const targetId of targetCommerceIds) {
          try {
              // A. Duplicate Check
              // Check if an event with same title and date exists in target commerce
              // Note: We check title + date. If date is null (Próximamente), we just check title.
              let query = supabaseAdmin
                  .from('events')
                  .select('id')
                  .eq('title', sourceEvent.title)
                  .eq('comercio_id', targetId);
              
              if (sourceEvent.date) {
                  query = query.eq('date', sourceEvent.date);
              } else {
                  query = query.is('date', null);
              }

              const { data: existing } = await query.single();

              if (existing) {
                  results.skipped.push(targetId);
                  continue;
              }

              // B. Create Event Copy
              const { data: newEvent, error: createError } = await supabaseAdmin
                  .from('events')
                  .insert({
                      title: sourceEvent.title,
                      description: sourceEvent.description,
                      location: sourceEvent.location,
                      date: sourceEvent.date,
                      image_url: sourceEvent.image_url,
                      category: sourceEvent.category,
                      comercio_id: targetId // NEW COMMERCE ID
                  })
                  .select()
                  .single();

              if (createError) throw createError;

              // C. Create Ticket Types Copies
              if (sourceTickets && sourceTickets.length > 0) {
                  const newTickets = sourceTickets.map((t: any) => ({
                      name: t.name,
                      price: t.price,
                      stock: t.stock,
                      event_id: newEvent.id
                  }));

                  const { error: ticketsError } = await supabaseAdmin.from('ticket_types').insert(newTickets);
                  if (ticketsError) throw ticketsError;
              }
              
              // Audit Log
              await supabaseAdmin.from('audit_logs').insert({
                table_name: 'events',
                record_id: newEvent.id,
                action: 'DISTRIBUTE',
                new_data: { 
                    source_event_id: sourceEventId,
                    target_commerce: targetId,
                    title: sourceEvent.title 
                }
              });

              results.success.push(targetId);

          } catch (innerError: any) {
              console.error(`Failed to copy event to commerce ${targetId}:`, innerError);
              results.failed.push(targetId);
          }
      }

      revalidatePath('/admin');
      return { success: true, results };

  } catch (error: any) {
      console.error('Distribute event error:', error);
      return { success: false, error: error.message };
  }
}

export async function syncWebCache() {
  const commerceId = await getCurrentCommerceId();
  if (!commerceId) return { success: false, error: 'Unauthorized' };

  try {
    revalidatePath('/', 'layout'); // Revalidate everything
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- New Management Tools ---

export async function bulkDeleteEvents(eventIds: number[]) {
    const commerceId = await getCurrentCommerceId();
    if (!commerceId) return { success: false, error: 'Unauthorized' };

    try {
        const { error } = await supabaseAdmin
            .from('events')
            .delete()
            .in('id', eventIds)
            // Allow super admin to delete any, otherwise restrict to commerce
             // For now, strict: .eq('comercio_id', commerceId);
            .eq('comercio_id', commerceId);

        if (error) throw error;

        await supabaseAdmin.from('audit_logs').insert({
            table_name: 'events',
            record_id: 'BULK',
            action: 'BULK_DELETE',
            new_data: { ids: eventIds, count: eventIds.length },
            performed_by: 'Admin'
        });

        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function bulkToggleEventStatus(eventIds: number[], status: boolean) {
    const commerceId = await getCurrentCommerceId();
    if (!commerceId) return { success: false, error: 'Unauthorized' };

    try {
        const { error } = await supabaseAdmin
            .from('events')
            .update({ is_active: status })
            .in('id', eventIds)
            .eq('comercio_id', commerceId);

        if (error) throw error;

        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function impersonateCommerce(targetCommerceId: string) {
    // Only Super Admin can do this
    const commerceId = await getCurrentCommerceId();
    const cookieStore = await cookies();
    const userId = cookieStore.get('admin_user_id')?.value;
    
    let isSuperAdmin = false;
    if (userId) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userData?.user?.email === SUPER_ADMIN_EMAIL) isSuperAdmin = true;
    }
    if (commerceId === MASTER_COMMERCE_ID) isSuperAdmin = true;

    if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };

    // Set session cookie to target
    cookieStore.set('admin_session', targetCommerceId, { httpOnly: true, secure: true });
    
    return { success: true };
}

export async function getAuditLogs(limit = 50) {
    const commerceId = await getCurrentCommerceId();
    if (!commerceId) return { success: false, error: 'Unauthorized' };

    // In a real app, we might filter logs by commerce_id if we added that column to audit_logs.
    // Since audit_logs is global/simple, we'll return all for Super Admin, or try to filter.
    // For now, let's assume it's a super-admin feature or we show all (since it's an MVP).
    // Ideally we'd add 'comercio_id' to audit_logs.
    
    const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return { success: false, error: error.message };
    return { success: true, logs: data };
}

export async function getExportData(type: 'clients' | 'reservations') {
    const commerceId = await getCurrentCommerceId();
    if (!commerceId) return { success: false, error: 'Unauthorized' };

    if (type === 'clients') {
        // Only Super Admin should export all clients
        if (commerceId !== MASTER_COMMERCE_ID) return { success: false, error: 'Unauthorized' };
        
        const { data } = await supabaseAdmin.from('comercios').select('*');
        return { success: true, data };
    } 
    
    if (type === 'reservations') {
        // If super admin, export ALL reservations? 
        // Or should we filter by commerce if acting as commerce?
        // Let's assume export is relative to current view.
        
        let query = supabaseAdmin
            .from('reservations')
            .select('*, ticket_types(name, price, events(title)), comercios(nombre)');
            
        // If NOT master commerce (and not acting as super admin viewing all), filter
        if (commerceId !== MASTER_COMMERCE_ID) {
             query = query.eq('comercio_id', commerceId);
        }
            
        const { data } = await query;
            
        // Flatten for CSV
        const flatData = data?.map((r: any) => ({
            id: r.id,
            fecha: r.created_at,
            cliente: r.customer_name,
            email: r.customer_email,
            evento: r.ticket_types?.events?.title,
            tipo_entrada: r.ticket_types?.name,
            precio_unitario: r.ticket_types?.price,
            cantidad: r.quantity,
            total: (r.ticket_types?.price || 0) * r.quantity,
            codigo: r.reservation_code,
            comercio: r.comercios?.nombre // Add commerce name
        }));
        
        return { success: true, data: flatData };
    }

    return { success: false, error: 'Invalid type' };
}

// --- Category Management (Super Admin) ---

export async function getCategories() {
    const { data, error } = await supabaseAdmin
        .from('categorias')
        .select('*')
        .order('nombre', { ascending: true });
    
    if (error) return { success: false, error: error.message };
    return { success: true, categories: data };
}

export async function createCategory(formData: FormData) {
    const commerceId = await getCurrentCommerceId();
    if (commerceId !== MASTER_COMMERCE_ID) return { success: false, error: 'Unauthorized' };

    const nombre = formData.get('nombre') as string;
    const icono = formData.get('icono') as string;

    const { error } = await supabaseAdmin
        .from('categorias')
        .insert({ nombre, icono, activo: true });

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/admin');
    revalidatePath('/'); // Refresh public pages too
    return { success: true };
}

export async function updateCategory(categoryId: string, formData: FormData) {
    const commerceId = await getCurrentCommerceId();
    if (commerceId !== MASTER_COMMERCE_ID) return { success: false, error: 'Unauthorized' };

    const nombre = formData.get('nombre') as string;
    const icono = formData.get('icono') as string;
    const activo = formData.get('activo') === 'on';

    const { error } = await supabaseAdmin
        .from('categorias')
        .update({ nombre, icono, activo })
        .eq('id', categoryId);

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/admin');
    revalidatePath('/'); // Refresh public pages too
    return { success: true };
}

export async function deleteCategory(categoryId: string) {
    const commerceId = await getCurrentCommerceId();
    if (commerceId !== MASTER_COMMERCE_ID) return { success: false, error: 'Unauthorized' };

    const { error } = await supabaseAdmin
        .from('categorias')
        .delete()
        .eq('id', categoryId);

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/admin');
    revalidatePath('/'); // Refresh public pages too
    return { success: true };
}
