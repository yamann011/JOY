import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/role-badge";
import { AnimatedUsername } from "@/components/animated-username";
import type { UserRoleType, Banner, User as UserType } from "@shared/schema";
import { Calendar, MessageSquare, Crown, Ticket, Film, Users, Trophy, Star, TrendingUp, Activity, Newspaper, Eye, Heart } from "lucide-react";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { useAnnouncement } from "@/hooks/use-announcement";
import { useQuery } from "@tanstack/react-query";

interface FeaturedMembersData {
  member1: string | null;
  member2: string | null;
  member3: string | null;
}

function FeaturedMembers() {
  const { data: featuredData } = useQuery<FeaturedMembersData>({
    queryKey: ["/api/settings/featured-members"],
    queryFn: async () => {
      const res = await fetch("/api/settings/featured-members");
      if (!res.ok) return { member1: null, member2: null, member3: null };
      return res.json();
    },
  });

  const { data: allUsers = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  if (!featuredData?.member1 && !featuredData?.member2 && !featuredData?.member3) {
    return null;
  }

  const getMember = (id: string | null) => {
    if (!id) return null;
    return allUsers.find(u => u.id === id);
  };

  const member1 = getMember(featuredData?.member1 || null);
  const member2 = getMember(featuredData?.member2 || null);
  const member3 = getMember(featuredData?.member3 || null);

  const rankStyles = [
    {
      bg: "bg-gradient-to-br from-yellow-400 to-yellow-600",
      border: "border-yellow-400",
      text: "text-yellow-400",
      label: "1.",
      glow: "shadow-[0_0_18px_4px_rgba(250,204,21,0.55)]",
      frameAnim: "top1Frame",
      frameStyle: `
        @keyframes top1Frame {
          0%,100% { box-shadow: 0 0 10px 3px rgba(250,204,21,0.5), inset 0 0 8px rgba(250,204,21,0.15); border-color: #facc15; }
          50%      { box-shadow: 0 0 22px 8px rgba(251,191,36,0.8), inset 0 0 14px rgba(251,191,36,0.25); border-color: #fbbf24; }
        }
      `,
    },
    {
      bg: "bg-gradient-to-br from-gray-300 to-gray-500",
      border: "border-gray-300",
      text: "text-gray-300",
      label: "2.",
      glow: "shadow-[0_0_14px_3px_rgba(209,213,219,0.45)]",
      frameAnim: "top2Frame",
      frameStyle: `
        @keyframes top2Frame {
          0%,100% { box-shadow: 0 0 8px 2px rgba(209,213,219,0.4); border-color: #d1d5db; }
          50%      { box-shadow: 0 0 18px 6px rgba(209,213,219,0.7); border-color: #e5e7eb; }
        }
      `,
    },
    {
      bg: "bg-gradient-to-br from-amber-600 to-amber-800",
      border: "border-amber-600",
      text: "text-amber-500",
      label: "3.",
      glow: "shadow-[0_0_12px_3px_rgba(217,119,6,0.45)]",
      frameAnim: "top3Frame",
      frameStyle: `
        @keyframes top3Frame {
          0%,100% { box-shadow: 0 0 8px 2px rgba(217,119,6,0.4); border-color: #d97706; }
          50%      { box-shadow: 0 0 18px 6px rgba(217,119,6,0.7); border-color: #f59e0b; }
        }
      `,
    },
  ];

  const members = [member1, member2, member3].filter(Boolean);
  if (members.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-primary" />
          Ayin Elemanlari
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap justify-center gap-4">
          {[member1, member2, member3].map((member, idx) => {
            if (!member) return null;
            const style = rankStyles[idx];
            const topRank = (idx + 1) as 1 | 2 | 3;
            return (
              <div
                key={member.id}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 ${style.border} min-w-[110px] bg-black/40 relative overflow-hidden`}
                style={{ animation: `${style.frameAnim} 2.5s ease-in-out infinite` }}
              >
                <style>{style.frameStyle}</style>
                <div className="relative">
                  <Avatar className={`w-14 h-14 sm:w-16 sm:h-16 border-2 ${style.border} ${style.glow}`}>
                    <AvatarImage src={member.avatar || undefined} />
                    <AvatarFallback className={`${style.bg} text-white font-bold`}>
                      {member.displayName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`absolute -top-1 -right-1 w-6 h-6 rounded-full ${style.bg} flex items-center justify-center text-xs font-bold text-white shadow-lg`}>
                    {style.label}
                  </span>
                </div>
                <div className="text-center">
                  <AnimatedUsername
                    username={member.displayName}
                    role={(member.role as UserRoleType) || "USER"}
                    specialPerms={(member as any).specialPerms}
                    isTop={topRank}
                  />
                  <p className="text-xs text-muted-foreground">@{member.username}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  content: string;
  imageUrl?: string;
  category: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
}

function LatestNews() {
  const { data: news = [] } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
    queryFn: async () => {
      const res = await fetch("/api/news");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const latestNews = Array.isArray(news) ? news.slice(0, 3) : [];

  if (latestNews.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Newspaper className="w-5 h-5 text-primary" />
            Son Haberler
          </CardTitle>
          <Link href="/news">
            <Button variant="ghost" size="sm">
              Tümünü Gör
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {latestNews.map((item) => (
            <Link key={item.id} href={`/news/${item.id}`}>
              <div className="flex gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group">
                {item.imageUrl && (
                  <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {item.summary || item.content}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {item.likeCount}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStats() {
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const totalUsers = users.length;
  const vipUsers = users.filter(u => u.role === "VIP" || u.role === "MOD" || u.role === "ADMIN").length;
  const onlineUsers = users.filter(u => u.isOnline).length;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <Card className="text-center p-3">
        <div className="flex flex-col items-center gap-1">
          <Users className="w-5 h-5 text-primary" />
          <span className="text-lg sm:text-2xl font-bold text-primary">{totalUsers}</span>
          <span className="text-xs text-muted-foreground">Toplam Uye</span>
        </div>
      </Card>
      <Card className="text-center p-3">
        <div className="flex flex-col items-center gap-1">
          <Crown className="w-5 h-5 text-yellow-500" />
          <span className="text-lg sm:text-2xl font-bold text-yellow-500">{vipUsers}</span>
          <span className="text-xs text-muted-foreground">VIP Uye</span>
        </div>
      </Card>
      <Card className="text-center p-3">
        <div className="flex flex-col items-center gap-1">
          <Activity className="w-5 h-5 text-green-500" />
          <span className="text-lg sm:text-2xl font-bold text-green-500">{onlineUsers}</span>
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </Card>
    </div>
  );
}

function AdBannerSmall() {
  const { data: banners } = useQuery<Banner[]>({
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

  if (!banners || banners.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-primary/30 max-w-md mx-auto">
      <div 
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner) => (
          <div key={banner.id} className="flex-shrink-0 w-full">
            {banner.imageUrl ? (
              <div className="block cursor-default">
                <img 
                  src={banner.imageUrl} 
                  alt={banner.title || "Reklam"} 
                  className="w-full h-auto max-h-24 object-cover"
                  data-testid={`ad-banner-${banner.id}`}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === currentIndex ? "bg-primary w-3" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasAnnouncement } = useAnnouncement();

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

  const userRole = (user?.role as UserRoleType) || "USER";
  const canAccessVip = userRole === "VIP" || userRole === "MOD" || userRole === "ADMIN";

  return (
    <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-16" : "pt-12"}`}>
      <div className="pt-4">
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <AdBannerSmall />
        <FeaturedMembers />
        <LatestNews />
        <QuickStats />
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Hoş Geldiniz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-card border border-card-border">
                <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-primary">
                  <AvatarImage src={user?.avatar || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-lg sm:text-xl">
                    {user?.displayName?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-semibold text-base sm:text-lg">{user?.displayName}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">@{user?.username}</p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                    <RoleBadge role={userRole} />
                    <Badge variant="outline" className="text-xs">Level {user?.level || 1}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Seviye Ilerlemesi</span>
                  <span className="text-primary font-medium">{((user?.level || 1) % 10) * 10}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full gold-gradient rounded-full transition-all duration-500"
                    style={{ width: `${((user?.level || 1) % 10) * 10}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Hizli Erisim</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
              <Link href="/events">
                <Button variant="outline" className="w-full h-12 sm:h-16 flex-col gap-0.5 sm:gap-1" data-testid="quick-link-events">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-[10px] sm:text-xs">Etkinlikler</span>
                </Button>
              </Link>
              <Link href="/chat">
                <Button variant="outline" className="w-full h-12 sm:h-16 flex-col gap-0.5 sm:gap-1" data-testid="quick-link-chat">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-[10px] sm:text-xs">Sohbet</span>
                </Button>
              </Link>
              <Link href="/film">
                <Button variant="outline" className="w-full h-12 sm:h-16 flex-col gap-0.5 sm:gap-1" data-testid="quick-link-film">
                  <Film className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-[10px] sm:text-xs">Film</span>
                </Button>
              </Link>
              <Link href="/tickets">
                <Button variant="outline" className="w-full h-12 sm:h-16 flex-col gap-0.5 sm:gap-1" data-testid="quick-link-tickets">
                  <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-[10px] sm:text-xs">Destek</span>
                </Button>
              </Link>
              {canAccessVip && (
                <Link href="/vip">
                  <Button variant="outline" className="w-full h-12 sm:h-16 flex-col gap-0.5 sm:gap-1 col-span-2 border-primary/50" data-testid="quick-link-vip">
                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <span className="text-[10px] sm:text-xs">VIP Uygulamalar</span>
                  </Button>
                </Link>
              )}
              <Link href="/users">
                <Button variant="outline" className="w-full h-12 sm:h-16 flex-col gap-0.5 sm:gap-1 col-span-2" data-testid="quick-link-users">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-[10px] sm:text-xs">Kullanicilar</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
      </div>
    </div>
  );
}
