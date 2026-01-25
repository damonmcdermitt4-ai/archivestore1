import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';

// Shared fulfillment logic used by both webhook and /api/checkout/complete
export async function fulfillCheckout(sessionId: string): Promise<{ success: boolean; transaction?: any; error?: string }> {
  // Check idempotency first
  const existingTransaction = await storage.getTransactionByStripeSession(sessionId);
  if (existingTransaction) {
    return { success: true, transaction: existingTransaction };
  }
  
  // Fetch verified session from Stripe API (not from payload)
  const stripe = await getUncachableStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  
  if (session.payment_status !== 'paid') {
    return { success: false, error: 'Payment not completed' };
  }
  
  const productId = session.metadata?.productId;
  const buyerId = session.metadata?.buyerId || 'guest';
  
  if (!productId) {
    return { success: false, error: 'Missing productId in session' };
  }
  
  const product = await storage.getProduct(Number(productId));
  if (!product) {
    return { success: false, error: 'Product not found' };
  }
  
  if (product.sold) {
    return { success: false, error: 'Product already sold' };
  }
  
  // Verify amount matches expected price + fee
  const expectedAmount = product.price + 100;
  if (session.amount_total !== expectedAmount) {
    return { success: false, error: `Amount mismatch: expected ${expectedAmount}, got ${session.amount_total}` };
  }
  
  // Create transaction and mark product sold
  const transaction = await storage.createTransaction({
    buyerId,
    sellerId: product.sellerId,
    productId: Number(productId),
    amount: product.price,
    fee: 100,
    stripeSessionId: sessionId,
  });
  
  return { success: true, transaction };
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // Let stripe-replit-sync process for database sync (it handles signature verification)
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    
    // Then handle checkout.session.completed for order fulfillment
    // Parse event type from payload - signature already verified by stripe-replit-sync
    try {
      const eventData = JSON.parse(payload.toString());
      
      if (eventData.type === 'checkout.session.completed') {
        const sessionId = eventData.data?.object?.id;
        
        if (sessionId) {
          // Use shared fulfillment logic that fetches verified session from Stripe
          const result = await fulfillCheckout(sessionId);
          if (result.success) {
            console.log(`Webhook: Fulfilled checkout session ${sessionId}`);
          } else {
            console.log(`Webhook: Fulfillment skipped for ${sessionId}: ${result.error}`);
          }
        }
      }
    } catch (err) {
      console.error('Webhook fulfillment error:', err);
      // Don't throw - sync already succeeded
    }
  }
}
