import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Film, Play } from "lucide-react";
import { Redirect } from "wouter";
import { useAnnouncement } from "@/hooks/use-announcement";


interface FilmSettings {
  filmUrl: string;
}

function convertToEmbedUrl(url: string): string {
  if (!url) return "";
  
  // Already an embed URL
  if (url.includes("/embed/")) {
    return url;
  }
  
  // YouTube watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1&rel=0`;
  }
  
  // YouTube short URL: https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=1&rel=0`;
  }
  
  // For other URLs (Vimeo, direct video links, etc.), return as-is
  return url;
}

export default function FilmPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasAnnouncement } = useAnnouncement();

  const { data: settings } = useQuery<FilmSettings>({
    queryKey: ["/api/settings/film"],
    queryFn: async () => {
      const res = await fetch("/api/settings/film", { credentials: "include" });
      if (!res.ok) return { filmUrl: "" };
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const embedUrl = settings?.filmUrl ? convertToEmbedUrl(settings.filmUrl) : "";

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

  return (
    <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
      {embedUrl ? (
        <>
          <div className="absolute left-4 top-16 z-[50]">
            
          </div>
          <div className="fixed inset-0 bg-black z-[40]" style={{ top: hasAnnouncement ? "40px" : "0" }}>
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              data-testid="film-iframe"
            />
          </div>
        </>
      ) : (
        <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
          
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gradient-gold flex items-center gap-2">
              <Film className="w-6 h-6" />
              Film
            </h1>
            <p className="text-sm text-muted-foreground">Guncel film ve videolar</p>
          </div>
          <Card>
            <CardContent className="py-16">
              <div className="text-center text-muted-foreground">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Henuz film eklenmedi</p>
                <p className="text-sm mt-2">Admin film URL'si ekledikten sonra burada gorunecek</p>
              </div>
            </CardContent>
          </Card>
        </main>
      )}
    </div>
  );
}
