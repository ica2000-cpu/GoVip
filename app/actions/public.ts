'use server'

import { supabaseAdmin } from '@/lib/supabase';
import { unstable_noStore as noStore } from 'next/cache';
import { MASTER_COMMERCE_ID } from '@/lib/constants';
import { sendEmail } from '@/lib/mail/sender';

// This function is exposed to the client but runs on the server.
// It uses the admin client (Service Role) to fetch settings, bypassing RLS if needed,
// but since we want to show this to the public, it's safe to return specific fields.
// In a real scenario, we might want to restrict this further or rely on public table access.
// However, moving it here hides the query logic and table name from the client bundle.
export async function getPaymentSettings(commerceId?: string) {
  noStore(); // Ensure dynamic fetching
  
  try {
    let query = supabaseAdmin
      .from('comercios')
      .select('cbu, alias, nombre_titular'); // Select only what's needed

    if (commerceId) {
        query = query.eq('id', commerceId);
    } else {
        // Fallback or explicit check for Master? 
        // Ideally we should always provide commerceId. 
        // If not provided, we could fallback to MASTER_COMMERCE_ID, 
        // but it's better to be explicit.
        query = query.eq('id', MASTER_COMMERCE_ID);
    }
      
    const { data, error } = await query.single();

    if (error) {
        console.error('Error fetching payment settings:', error);
        return null;
    }
    
    // Map to expected format if necessary, or just return data
    // The frontend likely expects { cbu, alias, account_number } based on previous code usage
    return {
        cbu: data.cbu,
        alias: data.alias,
        account_number: data.nombre_titular
    };
  } catch (error) {
    console.error('Unexpected error fetching payment settings:', error);
    return null;
  }
}

export async function createReservation(formData: {
  ticketTypeId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
}) {
  try {
    const { ticketTypeId, customerName, customerEmail, customerPhone, quantity } = formData;

    // Validate input
    if (!ticketTypeId || !customerName || !customerEmail || !customerPhone || !quantity) {
      return { success: false, error: 'Faltan campos requeridos' };
    }

    // Call Supabase RPC for atomic transaction via Admin client (Secure)
    const { data, error } = await supabaseAdmin.rpc('book_ticket', {
      p_ticket_type_id: ticketTypeId,
      p_quantity: quantity,
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_customer_phone: customerPhone,
    });

    if (error) {
      console.error('Reservation error:', error);
      return { success: false, error: error.message };
    }

    // Handle application-level errors returned by the function
    if (data && data.success === false) {
       return { success: false, error: data.error };
    }

    // --- Send Email Notification ---
    try {
      // Need to fetch event details for the email since we only have ticketTypeId
      const { data: ticketInfo } = await supabaseAdmin
        .from('ticket_types')
        .select('name, events(title, date)')
        .eq('id', ticketTypeId)
        .single();

      const eventTitle = ticketInfo?.events?.title || 'Evento Desconocido';
      const eventDate = ticketInfo?.events?.date 
        ? new Date(ticketInfo.events.date).toLocaleDateString('es-AR') 
        : 'Fecha pendiente';
      const zoneName = ticketInfo?.name || 'General';

      const emailHtml = `
        <h1>¡Nueva Reserva Confirmada!</h1>
        <p>Se ha registrado una nueva compra en el sistema.</p>
        <ul>
          <li><strong>Cliente:</strong> ${customerName} (${customerEmail})</li>
          <li><strong>Teléfono:</strong> ${customerPhone}</li>
          <li><strong>Evento:</strong> ${eventTitle}</li>
          <li><strong>Fecha:</strong> ${eventDate}</li>
          <li><strong>Zona:</strong> ${zoneName}</li>
          <li><strong>Cantidad:</strong> ${quantity} entradas</li>
          <li><strong>Código Reserva:</strong> ${data.reservation_code}</li>
          <li><strong>Referencia Pago:</strong> ${data.payment_reference}</li>
        </ul>
      `;

      await sendEmail({
        to: 'arielsanti121212@gmail.com',
        subject: `Nueva Reserva: ${eventTitle} - ${customerName}`,
        html: emailHtml
      });
      
    } catch (emailError) {
      // Non-blocking error logging
      console.error('⚠️ Error enviando notificación de email:', emailError);
    }
    // -------------------------------

    return { 
      success: true, 
      reservationId: data.reservation_id,
      paymentReference: data.payment_reference,
      reservationCode: data.reservation_code
    };

  } catch (err: any) {
    console.error('Unexpected error:', err);
    return { success: false, error: err.message || 'Error desconocido del servidor' };
  }
}
