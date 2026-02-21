import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const UserRole = {
  USER: "USER",
  VIP: "VIP",
  MOD: "MOD",
  ADMIN: "ADMIN",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("USER"),
  avatar: text("avatar"),
  level: integer("level").notNull().default(1),
  isOnline: boolean("is_online").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
}).extend({
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  displayName: z.string().min(2, "Görünen isim en az 2 karakter olmalı"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  agencyName: text("agency_name").notNull(),
  agencyLogo: text("agency_logo"),
  participant1Name: text("participant1_name"),
  participant1Avatar: text("participant1_avatar"),
  participant2Name: text("participant2_name"),
  participant2Avatar: text("participant2_avatar"),
  participantCount: integer("participant_count").notNull().default(0),
  participants: text("participants").array(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  isLive: boolean("is_live").notNull().default(false),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).pick({
  title: true,
  description: true,
  agencyName: true,
  agencyLogo: true,
  participant1Name: true,
  participant1Avatar: true,
  participant2Name: true,
  participant2Avatar: true,
  scheduledAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const chatGroups = pgTable("chat_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  requiredRole: text("required_role").notNull().default("USER"),
  isPrivate: boolean("is_private").notNull().default(false),
  participants: text("participants").array(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatGroupSchema = createInsertSchema(chatGroups).pick({
  name: true,
  description: true,
});

export type InsertChatGroup = z.infer<typeof insertChatGroupSchema>;
export type ChatGroup = typeof chatGroups.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  groupId: true,
  content: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// =======================
// ✅ TICKET SİSTEMİ (GELİŞMİŞ)
// =======================

// Hazır başlıklar (kategori)
export const TicketCategory = {
  ABUSE: "ABUSE", // Küfür ve Hakaret
  BAN: "BAN", // Yasaklanma
  QUOTA: "QUOTA", // Kota Destek
  COINS: "COINS", // Coins Destek
  OTHER: "OTHER", // Diğer
} as const;

export type TicketCategoryType = typeof TicketCategory[keyof typeof TicketCategory];

// Ticket tablosu (category + attachments eklendi)
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),

  category: text("category").notNull().default("OTHER"),

  subject: text("subject").notNull(),
  message: text("message").notNull(),

  // Foto linkleri (array)
  attachments: text("attachments").array(),

  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTicketSchema = createInsertSchema(tickets)
  .pick({
    category: true,
    subject: true,
    message: true,
    attachments: true,
  })
  .extend({
    category: z.enum(["ABUSE", "BAN", "QUOTA", "COINS", "OTHER"]).default("OTHER"),
    subject: z.string().min(2, "Konu en az 2 karakter olmalı"),
    message: z.string().min(5, "Mesaj en az 5 karakter olmalı"),
    attachments: z.array(z.string().url()).optional(),
  });

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

// Ticket mesajları (admin / kullanıcı cevap sistemi)
export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().default("USER"), // USER / MOD / ADMIN
  message: text("message").notNull(),
  attachments: text("attachments").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTicketMessageSchema = createInsertSchema(ticketMessages)
  .pick({
    ticketId: true,
    message: true,
    attachments: true,
  })
  .extend({
    ticketId: z.string().min(1),
    message: z.string().min(1, "Mesaj boş olamaz"),
    attachments: z.array(z.string().url()).optional(),
  });

export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).pick({
  content: true,
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

export const loginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı gerekli"),
  password: z.string().min(1, "Şifre gerekli"),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const adminCreateUserSchema = z.object({
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  displayName: z.string().min(2, "Görünen isim en az 2 karakter olmalı"),
  role: z.enum(["USER", "VIP", "MOD", "ADMIN"]),
  level: z.number().min(1).max(100),
});

export type AdminCreateUser = z.infer<typeof adminCreateUserSchema>;

export const BannerAnimationType = {
  NONE: "none",
  FADE: "fade",
  SLIDE: "slide",
  ZOOM: "zoom",
} as const;

export type BannerAnimationTypeValue = typeof BannerAnimationType[keyof typeof BannerAnimationType];

export const banners = pgTable("banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url"),
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  animationType: text("animation_type").notNull().default("fade"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBannerSchema = createInsertSchema(banners).pick({
  title: true,
  description: true,
  imageUrl: true,
  ctaLabel: true,
  ctaUrl: true,
  animationType: true,
  isActive: true,
  displayOrder: true,
}).extend({
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
  animationType: z.enum(["none", "fade", "slide", "zoom"]).default("fade"),
  isActive: z.boolean().default(true),
  displayOrder: z.number().default(0),
});

export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Setting = typeof settings.$inferSelect;

export const vipApps = pgTable("vip_apps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  downloadUrl: text("download_url").notNull(),
  version: text("version").notNull(),
  size: text("size").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVipAppSchema = createInsertSchema(vipApps).pick({
  name: true,
  description: true,
  imageUrl: true,
  downloadUrl: true,
  version: true,
  size: true,
});

export type InsertVipApp = z.infer<typeof insertVipAppSchema>;
export type VipApp = typeof vipApps.$inferSelect;

export const embeddedSites = pgTable("embedded_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  url: text("url").notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmbeddedSiteSchema = createInsertSchema(embeddedSites).pick({
  name: true,
  description: true,
  category: true,
  url: true,
  imageUrl: true,
  isActive: true,
  displayOrder: true,
}).extend({
  name: z.string().min(1, "İsim gerekli"),
  description: z.string().optional(),
  category: z.string().min(1, "Kategori gerekli"),
  url: z.string().url("Geçerli bir URL gerekli"),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().default(0),
});

export type InsertEmbeddedSite = z.infer<typeof insertEmbeddedSiteSchema>;
export type EmbeddedSite = typeof embeddedSites.$inferSelect;

export const news = pgTable("news", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  externalLink: text("external_link"),
  category: text("category").notNull().default("Genel"),
  isPublished: boolean("is_published").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNewsSchema = createInsertSchema(news).pick({
  title: true,
  content: true,
  summary: true,
  imageUrl: true,
  videoUrl: true,
  externalLink: true,
  category: true,
  isPublished: true,
}).extend({
  title: z.string().min(5, "Başlık en az 5 karakter olmalı"),
  content: z.string().min(10, "İçerik en az 10 karakter olmalı"),
  summary: z.string().optional(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  externalLink: z.string().optional(),
  category: z.string().default("Genel"),
  isPublished: z.boolean().default(true),
});

export type InsertNews = z.infer<typeof insertNewsSchema>;
export type News = typeof news.$inferSelect;

export const newsComments = pgTable("news_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  newsId: varchar("news_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNewsCommentSchema = createInsertSchema(newsComments).pick({
  content: true,
}).extend({
  content: z.string().min(1, "Yorum boş olamaz"),
});

export type InsertNewsComment = z.infer<typeof insertNewsCommentSchema>;
export type NewsComment = typeof newsComments.$inferSelect;

export const newsLikes = pgTable("news_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  newsId: varchar("news_id").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type NewsLike = typeof newsLikes.$inferSelect;
