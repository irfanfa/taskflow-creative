import { Resend } from 'resend';

let resendInstance: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_placeholder' || apiKey.trim() === '') {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailPayload): Promise<{
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}> {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'KMB Team Creative <onboarding@resend.dev>';

  if (!resend) {
    // Mode simulasi jika API key belum diisi di .env.local
    console.log(
      `[SIMULASI EMAIL VIA RESEND] To: ${Array.isArray(to) ? to.join(', ') : to} | Subject: "${subject}"`
    );
    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}`,
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[Resend Error]', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal mengirim email';
    console.error('[Resend Exception]', errorMsg);
    return { success: false, error: errorMsg };
  }
}
