// Geçici mock storage - PostgreSQL olmadan test için
import type { IStorage } from "./storage";
import type * as schema from "@shared/schema";

const users = new Map<string, any>();
const events = new Map<string, any>();
const tickets = new Map<string, any>();
const ticketMessages = new Map<string, any>();
const chatGroups = new Map<string, any>();
const chatMessages = new Map<string, any>();
const announcements = new Map<string, any>();
const banners = new Map<string, any>();
const embeddedSites = new Map<string, any>();
const settings = new Map<string, any>();
const news = new Map<string, any>();
const newsComments = new Map<string, any>();
const newsLikes = new Map<string, any>();

let idCounter = 1;
const generateId = () => String(idCounter++);

export const mockStorage: IStorage = {
  async getUser(id: string) {
    return users.get(id);
  },
  
  async getUserByUsername(username: string) {
    return Array.from(users.values()).find(u => u.username === username);
  },
  
  async createUser(user: any) {
    const id = generateId();
    const newUser = { id, ...user, createdAt: new Date(), level: 1, isOnline: false, isBanned: false, role: user.role || "USER" };
    users.set(id, newUser);
    return newUser;
  },
  
  async getAllUsers() {
    return Array.from(users.values());
  },
  
  async updateUser(id: string, updates: any) {
    const user = users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    users.set(id, updated);
    return updated;
  },
  
  async getEvents() {
    return Array.from(events.values());
  },
  
  async getEvent(id: string) {
    return events.get(id);
  },
  
  async createEvent(event: any) {
    const id = generateId();
    const newEvent = { id, ...event, createdAt: new Date(), participantCount: 0, isLive: false };
    events.set(id, newEvent);
    return newEvent;
  },
  
  async getChatGroups() {
    return Array.from(chatGroups.values());
  },
  
  async getChatGroup(id: string) {
    return chatGroups.get(id);
  },
  
  async createChatGroup(group: any) {
    const id = generateId();
    const newGroup = { id, ...group, createdAt: new Date(), isPrivate: false };
    chatGroups.set(id, newGroup);
    return newGroup;
  },
  
  async getChatMessages(groupId: string) {
    return Array.from(chatMessages.values()).filter(m => m.groupId === groupId);
  },
  
  async createChatMessage(message: any) {
    const id = generateId();
    const newMessage = { id, ...message, createdAt: new Date() };
    chatMessages.set(id, newMessage);
    return newMessage;
  },
  
  async deleteChatMessage(id: string) {
    return chatMessages.delete(id);
  },
  
  async deleteGroupMessages(groupId: string) {
    const messages = Array.from(chatMessages.entries()).filter(([_, m]) => m.groupId === groupId);
    messages.forEach(([id]) => chatMessages.delete(id));
    return messages.length;
  },
  
  async deleteChatGroup(id: string) {
    return chatGroups.delete(id);
  },
  
  async getTickets(userId?: string) {
    const allTickets = Array.from(tickets.values());
    return userId ? allTickets.filter(t => t.userId === userId) : allTickets;
  },
  
  async getTicket(id: string) {
    return tickets.get(id);
  },
  
  async getTicketById(id: string) {
    return tickets.get(id);
  },
  
  async createTicket(ticket: any) {
    const id = generateId();
    const newTicket = { id, ...ticket, status: "open", createdAt: new Date() };
    tickets.set(id, newTicket);
    return newTicket;
  },
  
  async updateTicket(id: string, updates: any) {
    const ticket = tickets.get(id);
    if (!ticket) return undefined;
    const updated = { ...ticket, ...updates };
    tickets.set(id, updated);
    return updated;
  },
  
  async deleteTicket(id: string) {
    return tickets.delete(id);
  },
  
  async getTicketMessages(ticketId: string) {
    return Array.from(ticketMessages.values()).filter(m => m.ticketId === ticketId);
  },
  
  async createTicketMessage(msg: any) {
    const id = generateId();
    const newMsg = { id, ...msg, createdAt: new Date() };
    ticketMessages.set(id, newMsg);
    return newMsg;
  },
  
  async getStats() {
    return {
      totalUsers: users.size,
      totalEvents: events.size,
      totalMessages: chatMessages.size,
      totalTickets: tickets.size,
    };
  },
  
  async getAnnouncements() {
    return Array.from(announcements.values()).filter(a => a.isActive);
  },
  
  async getActiveAnnouncement() {
    const active = Array.from(announcements.values()).filter(a => a.isActive);
    return active.length > 0 ? active[0] : undefined;
  },
  
  async getAnnouncement(id: string) {
    return announcements.get(id);
  },
  
  async createAnnouncement(announcement: any) {
    const id = generateId();
    const newAnn = { id, ...announcement, createdAt: new Date(), isActive: true };
    announcements.set(id, newAnn);
    return newAnn;
  },
  
  async updateAnnouncement(id: string, updates: any) {
    const ann = announcements.get(id);
    if (!ann) return undefined;
    const updated = { ...ann, ...updates };
    announcements.set(id, updated);
    return updated;
  },
  
  async deleteAnnouncement(id: string) {
    return announcements.delete(id);
  },
  
  async getBanners() {
    return Array.from(banners.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  },
  
  async getActiveBanners() {
    return Array.from(banners.values()).filter(b => b.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  },
  
  async getBanner(id: string) {
    return banners.get(id);
  },
  
  async createBanner(banner: any) {
    const id = generateId();
    const maxOrder = Math.max(0, ...Array.from(banners.values()).map(b => b.displayOrder));
    const newBanner = { id, ...banner, displayOrder: banner.displayOrder ?? maxOrder + 1, createdAt: new Date() };
    banners.set(id, newBanner);
    return newBanner;
  },
  
  async updateBanner(id: string, updates: any) {
    const banner = banners.get(id);
    if (!banner) return undefined;
    const updated = { ...banner, ...updates };
    banners.set(id, updated);
    return updated;
  },
  
  async deleteBanner(id: string) {
    return banners.delete(id);
  },
  
  async seedInitialData() {
    if (users.size > 0) return;
    
    const admin = await this.createUser({
      username: "admin",
      password: "admin123",
      displayName: "Platform Admin",
      role: "ADMIN",
      level: 50,
      isOnline: true,
    });
    
    await this.createUser({
      username: "moderator",
      password: "mod123",
      displayName: "Moderator",
      role: "MOD",
      level: 30,
      isOnline: true,
    });
    
    await this.createUser({
      username: "vipuser",
      password: "vip123",
      displayName: "VIP Uye",
      role: "VIP",
      level: 20,
      isOnline: false,
    });
    
    await this.createAnnouncement({
      content: "Platforma hoş geldiniz! Test modunda çalışıyoruz.",
      isActive: true,
      createdBy: admin.id,
    });
  },
  
  async getEmbeddedSites() {
    return Array.from(embeddedSites.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  },
  
  async getActiveEmbeddedSites() {
    return Array.from(embeddedSites.values()).filter(s => s.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  },
  
  async getEmbeddedSite(id: string) {
    return embeddedSites.get(id);
  },
  
  async createEmbeddedSite(site: any) {
    const id = generateId();
    const maxOrder = Math.max(0, ...Array.from(embeddedSites.values()).map(s => s.displayOrder));
    const newSite = { id, ...site, displayOrder: site.displayOrder ?? maxOrder + 1, createdAt: new Date() };
    embeddedSites.set(id, newSite);
    return newSite;
  },
  
  async updateEmbeddedSite(id: string, updates: any) {
    const site = embeddedSites.get(id);
    if (!site) return undefined;
    const updated = { ...site, ...updates };
    embeddedSites.set(id, updated);
    return updated;
  },
  
  async deleteEmbeddedSite(id: string) {
    return embeddedSites.delete(id);
  },
  
  async getVipApps() {
    return [];
  },
  
  async getVipApp(id: string) {
    return undefined;
  },
  
  async createVipApp(app: any) {
    const id = generateId();
    return { id, ...app, createdAt: new Date() };
  },
  
  async updateVipApp(id: string, updates: any) {
    return undefined;
  },
  
  async deleteVipApp(id: string) {
    return false;
  },
  
  async getSettings() {
    return Array.from(settings.values());
  },
  
  async getSetting(key: string) {
    return settings.get(key);
  },
  
  async setSetting(key: string, value: string) {
    const setting = { key, value };
    settings.set(key, setting);
    return setting;
  },

  async getAllNews() {
    return Array.from(news.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getPublishedNews() {
    return Array.from(news.values())
      .filter(n => n.isPublished)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getNewsById(id: string) {
    return news.get(id);
  },

  async createNews(newsData: any) {
    const id = generateId();
    const newNews = { 
      id, 
      ...newsData, 
      viewCount: 0,
      likeCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    news.set(id, newNews);
    return newNews;
  },

  async updateNews(id: string, updates: any) {
    const newsItem = news.get(id);
    if (!newsItem) return undefined;
    const updated = { ...newsItem, ...updates, updatedAt: new Date() };
    news.set(id, updated);
    return updated;
  },

  async deleteNews(id: string) {
    const comments = Array.from(newsComments.values()).filter(c => c.newsId === id);
    comments.forEach(c => newsComments.delete(c.id));
    const likes = Array.from(newsLikes.values()).filter(l => l.newsId === id);
    likes.forEach(l => newsLikes.delete(l.id));
    return news.delete(id);
  },

  async incrementNewsView(id: string) {
    const newsItem = news.get(id);
    if (!newsItem) return undefined;
    newsItem.viewCount = (newsItem.viewCount || 0) + 1;
    news.set(id, newsItem);
    return newsItem;
  },

  async getNewsComments(newsId: string) {
    return Array.from(newsComments.values())
      .filter(c => c.newsId === newsId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createNewsComment(comment: any) {
    const id = generateId();
    const newComment = { id, ...comment, createdAt: new Date() };
    newsComments.set(id, newComment);
    return newComment;
  },

  async deleteNewsComment(id: string) {
    return newsComments.delete(id);
  },

  async getUserNewsLike(newsId: string, userId: string) {
    return Array.from(newsLikes.values()).find(l => l.newsId === newsId && l.userId === userId);
  },

  async createNewsLike(newsId: string, userId: string) {
    const id = generateId();
    const like = { id, newsId, userId, createdAt: new Date() };
    newsLikes.set(id, like);
    
    const newsItem = news.get(newsId);
    if (newsItem) {
      newsItem.likeCount = (newsItem.likeCount || 0) + 1;
      news.set(newsId, newsItem);
    }
    
    return like;
  },

  async deleteNewsLike(newsId: string, userId: string) {
    const like = Array.from(newsLikes.values()).find(l => l.newsId === newsId && l.userId === userId);
    if (!like) return false;
    
    newsLikes.delete(like.id);
    
    const newsItem = news.get(newsId);
    if (newsItem) {
      newsItem.likeCount = Math.max(0, (newsItem.likeCount || 0) - 1);
      news.set(newsId, newsItem);
    }
    
    return true;
  },
};
