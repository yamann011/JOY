import { useState, useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { Announcement, Event, Banner } from "@shared/schema";
import { Crown, Shield, Users, MessageSquare, Calendar, Sparkles, Star, Zap, LogIn, Megaphone, Play, Volume2, VolumeX } from "lucide-react";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { useAnnouncement } from "@/hooks/use-announcement";
import { EventCard } from "@/components/event-card";
import { useBackgroundMusic } from "@/components/background-music";
import { useBranding } from "@/hooks/use-branding";

function TurkishFlag({ className = "w-6 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg">
      <rect width="30" height="20" fill="#E30A17"/>
      <circle cx="10.5" cy="10" r="6" fill="white"/>
      <circle cx="11.5" cy="10" r="4.8" fill="#E30A17"/>
      <polygon fill="white" points="16,10 12.5,8.5 13,11.5 11,8.8 14,11.2"/>
    </svg>
  );
}

const features = [
  {
    icon: Calendar,
    title: "PK Etkinlikleri",
    description: "Canli yayinlar ve ozel etkinliklere katilin",
  },
  {
    icon: MessageSquare,
    title: "Grup Sohbetleri",
    description: "Ajans gruplarinda yazili sohbet edin",
  },
  {
    icon: Users,
    title: "Elit Topluluk",
    description: "VIP ve ozel uyelerle tanisin",
  },
  {
    icon: Shield,
    title: "Guvenli Platform",
    description: "Moderator destekli guvenli ortam",
  },
];

function AdBannerSection() {
  const { data: banners, isLoading } = useQuery<Banner[]>({
    queryKey: ["/api/banners"],
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners]);

  if (isLoading || !banners || banners.length === 0) return null;

  return (
    <section className="py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-xl border border-primary/30 shadow-lg">
          <div 
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {banners.map((banner) => (
              <div key={banner.id} className="flex-shrink-0 w-full">
                {banner.imageUrl ? (
                  <a 
                    href={banner.ctaUrl || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img 
                      src={banner.imageUrl} 
                      alt={banner.title || "Reklam"} 
                      className="w-full h-auto object-cover"
                      data-testid={`ad-banner-${banner.id}`}
                    />
                  </a>
                ) : (
                  <div className="w-full h-32 bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">{banner.title || "Reklam"}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {banners.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex ? "bg-primary w-4" : "bg-white/50"
                  }`}
                  data-testid={`ad-dot-${index}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AnnouncementMarquee() {
  const { data: announcement, isLoading } = useQuery<Announcement | null>({
    queryKey: ["/api/announcements/active"],
    queryFn: async () => {
      const res = await fetch("/api/announcements/active");
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (isLoading || !announcement) return null;

  return (
    <div className="bg-primary/10 border-y border-primary/30 py-3 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap flex items-center gap-8">
        <div className="flex items-center gap-4 text-primary font-medium px-4">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <span>{announcement.content}</span>
        </div>
        <div className="flex items-center gap-4 text-primary font-medium px-4">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <span>{announcement.content}</span>
        </div>
        <div className="flex items-center gap-4 text-primary font-medium px-4">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <span>{announcement.content}</span>
        </div>
        <div className="flex items-center gap-4 text-primary font-medium px-4">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <span>{announcement.content}</span>
        </div>
      </div>
    </div>
  );
}

function QuickLoginBox() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedUsername = localStorage.getItem("joy_username");
    const savedRemember = localStorage.getItem("joy_remember");
    if (savedRemember === "true" && savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/login", { username, password, rememberMe });
      const user = await response.json();
      
      if (rememberMe) {
        localStorage.setItem("joy_username", username);
        localStorage.setItem("joy_remember", "true");
      } else {
        localStorage.removeItem("joy_username");
        localStorage.removeItem("joy_remember");
      }
      
      login(user);
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Giris yapilamadi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [showMobileLogin, setShowMobileLogin] = useState(false);

  return (
    <>
      {/* Desktop login form */}
      <form onSubmit={handleLogin} className="hidden sm:flex items-center gap-2">
        <Input
          type="text"
          placeholder="Kullanici"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-28 h-8 text-sm"
          data-testid="input-quick-username"
        />
        <Input
          type="password"
          placeholder="Sifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-28 h-8 text-sm"
          data-testid="input-quick-password"
        />
        <div className="flex items-center gap-1">
          <Checkbox 
            id="remember" 
            checked={rememberMe} 
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            data-testid="checkbox-remember"
          />
          <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">Hatirla</label>
        </div>
        <Button 
          type="submit" 
          size="sm" 
          disabled={isLoading || !username || !password}
          className="h-8"
          data-testid="button-quick-login"
        >
          <LogIn className="w-4 h-4" />
        </Button>
      </form>

      {/* Mobile login button */}
      <div className="sm:hidden">
        <Button 
          size="sm"
          onClick={() => setShowMobileLogin(!showMobileLogin)}
          className="h-8 gap-2"
          data-testid="button-mobile-login-toggle"
        >
          <LogIn className="w-4 h-4" />
          <span>Giris</span>
        </Button>
      </div>

      {/* Mobile login dropdown */}
      {showMobileLogin && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border p-4 z-50">
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <Input
              type="text"
              placeholder="Kullanici Adi"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 text-base"
              data-testid="input-mobile-username"
            />
            <Input
              type="password"
              placeholder="Sifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 text-base"
              data-testid="input-mobile-password"
            />
            <div className="flex items-center gap-2">
              <Checkbox 
                id="remember-mobile" 
                checked={rememberMe} 
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                data-testid="checkbox-remember-mobile"
              />
              <label htmlFor="remember-mobile" className="text-sm text-muted-foreground cursor-pointer">Beni Hatirla</label>
            </div>
            <Button 
              type="submit" 
              disabled={isLoading || !username || !password}
              className="w-full h-10"
              data-testid="button-mobile-login-submit"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Giris Yap
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

// Fake online user count hook
function useFakeOnlineCount() {
  const [count, setCount] = useState(() => Math.floor(Math.random() * 50) + 120);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => {
        const change = Math.floor(Math.random() * 7) - 3;
        return Math.max(100, Math.min(200, prev + change));
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);
  
  return count;
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { youtubeId } = useBackgroundMusic();
  const { siteName, showFlag } = useBranding();
  const [isMuted, setIsMuted] = useState(true);
  const onlineCount = useFakeOnlineCount();

  const { data: socialLinks } = useQuery({
    queryKey: ["/api/settings/social-links"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/settings/social-links");
      return response.json();
    },
  });

  const toggleMute = () => {
    const iframe = document.getElementById('youtube-music-player') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      if (isMuted) {
        iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
      } else {
        iframe.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
      }
      setIsMuted(!isMuted);
    }
  };

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {showFlag && <TurkishFlag className="w-7 h-5" />}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full gold-gradient flex items-center justify-center">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gradient-gold">{siteName}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-background/95 border border-primary/30 text-xs" data-testid="home-online-count">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-primary font-medium">{onlineCount}</span>
              <span className="text-muted-foreground">online</span>
            </div>
            {youtubeId && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                className="bg-background/95 border-primary/50 shadow-lg hover:bg-primary/20 w-8 h-8"
                data-testid="button-home-music-toggle"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-primary" />
                ) : (
                  <Volume2 className="w-4 h-4 text-primary" />
                )}
              </Button>
            )}
            <QuickLoginBox />
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        <AnnouncementMarquee />

        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background to-background" />
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Premium Ajans Platformu</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter italic">
              <span className="text-foreground drop-shadow-2xl">ELİT</span>
              <br />
              <span className="text-gradient-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]">TOPLULUK</span>
            </h1>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
              <Button 
                size="lg" 
                className="gold-gradient text-black font-bold px-8 h-12 text-lg hover:scale-105 transition-transform"
                onClick={() => {
                  if (socialLinks?.joinUrl) {
                    window.open(socialLinks.joinUrl, '_blank');
                  }
                }}
                disabled={!socialLinks?.joinUrl}
              >
                Simdi Katil
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-primary/50 text-primary px-8 h-12 text-lg hover:bg-primary/10 transition-colors"
                onClick={() => {
                  if (socialLinks?.moreInfoUrl) {
                    window.open(socialLinks.moreInfoUrl, '_blank');
                  }
                }}
                disabled={!socialLinks?.moreInfoUrl}
              >
                Daha Fazla Bilgi
              </Button>
            </div>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              PK etkinlikleri, ozel sohbet gruplari ve VIP avantajlariyla
              dolu premium ajans platformuna hos geldiniz.
            </p>

            <p className="text-sm text-muted-foreground mt-6">
              Hesabiniz yok mu? Admin ile iletisime gecin.
            </p>

            <div className="flex items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                <span>1000+ Uye</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span>50+ Ajans</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Gunluk Etkinlik</span>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="text-gradient-gold">Ozellikler</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                JOY size en iyi deneyimi sunmak icin tasarlandi
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="p-6 border-t-2 border-t-primary/50 hover-elevate transition-all duration-300"
                  data-testid={`feature-card-${index}`}
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-card/50">
          <div className="max-w-4xl mx-auto text-center">
            <Crown className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-gradient-gold">Premium Deneyim</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              VIP uyelik ile ozel avantajlara erisin, etkinliklere oncelikli katilin
              ve premium destek alin.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center">
              <Crown className="w-4 h-4 text-black" />
            </div>
            <span className="font-semibold text-gradient-gold">JOY</span>
          </div>
          <p className="text-sm text-muted-foreground">
            2024 JOY. Tum haklari saklidir.
          </p>
        </div>
      </footer>
    </div>
  );
}
