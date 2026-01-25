import { db } from "./db";
import {
  products,
  transactions,
  type Product,
  type InsertProduct,
  type Transaction,
  type InsertTransaction,
  users
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";

export interface IStorage {
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct & { sellerId: string }): Promise<Product>;
  createTransaction(transaction: InsertTransaction & { buyerId: string, fee: number, amount: number, stripeSessionId?: string, shippingCost?: number }): Promise<Transaction>;
  getTransactionByStripeSession(stripeSessionId: string): Promise<Transaction | undefined>;
  updateTransactionShipping(id: number, shippingData: { shippingLabelUrl: string, trackingNumber: string }): Promise<Transaction | undefined>;
  getUser(id: string): Promise<any>; 
}

export class DatabaseStorage implements IStorage {
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.sold, false)).orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct & { sellerId: string }): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async createTransaction(data: InsertTransaction & { buyerId: string, fee: number, amount: number, stripeSessionId?: string, shippingCost?: number }): Promise<Transaction> {
    return await db.transaction(async (tx) => {
      const [transaction] = await tx.insert(transactions).values(data).returning();
      
      await tx.update(products)
        .set({ sold: true })
        .where(eq(products.id, data.productId));
        
      return transaction;
    });
  }

  async getTransactionByStripeSession(stripeSessionId: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.stripeSessionId, stripeSessionId));
    return transaction;
  }

  async updateTransactionShipping(id: number, shippingData: { shippingLabelUrl: string, trackingNumber: string }): Promise<Transaction | undefined> {
    const [updated] = await db.update(transactions)
      .set(shippingData)
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }

  async getUser(id: string) {
    return authStorage.getUser(id);
  }
}

export const storage = new DatabaseStorage();
