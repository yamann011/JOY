import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Film,
  Plus,
  Lock,
  Users,
  Play,
  Pause,
  Send,
  Trash2,
  RefreshCw,
  Tv2,
  ChevronLeft,
  Crown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CinemaRoomInfo {
  id: string;
  name: string;
  hasPassword: boolean;
  videoUrl: string;
  isPlaying: boolean;
  participantCount: number;
  createdBy: string;
  createdAt: number;
}

interface CinemaMsg {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  role: string;
  text: string;
  createdAt: number;
}

interface VideoState {
  videoUrl: string;
  currentTime: number;
  isPlaying: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toEmbedUrl(url: string): string {
  if (!url) return "";
  if (url.includes("/embed/")) return url;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?enablejsapi=1&rel=0`;
  return url;
}

function isYouTube(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function roleColor(role: string) {
  const r = role.toLowerCase();
  if (r.includes("admin")) return "text-yellow-400";
  if (r.includes("ajans")) return "text-yellow-300";
  if (r.includes("moder")) return "text-blue-400";
  if (r.includes("asistan")) return "text-cyan-400";
  if (r.includes("vip")) return "text-rose-400";
  return "text-gray-300";
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function CinemaPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const socketRef = useRef<Socket | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [rooms, setRooms] = useState<CinemaRoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<CinemaRoomInfo | null>(null);
  const [videoState, setVideoState] = useState<VideoState | null>(null);
  const [messages, setMessages] = useState<CinemaMsg[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [participants, setParticipants] = useState<{ username: string; displayName: string; role: string }[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoinPass, setShowJoinPass] = useState<CinemaRoomInfo | null>(null);
  const [createName, setCreateName] = useState("");
  const [createUrl, setCreateUrl] = useState("");
  const [createPass, setCreatePass] = useState("");
  const [joinPass, setJoinPass] = useState("");
  const [showChangeUrl, setShowChangeUrl] = useState(false);
  const [newUrl, setNewUrl] = useState("");

  const canModerate = () => {
    if (!user) return false;
    const r = ((user as any).role || "").toLowerCase();
    return r.includes("admin") || r.includes("moder") || r.includes("asistan") || r.includes("ajans");
  };

  // ── Socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io("/cinema", {
      auth: isAuthenticated && user
        ? {
            userId: String((user as any).id || ""),
            username: (user as any).username || "",
            displayName: (user as any).displayName || "",
            role: (user as any).role || "",
          }
        : { userId: "", username: "Misafir", displayName: "Misafir", role: "guest" },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("cinema:rooms", (data: CinemaRoomInfo[]) => setRooms(data));
    socket.on("cinema:room_added", (room: CinemaRoomInfo) =>
      setRooms(prev => [...prev.filter(r => r.id !== room.id), room])
    );
    socket.on("cinema:room_removed", ({ roomId }: { roomId: string }) => {
      setRooms(prev => prev.filter(r => r.id !== roomId));
      setCurrentRoom(prev => prev?.id === roomId ? null : prev);
    });

    socket.on("cinema:created", ({ roomId }: { roomId: string }) => {
      socket.emit("cinema:join", { roomId, password: createPass });
      setShowCreate(false);
      setCreateName(""); setCreateUrl(""); setCreatePass("");
    });

    socket.on("cinema:state", (state: VideoState) => {
      setVideoState(state);
      setCurrentRoom(prev => prev ? { ...prev, videoUrl: state.videoUrl, isPlaying: state.isPlaying } : prev);
    });

    socket.on("cinema:messages_init", (msgs: CinemaMsg[]) => setMessages(msgs));
    socket.on("cinema:message", (msg: CinemaMsg) => setMessages(prev => [...prev, msg]));

    socket.on("cinema:sync", ({ isPlaying, currentTime }: { isPlaying: boolean; currentTime: number; by: string }) => {
      setVideoState(prev => prev ? { ...prev, isPlaying, currentTime } : prev);
      setCurrentRoom(prev => prev ? { ...prev, isPlaying } : prev);
      syncIframe(isPlaying, currentTime);
    });

    socket.on("cinema:url_changed", ({ videoUrl, by }: { videoUrl: string; by: string }) => {
      setVideoState(prev => prev ? { ...prev, videoUrl, currentTime: 0, isPlaying: false } : prev);
      setCurrentRoom(prev => prev ? { ...prev, videoUrl } : prev);
      toast({ title: `${by} videoyu değiştirdi` });
    });

    socket.on("cinema:participant_update", ({ count, participants: p }: { count: number; participants?: any[] }) => {
      setCurrentRoom(prev => prev ? { ...prev, participantCount: count } : prev);
      if (p) setParticipants(p);
    });

    socket.on("cinema:error", ({ message }: { message: string }) => {
      toast({ title: "Hata", description: message, variant: "destructive" });
    });

    return () => { socket.disconnect(); };
  }, [isAuthenticated, (user as any)?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const syncIframe = useCallback((playing: boolean, time: number) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func: playing ? "playVideo" : "pauseVideo", args: [] }), "*");
      if (time >= 0) {
        iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "seekTo", args: [time, true] }), "*");
      }
    } catch {}
  }, []);

  const joinRoom = (room: CinemaRoomInfo, password = "") => {
    setMessages([]); setParticipants([]);
    socketRef.current?.emit("cinema:join", { roomId: room.id, password });
    setCurrentRoom(room);
  };

  const handleJoinClick = (room: CinemaRoomInfo) => {
    if (room.hasPassword) { setShowJoinPass(room); setJoinPass(""); }
    else joinRoom(room);
  };

  const handleCreate = () => {
    if (!createName.trim() || !createUrl.trim()) {
      toast({ title: "İsim ve URL gerekli", variant: "destructive" });
      return;
    }
    socketRef.current?.emit("cinema:create", {
      name: createName.trim(),
      videoUrl: createUrl.trim(),
      password: createPass || undefined,
    });
  };

  const sendMsg = () => {
    const t = msgInput.trim();
    if (!t || !currentRoom) return;
    socketRef.current?.emit("cinema:message", { text: t });
    setMsgInput("");
  };

  const handlePlay = () => socketRef.current?.emit("cinema:play", { currentTime: videoState?.currentTime ?? 0 });
  const handlePause = () => socketRef.current?.emit("cinema:pause", { currentTime: videoState?.currentTime ?? 0 });
  const handleChangeUrl = () => {
    if (!newUrl.trim()) return;
    socketRef.current?.emit("cinema:change_url", { videoUrl: newUrl.trim() });
    setNewUrl(""); setShowChangeUrl(false);
  };
  const handleDeleteRoom = (roomId: string) => socketRef.current?.emit("cinema:delete_room", { roomId });
  const leaveRoom = () => { setCurrentRoom(null); setVideoState(null); setMessages([]); setParticipants([]); };

  // ─── ROOM VIEW ────────────────────────────────────────────────────────────
  if (currentRoom && videoState) {
    const embedUrl = toEmbedUrl(videoState.videoUrl);
    return (
      <div className="flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-black border-b border-yellow-500/20 shrink-0">
          <Button variant="ghost" size="icon" onClick={leaveRoom} className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Tv2 className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-lg truncate text-yellow-100">{currentRoom.name}</span>
          <Badge variant="outline" className="ml-auto border-yellow-500/30 text-yellow-300 text-xs">
            <Users className="w-3 h-3 mr-1" />{currentRoom.participantCount}
          </Badge>
          {canModerate() && (
            <>
              <Button size="sm" variant="outline" className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 text-xs" onClick={() => { setNewUrl(videoState.videoUrl); setShowChangeUrl(true); }}>
                <RefreshCw className="w-3 h-3 mr-1" /> URL Değiştir
              </Button>
              <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 text-xs" onClick={() => handleDeleteRoom(currentRoom.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Video */}
          <div className="flex-1 flex flex-col bg-black">
            <div className="flex-1 relative">
              {isYouTube(embedUrl) ? (
                <iframe ref={iframeRef} src={`${embedUrl}&autoplay=0`} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
              ) : (
                <video src={videoState.videoUrl} className="w-full h-full object-contain" />
              )}
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-black border-t border-yellow-500/20 shrink-0">
              {videoState.isPlaying ? (
                <Button onClick={handlePause} size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                  <Pause className="w-4 h-4 mr-1" /> Duraklat
                </Button>
              ) : (
                <Button onClick={handlePlay} size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                  <Play className="w-4 h-4 mr-1" /> Oynat
                </Button>
              )}
              <span className="text-xs text-yellow-500/60 ml-auto">
                {videoState.isPlaying ? "▶ Oynatılıyor" : "⏸ Duraklatıldı"}
              </span>
            </div>
          </div>

          {/* Chat */}
          <div className="w-72 flex flex-col bg-[#0a0a0a] border-l border-yellow-500/15">
            <div className="px-3 py-2 border-b border-yellow-500/15 shrink-0">
              <p className="text-xs text-yellow-500/60 font-semibold uppercase mb-1">İzleyenler ({participants.length})</p>
              <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
                {participants.map((p, i) => (
                  <span key={i} className={`text-xs font-medium ${roleColor(p.role)}`}>{p.displayName}</span>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map(m => (
                <div key={m.id} className="text-sm break-words">
                  <span className={`font-semibold mr-1 ${roleColor(m.role)}`}>{m.displayName}:</span>
                  <span className="text-gray-300">{m.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-2 border-t border-yellow-500/15 shrink-0 flex gap-2">
              <Input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendMsg(); }}
                placeholder={isAuthenticated ? "Mesaj yaz..." : "Giriş gerekiyor"}
                disabled={!isAuthenticated}
                className="bg-white/5 border-yellow-500/20 text-white text-sm h-8 placeholder:text-white/30" />
              <Button size="icon" className="h-8 w-8 bg-yellow-500 hover:bg-yellow-400 text-black shrink-0" onClick={sendMsg} disabled={!isAuthenticated}>
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={showChangeUrl} onOpenChange={setShowChangeUrl}>
          <DialogContent className="bg-[#111] border-yellow-500/30 text-white">
            <DialogHeader><DialogTitle className="text-yellow-400">Video URL Değiştir</DialogTitle></DialogHeader>
            <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..."
              className="bg-white/5 border-yellow-500/20 text-white" />
            <Button onClick={handleChangeUrl} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold w-full">Değiştir</Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── ROOM LIST ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header — hamburger menü altında, padding-top yeterli */}
      <div className="pt-16 pb-6 px-4 border-b border-yellow-500/15 bg-gradient-to-b from-black to-[#0a0a0a]">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/40 flex items-center justify-center">
              <Film className="w-5 h-5 text-yellow-400" />
            </div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              Sinema Odaları
            </h1>
            <Crown className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-yellow-500/50 text-sm">Gerçek zamanlı canlı film izleme odaları</p>

          {/* Oda oluştur butonu — başlığın altında */}
          {isAuthenticated && (
            <Button
              onClick={() => setShowCreate(true)}
              className="mt-5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-2 shadow-lg shadow-yellow-500/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Oda Oluştur
            </Button>
          )}
          {!isAuthenticated && (
            <p className="mt-4 text-xs text-yellow-500/40">Oda oluşturmak veya katılmak için giriş yapman gerekiyor</p>
          )}
        </div>
      </div>

      {/* Rooms */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-yellow-500/30">
            <Tv2 className="w-16 h-16 mb-4" />
            <p className="text-lg font-semibold">Henüz aktif oda yok</p>
            <p className="text-sm mt-1">İlk odayı sen oluştur!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => (
              <Card key={room.id} className="bg-[#111] border-yellow-500/20 hover:border-yellow-500/50 transition-all hover:shadow-lg hover:shadow-yellow-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-yellow-100 flex items-center gap-2 text-base">
                    {room.hasPassword && <Lock className="w-4 h-4 text-yellow-400 shrink-0" />}
                    <span className="truncate">{room.name}</span>
                  </CardTitle>
                  <p className="text-yellow-500/40 text-xs">{room.createdBy} tarafından</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3 text-sm text-yellow-200/60">
                    <Users className="w-4 h-4 text-yellow-500" />
                    <span>{room.participantCount} izleyici</span>
                    {room.isPlaying && (
                      <Badge className="ml-auto bg-green-500/15 text-green-400 border-green-500/30 text-xs">
                        ▶ Oynatılıyor
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm"
                      onClick={() => handleJoinClick(room)}
                      disabled={!isAuthenticated}
                    >
                      {room.hasPassword ? <><Lock className="w-3 h-3 mr-1" /> Katıl</> : <><Play className="w-3 h-3 mr-1" /> Katıl</>}
                    </Button>
                    {canModerate() && (
                      <Button size="icon" variant="ghost" className="text-red-400 hover:bg-red-500/10 shrink-0" onClick={() => handleDeleteRoom(room.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#111] border-yellow-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-400">
              <Film className="w-5 h-5" /> Yeni Sinema Odası
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Oda adı (örn: Film Gecesi)"
              className="bg-white/5 border-yellow-500/20 text-white placeholder:text-white/30" />
            <Input value={createUrl} onChange={e => setCreateUrl(e.target.value)} placeholder="Video URL (YouTube, direkt link...)"
              className="bg-white/5 border-yellow-500/20 text-white placeholder:text-white/30" />
            <Input value={createPass} onChange={e => setCreatePass(e.target.value)} placeholder="Şifre (opsiyonel)" type="password"
              className="bg-white/5 border-yellow-500/20 text-white placeholder:text-white/30" />
            <Button onClick={handleCreate} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold w-full">
              <Plus className="w-4 h-4 mr-2" /> Oda Oluştur
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join password dialog */}
      <Dialog open={!!showJoinPass} onOpenChange={v => { if (!v) setShowJoinPass(null); }}>
        <DialogContent className="bg-[#111] border-yellow-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-400">
              <Lock className="w-5 h-5" /> Şifreli Oda
            </DialogTitle>
          </DialogHeader>
          <p className="text-yellow-200/70 text-sm">"{showJoinPass?.name}" odasına katılmak için şifre gir:</p>
          <Input value={joinPass} onChange={e => setJoinPass(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && showJoinPass) { joinRoom(showJoinPass, joinPass); setShowJoinPass(null); } }}
            placeholder="Şifre" type="password"
            className="bg-white/5 border-yellow-500/20 text-white" />
          <Button onClick={() => { if (showJoinPass) { joinRoom(showJoinPass, joinPass); setShowJoinPass(null); } }}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold w-full">
            <Play className="w-4 h-4 mr-2" /> Katıl
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
