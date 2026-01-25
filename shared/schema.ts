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

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sellerId: text("seller_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // in cents
  imageUrl: text("image_url").notNull(),
  sold: boolean("sold").default(false).notNull(),
  packageSize: text("package_size").notNull().default("medium"), // small, medium, large
  shippingPaidBy: text("shipping_paid_by").notNull().default("buyer"), // buyer or seller
  weight: integer("weight").default(16), // in ounces
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  buyerId: text("buyer_id").notNull(), // Allow "guest" or user ID
  sellerId: text("seller_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  amount: integer("amount").notNull(), // in cents
  fee: integer("fee").default(100).notNull(), // $1.00 fee in cents
  shippingCost: integer("shipping_cost").default(0), // in cents
  shippingLabelUrl: text("shipping_label_url"), // URL to shipping label PDF
  trackingNumber: text("tracking_number"),
  stripeSessionId: text("stripe_session_id"), // For idempotency
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

export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, 
  sellerId: true, 
  sold: true, 
  createdAt: true 
}).extend({
  packageSize: z.enum(["small", "medium", "large"]).default("medium"),
  shippingPaidBy: z.enum(["buyer", "seller"]).default("buyer"),
  weight: z.number().min(1).max(1120).optional(), // up to 70 lbs in ounces
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  createdAt: true 
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
