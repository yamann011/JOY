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

  // İlk bağlanınca son mesajları gönder
  socket.emit("chat:init", { messages: recentMessages });

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
});

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
