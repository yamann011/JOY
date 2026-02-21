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
import { MessageCircle, X, Send, Shield, Crown, Trash2, Ban, VolumeX, Reply, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

function roleBadge(role?: string) {
  const r = (role || "").toLowerCase();
  if (r.includes("admin")) return { label: "ADMIN", icon: <Shield className="h-3.5 w-3.5" /> };
  if (r.includes("vip")) return { label: "VIP", icon: <Crown className="h-3.5 w-3.5" /> };
  if (r.includes("moder")) return { label: "MOD", icon: <Shield className="h-3.5 w-3.5" /> };
  return null;
}

function getSocketUrl() {
  // Aynı origin (Railway + aynı host/port) ise undefined doğru.
  return undefined;
}

export function FloatingChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();

  if (location === "/login") return null;

  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [replyingTo, setReplyingTo] = React.useState<ChatMessage | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = React.useState(0);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "welcome",
      userId: null,
      username: "Sistem",
      role: "system",
      text: "Canlı sohbet bağlanıyor…",
      createdAt: Date.now(),
    },
  ]);

  // ✅ Okunmamış sayaç (balon kapalıyken artar, açınca sıfırlanır)
  const [unread, setUnread] = React.useState(0);

  const roleLower = String((user as any)?.role || "").toLowerCase();
  const canModerate = !!user && (roleLower.includes("admin") || roleLower.includes("vip") || roleLower.includes("moder"));
  const canNuke = !!user && (roleLower.includes("admin") || roleLower.includes("vip"));
  const isAdmin = !!user && roleLower.includes("admin");

  const socketRef = React.useRef<Socket | null>(null);

  // ✅ ScrollArea viewport ref (shadcn/radix)
  const viewportRef = React.useRef<HTMLDivElement | null>(null);

  // ✅ Bağlantı toast spam olmasın diye: connect toast kapalı
  // (İstersen burada sadece debug log bırakılır)
  // const didConnectToastRef = React.useRef(false);

  // ✅ open değişince unread sıfırla
  React.useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  // ✅ Mesaj geldikçe (ve panel açıksa) otomatik en alta kaydır
  function scrollToBottom() {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollTop = vp.scrollHeight;
  }

  React.useEffect(() => {
    if (!open) return;
    // DOM boyutu otursun diye bir tick sonra
    const t = window.setTimeout(scrollToBottom, 50);
    return () => window.clearTimeout(t);
  }, [messages.length, open]);

  // Socket bağlantısı
  React.useEffect(() => {
    // giriş yoksa bağlanma
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setUnread(0);
      return;
    }

    // zaten bağlıysa tekrar bağlanma
    if (socketRef.current?.connected) return;

    const s = io(getSocketUrl(), {
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

    // ✅ BU TOAST’I KAPATTIK (spam yapmasın)
    s.on("connect", () => {
      // toast({ title: "Sohbet bağlı", description: "Global sohbete bağlandın." });
    });

    // connect_error toast kalsın (gerçek hata)
    s.on("connect_error", (err: any) => {
      toast({
        title: "Sohbete bağlanamadı",
        description: String(err?.message || err),
        variant: "destructive",
      });
    });

    s.on("chat:init", (payload: { messages?: ChatMessage[] }) => {
      const list = Array.isArray(payload?.messages) ? payload.messages : [];
      if (list.length) setMessages(list);
      else {
        setMessages([
          {
            id: "ready",
            userId: null,
            username: "Sistem",
            role: "system",
            text: "Sohbet hazır. İlk mesajı sen at 🙂",
            createdAt: Date.now(),
          },
        ]);
      }
      // init sonrası balon kapalıysa unread sıfır (yeni mesaj sayılmaz)
      setUnread(0);
    });

    s.on("chat:message", (msg: ChatMessage) => {
      if (!msg?.id) return;

      setMessages((prev) => [...prev, msg].slice(-100));

      // ✅ Balon kapalıysa unread arttır
      // Kendi mesajın geldiyse unread sayma
      const myId = (user as any)?.id;
      const mine = myId != null && msg.userId === myId;

      if (!open && !mine) {
        setUnread((u) => Math.min(u + 1, 99));
      }
    });

    s.on("chat:deleted", ({ id }: { id?: string }) => {
      if (!id) return;
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });

    s.on("chat:cleared", (info: { by?: string; role?: string }) => {
      setMessages([
        {
          id: "cleared",
          userId: null,
          username: "Sistem",
          role: "system",
          text: `Sohbet temizlendi. (${info?.by || "yetkili"})`,
          createdAt: Date.now(),
        },
      ]);
      setUnread(0);
    });

    s.on("chat:modlog", (info: any) => {
      toast({
        title: "Moderasyon",
        description: `${info?.action || "işlem"} → #${info?.targetId ?? "?"} (${info?.by || "?"})`,
      });
    });

    s.on("chat:error", (e: { code?: string; message?: string; remainingSeconds?: number }) => {
      if (e?.code === "COOLDOWN" && e.remainingSeconds) {
        setCooldownSeconds(e.remainingSeconds);
        
        // Countdown timer
        const countdown = setInterval(() => {
          setCooldownSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(countdown);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      
      toast({
        title: e?.code || "Hata",
        description: e?.message || "Sohbet hatası",
        variant: "destructive",
      });
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [(user as any)?.id, (user as any)?.username, (user as any)?.role, open, toast]);

  function send() {
    const t = text.trim();
    if (!t) return;
    if (!socketRef.current?.connected) {
      toast({ title: "Sohbet kapalı", description: "Bağlantı yok.", variant: "destructive" });
      return;
    }
    
    if (cooldownSeconds > 0) {
      toast({ 
        title: "Çok hızlı", 
        description: `${cooldownSeconds} saniye bekle`,
        variant: "destructive" 
      });
      return;
    }
    
    socketRef.current.emit("chat:message", { 
      text: t,
      avatar: (user as any)?.avatar,
      replyTo: replyingTo?.id 
    });
    setText("");
    setReplyingTo(null);
    // kendi mesajın sonrası en alta in
    window.setTimeout(scrollToBottom, 50);
  }

  function clearAll() {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("chat:clear");
  }

  function deleteOne(id: string) {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("chat:delete", { id });
  }

  function adminAction(action: "mute" | "unmute" | "ban" | "unban", userId: number) {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit(`chat:${action}`, { userId });
  }

  return (
    <div className="fixed bottom-4 right-4 z-[80]">
      {!open && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "group relative flex h-14 w-14 items-center justify-center rounded-full",
                "bg-gradient-to-br from-yellow-500 to-amber-400 text-black shadow-lg",
                "ring-1 ring-yellow-500/40 hover:brightness-110 active:scale-[0.98]",
                "transition"
              )}
            >
              <MessageCircle className="h-6 w-6" />

              {/* ✅ Artık toplam mesaj değil, okunmamış gösteriyoruz */}
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-red-600 px-1 text-xs font-bold text-white flex items-center justify-center">
                  {Math.min(unread, 99)}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Canlı Sohbet</TooltipContent>
        </Tooltip>
      )}

      {open && (
        <Card
          className={cn(
            "w-[340px] sm:w-[380px] overflow-hidden border border-yellow-500/25",
            "bg-black/85 backdrop-blur-xl shadow-2xl"
          )}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-yellow-500/20">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-yellow-500 to-amber-400 flex items-center justify-center text-black">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-white">Canlı Sohbet</div>
                <div className="text-xs text-white/60">Tek global oda</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {canNuke && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10"
                      onClick={clearAll}
                      aria-label="Sohbeti temizle"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Temizle (Admin/VIP)</TooltipContent>
                </Tooltip>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setOpen(false)}
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ✅ ScrollArea içine viewport ref bağladık */}
          <ScrollArea className="h-[320px] px-3 py-3">
            <div
              // Radix viewport yakalamak için: bu div, content wrapper gibi davranır.
              // Eğer sende tam aşağı inmiyorsa, ScrollArea componentinin içine bir prop daha ekleyip viewportRef'i oraya bağlarız.
              ref={(el) => {
                // ScrollArea içinde gerçek scroll yapan eleman bazen parent oluyor.
                // Burada en pratik yöntem: en yakın scrollable parent'ı bul.
                if (!el) return;
                const scroller = el.closest("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
                viewportRef.current = scroller ?? (el.parentElement as HTMLDivElement | null);
              }}
              className="space-y-2"
            >
              {messages.map((m) => {
                const mine = (user as any)?.id != null && m.userId === (user as any)?.id;
                const badge = roleBadge(m.role);

                return (
                  <div key={m.id} className={cn("group flex gap-2", mine ? "justify-end" : "justify-start")}>
                    {/* Avatar (kendi mesajlarında sağda göster) */}
                    {!mine && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage 
                          src={m.avatar} 
                          className="object-cover"
                          style={{ imageRendering: 'auto' }}
                        />
                        <AvatarFallback className="bg-yellow-500/20 text-yellow-500 text-xs">
                          {(m.displayName || m.username)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3 py-2",
                        mine ? "bg-yellow-500 text-black" : "bg-white/10 text-white border border-white/10"
                      )}
                    >
                      {/* Reply ediliyorsa göster */}
                      {m.replyTo && (
                        <div className="mb-1 pl-2 border-l-2 border-current opacity-60 text-xs">
                          <div className="truncate">Yanıt: {messages.find(msg => msg.id === m.replyTo)?.text || "..."}</div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-xs", mine ? "text-black/80" : "text-white/80")}>
                          <AnimatedUsername 
                            username={m.displayName || m.username} 
                            role={(m.role?.toUpperCase() || "USER") as any} 
                          />
                        </span>

                        {badge && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                              mine
                                ? "bg-black/15 text-black"
                                : "bg-yellow-500/15 text-yellow-300 border border-yellow-500/25"
                            )}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                        )}

                        <span className={cn("text-[10px]", mine ? "text-black/60" : "text-white/40")}>
                          {new Date(m.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className={cn("text-sm whitespace-pre-wrap break-words", mine ? "text-black" : "text-white")}>
                        {m.text}
                      </div>

                      {(canModerate || mine) && m.id !== "welcome" && (
                        <div className={cn("mt-2 hidden gap-1 group-hover:flex", mine ? "justify-end" : "")}>
                          {/* Reply butonu (herkes görebilir) */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 px-2 text-xs",
                              mine
                                ? "text-black/70 hover:text-black hover:bg-black/10"
                                : "text-white/70 hover:text-white hover:bg-white/10"
                            )}
                            onClick={() => setReplyingTo(m)}
                            title="Yanıtla"
                          >
                            <Reply className="h-3.5 w-3.5 mr-1" />
                            Yanıtla
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 px-2 text-xs",
                              mine
                                ? "text-black/70 hover:text-black hover:bg-black/10"
                                : "text-white/70 hover:text-white hover:bg-white/10"
                            )}
                            onClick={() => deleteOne(m.id)}
                            title="Mesaj sil"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Sil
                          </Button>

                          {canModerate && m.userId && !mine && (() => {
                            const myRole = String((user as any)?.role || "").toLowerCase();
                            const targetRole = String(m.role || "").toLowerCase();
                            
                            // Admin: Can't ban other admins
                            if (myRole.includes("admin") && targetRole.includes("admin")) {
                              return null;
                            }
                            
                            // Mod: Can't ban admins or other mods
                            if (myRole.includes("moder") && (targetRole.includes("admin") || targetRole.includes("moder"))) {
                              return null;
                            }
                            
                            return (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
                                  onClick={() => adminAction("mute", m.userId!)}
                                  title="Sustur"
                                >
                                  <VolumeX className="h-3.5 w-3.5 mr-1" />
                                  Mute
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
                                  onClick={() => adminAction("ban", m.userId!)}
                                  title="Ban"
                                >
                                  <Ban className="h-3.5 w-3.5 mr-1" />
                                  Ban
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

          <div className="p-3 border-t border-yellow-500/20">
            {/* Reply Preview */}
            {replyingTo && (
              <div className="mb-2 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                <Reply className="w-4 h-4 text-yellow-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-yellow-500 font-medium">{replyingTo.displayName || replyingTo.username}</div>
                  <div className="text-xs text-white/60 truncate">{replyingTo.text}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setReplyingTo(null)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {/* Cooldown Timer */}
            {cooldownSeconds > 0 && (
              <div className="mb-2 text-center text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg py-1">
                ⏱️ {cooldownSeconds} saniye bekle
              </div>
            )}
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={user ? "Mesaj yaz..." : "Giriş yapmadan yazamazsın"}
                disabled={!user}
                className={cn(
                  "bg-white/5 border-white/10 text-white placeholder:text-white/40",
                  "focus-visible:ring-yellow-500/40"
                )}
              />
              <Button
                type="submit"
                disabled={!user || !text.trim()}
                className="bg-yellow-500 text-black hover:brightness-110"
                aria-label="Gönder"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>

            {!user && <div className="mt-2 text-xs text-white/50">Mesaj yazmak için giriş yap.</div>}
          </div>
        </Card>
      )}
    </div>
  );
          }
