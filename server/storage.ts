import { db } from "./db";
import {
  products,
  transactions,
  favorites,
  type Product,
  type InsertProduct,
  type Transaction,
  type InsertTransaction,
  type Favorite,
  users
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";

export interface IStorage {
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductsBySeller(sellerId: string): Promise<Product[]>;
  createProduct(product: InsertProduct & { sellerId: string }): Promise<Product>;
  createTransaction(transaction: InsertTransaction & { buyerId: string, fee: number, amount: number, stripeSessionId?: string, shippingCost?: number }): Promise<Transaction>;
  getTransactionByStripeSession(stripeSessionId: string): Promise<Transaction | undefined>;
  updateTransactionShipping(id: number, shippingData: { shippingLabelUrl: string, trackingNumber: string }): Promise<Transaction | undefined>;
  getUser(id: string): Promise<any>;
  // Favorites
  addFavorite(userId: string, productId: number): Promise<Favorite>;
  removeFavorite(userId: string, productId: number): Promise<void>;
  getFavoritesByUser(userId: string): Promise<Favorite[]>;
  isFavorited(userId: string, productId: number): Promise<boolean>;
  getProductLikeCount(productId: number): Promise<number>;
  getProductsWithLikeCounts(): Promise<(Product & { likeCount: number })[]>;
}

export class DatabaseStorage implements IStorage {
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.sold, false)).orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductsBySeller(sellerId: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.sellerId, sellerId)).orderBy(desc(products.createdAt));
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

  async addFavorite(userId: string, productId: number): Promise<Favorite> {
    const [favorite] = await db.insert(favorites).values({ userId, productId }).returning();
    return favorite;
  }

  async removeFavorite(userId: string, productId: number): Promise<void> {
    await db.delete(favorites).where(
      and(eq(favorites.userId, userId), eq(favorites.productId, productId))
    );
  }

  async getFavoritesByUser(userId: string): Promise<Favorite[]> {
    return await db.select().from(favorites).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt));
  }

  async isFavorited(userId: string, productId: number): Promise<boolean> {
    const [favorite] = await db.select().from(favorites).where(
      and(eq(favorites.userId, userId), eq(favorites.productId, productId))
    );
    return !!favorite;
  }

  async getProductLikeCount(productId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(favorites)
      .where(eq(favorites.productId, productId));
    return result[0]?.count || 0;
  }

  async getProductsWithLikeCounts(): Promise<(Product & { likeCount: number })[]> {
    const productList = await db.select().from(products).where(eq(products.sold, false)).orderBy(desc(products.createdAt));
    
    const likeCounts = await db
      .select({ productId: favorites.productId, count: sql<number>`count(*)::int` })
      .from(favorites)
      .groupBy(favorites.productId);
    
    const likeCountMap = new Map(likeCounts.map(lc => [lc.productId, lc.count]));
    
    return productList.map(p => ({
      ...p,
      likeCount: likeCountMap.get(p.id) || 0
    }));
  }
}

export const storage = new DatabaseStorage();
