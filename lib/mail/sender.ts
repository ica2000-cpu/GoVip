import { Resend } from 'resend';

// Inicializar cliente solo si existe la API Key, para evitar errores en build time
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!resend) {
    console.warn('⚠️ RESEND_API_KEY no configurada. Email simulado:', { to, subject });
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: 'GoVip <onboarding@resend.dev>', // Usar dominio de prueba por defecto
      to,
      subject,
      html,
    });

    if (data.error) {
        console.error('Error enviando email:', data.error);
        return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Excepción enviando email:', error);
    return { success: false, error };
  }
}
