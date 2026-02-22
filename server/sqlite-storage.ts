import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import type { IStorage } from "./storage";

const genId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const toDate = (v: any): Date | null => (v ? new Date(v) : null);
const toArr = (v: any): string[] | null => {
  if (!v) return null;
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return null; }
};
const fromArr = (v: any): string | null =>
  Array.isArray(v) ? JSON.stringify(v) : (v ?? null);
const toBool = (v: any): boolean => v === 1 || v === true || v === "true";

function mapUser(r: any) {
  if (!r) return undefined;
  let specialPerms: any = null;
  if (r.specialPerms) {
    try { specialPerms = JSON.parse(r.specialPerms); } catch {}
  }
  return {
    ...r,
    isOnline: toBool(r.isOnline),
    isBanned: toBool(r.isBanned),
    createdAt: toDate(r.createdAt),
    specialPerms,
  };
}

function mapEvent(r: any) {
  if (!r) return undefined;
  return {
    ...r,
    isLive: toBool(r.isLive),
    participants: toArr(r.participants),
    scheduledAt: toDate(r.scheduledAt),
    createdAt: toDate(r.createdAt),
  };
}

function mapGroup(r: any) {
  if (!r) return undefined;
  return {
    ...r,
    isPrivate: toBool(r.isPrivate),
    participants: toArr(r.participants),
    createdAt: toDate(r.createdAt),
  };
}

function mapMsg(r: any) {
  if (!r) return undefined;
  return { ...r, createdAt: toDate(r.createdAt) };
}

function mapTicket(r: any) {
  if (!r) return undefined;
  return { ...r, attachments: toArr(r.attachments), createdAt: toDate(r.createdAt) };
}

function mapTicketMsg(r: any) {
  if (!r) return undefined;
  return { ...r, attachments: toArr(r.attachments), createdAt: toDate(r.createdAt) };
}

function mapAnn(r: any) {
  if (!r) return undefined;
  return { ...r, isActive: toBool(r.isActive), createdAt: toDate(r.createdAt) };
}

function mapBanner(r: any) {
  if (!r) return undefined;
  return { ...r, isActive: toBool(r.isActive), createdAt: toDate(r.createdAt) };
}

function mapSite(r: any) {
  if (!r) return undefined;
  return { ...r, isActive: toBool(r.isActive), createdAt: toDate(r.createdAt) };
}

function mapVipApp(r: any) {
  if (!r) return undefined;
  return { ...r, createdAt: toDate(r.createdAt) };
}

function mapNews(r: any) {
  if (!r) return undefined;
  return {
    ...r,
    isPublished: toBool(r.isPublished),
    createdAt: toDate(r.createdAt),
    updatedAt: toDate(r.updatedAt),
  };
}

function mapNewsComment(r: any) {
  if (!r) return undefined;
  return { ...r, createdAt: toDate(r.createdAt) };
}

function mapNewsLike(r: any) {
  if (!r) return undefined;
  return { ...r, createdAt: toDate(r.createdAt) };
}

function createSqliteDb(): Database.Database {
  const dbDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "database.sqlite");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      displayName TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      avatar TEXT,
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      isOnline INTEGER NOT NULL DEFAULT 0,
      isBanned INTEGER NOT NULL DEFAULT 0,
      specialPerms TEXT DEFAULT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      agencyName TEXT NOT NULL,
      agencyLogo TEXT,
      participant1Name TEXT,
      participant1Avatar TEXT,
      participant2Name TEXT,
      participant2Avatar TEXT,
      participantCount INTEGER NOT NULL DEFAULT 0,
      participants TEXT,
      scheduledAt TEXT NOT NULL,
      isLive INTEGER NOT NULL DEFAULT 0,
      createdBy TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      requiredRole TEXT NOT NULL DEFAULT 'USER',
      isPrivate INTEGER NOT NULL DEFAULT 0,
      participants TEXT,
      createdBy TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'OTHER',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      attachments TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ticket_messages (
      id TEXT PRIMARY KEY,
      ticketId TEXT NOT NULL,
      userId TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      message TEXT NOT NULL,
      attachments TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdBy TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS banners (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      imageUrl TEXT,
      ctaLabel TEXT,
      ctaUrl TEXT,
      animationType TEXT NOT NULL DEFAULT 'fade',
      isActive INTEGER NOT NULL DEFAULT 1,
      displayOrder INTEGER NOT NULL DEFAULT 0,
      createdBy TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vip_apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      downloadUrl TEXT NOT NULL,
      version TEXT NOT NULL,
      size TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS embedded_sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      url TEXT NOT NULL,
      imageUrl TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      displayOrder INTEGER NOT NULL DEFAULT 0,
      createdBy TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      imageUrl TEXT,
      videoUrl TEXT,
      externalLink TEXT,
      category TEXT NOT NULL DEFAULT 'Genel',
      isPublished INTEGER NOT NULL DEFAULT 1,
      viewCount INTEGER NOT NULL DEFAULT 0,
      likeCount INTEGER NOT NULL DEFAULT 0,
      createdBy TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS news_comments (
      id TEXT PRIMARY KEY,
      newsId TEXT NOT NULL,
      userId TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS news_likes (
      id TEXT PRIMARY KEY,
      newsId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(newsId, userId)
    );
  `);

  // Mevcut DB'ye xp kolonu ekle (migration — zaten varsa hata vermez)
  try { db.exec("ALTER TABLE users ADD COLUMN xp INTEGER NOT NULL DEFAULT 0"); } catch {}
  // specialPerms kolonu migration
  try { db.exec("ALTER TABLE users ADD COLUMN specialPerms TEXT DEFAULT NULL"); } catch {}

  return db;
}

// XP'den level hesapla (max 500)
export function calculateLevel(xp: number): number {
  return Math.min(500, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
}

export class SqliteStorage implements IStorage {
  private db: Database.Database;

  constructor() {
    this.db = createSqliteDb();
  }

  async getUser(id: string) {
    return mapUser(this.db.prepare("SELECT * FROM users WHERE id = ?").get(id));
  }

  async getUserByUsername(username: string) {
    return mapUser(this.db.prepare("SELECT * FROM users WHERE username = ?").get(username));
  }

  async createUser(user: any) {
    const id = genId();
    this.db.prepare(`
      INSERT INTO users (id, username, password, displayName, role, avatar, level, xp, isOnline, isBanned, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user.username, user.password, user.displayName, user.role || "USER", user.avatar ?? null, user.level ?? 1, 0, 1, 0, now());
    return mapUser(this.db.prepare("SELECT * FROM users WHERE id = ?").get(id))!;
  }

  async addUserXP(userId: string, amount: number): Promise<{ xp: number; level: number }> {
    const row: any = this.db.prepare("SELECT xp FROM users WHERE id = ?").get(userId);
    const newXp = ((row?.xp) || 0) + amount;
    const newLevel = calculateLevel(newXp);
    this.db.prepare("UPDATE users SET xp = ?, level = ? WHERE id = ?").run(newXp, newLevel, userId);
    return { xp: newXp, level: newLevel };
  }

  async getAllUsers() {
    return (this.db.prepare("SELECT * FROM users").all() as any[]).map(mapUser);
  }

  async updateUser(id: string, updates: any) {
    const user = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    if (!user) return undefined;
    const merged = { ...user, ...updates };
    const specialPermsJson = merged.specialPerms !== undefined
      ? (merged.specialPerms === null ? null : JSON.stringify(merged.specialPerms))
      : user.specialPerms;
    this.db.prepare(`
      UPDATE users SET username=?, password=?, displayName=?, role=?, avatar=?, level=?, isOnline=?, isBanned=?, specialPerms=? WHERE id=?
    `).run(merged.username, merged.password, merged.displayName, merged.role, merged.avatar ?? null, merged.level, merged.isOnline ? 1 : 0, merged.isBanned ? 1 : 0, specialPermsJson, id);
    return mapUser(this.db.prepare("SELECT * FROM users WHERE id = ?").get(id));
  }

  async createUserByAdmin(user: any) {
    const id = genId();
    this.db.prepare(`
      INSERT INTO users (id, username, password, displayName, role, level, isOnline, isBanned, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
    `).run(id, user.username, user.password, user.displayName, user.role, user.level ?? 1, now());
    return mapUser(this.db.prepare("SELECT * FROM users WHERE id = ?").get(id))!;
  }

  async deleteUser(id: string) {
    const r = this.db.prepare("DELETE FROM users WHERE id = ?").run(id);
    return r.changes > 0;
  }

  async getEvents() {
    return (this.db.prepare("SELECT * FROM events ORDER BY scheduledAt ASC").all() as any[]).map(mapEvent);
  }

  async getEvent(id: string) {
    return mapEvent(this.db.prepare("SELECT * FROM events WHERE id = ?").get(id));
  }

  async createEvent(event: any) {
    const id = genId();
    this.db.prepare(`
      INSERT INTO events (id, title, description, agencyName, agencyLogo, participant1Name, participant1Avatar,
        participant2Name, participant2Avatar, participantCount, participants, scheduledAt, isLive, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, event.title, event.description ?? null, event.agencyName, event.agencyLogo ?? null,
      event.participant1Name ?? null, event.participant1Avatar ?? null,
      event.participant2Name ?? null, event.participant2Avatar ?? null,
      event.participantCount ?? 0, fromArr(event.participants),
      event.scheduledAt instanceof Date ? event.scheduledAt.toISOString() : event.scheduledAt,
      event.isLive ? 1 : 0, event.createdBy, now());
    return mapEvent(this.db.prepare("SELECT * FROM events WHERE id = ?").get(id))!;
  }

  async getChatGroups() {
    return (this.db.prepare("SELECT * FROM chat_groups").all() as any[]).map(mapGroup);
  }

  async getChatGroup(id: string) {
    return mapGroup(this.db.prepare("SELECT * FROM chat_groups WHERE id = ?").get(id));
  }

  async createChatGroup(group: any) {
    const id = genId();
    this.db.prepare(`
      INSERT INTO chat_groups (id, name, description, requiredRole, isPrivate, participants, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, group.name, group.description ?? null, group.requiredRole ?? "USER",
      group.isPrivate ? 1 : 0, fromArr(group.participants), group.createdBy, now());
    return mapGroup(this.db.prepare("SELECT * FROM chat_groups WHERE id = ?").get(id))!;
  }

  async getChatMessages(groupId: string) {
    return (this.db.prepare("SELECT * FROM chat_messages WHERE groupId = ? ORDER BY createdAt ASC").all(groupId) as any[]).map(mapMsg);
  }

  async createChatMessage(message: any) {
    const id = genId();
    this.db.prepare(`
      INSERT INTO chat_messages (id, groupId, userId, content, createdAt) VALUES (?, ?, ?, ?, ?)
    `).run(id, message.groupId, message.userId, message.content, now());
    return mapMsg(this.db.prepare("SELECT * FROM chat_messages WHERE id = ?").get(id))!;
  }

  async deleteChatMessage(id: string) {
    return this.db.prepare("DELETE FROM chat_messages WHERE id = ?").run(id).changes > 0;
  }

  async deleteGroupMessages(groupId: string) {
    return this.db.prepare("DELETE FROM chat_messages WHERE groupId = ?").run(groupId).changes;
  }

  async deleteChatGroup(id: string) {
    this.deleteGroupMessages(id);
    return this.db.prepare("DELETE FROM chat_groups WHERE id = ?").run(id).changes > 0;
  }

  async getTickets(userId?: string) {
    if (userId) {
      return (this.db.prepare("SELECT * FROM tickets WHERE userId = ? ORDER BY createdAt DESC").all(userId) as any[]).map(mapTicket);
    }
    return (this.db.prepare("SELECT * FROM tickets ORDER BY createdAt DESC").all() as any[]).map(mapTicket);
  }

  async getTicket(id: string) {
    return mapTicket(this.db.prepare("SELECT * FROM tickets WHERE id = ?").get(id));
  }

  async getTicketById(id: string) {
    return this.getTicket(id);
  }

  async createTicket(ticket: any) {
    const id = genId();
    this.db.prepare(`
      INSERT INTO tickets (id, userId, category, subject, message, attachments, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
    `).run(id, ticket.userId, ticket.category ?? "OTHER", ticket.subject, ticket.message, fromArr(ticket.attachments), now());
    return mapTicket(this.db.prepare("SELECT * FROM tickets WHERE id = ?").get(id))!;
  }

  async updateTicket(id: string, updates: any) {
    const ticket = this.db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as any;
    if (!ticket) return undefined;
    const merged = { ...ticket, ...updates };
    this.db.prepare(`
      UPDATE tickets SET category=?, subject=?, message=?, attachments=?, status=? WHERE id=?
    `).run(merged.category, merged.subject, merged.message, fromArr(merged.attachments), merged.status, id);
    return mapTicket(this.db.prepare("SELECT * FROM tickets WHERE id = ?").get(id));
  }

  async deleteTicket(id: string) {
    return this.db.prepare("DELETE FROM tickets WHERE id = ?").run(id).changes > 0;
  }

  async getTicketMessages(ticketId: string) {
    return (this.db.prepare("SELECT * FROM ticket_messages WHERE ticketId = ? ORDER BY createdAt ASC").all(ticketId) as any[]).map(mapTicketMsg);
  }

  async createTicketMessage(msg: any) {
    const id = genId();
    this.db.prepare(`
      INSERT INTO ticket_messages (id, ticketId, userId, role, message, attachments, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, msg.ticketId, msg.userId, msg.role ?? "USER", msg.message, fromArr(msg.attachments), now());
    return mapTicketMsg(this.db.prepare("SELECT * FROM ticket_messages WHERE id = ?").get(id))!;
  }

  async getStats() {
    const totalUsers = (this.db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
    const totalEvents = (this.db.prepare("SELECT COUNT(*) as c FROM events").get() as any).c;
    const totalMessages = (this.db.prepare("SELECT COUNT(*) as c FROM chat_messages").get() as any).c;
    const totalTickets = (this.db.prepare("SELECT COUNT(*) as c FROM tickets").get() as any).c;
    return { totalUsers, totalEvents, totalMessages, totalTickets };
  }

  async getAnnouncements() {
    return (this.db.prepare("SELECT * FROM announcements WHERE isActive = 1 ORDER BY createdAt DESC").all() as any[]).map(mapAnn);
  }

  async getActiveAnnouncement() {
    return mapAnn(this.db.prepare("SELECT * FROM announcements WHERE isActive = 1 LIMIT 1").get());
  }

  async getAnnouncement(id: string) {
    return mapAnn(this.db.prepare("SELECT * FROM announcements WHERE id = ?").get(id));
  }

  async createAnnouncement(announcement: any) {
    this.db.prepare("UPDATE announcements SET isActive = 0").run();
    const id = genId();
    this.db.prepare(`
      INSERT INTO announcements (id, content, isActive, createdBy, createdAt) VALUES (?, ?, 1, ?, ?)
    `).run(id, announcement.content, announcement.createdBy, now());
    return mapAnn(this.db.prepare("SELECT * FROM announcements WHERE id = ?").get(id))!;
  }

  async updateAnnouncement(id: string, updates: any) {
    const ann = this.db.prepare("SELECT * FROM announcements WHERE id = ?").get(id) as any;
    if (!ann) return undefined;
    const merged = { ...ann, ...updates };
    this.db.prepare("UPDATE announcements SET content=?, isActive=? WHERE id=?")
      .run(merged.content, merged.isActive ? 1 : 0, id);
    return mapAnn(this.db.prepare("SELECT * FROM announcements WHERE id = ?").get(id));
  }

  async deleteAnnouncement(id: string) {
    return this.db.prepare("DELETE FROM announcements WHERE id = ?").run(id).changes > 0;
  }

  async getSetting(key: string) {
    const r = this.db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as any;
    return r?.value;
  }

  async setSetting(key: string, value: string) {
    this.db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .run(key, value);
  }

  async getVipApps() {
    return (this.db.prepare("SELECT * FROM vip_apps ORDER BY createdAt DESC").all() as any[]).map(mapVipApp);
  }

  async getVipApp(id: string) {
    return mapVipApp(this.db.prepare("SELECT * FROM vip_apps WHERE id = ?").get(id));
  }

  async createVipApp(app: any) {
    const id = genId();
    this.db.prepare(`
      INSERT INTO vip_apps (id, name, description, imageUrl, downloadUrl, version, size, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, app.name, app.description, app.imageUrl, app.downloadUrl, app.version, app.size, now());
    return mapVipApp(this.db.prepare("SELECT * FROM vip_apps WHERE id = ?").get(id))!;
  }

  async updateVipApp(id: string, updates: any) {
    const app = this.db.prepare("SELECT * FROM vip_apps WHERE id = ?").get(id) as any;
    if (!app) return undefined;
    const merged = { ...app, ...updates };
    this.db.prepare(`
      UPDATE vip_apps SET name=?, description=?, imageUrl=?, downloadUrl=?, version=?, size=? WHERE id=?
    `).run(merged.name, merged.description, merged.imageUrl, merged.downloadUrl, merged.version, merged.size, id);
    return mapVipApp(this.db.prepare("SELECT * FROM vip_apps WHERE id = ?").get(id));
  }

  async deleteVipApp(id: string) {
    return this.db.prepare("DELETE FROM vip_apps WHERE id = ?").run(id).changes > 0;
  }

  async getBanners() {
    return (this.db.prepare("SELECT * FROM banners ORDER BY displayOrder ASC").all() as any[]).map(mapBanner);
  }

  async getActiveBanners() {
    return (this.db.prepare("SELECT * FROM banners WHERE isActive = 1 ORDER BY displayOrder ASC").all() as any[]).map(mapBanner);
  }

  async getBanner(id: string) {
    return mapBanner(this.db.prepare("SELECT * FROM banners WHERE id = ?").get(id));
  }

  async createBanner(banner: any) {
    const maxRow = this.db.prepare("SELECT MAX(displayOrder) as m FROM banners").get() as any;
    const maxOrder = maxRow?.m ?? 0;
    const id = genId();
    this.db.prepare(`
      INSERT INTO banners (id, title, description, imageUrl, ctaLabel, ctaUrl, animationType, isActive, displayOrder, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, banner.title ?? null, banner.description ?? null, banner.imageUrl ?? null,
      banner.ctaLabel ?? null, banner.ctaUrl ?? null, banner.animationType ?? "fade",
      banner.isActive !== false ? 1 : 0, banner.displayOrder ?? maxOrder + 1, banner.createdBy, now());
    return mapBanner(this.db.prepare("SELECT * FROM banners WHERE id = ?").get(id))!;
  }

  async updateBanner(id: string, updates: any) {
    const banner = this.db.prepare("SELECT * FROM banners WHERE id = ?").get(id) as any;
    if (!banner) return undefined;
    const merged = { ...banner, ...updates };
    this.db.prepare(`
      UPDATE banners SET title=?, description=?, imageUrl=?, ctaLabel=?, ctaUrl=?, animationType=?, isActive=?, displayOrder=? WHERE id=?
    `).run(merged.title ?? null, merged.description ?? null, merged.imageUrl ?? null,
      merged.ctaLabel ?? null, merged.ctaUrl ?? null, merged.animationType ?? "fade",
      merged.isActive ? 1 : 0, merged.displayOrder, id);
    return mapBanner(this.db.prepare("SELECT * FROM banners WHERE id = ?").get(id));
  }

  async deleteBanner(id: string) {
    return this.db.prepare("DELETE FROM banners WHERE id = ?").run(id).changes > 0;
  }

  async getEmbeddedSites() {
    return (this.db.prepare("SELECT * FROM embedded_sites ORDER BY displayOrder ASC").all() as any[]).map(mapSite);
  }

  async getActiveEmbeddedSites() {
    return (this.db.prepare("SELECT * FROM embedded_sites WHERE isActive = 1 ORDER BY displayOrder ASC").all() as any[]).map(mapSite);
  }

  async getEmbeddedSite(id: string) {
    return mapSite(this.db.prepare("SELECT * FROM embedded_sites WHERE id = ?").get(id));
  }

  async createEmbeddedSite(site: any) {
    const maxRow = this.db.prepare("SELECT MAX(displayOrder) as m FROM embedded_sites").get() as any;
    const maxOrder = maxRow?.m ?? 0;
    const id = genId();
    this.db.prepare(`
      INSERT INTO embedded_sites (id, name, description, category, url, imageUrl, isActive, displayOrder, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, site.name, site.description ?? null, site.category, site.url, site.imageUrl ?? null,
      site.isActive !== false ? 1 : 0, site.displayOrder ?? maxOrder + 1, site.createdBy, now());
    return mapSite(this.db.prepare("SELECT * FROM embedded_sites WHERE id = ?").get(id))!;
  }

  async updateEmbeddedSite(id: string, updates: any) {
    const site = this.db.prepare("SELECT * FROM embedded_sites WHERE id = ?").get(id) as any;
    if (!site) return undefined;
    const merged = { ...site, ...updates };
    this.db.prepare(`
      UPDATE embedded_sites SET name=?, description=?, category=?, url=?, imageUrl=?, isActive=?, displayOrder=? WHERE id=?
    `).run(merged.name, merged.description ?? null, merged.category, merged.url, merged.imageUrl ?? null,
      merged.isActive ? 1 : 0, merged.displayOrder, id);
    return mapSite(this.db.prepare("SELECT * FROM embedded_sites WHERE id = ?").get(id));
  }

  async deleteEmbeddedSite(id: string) {
    return this.db.prepare("DELETE FROM embedded_sites WHERE id = ?").run(id).changes > 0;
  }

  async getAllNews() {
    return (this.db.prepare("SELECT * FROM news ORDER BY createdAt DESC").all() as any[]).map(mapNews);
  }

  async getPublishedNews() {
    return (this.db.prepare("SELECT * FROM news WHERE isPublished = 1 ORDER BY createdAt DESC").all() as any[]).map(mapNews);
  }

  async getNewsById(id: string) {
    return mapNews(this.db.prepare("SELECT * FROM news WHERE id = ?").get(id));
  }

  async createNews(newsData: any) {
    const id = genId();
    this.db.prepare(`
      INSERT INTO news (id, title, content, summary, imageUrl, videoUrl, externalLink, category, isPublished, viewCount, likeCount, createdBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
    `).run(id, newsData.title, newsData.content, newsData.summary ?? null, newsData.imageUrl ?? null,
      newsData.videoUrl ?? null, newsData.externalLink ?? null, newsData.category ?? "Genel",
      newsData.isPublished !== false ? 1 : 0, newsData.createdBy, now(), now());
    return mapNews(this.db.prepare("SELECT * FROM news WHERE id = ?").get(id))!;
  }

  async updateNews(id: string, updates: any) {
    const item = this.db.prepare("SELECT * FROM news WHERE id = ?").get(id) as any;
    if (!item) return undefined;
    const merged = { ...item, ...updates };
    this.db.prepare(`
      UPDATE news SET title=?, content=?, summary=?, imageUrl=?, videoUrl=?, externalLink=?, category=?, isPublished=?, updatedAt=? WHERE id=?
    `).run(merged.title, merged.content, merged.summary ?? null, merged.imageUrl ?? null,
      merged.videoUrl ?? null, merged.externalLink ?? null, merged.category, merged.isPublished ? 1 : 0, now(), id);
    return mapNews(this.db.prepare("SELECT * FROM news WHERE id = ?").get(id));
  }

  async deleteNews(id: string) {
    this.db.prepare("DELETE FROM news_comments WHERE newsId = ?").run(id);
    this.db.prepare("DELETE FROM news_likes WHERE newsId = ?").run(id);
    return this.db.prepare("DELETE FROM news WHERE id = ?").run(id).changes > 0;
  }

  async incrementNewsView(id: string) {
    this.db.prepare("UPDATE news SET viewCount = viewCount + 1 WHERE id = ?").run(id);
    return mapNews(this.db.prepare("SELECT * FROM news WHERE id = ?").get(id));
  }

  async getNewsComments(newsId: string) {
    return (this.db.prepare("SELECT * FROM news_comments WHERE newsId = ? ORDER BY createdAt DESC").all(newsId) as any[]).map(mapNewsComment);
  }

  async createNewsComment(comment: any) {
    const id = genId();
    this.db.prepare(`
      INSERT INTO news_comments (id, newsId, userId, content, createdAt) VALUES (?, ?, ?, ?, ?)
    `).run(id, comment.newsId, comment.userId, comment.content, now());
    return mapNewsComment(this.db.prepare("SELECT * FROM news_comments WHERE id = ?").get(id))!;
  }

  async deleteNewsComment(id: string) {
    return this.db.prepare("DELETE FROM news_comments WHERE id = ?").run(id).changes > 0;
  }

  async getUserNewsLike(newsId: string, userId: string) {
    return mapNewsLike(this.db.prepare("SELECT * FROM news_likes WHERE newsId = ? AND userId = ?").get(newsId, userId));
  }

  async createNewsLike(newsId: string, userId: string) {
    const id = genId();
    this.db.prepare(`
      INSERT OR IGNORE INTO news_likes (id, newsId, userId, createdAt) VALUES (?, ?, ?, ?)
    `).run(id, newsId, userId, now());
    this.db.prepare("UPDATE news SET likeCount = likeCount + 1 WHERE id = ?").run(newsId);
    return mapNewsLike(this.db.prepare("SELECT * FROM news_likes WHERE newsId = ? AND userId = ?").get(newsId, userId))!;
  }

  async deleteNewsLike(newsId: string, userId: string) {
    const r = this.db.prepare("DELETE FROM news_likes WHERE newsId = ? AND userId = ?").run(newsId, userId);
    if (r.changes > 0) {
      this.db.prepare("UPDATE news SET likeCount = MAX(0, likeCount - 1) WHERE id = ?").run(newsId);
      return true;
    }
    return false;
  }

  async seedInitialData() {
    const existing = this.db.prepare("SELECT COUNT(*) as c FROM users").get() as any;
    if (existing.c > 0) return;

    const adminId = genId();
    const modId = genId();

    this.db.prepare(`
      INSERT INTO users (id, username, password, displayName, role, level, isOnline, isBanned, createdAt)
      VALUES (?, 'admin', 'admin123', 'Platform Admin', 'ADMIN', 50, 1, 0, ?)
    `).run(adminId, now());

    this.db.prepare(`
      INSERT INTO users (id, username, password, displayName, role, level, isOnline, isBanned, createdAt)
      VALUES (?, 'moderator', 'mod123', 'Moderator', 'MOD', 30, 1, 0, ?)
    `).run(modId, now());

    this.db.prepare(`
      INSERT INTO users (id, username, password, displayName, role, level, isOnline, isBanned, createdAt)
      VALUES (?, 'vipuser', 'vip123', 'VIP Uye', 'VIP', 20, 0, 0, ?)
    `).run(genId(), now());

    const chatGroups = [
      { name: "Genel Sohbet", description: "Herkese acik genel sohbet grubu", requiredRole: "USER" },
      { name: "VIP Lounge", description: "VIP uyelere ozel sohbet alani", requiredRole: "VIP" },
      { name: "Yonetim Sohbeti", description: "Admin ve moderator ozel sohbet alani", requiredRole: "MOD" },
    ];
    for (const g of chatGroups) {
      this.db.prepare(`
        INSERT INTO chat_groups (id, name, description, requiredRole, isPrivate, createdBy, createdAt)
        VALUES (?, ?, ?, ?, 0, ?, ?)
      `).run(genId(), g.name, g.description, g.requiredRole, adminId, now());
    }

    this.db.prepare(`
      INSERT INTO announcements (id, content, isActive, createdBy, createdAt)
      VALUES (?, 'Platforma hos geldiniz! Bu hafta ozel etkinlikler ve surprizler sizi bekliyor.', 1, ?, ?)
    `).run(genId(), adminId, now());
  }
}

export const sqliteStorage = new SqliteStorage();
