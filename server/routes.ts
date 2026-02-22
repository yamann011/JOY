import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  loginSchema,
  insertChatMessageSchema,
  insertTicketSchema,
  insertAnnouncementSchema,
  adminCreateUserSchema,
  insertBannerSchema,
  insertEmbeddedSiteSchema,
  insertNewsSchema,
  insertNewsCommentSchema,
} from "@shared/schema";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const JWT_SECRET = process.env.SESSION_SECRET || "platform-secret-key-2024";
const JWT_EXPIRES = "30d";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const jwtMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.["joy.token"];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      req.userId = payload.userId;
    } catch {}
  }
  next();
};

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.userId) {
    return res.status(401).json({ message: "Yetkisiz erişim" });
  }
  next();
};

const isAdmin = (role?: string) =>
  role === "ADMIN" || role === "AJANS_SAHIBI";

const isMod = (role?: string) =>
  isAdmin(role) || role === "MOD" || role === "ASISTAN";

function setAuthCookie(res: Response, userId: string) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.cookie("joy.token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await storage.seedInitialData();

  app.set("trust proxy", 1);
  app.use(cookieParser());
  app.use(jwtMiddleware);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, displayName } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Kullanıcı adı ve şifre gerekli" });
      }
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ message: "Kullanıcı adı 3-20 karakter olmalı" });
      }
      if (password.length < 4) {
        return res.status(400).json({ message: "Şifre en az 4 karakter olmalı" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Bu kullanıcı adı zaten alınmış" });
      }
      const user = await storage.createUser({
        username: username.trim(),
        password,
        displayName: (displayName || username).trim(),
        role: "user",
        level: 1,
      });
      setAuthCookie(res, user.id);
      const { password: _pw, ...userWithoutPassword } = user as any;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Kayıt başarısız" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user || user.password !== validatedData.password) {
        return res.status(401).json({ message: "Kullanıcı adı veya şifre hatalı" });
      }
      if ((user as any).isBanned) {
        return res.status(403).json({ message: "Hesabınız banlanmış. Lütfen destek ile iletişime geçin." });
      }
      await storage.updateUser(user.id, { isOnline: true });
      setAuthCookie(res, user.id);
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Giriş başarısız" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    if (req.userId) {
      await storage.updateUser(req.userId, { isOnline: false });
    }
    res.clearCookie("joy.token", { path: "/" });
    res.json({ message: "Çıkış başarılı" });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Oturum bulunamadı" });
    }
    const user = await storage.getUser(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    const { avatar, displayName } = req.body;
    const updates: Record<string, any> = {};

    if (avatar !== undefined) updates.avatar = avatar;
    if (displayName) updates.displayName = displayName;

    const user = await storage.updateUser(req.userId!, updates);
    if (!user) {
      return res.status(404).json({ message: "Kullanici bulunamadi" });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.get("/api/stats", requireAuth, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    const users = await storage.getAllUsers();
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  });

  app.get("/api/admin/users", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const users = await storage.getAllUsers();
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  });

  app.get("/api/events", requireAuth, async (req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!currentUser) return res.status(401).json({ message: "Yetkisiz" });
    const role = (currentUser.role || "").toUpperCase();
    if (role !== "ADMIN" && role !== "MOD" && role !== "AJANS_SAHIBI") {
      return res.status(403).json({ message: "Etkinlik oluşturma yetkin yok." });
    }
    const { title, description, agencyName, coverImage, scheduledAt, participantsData, isLive } = req.body;
    if (!title || !agencyName || !scheduledAt) {
      return res.status(400).json({ message: "Başlık, ajans adı ve tarih zorunludur." });
    }
    // participantsData: JSON string array of {name, avatar}
    let parsedParticipants: Array<{ name: string; avatar?: string }> = [];
    try {
      if (participantsData) parsedParticipants = JSON.parse(participantsData).slice(0, 8);
    } catch {}
    const p1 = parsedParticipants[0];
    const p2 = parsedParticipants[1];
    const event = await storage.createEvent({
      title,
      description: description || null,
      agencyName,
      agencyLogo: null,
      coverImage: coverImage || null,
      participant1Name: p1?.name || null,
      participant1Avatar: p1?.avatar || null,
      participant2Name: p2?.name || null,
      participant2Avatar: p2?.avatar || null,
      participantsData: participantsData || null,
      scheduledAt: new Date(scheduledAt),
      isLive: isLive === true,
      createdBy: currentUser.id,
    });
    res.status(201).json(event);
  });

  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!currentUser) return res.status(401).json({ message: "Yetkisiz" });
    const role = (currentUser.role || "").toUpperCase();
    if (role !== "ADMIN" && role !== "MOD" && role !== "AJANS_SAHIBI") {
      return res.status(403).json({ message: "Silme yetkin yok." });
    }
    await storage.deleteEvent(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/events/:id", requireAuth, async (req, res) => {
    const event = await storage.getEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Etkinlik bulunamadı" });
    }
    res.json(event);
  });

  app.get("/api/chat/groups", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!currentUser) {
      return res.status(401).json({ message: "Kullanici bulunamadi" });
    }

    const allGroups = await storage.getChatGroups();
    const roleHierarchy: Record<string, number> = {
      USER: 1,
      VIP: 2,
      MOD: 3,
      ADMIN: 4,
    };
    const userLevel = roleHierarchy[currentUser.role] || 1;

    const filteredGroups = allGroups.filter((group) => {
      if (group.isPrivate) {
        return group.participants?.includes(currentUser.id);
      }
      const requiredLevel = roleHierarchy[group.requiredRole || "USER"] || 1;
      return userLevel >= requiredLevel;
    });

    res.json(filteredGroups);
  });

  app.post("/api/chat/private", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isMod(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erisim" });
    }

    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: "Hedef kullanici gerekli" });
    }

    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "Kullanici bulunamadi" });
    }

    const allGroups = await storage.getChatGroups();
    const existingChat = allGroups.find(
      (g) =>
        g.isPrivate &&
        g.participants?.includes(currentUser.id) &&
        g.participants?.includes(targetUserId),
    );

    if (existingChat) {
      return res.json(existingChat);
    }

    const group = await storage.createChatGroup({
      name: `${currentUser.displayName} - ${targetUser.displayName}`,
      description: "Ozel sohbet",
      createdBy: currentUser.id,
      isPrivate: true,
      participants: [currentUser.id, targetUserId],
    });

    res.status(201).json(group);
  });

  app.get("/api/chat/messages", requireAuth, async (req, res) => {
    const groupId = req.query.groupId as string;
    if (!groupId) {
      return res.status(400).json({ message: "Group ID gerekli" });
    }

    const messages = await storage.getChatMessages(groupId);

    const messagesWithUsers = await Promise.all(
      messages.map(async (msg) => {
        const user = await storage.getUser(msg.userId);
        if (!user) {
          return { ...msg, user: null };
        }
        const { password, ...userWithoutPassword } = user;
        return { ...msg, user: userWithoutPassword };
      }),
    );

    res.json(messagesWithUsers);
  });

  app.post("/api/chat/messages", requireAuth, async (req, res) => {
    try {
      const validatedData = insertChatMessageSchema.parse(req.body);

      const message = await storage.createChatMessage({
        ...validatedData,
        userId: req.userId!,
      });

      const user = await storage.getUser(req.userId!);
      if (!user) {
        res.status(201).json({ ...message, user: null });
        return;
      }
      const { password, ...userWithoutPassword } = user;

      res.status(201).json({ ...message, user: userWithoutPassword });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Mesaj gönderilemedi" });
    }
  });

  app.post("/api/chat/groups", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isMod(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    try {
      const { name, description } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Grup adı gerekli" });
      }

      const group = await storage.createChatGroup({
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: req.userId!,
      });

      res.status(201).json(group);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Grup oluşturulamadı" });
    }
  });

  app.delete("/api/chat/groups/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const deleted = await storage.deleteChatGroup(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Grup bulunamadı" });
    }
    res.json({ message: "Grup silindi" });
  });

  app.get("/api/chat/groups/:id/messages", requireAuth, async (req, res) => {
    const messages = await storage.getChatMessages(req.params.id);

    const messagesWithUsers = await Promise.all(
      messages.map(async (msg) => {
        const user = await storage.getUser(msg.userId);
        if (!user) {
          return { ...msg, user: null };
        }
        const { password, ...userWithoutPassword } = user;
        return { ...msg, user: userWithoutPassword };
      }),
    );

    res.json(messagesWithUsers);
  });

  app.post("/api/chat/groups/:id/messages", requireAuth, async (req, res) => {
    try {
      const validatedData = insertChatMessageSchema.parse({
        ...req.body,
        groupId: req.params.id,
      });

      const message = await storage.createChatMessage({
        ...validatedData,
        userId: req.userId!,
      });

      const user = await storage.getUser(req.userId!);
      if (!user) {
        res.status(201).json({ ...message, user: null });
        return;
      }
      const { password, ...userWithoutPassword } = user;

      res.status(201).json({ ...message, user: userWithoutPassword });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Mesaj gönderilemedi" });
    }
  });

  app.delete("/api/chat/groups/:id/messages", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isMod(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const count = await storage.deleteGroupMessages(req.params.id);
    res.json({ message: `${count} mesaj silindi` });
  });

  app.delete("/api/chat/messages/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isMod(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const deleted = await storage.deleteChatMessage(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Mesaj bulunamadı" });
    }
    res.json({ message: "Mesaj silindi" });
  });

  app.get("/api/tickets", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);

    let tickets;
    if (isMod(currentUser?.role)) {
      tickets = await storage.getTickets();
    } else {
      tickets = await storage.getTickets(req.userId);
    }

    res.json(tickets);
  });

  app.get("/api/admin/tickets/recent", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const tickets = await storage.getTickets();
    res.json(tickets.slice(0, 10));
  });

  app.post("/api/tickets", requireAuth, async (req, res) => {
    try {
      const validatedData = insertTicketSchema.parse(req.body);

      const ticket = await storage.createTicket({
        ...validatedData,
        userId: req.userId!,
      });

      res.status(201).json(ticket);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Talep oluşturulamadı" });
    }
  });

  app.patch("/api/tickets/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isMod(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const ticket = await storage.updateTicket(req.params.id, req.body);
    if (!ticket) {
      return res.status(404).json({ message: "Talep bulunamadı" });
    }

    res.json(ticket);
  });

  app.get("/api/tickets/:id/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getTicketMessages(req.params.id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Mesajlar alınamadı" });
    }
  });

  app.post("/api/tickets/:id/messages", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.userId!);
      if (!currentUser) {
        return res.status(401).json({ message: "Oturum bulunamadı" });
      }

      const validatedData = insertTicketMessageSchema.parse(req.body);
      
      const message = await storage.createTicketMessage({
        ...validatedData,
        ticketId: req.params.id,
        userId: currentUser.id,
        role: currentUser.role || "USER",
      });

      if (isAdmin(currentUser.role)) {
        await storage.updateTicket(req.params.id, { status: "in_progress" });
      }

      res.status(201).json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Mesaj gönderilemedi" });
    }
  });

  app.get("/api/announcements", async (req, res) => {
    const announcements = await storage.getAnnouncements();
    res.json(announcements);
  });

  app.get("/api/announcements/active", async (req, res) => {
    const announcement = await storage.getActiveAnnouncement();
    res.json(announcement || null);
  });

  app.post("/api/admin/announcements", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    try {
      const validatedData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement({
        ...validatedData,
        createdBy: req.userId!,
      });
      res.status(201).json(announcement);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Duyuru oluşturulamadı" });
    }
  });

  app.delete("/api/admin/announcements/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const deleted = await storage.deleteAnnouncement(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Duyuru bulunamadı" });
    }
    res.json({ message: "Duyuru silindi" });
  });

  app.post("/api/admin/users", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    try {
      const validatedData = adminCreateUserSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }

      const user = await storage.createUserByAdmin(validatedData);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Kullanıcı oluşturulamadı" });
    }
  });

  app.patch("/api/admin/users/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { role, level, displayName, isBanned } = req.body;
    const updates: Record<string, any> = {};
    if (role) updates.role = role;
    if (level !== undefined) updates.level = level;
    if (displayName) updates.displayName = displayName;
    if (isBanned !== undefined) updates.isBanned = isBanned;

    const user = await storage.updateUser(req.params.id, updates);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post("/api/admin/users/:id/ban", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    if (req.params.id === req.userId) {
      return res.status(400).json({ message: "Kendinizi banlayamazsınız" });
    }

    const user = await storage.updateUser(req.params.id, { isBanned: true });
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post("/api/admin/users/:id/unban", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const user = await storage.updateUser(req.params.id, { isBanned: false });
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.delete("/api/admin/users/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    if (req.params.id === req.userId) {
      return res.status(400).json({ message: "Kendinizi silemezsiniz" });
    }

    const deleted = await storage.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }
    res.json({ message: "Kullanıcı silindi" });
  });

  app.patch("/api/admin/users/:id/special-perms", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    const { animatedName, gifAvatar, animatedCinema, expiresAt } = req.body;
    const perms: Record<string, any> = {};
    if (animatedName !== undefined) perms.animatedName = !!animatedName;
    if (gifAvatar !== undefined) perms.gifAvatar = !!gifAvatar;
    if (animatedCinema !== undefined) perms.animatedCinema = !!animatedCinema;
    perms.expiresAt = expiresAt || null;
    const user = await storage.updateUser(req.params.id, { specialPerms: perms });
    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    const { password: _pw, ...safe } = user as any;
    res.json(safe);
  });

  app.get("/api/settings/film", requireAuth, async (req, res) => {
    const filmUrl = await storage.getSetting("filmUrl");
    res.json({ filmUrl: filmUrl || "" });
  });

  app.post("/api/settings/film", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { filmUrl } = req.body;
    await storage.setSetting("filmUrl", filmUrl || "");
    res.json({ filmUrl: filmUrl || "" });
  });

  app.get("/api/settings/music", async (req, res) => {
    const musicUrl = await storage.getSetting("musicUrl");
    res.json({ musicUrl: musicUrl || "" });
  });

  app.post("/api/settings/music", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { musicUrl } = req.body;
    await storage.setSetting("musicUrl", musicUrl || "");
    res.json({ musicUrl: musicUrl || "" });
  });

  app.get("/api/vip/apps", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!currentUser || !["VIP", "MOD", "ADMIN"].includes(currentUser.role)) {
      return res.status(403).json({ message: "VIP erisimi gerekli" });
    }
    const apps = await storage.getVipApps();
    res.json(apps);
  });

  app.post("/api/vip/apps", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { name, description, imageUrl, downloadUrl, version, size } = req.body;
    if (!name || !downloadUrl) {
      return res.status(400).json({ message: "Uygulama adi ve indirme linki gerekli" });
    }

    const appObj = await storage.createVipApp({
      name,
      description: description || "",
      imageUrl: imageUrl || "",
      downloadUrl,
      version: version || "",
      size: size || "",
    });
    res.status(201).json(appObj);
  });

  app.delete("/api/vip/apps/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const deleted = await storage.deleteVipApp(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Uygulama bulunamadi" });
    }
    res.json({ success: true });
  });

  app.get("/api/banners", async (req, res) => {
    const banners = await storage.getActiveBanners();
    res.json(banners);
  });

  app.get("/api/admin/banners", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    const banners = await storage.getBanners();
    res.json(banners);
  });

  app.post("/api/admin/banners", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    try {
      const validatedData = insertBannerSchema.parse(req.body);
      const banner = await storage.createBanner({
        ...validatedData,
        createdBy: req.userId!,
      });
      res.status(201).json(banner);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Banner oluşturulamadı" });
    }
  });

  app.patch("/api/admin/banners/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const banner = await storage.updateBanner(req.params.id, req.body);
    if (!banner) {
      return res.status(404).json({ message: "Banner bulunamadı" });
    }
    res.json(banner);
  });

  app.delete("/api/admin/banners/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const deleted = await storage.deleteBanner(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Banner bulunamadı" });
    }
    res.json({ success: true });
  });

  app.get("/api/settings/featured-members", async (req, res) => {
    const data = await storage.getSetting("featuredMembers");
    if (!data) {
      return res.json({ member1: null, member2: null, member3: null });
    }
    try {
      const parsed = JSON.parse(data);
      res.json(parsed);
    } catch {
      res.json({ member1: null, member2: null, member3: null });
    }
  });

  app.post("/api/settings/featured-members", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { member1, member2, member3 } = req.body;
    const data = JSON.stringify({ member1, member2, member3 });
    await storage.setSetting("featuredMembers", data);
    res.json({ member1, member2, member3 });
  });

  app.get("/api/settings/branding", async (req, res) => {
    const data = await storage.getSetting("branding");
    if (!data) {
      return res.json({ siteName: "JOY", showFlag: true });
    }
    try {
      const parsed = JSON.parse(data);
      res.json(parsed);
    } catch {
      res.json({ siteName: "JOY", showFlag: true });
    }
  });

  app.post("/api/settings/branding", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { siteName, showFlag } = req.body;
    const data = JSON.stringify({ siteName: siteName || "JOY", showFlag: showFlag !== false });
    await storage.setSetting("branding", data);
    res.json({ siteName: siteName || "JOY", showFlag: showFlag !== false });
  });

  app.get("/api/embedded-sites", requireAuth, async (req, res) => {
    try {
      const sites = await storage.getActiveEmbeddedSites();
      res.json(sites);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Siteler alınamadı" });
    }
  });

  app.get("/api/admin/embedded-sites", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    try {
      const sites = await storage.getEmbeddedSites();
      res.json(sites);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Siteler alınamadı" });
    }
  });

  app.post("/api/admin/embedded-sites", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    try {
      const validatedData = insertEmbeddedSiteSchema.parse(req.body);
      const site = await storage.createEmbeddedSite({
        ...validatedData,
        createdBy: req.userId!,
      });
      res.json(site);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Site eklenemedi" });
    }
  });

  app.patch("/api/admin/embedded-sites/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    try {
      const site = await storage.updateEmbeddedSite(req.params.id, req.body);
      if (!site) {
        return res.status(404).json({ message: "Site bulunamadı" });
      }
      res.json(site);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Site güncellenemedi" });
    }
  });

  app.delete("/api/admin/embedded-sites/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    try {
      const success = await storage.deleteEmbeddedSite(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Site bulunamadı" });
      }
      res.json({ message: "Site silindi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Site silinemedi" });
    }
  });

  app.delete("/api/tickets/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isMod(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    try {
      const success = await storage.deleteTicket(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Ticket bulunamadı" });
      }
      res.json({ message: "Ticket silindi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Ticket silinemedi" });
    }
  });

  // Social Links Settings
  app.get("/api/settings/social-links", async (req, res) => {
    const joinUrl = await storage.getSetting("joinUrl");
    const moreInfoUrl = await storage.getSetting("moreInfoUrl");
    res.json({ 
      joinUrl: joinUrl || "", 
      moreInfoUrl: moreInfoUrl || "" 
    });
  });

  app.post("/api/settings/social-links", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.userId!);
    if (!isAdmin(currentUser?.role)) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { joinUrl, moreInfoUrl } = req.body;
    
    if (joinUrl !== undefined) {
      await storage.setSetting("joinUrl", String(joinUrl || ""));
    }
    if (moreInfoUrl !== undefined) {
      await storage.setSetting("moreInfoUrl", String(moreInfoUrl || ""));
    }

    res.json({ 
      joinUrl: joinUrl || "", 
      moreInfoUrl: moreInfoUrl || "" 
    });
  });

  // PWA Settings endpoints
  app.get("/api/pwa/config", async (req, res) => {
    try {
      const appName = await storage.getSetting("pwaAppName");
      const appShortName = await storage.getSetting("pwaAppShortName");
      const appDescription = await storage.getSetting("pwaAppDescription");
      const appIconUrl = await storage.getSetting("pwaAppIconUrl");
      const themeColor = await storage.getSetting("pwaThemeColor");

      res.json({
        appName: appName?.value || "JOY Platform",
        appShortName: appShortName?.value || "JOY",
        appDescription: appDescription?.value || "JOY - Eğlence ve Sosyal Platform",
        appIconUrl: appIconUrl?.value || "/favicon.png",
        themeColor: themeColor?.value || "#D4AF37",
      });
    } catch (error) {
      res.status(500).json({ message: "PWA ayarları yüklenirken hata oluştu" });
    }
  });

  app.post("/api/pwa/config", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.userId!);
      if (!isAdmin(currentUser?.role)) {
        return res.status(403).json({ message: "Sadece adminler PWA ayarlarını değiştirebilir" });
      }

      const { appName, appShortName, appDescription, appIconUrl, themeColor } = req.body;

      if (appName !== undefined) {
        await storage.setSetting("pwaAppName", String(appName));
      }
      if (appShortName !== undefined) {
        await storage.setSetting("pwaAppShortName", String(appShortName));
      }
      if (appDescription !== undefined) {
        await storage.setSetting("pwaAppDescription", String(appDescription));
      }
      if (appIconUrl !== undefined) {
        await storage.setSetting("pwaAppIconUrl", String(appIconUrl));
      }
      if (themeColor !== undefined) {
        await storage.setSetting("pwaThemeColor", String(themeColor));
      }

      res.json({
        appName: appName || "JOY Platform",
        appShortName: appShortName || "JOY",
        appDescription: appDescription || "JOY - Eğlence ve Sosyal Platform",
        appIconUrl: appIconUrl || "/favicon.png",
        themeColor: themeColor || "#D4AF37",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "PWA ayarları güncellenirken hata oluştu" });
    }
  });

  app.get("/manifest.json", async (req, res) => {
    try {
      const appName = await storage.getSetting("pwaAppName");
      const appShortName = await storage.getSetting("pwaAppShortName");
      const appDescription = await storage.getSetting("pwaAppDescription");
      const appIconUrl = await storage.getSetting("pwaAppIconUrl");
      const themeColor = await storage.getSetting("pwaThemeColor");

      const manifest = {
        name: appName?.value || "JOY Platform",
        short_name: appShortName?.value || "JOY",
        description: appDescription?.value || "JOY - Eğlence ve Sosyal Platform",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: themeColor?.value || "#D4AF37",
        orientation: "portrait-primary",
        icons: [
          {
            src: appIconUrl?.value || "/favicon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: appIconUrl?.value || "/favicon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ],
        categories: ["entertainment", "social"],
        screenshots: [],
        shortcuts: [
          {
            name: "Sohbet",
            url: "/chat",
            description: "Sohbet odasına git"
          },
          {
            name: "Haberler",
            url: "/news",
            description: "Son haberleri gör"
          },
          {
            name: "Etkinlikler",
            url: "/events",
            description: "Etkinlikleri görüntüle"
          }
        ]
      };

      res.setHeader('Content-Type', 'application/json');
      res.json(manifest);
    } catch (error) {
      res.status(500).json({ message: "Manifest yüklenirken hata oluştu" });
    }
  });

  // News endpoints
  app.get("/api/news", async (req, res) => {
    try {
      const news = await storage.getPublishedNews();
      const newsWithAuthors = await Promise.all(
        news.map(async (item) => {
          const author = await storage.getUser(item.createdBy);
          return {
            ...item,
            author: author ? {
              id: author.id,
              username: author.username,
              displayName: author.displayName,
              role: author.role,
            } : null,
          };
        })
      );
      res.json(newsWithAuthors);
    } catch (error) {
      res.status(500).json({ message: "Haberler yüklenirken hata oluştu" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const newsItem = await storage.getNewsById(req.params.id);
      if (!newsItem) {
        return res.status(404).json({ message: "Haber bulunamadı" });
      }

      await storage.incrementNewsView(req.params.id);

      const author = await storage.getUser(newsItem.createdBy);
      const comments = await storage.getNewsComments(req.params.id);
      const commentsWithUsers = await Promise.all(
        comments.map(async (comment) => {
          const user = await storage.getUser(comment.userId);
          return {
            ...comment,
            user: user ? {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              role: user.role,
              avatar: user.avatar,
            } : null,
          };
        })
      );

      let userLiked = false;
      if (req.userId) {
        const like = await storage.getUserNewsLike(req.params.id, req.userId);
        userLiked = !!like;
      }

      res.json({
        ...newsItem,
        author: author ? {
          id: author.id,
          username: author.username,
          displayName: author.displayName,
          role: author.role,
        } : null,
        comments: commentsWithUsers,
        userLiked,
      });
    } catch (error) {
      res.status(500).json({ message: "Haber yüklenirken hata oluştu" });
    }
  });

  app.post("/api/news", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.userId!);
      if (!isAdmin(currentUser?.role)) {
        return res.status(403).json({ message: "Sadece adminler haber ekleyebilir" });
      }

      const validated = insertNewsSchema.parse(req.body);
      const news = await storage.createNews({
        ...validated,
        createdBy: req.userId!,
      });

      res.status(201).json(news);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Haber eklenirken hata oluştu" });
    }
  });

  app.patch("/api/news/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.userId!);
      if (!isAdmin(currentUser?.role)) {
        return res.status(403).json({ message: "Sadece adminler haber düzenleyebilir" });
      }

      const newsItem = await storage.getNewsById(req.params.id);
      if (!newsItem) {
        return res.status(404).json({ message: "Haber bulunamadı" });
      }

      const updated = await storage.updateNews(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Haber güncellenirken hata oluştu" });
    }
  });

  app.delete("/api/news/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.userId!);
      if (!isMod(currentUser?.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const deleted = await storage.deleteNews(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Haber bulunamadı" });
      }

      res.json({ message: "Haber silindi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Haber silinirken hata oluştu" });
    }
  });

  app.post("/api/news/:id/comments", requireAuth, async (req, res) => {
    try {
      const validated = insertNewsCommentSchema.parse(req.body);
      const comment = await storage.createNewsComment({
        newsId: req.params.id,
        userId: req.userId!,
        content: validated.content,
      });

      const user = await storage.getUser(req.userId!);
      res.status(201).json({
        ...comment,
        user: user ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          avatar: user.avatar,
        } : null,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Yorum eklenirken hata oluştu" });
    }
  });

  app.delete("/api/news/:newsId/comments/:commentId", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.userId!);
      if (!isMod(currentUser?.role)) {
        return res.status(403).json({ message: "Sadece adminler ve moderatörler yorum silebilir" });
      }

      const deleted = await storage.deleteNewsComment(req.params.commentId);
      if (!deleted) {
        return res.status(404).json({ message: "Yorum bulunamadı" });
      }

      res.json({ message: "Yorum silindi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Yorum silinirken hata oluştu" });
    }
  });

  app.post("/api/news/:id/like", requireAuth, async (req, res) => {
    try {
      const existingLike = await storage.getUserNewsLike(req.params.id, req.userId!);
      
      if (existingLike) {
        await storage.deleteNewsLike(req.params.id, req.userId!);
        const updated = await storage.getNewsById(req.params.id);
        return res.json({ liked: false, likeCount: updated?.likeCount || 0 });
      }

      await storage.createNewsLike(req.params.id, req.userId!);
      const updated = await storage.getNewsById(req.params.id);
      res.json({ liked: true, likeCount: updated?.likeCount || 0 });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Beğeni işlemi başarısız" });
    }
  });

  app.get("/api/admin/news", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.userId!);
      if (!isAdmin(currentUser?.role)) {
        return res.status(403).json({ message: "Sadece adminler tüm haberleri görebilir" });
      }

      const allNews = await storage.getAllNews();
      const newsWithAuthors = await Promise.all(
        allNews.map(async (item) => {
          const author = await storage.getUser(item.createdBy);
          return {
            ...item,
            author: author ? {
              id: author.id,
              username: author.username,
              displayName: author.displayName,
              role: author.role,
            } : null,
          };
        })
      );
      res.json(newsWithAuthors);
    } catch (error) {
      res.status(500).json({ message: "Haberler yüklenirken hata oluştu" });
    }
  });

  return httpServer;
}
