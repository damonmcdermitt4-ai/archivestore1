import { db } from "./db";
import { users } from "@shared/schema";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

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

      // If logged in, prevent buying own product. 
      // If not logged in, we allow the purchase (guest checkout).
      if (req.isAuthenticated() && product.sellerId === req.user.claims.sub) {
         return res.status(400).json({ message: "Cannot buy your own product" });
      }

      const transaction = await storage.createTransaction({
        buyerId: req.isAuthenticated() ? req.user.claims.sub : "guest",
        sellerId: product.sellerId,
        productId,
        amount: product.price,
        fee: 100, // $1.00 fee
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
        title: "DRIES VAN NOTEN",
        description: "Purple Sequinned Shirt. Editorial piece from archive.",
        price: 124000, // $1240.00
        imageUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&auto=format&fit=crop&q=60",
      });
      await storage.createProduct({
        sellerId,
        title: "RICK OWENS",
        description: "Black Satin Shirt. Iconic silhouette.",
        price: 67000, // $670.00
        imageUrl: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&auto=format&fit=crop&q=60",
      });
      await storage.createProduct({
        sellerId,
        title: "MAISON MARGIELA",
        description: "Tabi Leather Boots. Signature split-toe design.",
        price: 85000, // $850.00
        imageUrl: "https://images.unsplash.com/photo-1638247025967-b4e38f6893b4?w=800&auto=format&fit=crop&q=60",
      });
    }
  }

  await seedDatabase();

  return httpServer;
}
