import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
export * from "./models/auth";
import { users } from "./models/auth";

// Package sizes with approximate dimensions (inches) and weights for shipping calculation
export const PACKAGE_SIZES = {
  small: { label: "Small", description: "T-shirts, accessories", length: 10, width: 8, height: 4, maxWeight: 1 },
  medium: { label: "Medium", description: "Hoodies, jeans, dresses", length: 14, width: 12, height: 6, maxWeight: 3 },
  large: { label: "Large", description: "Coats, jackets, multiple items", length: 18, width: 14, height: 8, maxWeight: 5 },
} as const;

export type PackageSize = keyof typeof PACKAGE_SIZES;

// Condition options for product listings
export const CONDITION_OPTIONS = {
  new: { label: "New with Tags", description: "Brand new, never worn" },
  like_new: { label: "Like New", description: "Worn once or twice, no flaws" },
  good: { label: "Good", description: "Lightly worn, minor signs of use" },
  fair: { label: "Fair", description: "Visible wear, some flaws" },
  vintage: { label: "Vintage", description: "Aged/distressed aesthetic" },
} as const;

export type Condition = keyof typeof CONDITION_OPTIONS;

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sellerId: text("seller_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  brand: text("brand"),
  condition: text("condition").default("good"), // new, like_new, good, fair, vintage
  price: integer("price").notNull(), // in cents
  imageUrl: text("image_url").notNull(),
  sold: boolean("sold").default(false).notNull(),
  packageSize: text("package_size").notNull().default("medium"), // small, medium, large
  shippingPaidBy: text("shipping_paid_by").notNull().default("buyer"), // buyer or seller
  weight: integer("weight").default(16), // in ounces
  internationalShippingPrice: integer("international_shipping_price"), // custom price in cents for international buyers
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  buyerId: text("buyer_id").notNull(), // Allow "guest" or user ID
  buyerEmail: text("buyer_email"), // Email for guest buyers or notifications
  sellerId: text("seller_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  amount: integer("amount").notNull(), // in cents
  fee: integer("fee").default(100).notNull(), // $1.00 fee in cents
  shippingCost: integer("shipping_cost").default(0), // in cents
  shippingLabelUrl: text("shipping_label_url"), // URL to shipping label PDF
  trackingNumber: text("tracking_number"),
  shipped: boolean("shipped").default(false).notNull(), // Has seller shipped?
  isInternational: boolean("is_international").default(false), // International order?
  stripeSessionId: text("stripe_session_id"), // For idempotency
  createdAt: timestamp("created_at").defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  senderId: text("sender_id").notNull().references(() => users.id),
  receiverId: text("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productsRelations = relations(products, ({ one }) => ({
  seller: one(users, {
    fields: [products.sellerId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  buyer: one(users, {
    fields: [transactions.buyerId],
    references: [users.id],
    relationName: "buyer",
  }),
  seller: one(users, {
    fields: [transactions.sellerId],
    references: [users.id],
    relationName: "seller",
  }),
  product: one(products, {
    fields: [transactions.productId],
    references: [products.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [favorites.productId],
    references: [products.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
  product: one(products, {
    fields: [messages.productId],
    references: [products.id],
  }),
}));

export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, 
  sellerId: true, 
  sold: true, 
  createdAt: true 
}).extend({
  brand: z.string().optional(),
  condition: z.enum(["new", "like_new", "good", "fair", "vintage"]).default("good"),
  packageSize: z.enum(["small", "medium", "large"]).default("medium"),
  shippingPaidBy: z.enum(["buyer", "seller", "international"]).default("buyer"),
  weight: z.number().min(1).max(1120).optional(), // up to 70 lbs in ounces
  internationalShippingPrice: z.number().min(0).optional(), // custom international shipping price in cents
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  createdAt: true 
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  read: true,
  createdAt: true,
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
