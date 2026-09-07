import {
  MercadoPagoConfig,
  Preference,
  Payment,
  WebhookSignatureValidator
} from 'mercadopago';

function client() {
  if (!process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN.includes('COLE_')) {
    throw new Error('MP_ACCESS_TOKEN ainda não configurado no arquivo .env');
  }
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
}

export async function createCheckoutPreference({ order, baseUrl }) {
  const preference = new Preference(client());
  return preference.create({
    body: {
      items: order.items.map(item => ({
        id: item.productId,
        title: item.name,
        description: item.description?.slice(0, 250),
        quantity: item.quantity,
        currency_id: 'BRL',
        unit_price: Number(item.unitPrice)
      })),
      payer: {
        name: order.customer.name,
        email: order.customer.email
      },
      external_reference: order.externalReference,
      back_urls: {
        success: `${baseUrl}/checkout/retorno?order=${order.id}&status=success`,
        pending: `${baseUrl}/checkout/retorno?order=${order.id}&status=pending`,
        failure: `${baseUrl}/checkout/retorno?order=${order.id}&status=failure`
      },
      auto_return: 'approved',
      notification_url: `${baseUrl}/api/mercadopago/webhook`,
      statement_descriptor: 'NOROESTE RP',
      metadata: { order_id: order.id }
    }
  });
}

export async function getPayment(paymentId) {
  const payment = new Payment(client());
  return payment.get({ id: paymentId });
}

export function validateWebhook(req, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret || secret.includes('COLE_')) return false;
  return WebhookSignatureValidator.validate({
    xSignature: req.headers['x-signature'],
    xRequestId: req.headers['x-request-id'],
    dataId,
    secret
  });
}
