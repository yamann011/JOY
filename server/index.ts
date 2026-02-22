import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { runMigrations } from "./pg-migrate";

const app = express();
const httpServer = createServer(app);

/**
 * SOCKET.IO - Tek Global Sohbet
 * - Oda: "global"
 * - Herkese mesaj: chat:message
 * - Admin/VIP temizlik: chat:clear
 * - Admin mute/ban: chat:mute, chat:unmute, chat:ban, chat:unban
 * - Admin/Mod/VIP mesaj silme: chat:delete
 *
 * Moderasyon listeleri RAM'de (restart olursa sıfırlanır).
 */
const io = new SocketIOServer(httpServer, {
  cors: { origin: true, credentials: true },
});

// RAM'de moderasyon
const mutedUserIds = new Set<number>();
const bannedUserIds = new Set<number>();

// ─── DM (Özel Mesaj) RAM store ─────────────────────────────────────────────
type DmMsg = {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromRole: string;
  toUserId: string;
  text: string;
  createdAt: number;
  read: boolean;
};

function dmKey(a: string, b: string) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

const dmMessages = new Map<string, DmMsg[]>();       // key → mesajlar
const userSocketMap = new Map<string, string>();      // userId(string) → socketId

// Spam koruması - son mesaj zamanları (userId -> timestamp)
const lastMessageTime = new Map<number, number>();
const MESSAGE_COOLDOWN_MS = 5000; // 5 saniye

type ChatMsg = {
  id: string;
  userId: number;
  username: string;
  displayName: string;
  role: string;
  avatar?: string;
  text: string;
  replyTo?: string; // Reply yapılan mesaj ID'si
  createdAt: number;
};

// Son mesajlar (RAM)
const recentMessages: ChatMsg[] = [];
const RECENT_LIMIT = 100;

function roleStr(role: any) {
  return String(role || "user");
}
function isAdmin(role: string) {
  return role.toLowerCase().includes("admin");
}
function isMod(role: string) {
  return role.toLowerCase().includes("moder");
}
function isVip(role: string) {
  return role.toLowerCase().includes("vip");
}
function canModerate(role: string) {
  const r = role.toLowerCase();
  return r.includes("admin") || r.includes("vip") || r.includes("moder");
}
function canNuke(role: string) {
  const r = role.toLowerCase();
  return r.includes("admin") || r.includes("vip");
}

// Role hierarchy check: can actorRole moderate targetRole?
function canModerateRole(actorRole: string, targetRole: string): boolean {
  const actor = roleStr(actorRole).toLowerCase();
  const target = roleStr(targetRole).toLowerCase();
  
  // Admin can moderate everyone except other admins
  if (actor.includes("admin")) {
    return !target.includes("admin");
  }
  
  // Mod can moderate VIP and USER, but not Admin or other Mods
  if (actor.includes("moder")) {
    return !target.includes("admin") && !target.includes("moder");
  }
  
  // VIP and USER cannot moderate anyone
  return false;
}

// Socket auth (MISAFİR İZİNLİ) ✅ AUTH_REQUIRED kalkar
io.use((socket, next) => {
  try {
    const auth = socket.handshake.auth || {};

    const rawId = (auth as any).userId;
    const userId = Number(rawId);
    const username = String((auth as any).username || "Misafir");
    const displayName = String((auth as any).displayName || username);
    const role = String((auth as any).role || "guest");

    // Login yoksa guest'e -1 veriyoruz
    const safeUserId = Number.isFinite(userId) && userId > 0 ? userId : -1;

    (socket.data as any).user = { userId: safeUserId, username, displayName, role };
    return next();
  } catch {
    return next(new Error("AUTH_FAILED"));
  }
});

io.on("connection", (socket) => {
  const u = (socket.data as any).user as {
    userId: number;
    username: string;
    displayName: string;
    role: string;
  };

  // Ban kontrolü (guest'e dokunma)
  if (u.userId > 0 && bannedUserIds.has(u.userId)) {
    socket.emit("chat:error", {
      code: "BANNED",
      message: "Bu sohbetten banlandın.",
    });
    socket.disconnect(true);
    return;
  }

  socket.join("global");

  // userId → socketId haritası güncelle
  const myIdStr = String(u.userId);
  if (myIdStr) userSocketMap.set(myIdStr, socket.id);

  // İlk bağlanınca son mesajları + konuşma listesini gönder
  socket.emit("chat:init", { messages: recentMessages });

  // DM konuşma listesini gönder
  if (myIdStr) {
    const convos: { withUserId: string; withUsername: string; withDisplayName: string; withRole: string; lastMsg: string; lastAt: number; unread: number }[] = [];
    for (const [key, msgs] of dmMessages.entries()) {
      const parts = key.split("_");
      if (!parts.includes(myIdStr)) continue;
      const otherId = parts[0] === myIdStr ? parts[1] : parts[0];
      const last = msgs[msgs.length - 1];
      if (!last) continue;
      const unread = msgs.filter(m => m.toUserId === myIdStr && !m.read).length;
      const otherMsg = msgs.find(m => m.fromUserId === otherId);
      convos.push({
        withUserId: otherId,
        withUsername: otherMsg?.fromUsername ?? otherId,
        withDisplayName: otherMsg?.fromDisplayName ?? otherId,
        withRole: otherMsg?.fromRole ?? "USER",
        lastMsg: last.text,
        lastAt: last.createdAt,
        unread,
      });
    }
    socket.emit("dm:conversations", convos);
  }

  // Mesaj gönderme
  socket.on("chat:message", (payload: { text?: string; replyTo?: string; avatar?: string }) => {
    const text = String(payload?.text || "").trim();
    if (!text) return;

    // Mute kontrolü (guest'e dokunma)
    if (u.userId > 0 && mutedUserIds.has(u.userId)) {
      socket.emit("chat:error", {
        code: "MUTED",
        message: "Susturuldun. Mesaj gönderemezsin.",
      });
      return;
    }

    // Spam koruması (Admin ve Moderator hariç)
    const userRole = roleStr(u.role).toLowerCase();
    const isAdminOrMod = userRole.includes("admin") || userRole.includes("moder");
    
    if (!isAdminOrMod && u.userId > 0) {
      const now = Date.now();
      const lastTime = lastMessageTime.get(u.userId) || 0;
      const timeSinceLastMessage = now - lastTime;
      
      if (timeSinceLastMessage < MESSAGE_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((MESSAGE_COOLDOWN_MS - timeSinceLastMessage) / 1000);
        socket.emit("chat:error", {
          code: "COOLDOWN",
          message: `Çok hızlı mesaj gönderiyorsun. ${remainingSeconds} saniye bekle.`,
          remainingSeconds,
        });
        return;
      }
      
      // Son mesaj zamanını güncelle
      lastMessageTime.set(u.userId, now);
    }

    const msg: ChatMsg = {
      id:
        (globalThis as any).crypto?.randomUUID?.()
          ? (crypto as any).randomUUID()
          : `${Date.now()}-${Math.random()}`,
      userId: u.userId,
      username: u.username,
      displayName: u.displayName,
      role: roleStr(u.role),
      avatar: payload?.avatar,
      text,
      replyTo: payload?.replyTo,
      createdAt: Date.now(),
    };

    recentMessages.push(msg);
    if (recentMessages.length > RECENT_LIMIT) recentMessages.shift();

    io.to("global").emit("chat:message", msg);
  });

  // Mesaj silme (Admin/Mod/VIP) + kullanıcı kendi mesajını silebilir
  socket.on("chat:delete", (payload: { id?: string }) => {
    const id = String(payload?.id || "");
    if (!id) return;

    const idx = recentMessages.findIndex((m) => m.id === id);
    if (idx === -1) return;

    const msg = recentMessages[idx];

    const role = roleStr(u.role);
    const allowed = canModerate(role) || msg.userId === u.userId;

    if (!allowed) {
      socket.emit("chat:error", {
        code: "NO_PERMISSION",
        message: "Bu işlem için yetkin yok.",
      });
      return;
    }

    recentMessages.splice(idx, 1);
    io.to("global").emit("chat:deleted", { id });
  });

  // Sohbeti komple temizle (Admin/VIP)
  socket.on("chat:clear", () => {
    const role = roleStr(u.role);
    if (!canNuke(role)) {
      socket.emit("chat:error", {
        code: "NO_PERMISSION",
        message: "Temizleme için Admin/VIP olmalısın.",
      });
      return;
    }

    recentMessages.splice(0, recentMessages.length);
    io.to("global").emit("chat:cleared", { by: u.username, role });
  });

  // Mute / Unmute (Admin veya Mod)
  socket.on("chat:mute", async (payload: { userId?: number }) => {
    const role = roleStr(u.role);
    if (!canModerate(role)) {
      socket.emit("chat:error", {
        code: "NO_PERMISSION",
        message: "Mute için yetkili değilsin.",
      });
      return;
    }
    const targetId = Number(payload?.userId);
    if (!Number.isFinite(targetId) || targetId <= 0) return;

    // Get target user role from storage
    try {
      const targetUser = await storage.getUser(String(targetId));
      if (targetUser) {
        if (!canModerateRole(u.role, targetUser.role || "USER")) {
          socket.emit("chat:error", {
            code: "NO_PERMISSION",
            message: "Bu kullanıcıyı mute edemezsin.",
          });
          return;
        }
      }
    } catch (err) {
      // Kullanıcı bulunamazsa devam et (misafir olabilir)
    }

    mutedUserIds.add(targetId);
    io.to("global").emit("chat:modlog", {
      action: "mute",
      targetId,
      by: u.username,
    });
  });

  socket.on("chat:unmute", (payload: { userId?: number }) => {
    const role = roleStr(u.role);
    if (!isAdmin(role)) {
      socket.emit("chat:error", {
        code: "NO_PERMISSION",
        message: "Unmute için Admin olmalısın.",
      });
      return;
    }
    const targetId = Number(payload?.userId);
    if (!Number.isFinite(targetId) || targetId <= 0) return;

    mutedUserIds.delete(targetId);
    io.to("global").emit("chat:modlog", {
      action: "unmute",
      targetId,
      by: u.username,
    });
  });

  // Ban / Unban (Admin veya Mod)
  socket.on("chat:ban", async (payload: { userId?: number }) => {
    const role = roleStr(u.role);
    if (!canModerate(role)) {
      socket.emit("chat:error", {
        code: "NO_PERMISSION",
        message: "Ban için yetkili değilsin.",
      });
      return;
    }
    const targetId = Number(payload?.userId);
    if (!Number.isFinite(targetId) || targetId <= 0) return;

    // Get target user role from storage
    try {
      const targetUser = await storage.getUser(String(targetId));
      if (targetUser) {
        if (!canModerateRole(u.role, targetUser.role || "USER")) {
          socket.emit("chat:error", {
            code: "NO_PERMISSION",
            message: "Bu kullanıcıyı banlayamazsın.",
          });
          return;
        }
      }
    } catch (err) {
      // Kullanıcı bulunamazsa devam et
    }

    bannedUserIds.add(targetId);
    io.to("global").emit("chat:modlog", {
      action: "ban",
      targetId,
      by: u.username,
    });

    // O kullanıcı bağlıysa düşür
    for (const s of io.sockets.sockets.values()) {
      const su = (s.data as any)?.user;
      if (su?.userId === targetId) {
        s.emit("chat:error", { code: "BANNED", message: "Bu sohbetten banlandın." });
        s.disconnect(true);
      }
    }
  });

  socket.on("chat:unban", (payload: { userId?: number }) => {
    const role = roleStr(u.role);
    if (!isAdmin(role)) {
      socket.emit("chat:error", {
        code: "NO_PERMISSION",
        message: "Unban için Admin olmalısın.",
      });
      return;
    }
    const targetId = Number(payload?.userId);
    if (!Number.isFinite(targetId) || targetId <= 0) return;

    bannedUserIds.delete(targetId);
    io.to("global").emit("chat:modlog", {
      action: "unban",
      targetId,
      by: u.username,
    });
  });

  // ─── DM: Özel Mesaj Gönder ────────────────────────────────────────────────
  socket.on("dm:send", async (payload: { toUserId?: string; toDisplayName?: string; toUsername?: string; text?: string }) => {
    if (!myIdStr) {
      socket.emit("dm:error", { code: "AUTH", message: "Giriş yapman gerekiyor." });
      return;
    }
    const toUserId = String(payload?.toUserId || "").trim();
    if (!toUserId || toUserId === myIdStr) {
      socket.emit("dm:error", { code: "INVALID", message: "Geçersiz hedef." });
      return;
    }
    const text = String(payload?.text || "").trim();
    if (!text) return;

    const myRole = u.role.toLowerCase();
    const key = dmKey(myIdStr, toUserId);
    const existing = dmMessages.get(key) || [];

    // Yeni konuşma başlatma yetkisi: sadece ADMIN ve AJANS_SAHIBI
    const canStartDm = myRole.includes("admin") || myRole.includes("ajans");
    if (existing.length === 0 && !canStartDm) {
      socket.emit("dm:error", { code: "NO_PERMISSION", message: "Özel mesaj açma yetkin yok. Sadece Admin ve Ajans Sahibi başlatabilir." });
      return;
    }

    const msg: DmMsg = {
      id: `${Date.now()}-${Math.random()}`,
      fromUserId: myIdStr,
      fromUsername: u.username,
      fromDisplayName: u.displayName,
      fromRole: u.role,
      toUserId,
      text,
      createdAt: Date.now(),
      read: false,
    };

    existing.push(msg);
    if (existing.length > 200) existing.shift();
    dmMessages.set(key, existing);

    // Gönderene confirm
    socket.emit("dm:message", msg);

    // Alıcı online ise gönder
    const targetSocketId = userSocketMap.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("dm:message", msg);
      // Alıcıya konuşma listesini güncelle
      io.to(targetSocketId).emit("dm:conversation_update", {
        withUserId: myIdStr,
        withUsername: u.username,
        withDisplayName: u.displayName,
        withRole: u.role,
        lastMsg: text,
        lastAt: msg.createdAt,
        unread: existing.filter(m => m.toUserId === toUserId && !m.read).length,
      });
    }

    // Gönderenin conversation listesini güncelle — karşı tarafın adını payload veya mevcut mesajlardan al
    const toDisplayName = String(payload?.toDisplayName || "").trim();
    const toUsername = String(payload?.toUsername || "").trim();
    const existingOtherMsg = existing.find(m => m.fromUserId === toUserId);
    socket.emit("dm:conversation_update", {
      withUserId: toUserId,
      withUsername: existingOtherMsg?.fromUsername ?? (toUsername || toUserId),
      withDisplayName: existingOtherMsg?.fromDisplayName ?? (toDisplayName || toUsername || toUserId),
      withRole: existingOtherMsg?.fromRole ?? "USER",
      lastMsg: text,
      lastAt: msg.createdAt,
      unread: 0,
    });
  });

  // DM geçmişini getir
  socket.on("dm:history", (payload: { withUserId?: string }) => {
    if (!myIdStr) return;
    const withUserId = String(payload?.withUserId || "").trim();
    if (!withUserId) return;

    const key = dmKey(myIdStr, withUserId);
    const msgs = dmMessages.get(key) || [];

    // Okunmamışları oku
    for (const m of msgs) {
      if (m.toUserId === myIdStr) m.read = true;
    }

    socket.emit("dm:history", { withUserId, messages: msgs.slice(-100) });
  });

  // DM okundu bildir
  socket.on("dm:read", (payload: { withUserId?: string }) => {
    if (!myIdStr) return;
    const withUserId = String(payload?.withUserId || "").trim();
    if (!withUserId) return;
    const key = dmKey(myIdStr, withUserId);
    const msgs = dmMessages.get(key) || [];
    for (const m of msgs) {
      if (m.toUserId === myIdStr) m.read = true;
    }
    socket.emit("dm:read_ack", { withUserId });
  });

  // Disconnect: userSocketMap temizle
  socket.on("disconnect", () => {
    if (myIdStr && userSocketMap.get(myIdStr) === socket.id) {
      userSocketMap.delete(myIdStr);
    }
  });
});

// =====================================================
// 🎬 SİNEMA ODALARI
// =====================================================
interface CinemaRoom {
  id: string;
  name: string;
  passwordHash?: string;
  videoUrl: string;
  currentTime: number;
  lastSyncAt: number; // server timestamp — elapsed time hesabı için
  isPlaying: boolean;
  createdBy: string;
  createdByUserId: string;
  createdAt: number;
  participants: Map<string, { username: string; displayName: string; role: string }>;
}

/** Odanın gerçek anlık oynatma zamanını hesapla */
function calcCurrentTime(room: CinemaRoom): number {
  if (!room.isPlaying) return room.currentTime;
  const elapsed = (Date.now() - room.lastSyncAt) / 1000;
  return room.currentTime + elapsed;
}

interface CinemaMsg {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  role: string;
  avatar?: string;
  text: string;
  createdAt: number;
}

const cinemaRooms = new Map<string, CinemaRoom>();
const cinemaRoomMessages = new Map<string, CinemaMsg[]>();
const userActiveRoom = new Map<string, string>(); // userId → roomId (kişi başı 1 oda)

function cinemaCID(): string {
  return `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function simplehash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return String(h);
}

const cinemaIO = io.of("/cinema");

cinemaIO.use((socket, next) => {
  try {
    const auth = socket.handshake.auth || {};
    const userId = String((auth as any).userId || "");
    const username = String((auth as any).username || "Misafir");
    const displayName = String((auth as any).displayName || username);
    const role = String((auth as any).role || "guest");
    const avatar = String((auth as any).avatar || "");
    const safeUserId = userId && userId !== "undefined" && userId !== "null" ? userId : "";
    (socket.data as any).user = { userId: safeUserId, username, displayName, role, avatar };
    return next();
  } catch {
    return next(new Error("AUTH_FAILED"));
  }
});

cinemaIO.on("connection", (socket) => {
  const u = (socket.data as any).user as { userId: string; username: string; displayName: string; role: string; avatar: string };
  let currentRoomId: string | null = null;

  // Oda listesini gönder
  socket.emit("cinema:rooms", Array.from(cinemaRooms.values()).map(r => ({
    id: r.id,
    name: r.name,
    hasPassword: !!r.passwordHash,
    videoUrl: r.videoUrl,
    isPlaying: r.isPlaying,
    participantCount: r.participants.size,
    participants: Array.from(r.participants.values()),
    createdBy: r.createdBy,
    createdByUserId: r.createdByUserId,
    createdAt: r.createdAt,
  })));

  // Oda oluştur
  socket.on("cinema:create", (payload: { name?: string; videoUrl?: string; password?: string }) => {
    if (!u.userId) {
      socket.emit("cinema:error", { code: "AUTH", message: "Giriş yapman gerekiyor." });
      return;
    }
    // Kişi başı maksimum 1 oda
    if (userActiveRoom.has(u.userId)) {
      socket.emit("cinema:error", { code: "LIMIT", message: "Zaten aktif bir odanız var. Önce mevcut odanızı kapatın." });
      return;
    }
    const name = String(payload?.name || "").trim();
    const videoUrl = String(payload?.videoUrl || "").trim();
    if (!name || !videoUrl) {
      socket.emit("cinema:error", { code: "INVALID", message: "İsim ve video URL gerekli." });
      return;
    }
    const id = cinemaCID();
    const room: CinemaRoom = {
      id,
      name,
      passwordHash: payload?.password ? simplehash(payload.password) : undefined,
      videoUrl,
      currentTime: 0,
      lastSyncAt: Date.now(),
      isPlaying: false,
      createdBy: u.displayName,
      createdByUserId: u.userId,
      createdAt: Date.now(),
      participants: new Map(),
    };
    cinemaRooms.set(id, room);
    cinemaRoomMessages.set(id, []);
    userActiveRoom.set(u.userId, id); // Bu kullanıcının aktif odası

    // Broadcast yeni oda
    cinemaIO.emit("cinema:room_added", {
      id, name,
      hasPassword: !!room.passwordHash,
      videoUrl,
      isPlaying: false,
      participantCount: 0,
      participants: [],
      createdBy: room.createdBy,
      createdByUserId: room.createdByUserId,
      createdAt: room.createdAt,
    });
    socket.emit("cinema:created", { roomId: id });
  });

  // Odaya katıl
  socket.on("cinema:join", (payload: { roomId?: string; password?: string }) => {
    const roomId = String(payload?.roomId || "");
    const room = cinemaRooms.get(roomId);
    if (!room) {
      socket.emit("cinema:error", { code: "NOT_FOUND", message: "Oda bulunamadı." });
      return;
    }
    // Oda sahibi şifresiz girebilir
    const isOwner = u.userId && u.userId === room.createdByUserId;
    if (!isOwner && room.passwordHash && simplehash(String(payload?.password || "")) !== room.passwordHash) {
      socket.emit("cinema:error", { code: "WRONG_PASSWORD", message: "Şifre yanlış." });
      return;
    }
    if (currentRoomId) {
      const oldRoom = cinemaRooms.get(currentRoomId);
      if (oldRoom) {
        oldRoom.participants.delete(socket.id);
        socket.leave(`cinema:${currentRoomId}`);
        cinemaIO.to(`cinema:${currentRoomId}`).emit("cinema:participant_update", { count: oldRoom.participants.size });
      }
    }
    currentRoomId = roomId;
    room.participants.set(socket.id, { username: u.username, displayName: u.displayName, role: u.role });
    socket.join(`cinema:${roomId}`);

    // Mevcut durumu gönder — elapsed time ile gerçek zamanı hesapla
    socket.emit("cinema:state", {
      videoUrl: room.videoUrl,
      currentTime: calcCurrentTime(room),
      isPlaying: room.isPlaying,
      createdByUserId: room.createdByUserId,
    });

    const msgs = cinemaRoomMessages.get(roomId) || [];
    socket.emit("cinema:messages_init", msgs.slice(-50));

    const participantList = Array.from(room.participants.values());
    cinemaIO.to(`cinema:${roomId}`).emit("cinema:participant_update", {
      count: room.participants.size,
      participants: participantList,
    });
    // Tüm listeyi güncellemek için global broadcast
    cinemaIO.emit("cinema:room_participants", {
      roomId,
      participants: participantList,
      count: room.participants.size,
    });
  });

  // Oynat/Duraklat/Seek — sadece oda kurucusu
  function canControlVideo(room: CinemaRoom): boolean {
    return !!(u.userId && u.userId === room.createdByUserId);
  }

  socket.on("cinema:play", (payload: { currentTime?: number }) => {
    if (!currentRoomId) return;
    const room = cinemaRooms.get(currentRoomId);
    if (!room) return;
    if (!canControlVideo(room)) {
      socket.emit("cinema:error", { code: "NO_PERMISSION", message: "Sadece oda kurucusu ve yetkililer video kontrolü yapabilir." });
      return;
    }
    room.isPlaying = true;
    room.currentTime = Number(payload?.currentTime ?? room.currentTime);
    room.lastSyncAt = Date.now();
    cinemaIO.to(`cinema:${currentRoomId}`).emit("cinema:sync", { isPlaying: true, currentTime: room.currentTime, by: u.username });
  });

  socket.on("cinema:pause", (payload: { currentTime?: number }) => {
    if (!currentRoomId) return;
    const room = cinemaRooms.get(currentRoomId);
    if (!room) return;
    if (!canControlVideo(room)) {
      socket.emit("cinema:error", { code: "NO_PERMISSION", message: "Sadece oda kurucusu ve yetkililer video kontrolü yapabilir." });
      return;
    }
    room.isPlaying = false;
    room.currentTime = Number(payload?.currentTime ?? calcCurrentTime(room));
    room.lastSyncAt = Date.now();
    cinemaIO.to(`cinema:${currentRoomId}`).emit("cinema:sync", { isPlaying: false, currentTime: room.currentTime, by: u.username });
  });

  socket.on("cinema:seek", (payload: { currentTime?: number }) => {
    if (!currentRoomId) return;
    const room = cinemaRooms.get(currentRoomId);
    if (!room) return;
    if (!canControlVideo(room)) return;
    room.currentTime = Number(payload?.currentTime ?? 0);
    room.lastSyncAt = Date.now();
    cinemaIO.to(`cinema:${currentRoomId}`).emit("cinema:sync", { isPlaying: room.isPlaying, currentTime: room.currentTime, by: u.username });
  });

  // Heartbeat — oda sahibi her 5sn'de currentTime gönderir
  socket.on("cinema:heartbeat", (payload: { currentTime?: number }) => {
    if (!currentRoomId) return;
    const room = cinemaRooms.get(currentRoomId);
    if (!room || !room.isPlaying) return;
    if (!canControlVideo(room)) return;
    room.currentTime = Number(payload?.currentTime ?? room.currentTime);
    room.lastSyncAt = Date.now();
  });

  // URL değiştir (admin/mod veya oda kurucusu kontrolü)
  socket.on("cinema:change_url", (payload: { videoUrl?: string }) => {
    if (!currentRoomId) return;
    const room = cinemaRooms.get(currentRoomId);
    if (!room) return;
    const role = u.role.toLowerCase();
    if (!role.includes("admin") && !role.includes("moder") && !role.includes("asistan") && !role.includes("ajans") && room.createdBy !== u.displayName) {
      socket.emit("cinema:error", { code: "NO_PERMISSION", message: "URL değiştirmek için yetkin yok." });
      return;
    }
    const url = String(payload?.videoUrl || "").trim();
    if (!url) return;
    room.videoUrl = url;
    room.currentTime = 0;
    room.lastSyncAt = Date.now();
    room.isPlaying = false;
    cinemaIO.to(`cinema:${currentRoomId}`).emit("cinema:url_changed", { videoUrl: url, by: u.username });
  });

  // Sohbet
  socket.on("cinema:message", (payload: { text?: string }) => {
    if (!currentRoomId) return;
    const text = String(payload?.text || "").trim();
    if (!text) return;
    const msg: CinemaMsg = {
      id: `${Date.now()}-${Math.random()}`,
      userId: u.userId,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      avatar: u.avatar || undefined,
      text,
      createdAt: Date.now(),
    };
    const msgs = cinemaRoomMessages.get(currentRoomId) || [];
    msgs.push(msg);
    if (msgs.length > 200) msgs.shift();
    cinemaRoomMessages.set(currentRoomId, msgs);
    cinemaIO.to(`cinema:${currentRoomId}`).emit("cinema:message", msg);
  });

  // Sohbeti temizle (oda sahibi)
  socket.on("cinema:clear_chat", () => {
    if (!currentRoomId) return;
    const room = cinemaRooms.get(currentRoomId);
    if (!room) return;
    const role = u.role.toLowerCase();
    const isOwner = u.userId && u.userId === room.createdByUserId;
    if (!isOwner && !role.includes("admin") && !role.includes("ajans")) {
      socket.emit("cinema:error", { code: "NO_PERMISSION", message: "Sohbeti temizlemek için yetkin yok." });
      return;
    }
    cinemaRoomMessages.set(currentRoomId, []);
    cinemaIO.to(`cinema:${currentRoomId}`).emit("cinema:chat_cleared");
  });

  // Odayı sil (admin/mod)
  socket.on("cinema:update_room", (payload: { name?: string }) => {
    if (!currentRoomId) return;
    const room = cinemaRooms.get(currentRoomId);
    if (!room) return;
    const role = u.role.toLowerCase();
    const isOwner = u.userId && u.userId === room.createdByUserId;
    if (!isOwner && !role.includes("admin") && !role.includes("moder") && !role.includes("ajans")) {
      socket.emit("cinema:error", { code: "NO_PERMISSION", message: "Yetkin yok." });
      return;
    }
    if (payload?.name?.trim()) room.name = payload.name.trim();
    cinemaIO.emit("cinema:room_list_update", Array.from(cinemaRooms.values()).map(r => ({
      id: r.id, name: r.name, hasPassword: !!r.passwordHash, videoUrl: r.videoUrl,
      participantCount: r.participants.size, createdByUserId: r.createdByUserId,
    })));
  });

  socket.on("cinema:set_password", (payload: { password?: string }) => {
    if (!currentRoomId) return;
    const room = cinemaRooms.get(currentRoomId);
    if (!room) return;
    const role = u.role.toLowerCase();
    const isOwner = u.userId && u.userId === room.createdByUserId;
    if (!isOwner && !role.includes("admin") && !role.includes("ajans")) {
      socket.emit("cinema:error", { code: "NO_PERMISSION", message: "Yetkin yok." });
      return;
    }
    const pw = String(payload?.password || "").trim();
    room.passwordHash = pw ? require("crypto").createHash("sha256").update(pw).digest("hex") : undefined;
    cinemaIO.emit("cinema:room_list_update", Array.from(cinemaRooms.values()).map(r => ({
      id: r.id, name: r.name, hasPassword: !!r.passwordHash, videoUrl: r.videoUrl,
      participantCount: r.participants.size, createdByUserId: r.createdByUserId,
    })));
  });

  socket.on("cinema:delete_room", (payload: { roomId?: string }) => {
    const rid = String(payload?.roomId || currentRoomId || "");
    const role = u.role.toLowerCase();
    const room = cinemaRooms.get(rid);
    // Sadece oda sahibi veya admin/mod silebilir
    const isOwner = room && u.userId && u.userId === room.createdByUserId;
    if (!isOwner && !role.includes("admin") && !role.includes("moder") && !role.includes("asistan") && !role.includes("ajans")) {
      socket.emit("cinema:error", { code: "NO_PERMISSION", message: "Oda silmek için yetkin yok." });
      return;
    }
    if (room) userActiveRoom.delete(room.createdByUserId);
    cinemaRooms.delete(rid);
    cinemaRoomMessages.delete(rid);
    cinemaIO.emit("cinema:room_removed", { roomId: rid });
  });

  socket.on("disconnect", () => {
    if (currentRoomId) {
      const room = cinemaRooms.get(currentRoomId);
      if (room) {
        room.participants.delete(socket.id);
        const participantList = Array.from(room.participants.values());
        cinemaIO.to(`cinema:${currentRoomId}`).emit("cinema:participant_update", {
          count: room.participants.size,
          participants: participantList,
        });
        cinemaIO.emit("cinema:room_participants", {
          roomId: currentRoomId,
          participants: participantList,
          count: room.participants.size,
        });
      }
    }
  });
});

// Cinema REST API helper - routes.ts'den çağrılacak
export { cinemaRooms };

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  // PostgreSQL varsa tabloları otomatik oluştur, sonra seed et
  await runMigrations();
  await storage.seedInitialData();

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "8080", 10);
  httpServer.listen(
    {
      port,
      host: process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
