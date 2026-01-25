import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';
import { createShipmentAndPurchaseLabel, getEstimatedShippingCost, type ShippingAddress } from './shippoClient';
import { type PackageSize } from '@shared/schema';

function getExpectedShippingCost(packageSize: PackageSize): number {
  return getEstimatedShippingCost(packageSize);
}

// Shared fulfillment logic used by both webhook and /api/checkout/complete
export async function fulfillCheckout(sessionId: string): Promise<{ success: boolean; transaction?: any; error?: string }> {
  // Check idempotency first
  const existingTransaction = await storage.getTransactionByStripeSession(sessionId);
  if (existingTransaction) {
    return { success: true, transaction: existingTransaction };
  }
  
  // Fetch verified session from Stripe API (not from payload)
  const stripe = await getUncachableStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['shipping_details'],
  });
  
  if (session.payment_status !== 'paid') {
    return { success: false, error: 'Payment not completed' };
  }
  
  const productId = session.metadata?.productId;
  const buyerId = session.metadata?.buyerId || 'guest';
  const shippingCostStr = session.metadata?.shippingCost || '0';
  const packageSize = (session.metadata?.packageSize as PackageSize) || 'medium';
  
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
  
  // Validate shipping cost against product's current settings
  const shippingCost = parseInt(shippingCostStr, 10);
  const expectedShippingCost = product.shippingPaidBy === 'buyer' 
    ? getExpectedShippingCost(packageSize)
    : 0;
  
  if (shippingCost !== expectedShippingCost) {
    return { success: false, error: `Shipping cost mismatch: expected ${expectedShippingCost}, got ${shippingCost}` };
  }
  
  // Calculate expected amount (price + fee + shipping)
  const expectedAmount = product.price + 100 + shippingCost;
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
    shippingCost,
    stripeSessionId: sessionId,
  });
  
  // Generate shipping label if we have shipping address
  const shippingDetails = (session as any).shipping_details;
  if (shippingDetails?.address) {
    try {
      const addr = shippingDetails.address;
      const shippingAddress: ShippingAddress = {
        name: shippingDetails.name || 'Customer',
        street1: addr.line1 || '',
        street2: addr.line2 || undefined,
        city: addr.city || '',
        state: addr.state || '',
        zip: addr.postal_code || '',
        country: addr.country || 'US',
      };
      
      const label = await createShipmentAndPurchaseLabel(shippingAddress, packageSize);
      
      // Update transaction with shipping info
      await storage.updateTransactionShipping(transaction.id, {
        shippingLabelUrl: label.labelUrl,
        trackingNumber: label.trackingNumber,
      });
      
      console.log(`Shipping label generated: ${label.trackingNumber}`);
    } catch (err) {
      console.error('Failed to generate shipping label:', err);
      // Don't fail the transaction - shipping label can be generated later
    }
  }
  
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
