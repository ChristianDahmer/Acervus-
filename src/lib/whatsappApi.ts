import { EmpresaConfig } from '../types';
import { sanitizarTelefone } from '../utils/whatsappTemplates';

export interface WhatsAppSendResult {
  success: boolean;
  method: 'API_AUTOMATIC' | 'DEEP_LINK_FALLBACK';
  message: string;
  details?: string;
}

/**
 * Sends a message via Meta WhatsApp Business Cloud API automatically if token/endpoint configured,
 * or gracefully triggers WhatsApp Web 1-click fallback deep-link.
 */
export async function sendWhatsAppMessageAuto(
  phone: string,
  messageText: string,
  empresaConfig?: EmpresaConfig
): Promise<WhatsAppSendResult> {
  const sanitizedPhone = sanitizarTelefone(phone);
  const token = empresaConfig?.whatsappApiToken;
  const endpoint = empresaConfig?.whatsappApiEndpoint;
  const phoneNumberId = empresaConfig?.whatsappPhoneNumberId;

  // Attempt silent automatic background API dispatch if token and endpoint/phoneId configured
  if (token && (endpoint || phoneNumberId)) {
    try {
      const apiUrl = endpoint || `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: sanitizedPhone,
          type: 'text',
          text: { body: messageText },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          method: 'API_AUTOMATIC',
          message: 'Mensagem enviada automaticamente via API do WhatsApp!',
          details: `ID do disparo: ${data.messages?.[0]?.id || 'sucesso'}`,
        };
      } else {
        const errData = await response.json().catch(() => ({}));
        console.warn('[WhatsApp API Auto] Falha na requisição da API WhatsApp:', errData);
      }
    } catch (err: any) {
      console.warn('[WhatsApp API Auto] Erro de rede/CORS ao tentar API automática:', err);
    }
  }

  // Fallback: Direct 1-Click WhatsApp window launcher
  const encodedText = encodeURIComponent(messageText);
  const deepLinkUrl = `https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedText}`;
  window.open(deepLinkUrl, '_blank');

  return {
    success: true,
    method: 'DEEP_LINK_FALLBACK',
    message: 'Janela do WhatsApp aberta com a mensagem da proposta preenchida.',
    details: 'Para envio 100% automático em segundo plano sem interação do usuário, informe o Token de API do WhatsApp em Configurações.',
  };
}
