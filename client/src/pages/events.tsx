import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { EventCard, EventCardSkeleton } from "@/components/event-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Event } from "@shared/schema";
import { Calendar, Search, Plus, Filter, UserPlus, X, Image as ImageIcon, Trash2 } from "lucide-react";
import { Redirect } from "wouter";
import { useAnnouncement } from "@/hooks/use-announcement";
import { useToast } from "@/hooks/use-toast";

type Participant = { name: string; avatar?: string };

const MAX_PARTICIPANTS = 8;

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function Events() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { hasAnnouncement } = useAnnouncement();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    agencyName: "",
    coverImage: "",
    scheduledAt: "",
    isLive: false,
  });
  const [participants, setParticipants] = useState<Participant[]>([{ name: "", avatar: "" }]);

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Redirect to="/login" />;

  const filteredEvents = events?.filter((ev) => {
    const q = searchQuery.toLowerCase();
    const match = ev.title.toLowerCase().includes(q) || ev.agencyName.toLowerCase().includes(q);
    if (activeTab === "live") return match && ev.isLive;
    if (activeTab === "upcoming") return match && !ev.isLive;
    return match;
  }) || [];

  const role = ((user as any)?.role || "").toUpperCase();
  const canManage = role === "ADMIN" || role === "MOD" || role === "AJANS_SAHIBI";

  function addParticipant() {
    if (participants.length >= MAX_PARTICIPANTS) return;
    setParticipants(p => [...p, { name: "", avatar: "" }]);
  }
  function removeParticipant(i: number) {
    setParticipants(p => p.filter((_, idx) => idx !== i));
  }
  function updateParticipant(i: number, field: keyof Participant, value: string) {
    setParticipants(p => p.map((pt, idx) => idx === i ? { ...pt, [field]: value } : pt));
  }
  async function pickParticipantAvatar(i: number, file: File) {
    const b64 = await toBase64(file);
    updateParticipant(i, "avatar", b64);
  }
  async function pickCover(file: File) {
    const b64 = await toBase64(file);
    setForm(f => ({ ...f, coverImage: b64 }));
  }

  async function handleCreate() {
    if (!form.title || !form.agencyName || !form.scheduledAt) {
      toast({ title: "Başlık, ajans adı ve tarih zorunludur", variant: "destructive" });
      return;
    }
    const validParticipants = participants.filter(p => p.name.trim());
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          participantsData: JSON.stringify(validParticipants),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Hata oluştu");
      }
      toast({ title: "Etkinlik oluşturuldu!" });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setShowCreate(false);
      setForm({ title: "", description: "", agencyName: "", coverImage: "", scheduledAt: "", isLive: false });
      setParticipants([{ name: "", avatar: "" }]);
    } catch (e: any) {
      toast({ title: e.message || "Hata", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu etkinliği silmek istediğine emin misin?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Silme başarısız");
      toast({ title: "Etkinlik silindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gradient-gold">PK / Etkinlikler</h1>
            <p className="text-sm text-muted-foreground">Tüm etkinlikleri görüntüleyin</p>
          </div>
          {canManage && (
            <Button className="gap-2" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> Yeni Etkinlik
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Etkinlik veya ajans ara..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> Filtrele
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Tümü</TabsTrigger>
            <TabsTrigger value="live">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Canlı
              </span>
            </TabsTrigger>
            <TabsTrigger value="upcoming">Yaklaşan</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
            ) : filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents.map(ev => (
                  <div key={ev.id} className="relative group">
                    <EventCard event={ev} />
                    {canManage && (
                      <button onClick={() => handleDelete(ev.id)}
                        disabled={deleting === ev.id}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/90 hover:bg-red-600 text-white rounded p-1.5 z-10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Etkinlik Bulunamadı</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Arama kriterlerinize uygun etkinlik bulunamadı." : "Henüz etkinlik oluşturulmamış."}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ─── Yeni Etkinlik Modal ─────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Etkinlik Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Kapak resmi */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kapak Resmi</label>
              <input ref={coverRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && pickCover(e.target.files[0])} />
              {form.coverImage ? (
                <div className="relative">
                  <img src={form.coverImage} alt="kapak" className="w-full h-32 object-cover rounded-lg" />
                  <button onClick={() => setForm(f => ({ ...f, coverImage: "" }))}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => coverRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/60 transition-colors">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-xs">Resim seç</span>
                </button>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Başlık *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Etkinlik başlığı" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ajans Adı *</label>
              <Input value={form.agencyName} onChange={e => setForm(f => ({ ...f, agencyName: e.target.value }))} placeholder="Ajans adı" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Açıklama</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Kısa açıklama" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tarih & Saat *</label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.isLive} onChange={e => setForm(f => ({ ...f, isLive: e.target.checked }))} className="accent-yellow-400" />
              Şu an canlı
            </label>

            {/* Katılımcılar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground font-semibold uppercase">
                  Katılımcılar ({participants.length}/{MAX_PARTICIPANTS})
                </label>
                {participants.length < MAX_PARTICIPANTS && (
                  <Button size="sm" variant="outline" onClick={addParticipant} className="h-7 text-xs gap-1">
                    <UserPlus className="w-3 h-3" /> Ekle
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {participants.map((pt, i) => (
                  <ParticipantRow key={i} pt={pt} index={i}
                    onNameChange={v => updateParticipant(i, "name", v)}
                    onAvatarChange={file => pickParticipantAvatar(i, file)}
                    onRemove={() => removeParticipant(i)}
                    removable={participants.length > 1}
                  />
                ))}
              </div>
            </div>

            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? "Oluşturuluyor..." : "Etkinlik Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ParticipantRow({
  pt, index, onNameChange, onAvatarChange, onRemove, removable
}: {
  pt: Participant; index: number;
  onNameChange: (v: string) => void;
  onAvatarChange: (f: File) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && onAvatarChange(e.target.files[0])} />
      <button onClick={() => fileRef.current?.click()} className="shrink-0">
        {pt.avatar ? (
          <img src={pt.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-primary/30" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-muted border border-dashed border-muted-foreground/40 flex items-center justify-center text-muted-foreground">
            <UserPlus className="w-4 h-4" />
          </div>
        )}
      </button>
      <Input value={pt.name} onChange={e => onNameChange(e.target.value)}
        placeholder={`Katılımcı ${index + 1} adı`} className="h-8 text-sm" />
      {removable && (
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
