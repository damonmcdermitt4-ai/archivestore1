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

  app.post(api.transactions.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const { productId } = req.body;
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.sold) {
        return res.status(400).json({ message: "Product already sold" });
      }

      if (product.sellerId === req.user.claims.sub) {
         return res.status(400).json({ message: "Cannot buy your own product" });
      }

      const transaction = await storage.createTransaction({
        buyerId: req.user.claims.sub,
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
    // Seeding disabled as per user request to take away listings
  }

  await seedDatabase();

  return httpServer;
}
