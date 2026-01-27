import { db } from "./db";
import {
  products,
  transactions,
  favorites,
  messages,
  type Product,
  type InsertProduct,
  type Transaction,
  type InsertTransaction,
  type Favorite,
  type Message,
  type InsertMessage,
  users
} from "@shared/schema";
import { eq, desc, and, sql, ilike, or } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";

export interface IStorage {
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductsBySeller(sellerId: string): Promise<Product[]>;
  getSoldProducts(): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  createProduct(product: InsertProduct & { sellerId: string }): Promise<Product>;
  createTransaction(transaction: InsertTransaction & { buyerId: string, fee: number, amount: number, stripeSessionId?: string, shippingCost?: number, buyerEmail?: string, isInternational?: boolean }): Promise<Transaction>;
  getTransactionByStripeSession(stripeSessionId: string): Promise<Transaction | undefined>;
  getTransactionsByBuyer(buyerId: string): Promise<Transaction[]>;
  getTransactionsBySeller(sellerId: string): Promise<Transaction[]>;
  updateTransactionShipping(id: number, shippingData: { shippingLabelUrl?: string, trackingNumber: string, shipped: boolean }): Promise<Transaction | undefined>;
  getUser(id: string): Promise<any>;
  // Favorites
  addFavorite(userId: string, productId: number): Promise<Favorite>;
  removeFavorite(userId: string, productId: number): Promise<void>;
  getFavoritesByUser(userId: string): Promise<Favorite[]>;
  isFavorited(userId: string, productId: number): Promise<boolean>;
  getProductLikeCount(productId: number): Promise<number>;
  getProductsWithLikeCounts(): Promise<(Product & { likeCount: number })[]>;
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByProduct(productId: number): Promise<Message[]>;
  getConversations(userId: string): Promise<{ productId: number; otherUserId: string; lastMessage: Message }[]>;
  markMessagesAsRead(productId: number, receiverId: string): Promise<void>;
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

  async getSoldProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.sold, true)).orderBy(desc(products.createdAt));
  }

  async searchProducts(query: string): Promise<Product[]> {
    const searchTerm = `%${query}%`;
    // Special case: searching "sold" returns sold items
    if (query.toLowerCase() === "sold") {
      return this.getSoldProducts();
    }
    return await db.select().from(products)
      .where(
        and(
          eq(products.sold, false),
          or(
            ilike(products.title, searchTerm),
            ilike(products.description, searchTerm),
            ilike(products.brand, searchTerm)
          )
        )
      )
      .orderBy(desc(products.createdAt));
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

  async getTransactionsByBuyer(buyerId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.buyerId, buyerId)).orderBy(desc(transactions.createdAt));
  }

  async getTransactionsBySeller(sellerId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.sellerId, sellerId)).orderBy(desc(transactions.createdAt));
  }

  async updateTransactionShipping(id: number, shippingData: { shippingLabelUrl?: string, trackingNumber: string, shipped: boolean }): Promise<Transaction | undefined> {
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

  // Messages
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getMessagesByProduct(productId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.productId, productId)).orderBy(messages.createdAt);
  }

  async getConversations(userId: string): Promise<{ productId: number; otherUserId: string; lastMessage: Message }[]> {
    // Get all messages where user is sender or receiver
    const userMessages = await db.select().from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));
    
    // Group by product and get last message per conversation
    const conversationMap = new Map<number, { otherUserId: string; lastMessage: Message }>();
    
    for (const msg of userMessages) {
      if (!conversationMap.has(msg.productId)) {
        const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
        conversationMap.set(msg.productId, { otherUserId, lastMessage: msg });
      }
    }
    
    return Array.from(conversationMap.entries()).map(([productId, data]) => ({
      productId,
      ...data
    }));
  }

  async markMessagesAsRead(productId: number, receiverId: string): Promise<void> {
    await db.update(messages)
      .set({ read: true })
      .where(and(eq(messages.productId, productId), eq(messages.receiverId, receiverId)));
  }
}

export const storage = new DatabaseStorage();
