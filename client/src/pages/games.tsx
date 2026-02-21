import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAnnouncement } from "@/hooks/use-announcement";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import type { EmbeddedSite } from "@shared/schema";
import { Gamepad2, ExternalLink, Maximize2, X } from "lucide-react";
import { Redirect } from "wouter";

export default function Games() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasAnnouncement } = useAnnouncement();
  const [selectedSite, setSelectedSite] = useState<EmbeddedSite | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: sites, isLoading } = useQuery<EmbeddedSite[]>({
    queryKey: ["/api/embedded-sites"],
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

  const categories = Array.from(new Set(sites?.map(s => s.category) || []));
  const activeSites = sites?.filter(s => s.isActive) || [];

  return (
    <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gradient-gold flex items-center gap-2">
              <Gamepad2 className="w-7 h-7" />
              Oyunlar & İçerikler
            </h1>
            <p className="text-sm text-muted-foreground">Gömülü siteler ve uygulamalar</p>
          </div>
        </div>

        {selectedSite ? (
          <Card className={`${isFullscreen ? 'fixed inset-4 z-50' : 'h-[80vh]'} flex flex-col`}>
            <div className="p-3 border-b flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
              <h3 className="font-semibold flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-primary" />
                {selectedSite.name}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  data-testid="button-toggle-fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedSite(null);
                    setIsFullscreen(false);
                  }}
                  data-testid="button-close-iframe"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <CardContent className="flex-1 p-0">
              <iframe
                src={selectedSite.url}
                className="w-full h-full"
                allowFullScreen
                title={selectedSite.name}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="aspect-video bg-muted rounded animate-pulse mb-3" />
                    <div className="h-5 w-2/3 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                  </Card>
                ))}
              </div>
            ) : categories.length > 0 ? (
              <Tabs defaultValue={categories[0]} className="w-full">
                <TabsList className="flex-wrap">
                  {categories.map((cat) => (
                    <TabsTrigger key={cat} value={cat} data-testid={`tab-category-${cat}`}>
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {categories.map((cat) => (
                  <TabsContent key={cat} value={cat} className="mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeSites
                        .filter((site) => site.category === cat)
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((site) => (
                          <Card
                            key={site.id}
                            className="overflow-hidden hover-elevate cursor-pointer transition-all"
                            onClick={() => setSelectedSite(site)}
                            data-testid={`site-card-${site.id}`}
                          >
                            {site.imageUrl && (
                              <div
                                className="aspect-video bg-cover bg-center"
                                style={{ backgroundImage: `url(${site.imageUrl})` }}
                              />
                            )}
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-semibold line-clamp-1">{site.name}</h3>
                                <Badge variant="outline" className="flex-shrink-0">
                                  {site.category}
                                </Badge>
                              </div>
                              {site.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                  {site.description}
                                </p>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSite(site);
                                }}
                              >
                                <ExternalLink className="w-4 h-4" />
                                Aç
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <Card className="p-12 text-center">
                <Gamepad2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Henüz İçerik Yok</h3>
                <p className="text-muted-foreground">
                  Admin tarafından içerik eklendiğinde burada görünecek.
                </p>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
