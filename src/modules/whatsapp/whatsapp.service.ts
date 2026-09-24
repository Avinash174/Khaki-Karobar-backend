import { ENV } from '../../config/env';

export interface WhatsAppSendOptions {
  toPhone: string;
  templateName?: string;
  messageText?: string;
  pdfUrl?: string;
}

export class WhatsAppService {
  /**
   * Dispatches WhatsApp message via Meta Cloud API or queued fallback
   */
  static async sendMessage(options: WhatsAppSendOptions): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
    const formattedPhone = options.toPhone.replace(/\D/g, '');
    const recipient = formattedPhone.startsWith('91') ? formattedPhone : `91${formattedPhone}`;

    if (!ENV.WHATSAPP_ACCESS_TOKEN || !ENV.WHATSAPP_PHONE_NUMBER_ID) {
      console.log(`[WHATSAPP-DISPATCH] (Simulation Mode - No Credentials Configured)`);
      console.log(`To: +${recipient}`);
      console.log(`Message: ${options.messageText || `Template: ${options.templateName}`}`);
      return {
        success: true,
        messageId: `sim_wamid_${Date.now()}`,
        simulated: true,
      };
    }

    try {
      const url = `${ENV.WHATSAPP_API_URL}/${ENV.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: options.messageText },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ENV.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
        console.error('WhatsApp API Error:', data);
        return { success: false };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
        simulated: false,
      };
    } catch (err) {
      console.error('WhatsApp dispatch network error:', err);
      return { success: false };
    }
  }

  static generateInvoiceShareText(businessName: string, customerName: string, invoiceNumber: string, amount: number, balance: number): string {
    return (
      `Dear ${customerName},\n\n` +
      `Greetings from *${businessName}*!\n\n` +
      `Your invoice *#${invoiceNumber}* for *₹${amount.toLocaleString('en-IN')}* has been generated.\n` +
      (balance > 0 ? `Outstanding balance: *₹${balance.toLocaleString('en-IN')}*.\n\n` : `Status: *PAID (Thank you!)*\n\n`) +
      `Thank you for doing business with us.`
    );
  }

  static generatePaymentReminderText(businessName: string, customerName: string, balance: number): string {
    return (
      `Dear ${customerName},\n\n` +
      `This is a gentle payment reminder from *${businessName}*.\n\n` +
      `Your current pending balance is *₹${balance.toLocaleString('en-IN')}*.\n` +
      `Kindly arrange the payment at your earliest convenience.\n\n` +
      `Thank you!`
    );
  }
}
