import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, Eye, Heart, MessageSquare, ExternalLink, Play, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { HamburgerMenuTrigger } from "@/components/hamburger-menu";
import { useBranding } from "@/hooks/use-branding";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  summary?: string;
  imageUrl?: string;
  videoUrl?: string;
  externalLink?: string;
  category: string;
  viewCount: number;
  likeCount: number;
  author: { id: string; username: string; displayName: string; role: string } | null;
  createdAt: string;
}

const canModerate = (role?: string) =>
  ["ADMIN", "AJANS_SAHIBI", "MOD", "ASISTAN"].includes(role || "");

export default function NewsPage() {
  const [, setLocation] = useLocation();
  const { siteName } = useBranding();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: news, isLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
    queryFn: async () => {
      const res = await fetch("/api/news");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/news/${id}`);
      if (!res.ok) throw new Error("Silinemedi");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({ title: "Haber silindi" });
    },
    onError: () => toast({ title: "Hata", description: "Silinemedi", variant: "destructive" }),
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Bu haberi silmek istediğinize emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <HamburgerMenuTrigger />
            <Newspaper className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-gradient-gold">Haberler</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted" />
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : news && news.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setLocation(`/news/${item.id}`)}
              >
                {item.imageUrl && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.videoUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                    )}
                    <Badge className="absolute top-2 right-2 bg-primary/90">{item.category}</Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors flex-1">
                      {item.title}
                    </CardTitle>
                    {canModerate(user?.role) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDelete(e, item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.author?.displayName || "Anonim"}</span>
                    <span>•</span>
                    <span>{format(new Date(item.createdAt), "d MMMM yyyy", { locale: tr })}</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {item.summary || item.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" /> {item.viewCount}
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" /> {item.likeCount}
                    </div>
                    {item.externalLink && (
                      <div className="flex items-center gap-1 ml-auto">
                        <ExternalLink className="w-4 h-4" />
                        <span>Link</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Newspaper className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Henüz haber bulunmuyor</p>
              <p className="text-sm text-muted-foreground">Yeni haberler yayınlandığında burada görünecek</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
