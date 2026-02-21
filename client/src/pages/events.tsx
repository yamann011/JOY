import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { EventCard, EventCardSkeleton } from "@/components/event-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Event } from "@shared/schema";
import { Calendar, Search, Plus, Filter } from "lucide-react";
import { Redirect } from "wouter";
import { useAnnouncement } from "@/hooks/use-announcement";
import { useToast } from "@/hooks/use-toast";

export default function Events() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { hasAnnouncement } = useAnnouncement();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    agencyName: "",
    participant1Name: "",
    participant2Name: "",
    scheduledAt: "",
    isLive: false,
  });

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

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  const filteredEvents = events?.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.agencyName.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "live") return matchesSearch && event.isLive;
    if (activeTab === "upcoming") return matchesSearch && !event.isLive;
    return matchesSearch;
  }) || [];

  const role = (user?.role || "").toUpperCase();
  const canCreateEvent = role === "ADMIN" || role === "MOD" || role === "AJANS_SAHIBI";

  async function handleCreate() {
    if (!form.title || !form.agencyName || !form.scheduledAt) {
      toast({ title: "Başlık, ajans adı ve tarih zorunludur", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Hata oluştu");
      }
      toast({ title: "Etkinlik oluşturuldu!" });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setShowCreate(false);
      setForm({ title: "", description: "", agencyName: "", participant1Name: "", participant2Name: "", scheduledAt: "", isLive: false });
    } catch (e: any) {
      toast({ title: e.message || "Hata", variant: "destructive" });
    } finally {
      setSaving(false);
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
          {canCreateEvent && (
            <Button className="gap-2" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              Yeni Etkinlik
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Etkinlik veya ajans ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtrele
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Tümü</TabsTrigger>
            <TabsTrigger value="live">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Canlı
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
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
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

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Etkinlik Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Katılımcı 1</label>
                <Input value={form.participant1Name} onChange={e => setForm(f => ({ ...f, participant1Name: e.target.value }))} placeholder="İsim" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Katılımcı 2</label>
                <Input value={form.participant2Name} onChange={e => setForm(f => ({ ...f, participant2Name: e.target.value }))} placeholder="İsim" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tarih & Saat *</label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.isLive} onChange={e => setForm(f => ({ ...f, isLive: e.target.checked }))} className="accent-yellow-400" />
              Şu an canlı
            </label>
            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
