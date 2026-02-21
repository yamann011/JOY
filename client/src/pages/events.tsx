import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { EventCard, EventCardSkeleton } from "@/components/event-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import type { Event } from "@shared/schema";
import { Calendar, Search, Plus, Filter } from "lucide-react";
import { Redirect } from "wouter";
import { useAnnouncement } from "@/hooks/use-announcement";


export default function Events() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { hasAnnouncement } = useAnnouncement();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

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

  const canCreateEvent = user?.role === "ADMIN" || user?.role === "MOD";

  return (
    <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-6">
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gradient-gold">PK / Etkinlikler</h1>
            <p className="text-sm text-muted-foreground">Tüm etkinlikleri görüntüleyin</p>
          </div>
          {canCreateEvent && (
            <Button className="gap-2" data-testid="button-create-event">
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
              data-testid="input-search-events"
            />
          </div>
          <Button variant="outline" className="gap-2" data-testid="button-filter-events">
            <Filter className="w-4 h-4" />
            Filtrele
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-events">
              Tümü
            </TabsTrigger>
            <TabsTrigger value="live" data-testid="tab-live-events">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Canlı
              </span>
            </TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming-events">
              Yaklaşan
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
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
                  {searchQuery
                    ? "Arama kriterlerinize uygun etkinlik bulunamadı."
                    : "Henüz etkinlik oluşturulmamış."}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
