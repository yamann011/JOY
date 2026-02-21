import {
  type User,
  type InsertUser,
  type Event,
  type InsertEvent,
  type ChatGroup,
  type InsertChatGroup,
  type ChatMessage,
  type InsertChatMessage,
  type Ticket,
  type InsertTicket,
  type TicketMessage,
  type InsertTicketMessage,
  type Announcement,
  type InsertAnnouncement,
  type AdminCreateUser,
  type Banner,
  type InsertBanner,
  type VipApp,
  type EmbeddedSite,
  type InsertEmbeddedSite,
  type News,
  type NewsComment,
  type NewsLike,
  users,
  events,
  chatGroups,
  chatMessages,
  tickets,
  ticketMessages,
  announcements,
  banners,
  settings,
  vipApps,
  embeddedSites,
  news,
  newsComments,
  newsLikes,
} from "@shared/schema";

import { db } from "./db";
import { eq, desc, asc, count } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent & { createdBy: string; isLive?: boolean }): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  updateEvent(id: string, data: Partial<Event>): Promise<Event | undefined>;

  getChatGroups(): Promise<ChatGroup[]>;
  getChatGroup(id: string): Promise<ChatGroup | undefined>;
  createChatGroup(
    group: InsertChatGroup & { createdBy: string; isPrivate?: boolean; participants?: string[] },
  ): Promise<ChatGroup>;

  getChatMessages(groupId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage & { userId: string }): Promise<ChatMessage>;
  deleteChatMessage(id: string): Promise<boolean>;
  deleteGroupMessages(groupId: string): Promise<number>;
  deleteChatGroup(id: string): Promise<boolean>;

  getTickets(userId?: string): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>; // eski isim
  getTicketById(id: string): Promise<Ticket | undefined>; // yeni isim (routes için)
  createTicket(ticket: InsertTicket & { userId: string }): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined>;
  deleteTicket(id: string): Promise<boolean>;

  // ✅ Ticket mesajları (cevap sistemi)
  getTicketMessages(ticketId: string): Promise<TicketMessage[]>;
  createTicketMessage(
    msg: InsertTicketMessage & { userId: string; role: string },
  ): Promise<TicketMessage>;

  getStats(): Promise<{
    totalUsers: number;
    totalEvents: number;
    totalMessages: number;
    totalTickets: number;
  }>;

  getAnnouncements(): Promise<Announcement[]>;
  getActiveAnnouncement(): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement & { createdBy: string }): Promise<Announcement>;
  updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<boolean>;

  createUserByAdmin(user: AdminCreateUser): Promise<User>;
  deleteUser(id: string): Promise<boolean>;

  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;

  getVipApps(): Promise<VipApp[]>;
  createVipApp(app: Omit<VipApp, "id" | "createdAt">): Promise<VipApp>;
  deleteVipApp(id: string): Promise<boolean>;

  getBanners(): Promise<Banner[]>;
  getActiveBanners(): Promise<Banner[]>;
  getBanner(id: string): Promise<Banner | undefined>;
  createBanner(banner: InsertBanner & { createdBy: string }): Promise<Banner>;
  updateBanner(id: string, updates: Partial<Banner>): Promise<Banner | undefined>;
  deleteBanner(id: string): Promise<boolean>;

  getEmbeddedSites(): Promise<EmbeddedSite[]>;
  getActiveEmbeddedSites(): Promise<EmbeddedSite[]>;
  getEmbeddedSite(id: string): Promise<EmbeddedSite | undefined>;
  createEmbeddedSite(site: InsertEmbeddedSite & { createdBy: string }): Promise<EmbeddedSite>;
  updateEmbeddedSite(id: string, updates: Partial<EmbeddedSite>): Promise<EmbeddedSite | undefined>;
  deleteEmbeddedSite(id: string): Promise<boolean>;

  createUserByAdmin(user: AdminCreateUser): Promise<User>;
  deleteUser(id: string): Promise<boolean>;

  getAllNews(): Promise<any[]>;
  getPublishedNews(): Promise<any[]>;
  getNewsById(id: string): Promise<any | undefined>;
  createNews(newsData: any): Promise<any>;
  updateNews(id: string, updates: any): Promise<any | undefined>;
  deleteNews(id: string): Promise<boolean>;
  incrementNewsView(id: string): Promise<any | undefined>;

  getNewsComments(newsId: string): Promise<any[]>;
  createNewsComment(comment: any): Promise<any>;
  deleteNewsComment(id: string): Promise<boolean>;

  getUserNewsLike(newsId: string, userId: string): Promise<any | undefined>;
  createNewsLike(newsId: string, userId: string): Promise<any>;
  deleteNewsLike(newsId: string, userId: string): Promise<boolean>;

  getAnnouncement?(id: string): Promise<any | undefined>;
  getVipApp?(id: string): Promise<any | undefined>;
  updateVipApp?(id: string, updates: any): Promise<any | undefined>;
  getSettings?(): Promise<any[]>;

  seedInitialData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        role: "USER",
        level: 1,
        isOnline: true,
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  async getEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(asc(events.scheduledAt));
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async createEvent(event: InsertEvent & { createdBy: string; isLive?: boolean }): Promise<Event> {
    const [newEvent] = await db
      .insert(events)
      .values({
        title: event.title,
        description: event.description ?? null,
        agencyName: event.agencyName,
        agencyLogo: event.agencyLogo ?? null,
        coverImage: event.coverImage ?? null,
        participant1Name: event.participant1Name ?? null,
        participant1Avatar: event.participant1Avatar ?? null,
        participant2Name: event.participant2Name ?? null,
        participant2Avatar: event.participant2Avatar ?? null,
        participantsData: event.participantsData ?? null,
        participantCount: 0,
        participants: [],
        scheduledAt: event.scheduledAt,
        isLive: event.isLive ?? false,
        createdBy: event.createdBy,
      })
      .returning();
    return newEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async updateEvent(id: string, data: Partial<Event>): Promise<Event | undefined> {
    const [updated] = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return updated;
  }

  async getChatGroups(): Promise<ChatGroup[]> {
    return await db.select().from(chatGroups);
  }

  async getChatGroup(id: string): Promise<ChatGroup | undefined> {
    const [group] = await db.select().from(chatGroups).where(eq(chatGroups.id, id));
    return group || undefined;
  }

  async createChatGroup(
    group: InsertChatGroup & { createdBy: string; isPrivate?: boolean; participants?: string[] },
  ): Promise<ChatGroup> {
    const [newGroup] = await db
      .insert(chatGroups)
      .values({
        name: group.name,
        description: group.description ?? null,
        requiredRole: "USER",
        isPrivate: group.isPrivate ?? false,
        participants: group.participants ?? null,
        createdBy: group.createdBy,
      })
      .returning();
    return newGroup;
  }

  async getChatMessages(groupId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.groupId, groupId))
      .orderBy(asc(chatMessages.createdAt));
  }

  async createChatMessage(message: InsertChatMessage & { userId: string }): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async deleteChatMessage(id: string): Promise<boolean> {
    const result: any = await db.delete(chatMessages).where(eq(chatMessages.id, id));
    if (typeof result?.rowCount === "number") return result.rowCount > 0;
    return true;
  }

  async deleteGroupMessages(groupId: string): Promise<number> {
    const result: any = await db.delete(chatMessages).where(eq(chatMessages.groupId, groupId));
    if (typeof result?.rowCount === "number") return result.rowCount;
    return 0;
  }

  async deleteChatGroup(id: string): Promise<boolean> {
    await this.deleteGroupMessages(id);
    const result: any = await db.delete(chatGroups).where(eq(chatGroups.id, id));
    if (typeof result?.rowCount === "number") return result.rowCount > 0;
    return true;
  }

  async getTickets(userId?: string): Promise<Ticket[]> {
    if (userId) {
      return await db
        .select()
        .from(tickets)
        .where(eq(tickets.userId, userId))
        .orderBy(desc(tickets.createdAt));
    }
    return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  // Eski isim
  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket || undefined;
  }

  // Yeni isim (routes için)
  async getTicketById(id: string): Promise<Ticket | undefined> {
    return this.getTicket(id);
  }

  async createTicket(ticket: InsertTicket & { userId: string }): Promise<Ticket> {
    // schema güncellendiyse category + attachments burada otomatik gelir
    const [newTicket] = await db
      .insert(tickets)
      .values({
        ...ticket,
        // attachments array null olabilir, sorun değil
        status: "open",
      })
      .returning();
    return newTicket;
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const [updated] = await db.update(tickets).set(updates).where(eq(tickets.id, id)).returning();
    return updated || undefined;
  }

  async deleteTicket(id: string): Promise<boolean> {
    const result: any = await db.delete(tickets).where(eq(tickets.id, id));
    if (typeof result?.rowCount === "number") return result.rowCount > 0;
    return true;
  }

  // =========================
  // ✅ Ticket Mesajları
  // =========================
  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    return await db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(asc(ticketMessages.createdAt));
  }

  async createTicketMessage(
    msg: InsertTicketMessage & { userId: string; role: string },
  ): Promise<TicketMessage> {
    const [newMsg] = await db
      .insert(ticketMessages)
      .values({
        ticketId: msg.ticketId,
        userId: msg.userId,
        role: msg.role || "USER",
        message: msg.message,
        attachments: msg.attachments ?? null,
      })
      .returning();

    return newMsg;
  }

  async getStats(): Promise<{
    totalUsers: number;
    totalEvents: number;
    totalMessages: number;
    totalTickets: number;
  }> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [eventCount] = await db.select({ count: count() }).from(events);
    const [messageCount] = await db.select({ count: count() }).from(chatMessages);
    const [ticketCount] = await db.select({ count: count() }).from(tickets);

    return {
      totalUsers: userCount?.count ?? 0,
      totalEvents: eventCount?.count ?? 0,
      totalMessages: messageCount?.count ?? 0,
      totalTickets: ticketCount?.count ?? 0,
    };
  }

  async getAnnouncements(): Promise<Announcement[]> {
    return await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }

  async getActiveAnnouncement(): Promise<Announcement | undefined> {
    const [announcement] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .limit(1);
    return announcement || undefined;
  }

  async createAnnouncement(announcement: InsertAnnouncement & { createdBy: string }): Promise<Announcement> {
    await db.update(announcements).set({ isActive: false });
    const [newAnnouncement] = await db
      .insert(announcements)
      .values({
        content: announcement.content,
        isActive: true,
        createdBy: announcement.createdBy,
      })
      .returning();
    return newAnnouncement;
  }

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | undefined> {
    const [updated] = await db.update(announcements).set(updates).where(eq(announcements.id, id)).returning();
    return updated || undefined;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const result: any = await db.delete(announcements).where(eq(announcements.id, id));
    if (typeof result?.rowCount === "number") return result.rowCount > 0;
    return true;
  }

  async createUserByAdmin(user: AdminCreateUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        username: user.username,
        password: user.password,
        displayName: user.displayName,
        role: user.role,
        level: user.level,
        isOnline: false,
      })
      .returning();
    return newUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result: any = await db.delete(users).where(eq(users.id, id));
    if (typeof result?.rowCount === "number") return result.rowCount > 0;
    return true;
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [settingRow] = await db.select().from(settings).where(eq(settings.key, key));
    return settingRow?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const existing = await db.select().from(settings).where(eq(settings.key, key));
    if (existing.length > 0) {
      await db.update(settings).set({ value }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  async getVipApps(): Promise<VipApp[]> {
    return await db.select().from(vipApps).orderBy(desc(vipApps.createdAt));
  }

  async createVipApp(app: Omit<VipApp, "id" | "createdAt">): Promise<VipApp> {
    const [newApp] = await db.insert(vipApps).values(app).returning();
    return newApp;
  }

  async deleteVipApp(id: string): Promise<boolean> {
    const result: any = await db.delete(vipApps).where(eq(vipApps.id, id));
    if (typeof result?.rowCount === "number") return result.rowCount > 0;
    return true;
  }

  async getBanners(): Promise<Banner[]> {
    return await db.select().from(banners).orderBy(asc(banners.displayOrder));
  }

  async getActiveBanners(): Promise<Banner[]> {
    return await db
      .select()
      .from(banners)
      .where(eq(banners.isActive, true))
      .orderBy(asc(banners.displayOrder));
  }

  async getBanner(id: string): Promise<Banner | undefined> {
    const [banner] = await db.select().from(banners).where(eq(banners.id, id));
    return banner || undefined;
  }

  async createBanner(banner: InsertBanner & { createdBy: string }): Promise<Banner> {
    const existingBanners = await db.select().from(banners);
    const maxOrder = Math.max(0, ...existingBanners.map((b) => b.displayOrder));

    const [newBanner] = await db
      .insert(banners)
      .values({
        title: banner.title,
        description: banner.description ?? null,
        imageUrl: banner.imageUrl ?? null,
        ctaLabel: banner.ctaLabel ?? null,
        ctaUrl: banner.ctaUrl ?? null,
        animationType: banner.animationType ?? "fade",
        isActive: banner.isActive ?? true,
        displayOrder: banner.displayOrder ?? maxOrder + 1,
        createdBy: banner.createdBy,
      })
      .returning();
    return newBanner;
  }

  async updateBanner(id: string, updates: Partial<Banner>): Promise<Banner | undefined> {
    const [updated] = await db.update(banners).set(updates).where(eq(banners.id, id)).returning();
    return updated || undefined;
  }

  async deleteBanner(id: string): Promise<boolean> {
    const result: any = await db.delete(banners).where(eq(banners.id, id));
    if (typeof result?.rowCount === "number") return result.rowCount > 0;
    return true;
  }

  async seedInitialData(): Promise<void> {
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) return;

    const [adminUser] = await db
      .insert(users)
      .values({
        username: "admin",
        password: "admin123",
        displayName: "Platform Admin",
        role: "ADMIN",
        level: 50,
        isOnline: true,
      })
      .returning();

    const [modUser] = await db
      .insert(users)
      .values({
        username: "moderator",
        password: "mod123",
        displayName: "Moderator",
        role: "MOD",
        level: 30,
        isOnline: true,
      })
      .returning();

    await db.insert(users).values({
      username: "vipuser",
      password: "vip123",
      displayName: "VIP Uye",
      role: "VIP",
      level: 20,
      isOnline: false,
    });

    await db.insert(chatGroups).values([
      {
        name: "Genel Sohbet",
        description: "Herkese acik genel sohbet grubu",
        requiredRole: "USER",
        isPrivate: false,
        createdBy: adminUser.id,
      },
      {
        name: "VIP Lounge",
        description: "VIP uyelere ozel sohbet alani",
        requiredRole: "VIP",
        isPrivate: false,
        createdBy: adminUser.id,
      },
      {
        name: "Yonetim Sohbeti",
        description: "Admin ve moderator ozel sohbet alani",
        requiredRole: "MOD",
        isPrivate: false,
        createdBy: adminUser.id,
      },
    ]);

    await db.insert(events).values([
      {
        title: "Haftalik PK Yarismasi",
        description: "Her hafta duzenlenen buyuk PK etkinligi. Oduller ve surprizler sizi bekliyor!",
        agencyName: "Elite Agency",
        participant1Name: "StarQueen",
        participant1Avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=StarQueen",
        participant2Name: "GoldenKing",
        participant2Avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=GoldenKing",
        participantCount: 24,
        participants: ["Ali", "Veli", "Ayse", "Fatma", "Mehmet"],
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        isLive: false,
        createdBy: adminUser.id,
      },
      {
        title: "VIP Ozel Yayin",
        description: "VIP uyelere ozel canli yayin etkinligi",
        agencyName: "Premium Productions",
        participant1Name: "DiamondStar",
        participant1Avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DiamondStar",
        participant2Name: "RubyQueen",
        participant2Avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=RubyQueen",
        participantCount: 12,
        participants: ["Crown", "Star", "Diamond"],
        scheduledAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        isLive: true,
        createdBy: modUser.id,
      },
    ]);

    await db.insert(announcements).values({
      content:
        "Platforma hos geldiniz! Bu hafta ozel etkinlikler ve surprizler sizi bekliyor. VIP uyelik avantajlarindan yararlanin!",
      isActive: true,
      createdBy: adminUser.id,
    });
  }

  async getEmbeddedSites(): Promise<EmbeddedSite[]> {
    return await db.select().from(embeddedSites).orderBy(asc(embeddedSites.displayOrder));
  }

  async getActiveEmbeddedSites(): Promise<EmbeddedSite[]> {
    return await db
      .select()
      .from(embeddedSites)
      .where(eq(embeddedSites.isActive, true))
      .orderBy(asc(embeddedSites.displayOrder));
  }

  async getEmbeddedSite(id: string): Promise<EmbeddedSite | undefined> {
    const [site] = await db.select().from(embeddedSites).where(eq(embeddedSites.id, id));
    return site || undefined;
  }

  async createEmbeddedSite(site: InsertEmbeddedSite & { createdBy: string }): Promise<EmbeddedSite> {
    const [newSite] = await db.insert(embeddedSites).values(site).returning();
    return newSite;
  }

  async updateEmbeddedSite(id: string, updates: Partial<EmbeddedSite>): Promise<EmbeddedSite | undefined> {
    const [updated] = await db.update(embeddedSites).set(updates).where(eq(embeddedSites.id, id)).returning();
    return updated || undefined;
  }

  async deleteEmbeddedSite(id: string): Promise<boolean> {
    const result: any = await db.delete(embeddedSites).where(eq(embeddedSites.id, id));
    if (typeof result?.rowCount === "number") return result.rowCount > 0;
    return true;
  }

  async getVipApp(id: string): Promise<VipApp | undefined> {
    const [app] = await db.select().from(vipApps).where(eq(vipApps.id, id));
    return app || undefined;
  }

  async updateVipApp(id: string, updates: any): Promise<VipApp | undefined> {
    const [updated] = await db.update(vipApps).set(updates).where(eq(vipApps.id, id)).returning();
    return updated || undefined;
  }

  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const [ann] = await db.select().from(announcements).where(eq(announcements.id, id));
    return ann || undefined;
  }

  async getAllNews(): Promise<News[]> {
    return await db.select().from(news).orderBy(desc(news.createdAt));
  }

  async getPublishedNews(): Promise<News[]> {
    return await db.select().from(news).where(eq(news.isPublished, true)).orderBy(desc(news.createdAt));
  }

  async getNewsById(id: string): Promise<News | undefined> {
    const [item] = await db.select().from(news).where(eq(news.id, id));
    return item || undefined;
  }

  async createNews(newsData: any): Promise<News> {
    const [item] = await db.insert(news).values(newsData).returning();
    return item;
  }

  async updateNews(id: string, updates: any): Promise<News | undefined> {
    const [updated] = await db.update(news).set({ ...updates, updatedAt: new Date() }).where(eq(news.id, id)).returning();
    return updated || undefined;
  }

  async deleteNews(id: string): Promise<boolean> {
    await db.delete(newsComments).where(eq(newsComments.newsId, id));
    await db.delete(newsLikes).where(eq(newsLikes.newsId, id));
    const result: any = await db.delete(news).where(eq(news.id, id));
    if (typeof result?.rowCount === "number") return result.rowCount > 0;
    return true;
  }

  async incrementNewsView(id: string): Promise<News | undefined> {
    const item = await this.getNewsById(id);
    if (!item) return undefined;
    const [updated] = await db.update(news).set({ viewCount: (item.viewCount || 0) + 1 }).where(eq(news.id, id)).returning();
    return updated || undefined;
  }

  async getNewsComments(newsId: string): Promise<NewsComment[]> {
    return await db.select().from(newsComments).where(eq(newsComments.newsId, newsId)).orderBy(desc(newsComments.createdAt));
  }

  async createNewsComment(comment: any): Promise<NewsComment> {
    const [item] = await db.insert(newsComments).values(comment).returning();
    return item;
  }

  async deleteNewsComment(id: string): Promise<boolean> {
    const result: any = await db.delete(newsComments).where(eq(newsComments.id, id));
    if (typeof result?.rowCount === "number") return result.rowCount > 0;
    return true;
  }

  async getUserNewsLike(newsId: string, userId: string): Promise<NewsLike | undefined> {
    const [like] = await db.select().from(newsLikes).where(eq(newsLikes.newsId, newsId)).where(eq(newsLikes.userId, userId));
    return like || undefined;
  }

  async createNewsLike(newsId: string, userId: string): Promise<NewsLike> {
    const existing = await this.getUserNewsLike(newsId, userId);
    if (existing) return existing;
    const [like] = await db.insert(newsLikes).values({ newsId, userId }).returning();
    await db.update(news).set({ likeCount: (await this.getNewsById(newsId))?.likeCount ?? 0 + 1 }).where(eq(news.id, newsId));
    return like;
  }

  async deleteNewsLike(newsId: string, userId: string): Promise<boolean> {
    const result: any = await db.delete(newsLikes).where(eq(newsLikes.newsId, newsId)).where(eq(newsLikes.userId, userId));
    const changed = typeof result?.rowCount === "number" ? result.rowCount > 0 : true;
    if (changed) {
      const item = await this.getNewsById(newsId);
      if (item) await db.update(news).set({ likeCount: Math.max(0, (item.likeCount || 0) - 1) }).where(eq(news.id, newsId));
    }
    return changed;
  }
}

// Storage selection: SQLite (default, no DB needed) or PostgreSQL (if DATABASE_URL set)
import { sqliteStorage } from "./sqlite-storage";
export const storage: IStorage = process.env.DATABASE_URL ? new DatabaseStorage() : sqliteStorage;
