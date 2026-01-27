import { db } from "./db";
import { users, PACKAGE_SIZES, type PackageSize, insertMessageSchema } from "@shared/schema";
import type { Server } from "http";
import type { Express } from "express";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { fulfillCheckout } from "./webhookHandlers";
import { getShippingRates, getEstimatedShippingCost, isShippoConfigured, purchaseShippingLabel } from "./shippoClient";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth FIRST
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    const productsWithSellers = await Promise.all(
      products.map(async (product) => {
        const seller = await storage.getUser(product.sellerId);
        return { ...product, seller };
      })
    );
    res.json(productsWithSellers);
  });

  // Get products with like counts - must be before :id route
  app.get('/api/products/with-likes', async (req, res) => {
    try {
      const productsData = await storage.getProductsWithLikeCounts();
      const productsWithSellers = await Promise.all(
        productsData.map(async (product) => {
          const seller = await storage.getUser(product.sellerId);
          return { ...product, seller };
        })
      );
      res.json(productsWithSellers);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to get products with likes' });
    }
  });

  // Search products - supports "sold" keyword to show sold items
  app.get('/api/products/search', async (req, res) => {
    try {
      const query = req.query.q as string || '';
      const products = await storage.searchProducts(query);
      const productsWithSellers = await Promise.all(
        products.map(async (product) => {
          const seller = await storage.getUser(product.sellerId);
          return { ...product, seller };
        })
      );
      res.json(productsWithSellers);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to search products' });
    }
  });

  // Get sold products
  app.get('/api/products/sold', async (req, res) => {
    try {
      const products = await storage.getSoldProducts();
      const productsWithSellers = await Promise.all(
        products.map(async (product) => {
          const seller = await storage.getUser(product.sellerId);
          return { ...product, seller };
        })
      );
      res.json(productsWithSellers);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to get sold products' });
    }
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const seller = await storage.getUser(product.sellerId);
    res.json({ ...product, seller });
  });

  // Get products by seller
  app.get('/api/sellers/:id/products', async (req, res) => {
    try {
      const products = await storage.getProductsBySeller(req.params.id);
      const seller = await storage.getUser(req.params.id);
      const productsWithSeller = products.map(product => ({ ...product, seller }));
      res.json(productsWithSeller);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to get seller products' });
    }
  });

  // Get seller profile
  app.get('/api/sellers/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'Seller not found' });
      }
      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to get seller' });
    }
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

  // ========== FAVORITES ENDPOINTS ==========
  
  // Get user's favorites
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const favorites = await storage.getFavoritesByUser(req.user.claims.sub);
      const productsWithDetails = await Promise.all(
        favorites.map(async (fav) => {
          const product = await storage.getProduct(fav.productId);
          if (!product) return null;
          const seller = await storage.getUser(product.sellerId);
          return { ...fav, product: { ...product, seller } };
        })
      );
      res.json(productsWithDetails.filter(Boolean));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to get favorites' });
    }
  });

  // Check if product is favorited
  app.get('/api/favorites/:productId', isAuthenticated, async (req: any, res) => {
    try {
      const isFavorited = await storage.isFavorited(req.user.claims.sub, Number(req.params.productId));
      res.json({ isFavorited });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to check favorite status' });
    }
  });

  // Add to favorites
  app.post('/api/favorites/:productId', isAuthenticated, async (req: any, res) => {
    try {
      const productId = Number(req.params.productId);
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Check if already favorited
      const alreadyFavorited = await storage.isFavorited(req.user.claims.sub, productId);
      if (alreadyFavorited) {
        return res.json({ message: 'Already favorited' });
      }
      
      const favorite = await storage.addFavorite(req.user.claims.sub, productId);
      res.status(201).json(favorite);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to add favorite' });
    }
  });

  // Remove from favorites
  app.delete('/api/favorites/:productId', isAuthenticated, async (req: any, res) => {
    try {
      await storage.removeFavorite(req.user.claims.sub, Number(req.params.productId));
      res.json({ message: 'Removed from favorites' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to remove favorite' });
    }
  });

  // Get product like count
  app.get('/api/products/:id/likes', async (req, res) => {
    try {
      const count = await storage.getProductLikeCount(Number(req.params.id));
      res.json({ count });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to get like count' });
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

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      // Calculate shipping cost
      const packageSize = (product.packageSize as PackageSize) || "medium";
      let shippingCost = 0;
      const isInternational = product.shippingPaidBy === "international";
      
      // If buyer pays shipping, add shipping cost
      if (product.shippingPaidBy === "buyer") {
        shippingCost = getEstimatedShippingCost(packageSize);
      } else if (isInternational && product.internationalShippingPrice) {
        shippingCost = product.internationalShippingPrice;
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
              name: isInternational ? 'International Shipping' : 'Shipping',
              description: isInternational ? 'Flat rate international shipping' : `${PACKAGE_SIZES[packageSize].label} package`,
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
          allowed_countries: isInternational 
            ? ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'NZ']
            : ['US'],
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
          isInternational: isInternational ? 'true' : 'false',
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

  // ========== ORDERS ENDPOINTS ==========
  
  // Get buyer's orders (purchases)
  app.get('/api/orders/purchases', isAuthenticated, async (req: any, res) => {
    try {
      const transactions = await storage.getTransactionsByBuyer(req.user.claims.sub);
      const ordersWithDetails = await Promise.all(
        transactions.map(async (tx) => {
          const product = await storage.getProduct(tx.productId);
          const seller = product ? await storage.getUser(product.sellerId) : null;
          return { ...tx, product, seller };
        })
      );
      res.json(ordersWithDetails);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to get orders' });
    }
  });

  // Get seller's orders (sales)
  app.get('/api/orders/sales', isAuthenticated, async (req: any, res) => {
    try {
      const transactions = await storage.getTransactionsBySeller(req.user.claims.sub);
      const ordersWithDetails = await Promise.all(
        transactions.map(async (tx) => {
          const product = await storage.getProduct(tx.productId);
          const buyer = tx.buyerId !== 'guest' ? await storage.getUser(tx.buyerId) : null;
          return { ...tx, product, buyer };
        })
      );
      res.json(ordersWithDetails);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to get sales' });
    }
  });

  // Mark order as shipped (seller adds tracking)
  app.post('/api/orders/:id/ship', isAuthenticated, async (req: any, res) => {
    try {
      const orderId = Number(req.params.id);
      const { trackingNumber } = req.body;
      
      if (!trackingNumber) {
        return res.status(400).json({ message: 'Tracking number is required' });
      }

      // Get the transaction
      const transactions = await storage.getTransactionsBySeller(req.user.claims.sub);
      const transaction = transactions.find(t => t.id === orderId);
      
      if (!transaction) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (transaction.shipped) {
        return res.status(400).json({ message: 'Order already shipped' });
      }

      const updated = await storage.updateTransactionShipping(orderId, {
        trackingNumber,
        shipped: true,
      });

      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to mark as shipped' });
    }
  });

  // ========== MESSAGES ENDPOINTS ==========
  
  // Send message to seller about a product
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const { productId, receiverId, content } = req.body;
      
      if (!productId || !receiverId || !content) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const message = await storage.createMessage({
        productId,
        senderId: req.user.claims.sub,
        receiverId,
        content,
      });

      res.status(201).json(message);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Get messages for a product (conversation)
  app.get('/api/messages/product/:productId', isAuthenticated, async (req: any, res) => {
    try {
      const productId = Number(req.params.productId);
      const messages = await storage.getMessagesByProduct(productId);
      
      // Only allow sender, receiver, or product owner to view messages
      const product = await storage.getProduct(productId);
      const userId = req.user.claims.sub;
      
      const userMessages = messages.filter(
        m => m.senderId === userId || m.receiverId === userId || product?.sellerId === userId
      );
      
      // Mark as read
      await storage.markMessagesAsRead(productId, userId);
      
      res.json(userMessages);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to get messages' });
    }
  });

  // Get all conversations for current user
  app.get('/api/messages/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const conversations = await storage.getConversations(req.user.claims.sub);
      
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conv) => {
          const product = await storage.getProduct(conv.productId);
          const otherUser = await storage.getUser(conv.otherUserId);
          return { ...conv, product, otherUser };
        })
      );
      
      res.json(conversationsWithDetails);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to get conversations' });
    }
  });

  return httpServer;
}
