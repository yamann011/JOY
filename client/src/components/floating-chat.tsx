import * as React from "react";
import { useLocation } from "wouter";
import { io, type Socket } from "socket.io-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { AnimatedUsername } from "@/components/animated-username";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle, X, Send, Shield, Crown, Trash2, Ban, VolumeX,
  Reply, XCircle, Mail, Users, ChevronLeft, PenSquare, Search,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatMessage = {
  id: string;
  userId: number | null;
  username: string;
  displayName?: string;
  role?: string;
  avatar?: string;
  text: string;
  replyTo?: string;
  createdAt: number;
};

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

type DmConvo = {
  withUserId: string;
  withUsername: string;
  withDisplayName: string;
  withRole: string;
  lastMsg: string;
  lastAt: number;
  unread: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roleBadge(role?: string) {
  const r = (role || "").toLowerCase();
  if (r.includes("admin") || r.includes("ajans")) return { label: r.includes("ajans") ? "PATRON" : "ADMIN", icon: <Shield className="h-3.5 w-3.5" /> };
  if (r.includes("vip")) return { label: "VIP", icon: <Crown className="h-3.5 w-3.5" /> };
  if (r.includes("moder") || r.includes("asistan")) return { label: r.includes("asistan") ? "ASİSTAN" : "MOD", icon: <Shield className="h-3.5 w-3.5" /> };
  return null;
}

function roleColor(role?: string) {
  const r = (role || "").toLowerCase();
  if (r.includes("admin")) return "text-yellow-400";
  if (r.includes("ajans")) return "text-yellow-300";
  if (r.includes("moder")) return "text-blue-400";
  if (r.includes("asistan")) return "text-cyan-400";
  if (r.includes("vip")) return "text-rose-400";
  return "text-white/80";
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FloatingChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  if (location === "/login") return null;

  // ── Rol hesapları — useEffect'lerden ÖNCE tanımlanmalı ────────────────────
  const myId = String((user as any)?.id || "");
  const myRole = String((user as any)?.role || "").toLowerCase();
  const canModerate = !!user && (myRole.includes("admin") || myRole.includes("vip") || myRole.includes("moder") || myRole.includes("ajans") || myRole.includes("asistan"));
  const canNuke = !!user && (myRole.includes("admin") || myRole.includes("vip") || myRole.includes("ajans"));
  const canStartDm = !!user && (myRole.includes("admin") || myRole.includes("ajans"));

  // ── Panel state ────────────────────────────────────────────────────────────
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"global" | "dm">("global");

  // ── Global chat ────────────────────────────────────────────────────────────
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { id: "welcome", userId: null, username: "Sistem", role: "system", text: "Canlı sohbet bağlanıyor…", createdAt: Date.now() },
  ]);
  const [text, setText] = React.useState("");
  const [replyingTo, setReplyingTo] = React.useState<ChatMessage | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = React.useState(0);
  const [unreadGlobal, setUnreadGlobal] = React.useState(0);
  const [globalPulse, setGlobalPulse] = React.useState(false);

  // ── DM state ───────────────────────────────────────────────────────────────
  const [convos, setConvos] = React.useState<DmConvo[]>([]);
  const [activeDm, setActiveDm] = React.useState<DmConvo | null>(null);
  const activeDmRef = React.useRef<DmConvo | null>(null);
  const [dmHistory, setDmHistory] = React.useState<DmMsg[]>([]);
  const [dmText, setDmText] = React.useState("");
  const [unreadDm, setUnreadDm] = React.useState(0);
  const [dmPulse, setDmPulse] = React.useState(false);
  const [showNewDm, setShowNewDm] = React.useState(false);
  const [newDmUserId, setNewDmUserId] = React.useState("");
  const [newDmDisplayName, setNewDmDisplayName] = React.useState("");
  const [userSearch, setUserSearch] = React.useState("");
  const [allUsers, setAllUsers] = React.useState<any[]>([]);

  // Kullanıcı listesini DM paneli açıldığında çek
  React.useEffect(() => {
    if (!showNewDm || !canStartDm) return;
    fetch("/api/users", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => setAllUsers([]));
  }, [showNewDm, canStartDm]);

  const filteredUsers = allUsers.filter((u: any) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (u.displayName || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q);
  });

  const socketRef = React.useRef<Socket | null>(null);
  const globalEndRef = React.useRef<HTMLDivElement | null>(null);
  const dmEndRef = React.useRef<HTMLDivElement | null>(null);
  const viewportRef = React.useRef<HTMLDivElement | null>(null);

  // Total unread for FAB badge
  const totalUnread = unreadGlobal + unreadDm;

  // ── Clear unread on tab switch / open ─────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    if (activeTab === "global") { setUnreadGlobal(0); setGlobalPulse(false); }
    if (activeTab === "dm") { setUnreadDm(0); setDmPulse(false); }
  }, [open, activeTab]);

  React.useEffect(() => { if (open) setUnreadGlobal(0); }, [open]);

  // ── Auto scroll ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const vp = viewportRef.current;
    if (vp && open && activeTab === "global") {
      setTimeout(() => { vp.scrollTop = vp.scrollHeight; }, 50);
    }
  }, [messages.length, open, activeTab]);

  React.useEffect(() => {
    dmEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmHistory.length]);

  // ── Socket ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setUnreadGlobal(0); setUnreadDm(0);
      return;
    }
    if (socketRef.current?.connected) return;

    const s = io(undefined, {
      transports: ["websocket"],
      withCredentials: true,
      auth: {
        userId: (user as any)?.id,
        username: (user as any)?.username,
        displayName: (user as any)?.displayName,
        role: (user as any)?.role,
      },
    });
    socketRef.current = s;

    s.on("connect_error", (err: any) => {
      toast({ title: "Sohbete bağlanamadı", description: String(err?.message || err), variant: "destructive" });
    });

    // ── Global chat events ─────────────────────────────────────────────────
    s.on("chat:init", (payload: { messages?: ChatMessage[] }) => {
      const list = Array.isArray(payload?.messages) ? payload.messages : [];
      setMessages(list.length ? list : [{ id: "ready", userId: null, username: "Sistem", role: "system", text: "Sohbet hazır 🙂", createdAt: Date.now() }]);
      setUnreadGlobal(0);
    });

    s.on("chat:message", (msg: ChatMessage) => {
      if (!msg?.id) return;
      setMessages(prev => [...prev, msg].slice(-100));
      const mine = myId !== "" && String(msg.userId) === myId;
      if (!mine) {
        if (!open || activeTab !== "global") {
          setUnreadGlobal(u => Math.min(u + 1, 99));
          setGlobalPulse(true);
          setTimeout(() => setGlobalPulse(false), 2000);
        }
      }
    });

    s.on("chat:deleted", ({ id }: { id?: string }) => {
      if (!id) return;
      setMessages(prev => prev.filter(m => m.id !== id));
    });

    s.on("chat:cleared", (info: any) => {
      setMessages([{ id: "cleared", userId: null, username: "Sistem", role: "system", text: `Sohbet temizlendi. (${info?.by || "yetkili"})`, createdAt: Date.now() }]);
      setUnreadGlobal(0);
    });

    s.on("chat:modlog", (info: any) => {
      toast({ title: "Moderasyon", description: `${info?.action || "işlem"} → #${info?.targetId ?? "?"} (${info?.by || "?"})` });
    });

    s.on("chat:error", (e: { code?: string; message?: string; remainingSeconds?: number }) => {
      if (e?.code === "COOLDOWN" && e.remainingSeconds) {
        setCooldownSeconds(e.remainingSeconds);
        const t = setInterval(() => setCooldownSeconds(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; }), 1000);
      }
      toast({ title: e?.code || "Hata", description: e?.message || "Sohbet hatası", variant: "destructive" });
    });

    // ── DM events ─────────────────────────────────────────────────────────
    s.on("dm:conversations", (data: DmConvo[]) => {
      setConvos(data);
      setUnreadDm(data.reduce((acc, c) => acc + c.unread, 0));
    });

    s.on("dm:conversation_update", (convo: DmConvo) => {
      setConvos(prev => {
        const filtered = prev.filter(c => c.withUserId !== convo.withUserId);
        return [convo, ...filtered];
      });
      // If message is to me (unread)
      if (convo.unread > 0) {
        if (!open || activeTab !== "dm" || activeDm?.withUserId !== convo.withUserId) {
          setUnreadDm(u => Math.min(u + convo.unread, 99));
          setDmPulse(true);
          setTimeout(() => setDmPulse(false), 2000);
        }
      }
    });

    s.on("dm:message", (msg: DmMsg) => {
      if (msg.fromUserId === myId || msg.toUserId === myId) {
        setDmHistory(prev => {
          const other = msg.fromUserId === myId ? msg.toUserId : msg.fromUserId;
          // activeDm closure stale olabilir — withUserId any thread ile match et
          const isCurrentThread = prev.some(m =>
            (m.fromUserId === msg.fromUserId && m.toUserId === msg.toUserId) ||
            (m.fromUserId === msg.toUserId && m.toUserId === msg.fromUserId)
          ) || prev.length === 0;
          if (!isCurrentThread && other !== (activeDmRef.current?.withUserId)) return prev;
          // Optimistic duplicate kaldır
          const withoutOptimistic = prev.filter(m =>
            !(m.id.startsWith("optimistic-") && m.fromUserId === myId && m.text === msg.text)
          );
          // Gerçek mesajı duplicate kontrolüyle ekle
          if (withoutOptimistic.some(m => m.id === msg.id)) return withoutOptimistic;
          return [...withoutOptimistic, msg];
        });
        if (msg.fromUserId !== myId) {
          if (!open || activeTab !== "dm" || activeDm?.withUserId !== msg.fromUserId) {
            setUnreadDm(u => Math.min(u + 1, 99));
            setDmPulse(true);
            setTimeout(() => setDmPulse(false), 2000);
          }
        }
      }
    });

    s.on("dm:history", (data: { withUserId: number; messages: DmMsg[] }) => {
      setDmHistory(data.messages);
    });

    s.on("dm:error", (e: { code?: string; message?: string }) => {
      toast({ title: "DM Hatası", description: e?.message || "Özel mesaj hatası", variant: "destructive" });
    });

    return () => { s.disconnect(); socketRef.current = null; };
  }, [(user as any)?.id, (user as any)?.username, (user as any)?.role]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function sendGlobal() {
    const t = text.trim();
    if (!t || !socketRef.current?.connected) return;
    if (cooldownSeconds > 0) {
      toast({ title: "Çok hızlı", description: `${cooldownSeconds} saniye bekle`, variant: "destructive" });
      return;
    }
    socketRef.current.emit("chat:message", { text: t, avatar: (user as any)?.avatar, replyTo: replyingTo?.id });
    setText(""); setReplyingTo(null);
  }

  function sendDm() {
    const t = dmText.trim();
    if (!t || !activeDm || !socketRef.current?.connected) return;
    // Optimistic update — mesajı hemen göster
    const optimistic: DmMsg = {
      id: `optimistic-${Date.now()}`,
      fromUserId: myId,
      fromUsername: (user as any)?.username || "",
      fromDisplayName: (user as any)?.displayName || (user as any)?.username || "",
      fromRole: (user as any)?.role || "",
      toUserId: activeDm.withUserId,
      text: t,
      createdAt: Date.now(),
      read: true,
    };
    setDmHistory(prev => [...prev, optimistic]);
    socketRef.current.emit("dm:send", {
      toUserId: activeDm.withUserId,
      toDisplayName: activeDm.withDisplayName,
      toUsername: activeDm.withUsername,
      text: t,
    });
    setDmText("");
  }

  function openDmWith(convo: DmConvo) {
    setActiveDm(convo);
    activeDmRef.current = convo;
    setDmHistory([]);
    socketRef.current?.emit("dm:history", { withUserId: convo.withUserId });
    socketRef.current?.emit("dm:read", { withUserId: convo.withUserId });
    setConvos(prev => prev.map(c => c.withUserId === convo.withUserId ? { ...c, unread: 0 } : c));
    setUnreadDm(prev => Math.max(0, prev - (convo.unread || 0)));
  }

  function closeDm() {
    setActiveDm(null);
    activeDmRef.current = null;
    setDmHistory([]);
  }

  function deleteDmConvo(withUserId: string) {
    setConvos(prev => prev.filter(c => c.withUserId !== withUserId));
    if (activeDm?.withUserId === withUserId) closeDm();
  }

  function startNewDm() {
    const uid = String(newDmUserId).trim();
    if (!uid) {
      toast({ title: "Geçersiz kullanıcı", variant: "destructive" });
      return;
    }
    const fakeConvo: DmConvo = {
      withUserId: uid,
      withUsername: newDmDisplayName || uid,
      withDisplayName: newDmDisplayName || uid,
      withRole: "USER",
      lastMsg: "",
      lastAt: Date.now(),
      unread: 0,
    };
    openDmWith(fakeConvo);
    setShowNewDm(false);
    setNewDmUserId(""); setNewDmDisplayName("");
  }

  function startDmWithUser(u: any) {
    const convo: DmConvo = {
      withUserId: String(u.id),
      withUsername: u.username,
      withDisplayName: u.displayName || u.username,
      withRole: u.role || "USER",
      lastMsg: "",
      lastAt: Date.now(),
      unread: 0,
    };
    openDmWith(convo);
    setShowNewDm(false);
    setUserSearch("");
  }

  function clearAll() { socketRef.current?.emit("chat:clear"); }
  function deleteOne(id: string) { socketRef.current?.emit("chat:delete", { id }); }
  function adminAction(action: string, userId: number) { socketRef.current?.emit(`chat:${action}`, { userId }); }

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-4 right-4 z-[80]">
      {/* FAB button */}
      {!open && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "group relative flex h-14 w-14 items-center justify-center rounded-full",
                "bg-gradient-to-br from-yellow-500 to-amber-400 text-black shadow-lg",
                "ring-1 ring-yellow-500/40 hover:brightness-110 active:scale-[0.98] transition"
              )}
            >
              <MessageCircle className="h-6 w-6" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-red-600 px-1 text-xs font-bold text-white flex items-center justify-center animate-bounce">
                  {Math.min(totalUnread, 99)}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Canlı Sohbet</TooltipContent>
        </Tooltip>
      )}

      {/* Chat panel */}
      {open && (
        <Card className={cn("w-[340px] sm:w-[380px] overflow-hidden border border-yellow-500/25 bg-black/90 backdrop-blur-xl shadow-2xl flex flex-col")} style={{ height: 480 }}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-yellow-500/20 shrink-0">
            <div className="flex items-center gap-2">
              {activeDm && activeTab === "dm" ? (
                <button onClick={() => closeDm()} className="text-white/60 hover:text-white">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : null}
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-500 to-amber-400 flex items-center justify-center text-black">
                <MessageCircle className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-white">
                {activeTab === "dm" && activeDm
                  ? activeDm.withDisplayName
                  : "Canlı Sohbet"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {activeTab === "global" && canNuke && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10 h-7 w-7" onClick={clearAll}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Temizle</TooltipContent>
                </Tooltip>
              )}
              {activeTab === "dm" && activeDm && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 h-7 w-7"
                      onClick={() => deleteDmConvo(activeDm.withUserId)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Sohbeti Sil</TooltipContent>
                </Tooltip>
              )}
              {activeTab === "dm" && !activeDm && canStartDm && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10 h-7 w-7" onClick={() => setShowNewDm(true)}>
                      <PenSquare className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Yeni Mesaj</TooltipContent>
                </Tooltip>
              )}
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div className="flex border-b border-white/10 shrink-0">
            <button
              onClick={() => { setActiveTab("global"); setUnreadGlobal(0); setGlobalPulse(false); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors relative",
                activeTab === "global"
                  ? "text-yellow-400 border-b-2 border-yellow-400"
                  : "text-white/50 hover:text-white/80"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Global
              {unreadGlobal > 0 && (
                <span className={cn("h-4 min-w-4 rounded-full bg-red-600 px-1 text-[10px] font-bold text-white flex items-center justify-center", globalPulse && "animate-pulse")}>
                  {unreadGlobal}
                </span>
              )}
              {globalPulse && unreadGlobal === 0 && (
                <span className="absolute inset-0 rounded animate-ping bg-yellow-400/20 pointer-events-none" />
              )}
            </button>
            <button
              onClick={() => { setActiveTab("dm"); setUnreadDm(0); setDmPulse(false); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors relative",
                activeTab === "dm"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-white/50 hover:text-white/80"
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              Özel
              {unreadDm > 0 && (
                <span className={cn("h-4 min-w-4 rounded-full bg-red-600 px-1 text-[10px] font-bold text-white flex items-center justify-center", dmPulse && "animate-pulse")}>
                  {unreadDm}
                </span>
              )}
              {dmPulse && unreadDm === 0 && (
                <span className="absolute inset-0 rounded animate-ping bg-blue-400/20 pointer-events-none" />
              )}
            </button>
          </div>

          {/* ── Body ────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden flex flex-col">

            {/* === GLOBAL TAB === */}
            {activeTab === "global" && (
              <>
                <ScrollArea className="flex-1 px-3 py-2">
                  <div
                    ref={el => {
                      if (!el) return;
                      const scroller = el.closest("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
                      viewportRef.current = scroller ?? (el.parentElement as HTMLDivElement | null);
                    }}
                    className="space-y-2"
                  >
                    {messages.map(m => {
                      const mine = myId !== "" && String(m.userId) === myId;
                      const badge = roleBadge(m.role);
                      return (
                        <div key={m.id} className={cn("group flex gap-2", mine ? "justify-end" : "justify-start")}>
                          {!mine && (
                            <Avatar className="w-7 h-7 flex-shrink-0">
                              <AvatarImage src={m.avatar} />
                              <AvatarFallback className="bg-yellow-500/20 text-yellow-500 text-xs">
                                {(m.displayName || m.username)?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={cn("max-w-[78%] rounded-2xl px-3 py-2", mine ? "bg-yellow-500 text-black" : "bg-white/10 text-white border border-white/10")}>
                            {m.replyTo && (
                              <div className="mb-1 pl-2 border-l-2 border-current opacity-60 text-xs truncate">
                                Yanıt: {messages.find(msg => msg.id === m.replyTo)?.text || "…"}
                              </div>
                            )}
                            <div className="flex items-center flex-wrap gap-1 mb-0.5">
                              <span className={cn("text-xs", mine ? "text-black/80" : "text-white/80")}>
                                <AnimatedUsername username={m.displayName || m.username} role={(m.role?.toUpperCase() || "USER") as any} />
                              </span>
                              {badge && (
                                <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold", mine ? "bg-black/15 text-black" : "bg-yellow-500/15 text-yellow-300 border border-yellow-500/25")}>
                                  {badge.icon}{badge.label}
                                </span>
                              )}
                              <span className={cn("text-[10px] ml-auto", mine ? "text-black/60" : "text-white/40")}>
                                {new Date(m.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <div className={cn("text-sm whitespace-pre-wrap break-words", mine ? "text-black" : "text-white")}>{m.text}</div>
                            {(canModerate || mine) && m.id !== "welcome" && (
                              <div className={cn("mt-1.5 hidden gap-1 group-hover:flex", mine ? "justify-end" : "")}>
                                <Button variant="ghost" size="sm" className={cn("h-6 px-1.5 text-[10px]", mine ? "text-black/70 hover:bg-black/10" : "text-white/70 hover:bg-white/10")} onClick={() => setReplyingTo(m)}>
                                  <Reply className="h-3 w-3 mr-0.5" /> Yanıtla
                                </Button>
                                <Button variant="ghost" size="sm" className={cn("h-6 px-1.5 text-[10px]", mine ? "text-black/70 hover:bg-black/10" : "text-white/70 hover:bg-white/10")} onClick={() => deleteOne(m.id)}>
                                  <Trash2 className="h-3 w-3 mr-0.5" /> Sil
                                </Button>
                                {canModerate && m.userId && !mine && (() => {
                                  const tr = (m.role || "").toLowerCase();
                                  if (myRole.includes("admin") && tr.includes("admin")) return null;
                                  if (myRole.includes("moder") && (tr.includes("admin") || tr.includes("moder"))) return null;
                                  return (
                                    <>
                                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-white/70 hover:bg-white/10" onClick={() => adminAction("mute", m.userId!)}>
                                        <VolumeX className="h-3 w-3 mr-0.5" /> Mute
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-white/70 hover:bg-white/10" onClick={() => adminAction("ban", m.userId!)}>
                                        <Ban className="h-3 w-3 mr-0.5" /> Ban
                                      </Button>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                {/* Global input */}
                <div className="px-3 pb-3 pt-2 border-t border-yellow-500/20 shrink-0">
                  {replyingTo && (
                    <div className="mb-2 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-1.5">
                      <Reply className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-yellow-500 font-medium">{replyingTo.displayName || replyingTo.username}</div>
                        <div className="text-xs text-white/60 truncate">{replyingTo.text}</div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0" onClick={() => setReplyingTo(null)}>
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                  {cooldownSeconds > 0 && (
                    <div className="mb-2 text-center text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg py-1">
                      ⏱ {cooldownSeconds}s bekle
                    </div>
                  )}
                  <form onSubmit={e => { e.preventDefault(); sendGlobal(); }} className="flex gap-2">
                    <Input value={text} onChange={e => setText(e.target.value)} placeholder={user ? "Mesaj yaz…" : "Giriş yapman gerekiyor"} disabled={!user}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-yellow-500/40 h-8 text-sm" />
                    <Button type="submit" disabled={!user || !text.trim()} className="bg-yellow-500 text-black hover:brightness-110 h-8 w-8 p-0 shrink-0">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              </>
            )}

            {/* === DM TAB === */}
            {activeTab === "dm" && (
              <>
                {/* Kullanıcı rehberi */}
                {showNewDm && (
                  <div className="px-3 py-2 border-b border-white/10 bg-[#0a0a14] shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-blue-400 font-semibold">Kullanıcı Seç</p>
                      <Button variant="ghost" size="sm" className="h-5 px-1 text-white/40 hover:text-white" onClick={() => { setShowNewDm(false); setUserSearch(""); }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
                      <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="İsim ara..."
                        className="bg-white/10 border-white/20 text-white text-xs h-7 pl-7 placeholder:text-white/30" />
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {filteredUsers.filter((u: any) => u.id !== myId).map((u: any) => (
                        <button key={u.id} onClick={() => startDmWithUser(u)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left">
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs">
                              {(u.displayName || u.username)?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className={cn("text-xs font-semibold truncate", roleColor(u.role))}>{u.displayName || u.username}</div>
                            <div className="text-[10px] text-white/30 truncate">@{u.username}</div>
                          </div>
                          <span className="text-[10px] text-white/20 shrink-0 capitalize">{u.role?.toLowerCase()}</span>
                        </button>
                      ))}
                      {filteredUsers.filter((u: any) => u.id !== myId).length === 0 && (
                        <p className="text-xs text-white/30 text-center py-2">Kullanıcı bulunamadı</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Conversation list OR DM thread */}
                {!activeDm ? (
                  /* Conversation list */
                  <ScrollArea className="flex-1">
                    {convos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-white/40 py-10 text-sm gap-2">
                        <Mail className="h-8 w-8 opacity-40" />
                        <p>Henüz özel mesaj yok</p>
                        {canStartDm && (
                          <p className="text-xs">Yukarıdaki kalem ikonuyla yeni mesaj başlat</p>
                        )}
                        {!canStartDm && (
                          <p className="text-xs text-center px-4">Mesaj alma: Admin veya Ajans Sahibi sana mesaj açtığında burada görünür</p>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {convos.sort((a, b) => b.lastAt - a.lastAt).map(c => (
                          <div key={c.withUserId} className="group relative flex items-center hover:bg-white/5 transition-colors">
                            <button onClick={() => openDmWith(c)}
                              className="flex-1 flex items-center gap-3 px-3 py-3 text-left min-w-0">
                              <Avatar className="w-9 h-9 shrink-0">
                                <AvatarFallback className="bg-blue-500/20 text-blue-400 text-sm">
                                  {c.withDisplayName?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className={cn("text-sm font-semibold truncate", roleColor(c.withRole))}>{c.withDisplayName}</div>
                                <div className="text-xs text-white/50 truncate">{c.lastMsg}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[10px] text-white/30">
                                  {new Date(c.lastAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {c.unread > 0 && (
                                  <span className="h-4 min-w-4 rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white flex items-center justify-center">
                                    {c.unread}
                                  </span>
                                )}
                              </div>
                            </button>
                            <button onClick={e => { e.stopPropagation(); deleteDmConvo(c.withUserId); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/10">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                ) : (
                  /* DM Thread */
                  <>
                    <ScrollArea className="flex-1 px-3 py-2">
                      <div className="space-y-2">
                        {dmHistory.map(m => {
                          const mine = m.fromUserId === myId;
                          return (
                            <div key={m.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                              {!mine && (
                                <Avatar className="w-7 h-7 shrink-0">
                                  <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs">
                                    {m.fromDisplayName?.[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className={cn("max-w-[78%] rounded-2xl px-3 py-2", mine ? "bg-blue-600 text-white" : "bg-white/10 text-white border border-white/10")}>
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className={cn("text-xs font-semibold", mine ? "text-white/80" : roleColor(m.fromRole))}>
                                    {m.fromDisplayName}
                                  </span>
                                  <span className="text-[10px] text-white/40 ml-auto">
                                    {new Date(m.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                                <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={dmEndRef} />
                      </div>
                    </ScrollArea>
                    {/* DM input */}
                    <div className="px-3 pb-3 pt-2 border-t border-blue-500/20 shrink-0">
                      <form onSubmit={e => { e.preventDefault(); sendDm(); }} className="flex gap-2">
                        <Input value={dmText} onChange={e => setDmText(e.target.value)} placeholder="Mesaj yaz…"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-blue-500/40 h-8 text-sm" />
                        <Button type="submit" disabled={!dmText.trim()} className="bg-blue-600 text-white hover:bg-blue-700 h-8 w-8 p-0 shrink-0">
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
