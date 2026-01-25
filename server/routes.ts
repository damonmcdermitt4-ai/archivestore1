import { db } from "./db";
import { users, PACKAGE_SIZES, type PackageSize } from "@shared/schema";
import type { Server } from "http";
import type { Express } from "express";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { fulfillCheckout } from "./webhookHandlers";
import { getShippingRates, getEstimatedShippingCost, isShippoConfigured } from "./shippoClient";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth FIRST
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  });

  app.post(api.products.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct({
        ...input,
        sellerId: req.user.claims.sub,
      });
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Get Stripe publishable key for frontend
  app.get('/api/stripe/config', async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to get Stripe config" });
    }
  });

  // Get shipping rates for a product
  app.post('/api/shipping/rates', async (req, res) => {
    try {
      const { productId, address } = req.body;
      
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const packageSize = (product.packageSize as PackageSize) || "medium";
      const rates = await getShippingRates(address, packageSize);
      
      res.json({ 
        rates,
        shippingPaidBy: product.shippingPaidBy,
        isConfigured: isShippoConfigured(),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to get shipping rates" });
    }
  });

  // Get estimated shipping cost for a product (without address)
  app.get('/api/shipping/estimate/:productId', async (req, res) => {
    try {
      const product = await storage.getProduct(Number(req.params.productId));
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const packageSize = (product.packageSize as PackageSize) || "medium";
      const estimatedCost = getEstimatedShippingCost(packageSize);
      
      res.json({ 
        estimatedCost,
        shippingPaidBy: product.shippingPaidBy,
        packageSize,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to estimate shipping" });
    }
  });

  // Create Stripe Checkout Session for a product
  app.post('/api/checkout', async (req: any, res) => {
    try {
      const { productId, shippingRateId } = req.body;
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.sold) {
        return res.status(400).json({ message: "Product already sold" });
      }

      if (req.isAuthenticated() && product.sellerId === req.user.claims.sub) {
         return res.status(400).json({ message: "Cannot buy your own product" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      // Calculate shipping cost
      const packageSize = (product.packageSize as PackageSize) || "medium";
      let shippingCost = 0;
      
      // If buyer pays shipping, add shipping cost
      if (product.shippingPaidBy === "buyer") {
        shippingCost = getEstimatedShippingCost(packageSize);
      }

      const platformFee = 100; // $1.00
      const totalAmount = product.price + platformFee + shippingCost;

      // Build line items
      const lineItems: any[] = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.title,
              description: product.description,
              images: product.imageUrl.startsWith('http') ? [product.imageUrl] : [`${baseUrl}${product.imageUrl}`],
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Platform Fee',
              description: 'Service fee',
            },
            unit_amount: platformFee,
          },
          quantity: 1,
        },
      ];

      // Add shipping as line item if buyer pays
      if (shippingCost > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Shipping',
              description: `${PACKAGE_SIZES[packageSize].label} package`,
            },
            unit_amount: shippingCost,
          },
          quantity: 1,
        });
      }

      // Create Stripe Checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        shipping_address_collection: {
          allowed_countries: ['US'],
        },
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&product_id=${productId}`,
        cancel_url: `${baseUrl}/products/${productId}`,
        metadata: {
          productId: String(productId),
          sellerId: product.sellerId,
          buyerId: req.isAuthenticated() ? req.user.claims.sub : 'guest',
          platformFee: String(platformFee),
          shippingCost: String(shippingCost),
          packageSize,
        },
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Handle successful checkout - mark product as sold
  // Uses shared fulfillment logic with webhook handler
  app.post('/api/checkout/complete', async (req: any, res) => {
    try {
      const { sessionId, productId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Missing session ID" });
      }
      
      // Use shared fulfillment logic (fetches verified session from Stripe)
      const result = await fulfillCheckout(sessionId);
      
      if (result.success) {
        // Verify the productId matches (extra security check)
        if (productId && result.transaction?.productId !== Number(productId)) {
          console.error(`Security: productId mismatch in checkout/complete`);
          // Don't error - transaction already exists with correct productId
        }
        return res.status(200).json(result.transaction);
      } else {
        return res.status(400).json({ message: result.error });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to complete checkout" });
    }
  });

  app.post(api.transactions.create.path, async (req: any, res) => {
    try {
      const { productId } = req.body;
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.sold) {
        return res.status(400).json({ message: "Product already sold" });
      }

      if (req.isAuthenticated() && product.sellerId === req.user.claims.sub) {
         return res.status(400).json({ message: "Cannot buy your own product" });
      }

      const transaction = await storage.createTransaction({
        buyerId: req.isAuthenticated() ? req.user.claims.sub : "guest",
        sellerId: product.sellerId,
        productId,
        amount: product.price,
        fee: 100,
      });
      
      res.status(201).json(transaction);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Transaction failed" });
    }
  });

  async function seedDatabase() {
    const existingUsers = await db.select().from(users).limit(1);
    let sellerId = existingUsers[0]?.id;

    if (!sellerId) {
      const [user] = await db.insert(users).values({
        email: "guest@example.com",
        firstName: "Avant",
        lastName: "Garde",
      }).returning();
      sellerId = user.id;
    }

    const existingProducts = await storage.getProducts();
    if (existingProducts.length === 0) {
      await storage.createProduct({
        sellerId,
        title: "LGB BONO",
        description: "Iconic military-inspired Bono jacket by Le Grand Bleu. Distressed detailing and complex construction.",
        price: 85000, // $850.00
        imageUrl: "/images/lgb_bono.png",
      });
      await storage.createProduct({
        sellerId,
        title: "PILOT JACKET",
        description: "Customized pilot jacket with multi-pocket detailing and avant-garde silhouette.",
        price: 65000, // $650.00
        imageUrl: "/images/pilot_jacket.png",
      });
      await storage.createProduct({
        sellerId,
        title: "LGB RIDERS JACKET",
        description: "Minimalist black riders jacket by Le Grand Bleu. Asymmetric zip and slim silhouette.",
        price: 75000, // $750.00
        imageUrl: "/images/lgb_riders.png",
      });
    }
  }

  await seedDatabase();

  return httpServer;
}
