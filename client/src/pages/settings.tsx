import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RoleBadge } from "@/components/role-badge";
import type { UserRoleType } from "@shared/schema";
import { User, Camera, Shield, Bell, Lock, Palette, Film, Music, Save, Loader2, Star, Globe, Trophy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { User as UserType } from "@shared/schema";
import { Redirect } from "wouter";
import { useAnnouncement } from "@/hooks/use-announcement";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";


export default function Settings() {
  const { isAuthenticated, isLoading: authLoading, user, refetchUser } = useAuth();
  const { hasAnnouncement } = useAnnouncement();
  const { toast } = useToast();
  const [filmUrl, setFilmUrl] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [siteName, setSiteName] = useState("JOY");
  const [showFlag, setShowFlag] = useState(true);
  const [member1, setMember1] = useState<string | null>(null);
  const [member2, setMember2] = useState<string | null>(null);
  const [member3, setMember3] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isAdmin = user?.role === "ADMIN";

  const { data: allUsers = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: brandingSettings } = useQuery({
    queryKey: ["/api/settings/branding"],
    queryFn: async () => {
      const res = await fetch("/api/settings/branding");
      if (!res.ok) return { siteName: "JOY", showFlag: true };
      return res.json();
    },
    enabled: isAuthenticated && isAdmin,
  });

  const { data: featuredSettings } = useQuery({
    queryKey: ["/api/settings/featured-members"],
    queryFn: async () => {
      const res = await fetch("/api/settings/featured-members");
      if (!res.ok) return { member1: null, member2: null, member3: null };
      return res.json();
    },
    enabled: isAuthenticated && isAdmin,
  });

  useEffect(() => {
    if (brandingSettings) {
      setSiteName(brandingSettings.siteName || "JOY");
      setShowFlag(brandingSettings.showFlag !== false);
    }
  }, [brandingSettings]);

  useEffect(() => {
    if (featuredSettings) {
      setMember1(featuredSettings.member1 || null);
      setMember2(featuredSettings.member2 || null);
      setMember3(featuredSettings.member3 || null);
    }
  }, [featuredSettings]);
  
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);
  
  const updateAvatarMutation = useMutation({
    mutationFn: async (avatar: string) => {
      return apiRequest("PATCH", "/api/user/profile", { avatar });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      refetchUser?.();
      toast({ title: "Basarili", description: "Profil resmi guncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });
  
  const updateProfileMutation = useMutation({
    mutationFn: async (newDisplayName: string) => {
      return apiRequest("PATCH", "/api/user/profile", { displayName: newDisplayName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      refetchUser?.();
      toast({ title: "Basarili", description: "Profil guncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Hata", description: "Dosya boyutu 2MB'dan kucuk olmali", variant: "destructive" });
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updateAvatarMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
  };
  
  const { data: filmSettings } = useQuery({
    queryKey: ["/api/settings/film"],
    queryFn: async () => {
      const res = await fetch("/api/settings/film", { credentials: "include" });
      if (!res.ok) return { filmUrl: "" };
      return res.json();
    },
    enabled: isAuthenticated && isAdmin,
  });

  const { data: musicSettings } = useQuery({
    queryKey: ["/api/settings/music"],
    queryFn: async () => {
      const res = await fetch("/api/settings/music", { credentials: "include" });
      if (!res.ok) return { musicUrl: "" };
      return res.json();
    },
    enabled: isAuthenticated && isAdmin,
  });
  
  useEffect(() => {
    if (filmSettings?.filmUrl) {
      setFilmUrl(filmSettings.filmUrl);
    }
  }, [filmSettings]);

  useEffect(() => {
    if (musicSettings?.musicUrl) {
      setMusicUrl(musicSettings.musicUrl);
    }
  }, [musicSettings]);
  
  const saveFilmMutation = useMutation({
    mutationFn: async (url: string) => {
      return apiRequest("POST", "/api/settings/film", { filmUrl: url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/film"] });
      toast({ title: "Basarili", description: "Film URL kaydedildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const saveMusicMutation = useMutation({
    mutationFn: async (url: string) => {
      return apiRequest("POST", "/api/settings/music", { musicUrl: url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/music"] });
      toast({ title: "Basarili", description: "Muzik URL kaydedildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const saveBrandingMutation = useMutation({
    mutationFn: async (data: { siteName: string; showFlag: boolean }) => {
      return apiRequest("POST", "/api/settings/branding", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/branding"] });
      toast({ title: "Basarili", description: "Site ayarlari kaydedildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const saveFeaturedMutation = useMutation({
    mutationFn: async (data: { member1: string | null; member2: string | null; member3: string | null }) => {
      return apiRequest("POST", "/api/settings/featured-members", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/featured-members"] });
      toast({ title: "Basarili", description: "Ayin elemanlari kaydedildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
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

  return (
    <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profil Bilgileri
            </CardTitle>
            <CardDescription>Profil bilgilerinizi güncelleyin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-20 h-20 border-2 border-primary">
                  <AvatarImage src={user?.avatar || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                    {user?.displayName?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                  data-testid="input-avatar-file"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={updateAvatarMutation.isPending}
                  data-testid="button-change-avatar"
                >
                  {updateAvatarMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{user?.displayName}</h3>
                <p className="text-sm text-muted-foreground">@{user?.username}</p>
                <div className="flex items-center gap-2 mt-2">
                  <RoleBadge role={(user?.role as UserRoleType) || "USER"} />
                  <span className="text-sm text-muted-foreground">Level {user?.level}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="displayName">Görünen İsim</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  data-testid="input-settings-display-name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <Input
                  id="username"
                  defaultValue={user?.username}
                  disabled
                  className="bg-muted"
                  data-testid="input-settings-username"
                />
                <p className="text-xs text-muted-foreground">
                  Kullanıcı adı değiştirilemez
                </p>
              </div>
            </div>

            <Button 
              onClick={() => updateProfileMutation.mutate(displayName)}
              disabled={updateProfileMutation.isPending || !displayName.trim()}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                "Değişiklikleri Kaydet"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Güvenlik
            </CardTitle>
            <CardDescription>Şifre ve güvenlik ayarları</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Mevcut Şifre</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="••••••••"
                data-testid="input-current-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">Yeni Şifre</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                data-testid="input-new-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                data-testid="input-confirm-password"
              />
            </div>
            <Button variant="outline" data-testid="button-change-password">
              Şifreyi Değiştir
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Bildirimler
            </CardTitle>
            <CardDescription>Bildirim tercihlerinizi yönetin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Etkinlik Bildirimleri</p>
                  <p className="text-sm text-muted-foreground">
                    Yeni etkinliklerden haberdar olun
                  </p>
                </div>
                <Button variant="outline" size="sm" data-testid="toggle-event-notifications">
                  Açık
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Mesaj Bildirimleri</p>
                  <p className="text-sm text-muted-foreground">
                    Yeni mesajlardan haberdar olun
                  </p>
                </div>
                <Button variant="outline" size="sm" data-testid="toggle-message-notifications">
                  Açık
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Görünüm
            </CardTitle>
            <CardDescription>Tema ve görünüm ayarları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tema</p>
                <p className="text-sm text-muted-foreground">
                  Platform temasını seçin
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-background"
                  data-testid="button-theme-dark"
                >
                  Koyu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-primary" />
                  Film Ayarları
                </CardTitle>
                <CardDescription>Film sayfasında gösterilecek video URL'si (Admin)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="filmUrl">Video URL (Embed)</Label>
                  <Input
                    id="filmUrl"
                    placeholder="https://www.youtube.com/embed/..."
                    value={filmUrl}
                    onChange={(e) => setFilmUrl(e.target.value)}
                    data-testid="input-film-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    YouTube, Vimeo veya baska bir embed URL girebilirsiniz
                  </p>
                </div>
                <Button
                  onClick={() => saveFilmMutation.mutate(filmUrl)}
                  disabled={saveFilmMutation.isPending}
                  data-testid="button-save-film-url"
                >
                  {saveFilmMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Kaydet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  Arka Plan Muzigi
                </CardTitle>
                <CardDescription>Site acildiginda calacak muzik (YouTube linki)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="musicUrl">YouTube URL</Label>
                  <Input
                    id="musicUrl"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={musicUrl}
                    onChange={(e) => setMusicUrl(e.target.value)}
                    data-testid="input-music-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    YouTube video linki girin. Site acildiginda otomatik calmaya baslayacak.
                  </p>
                </div>
                <Button
                  onClick={() => saveMusicMutation.mutate(musicUrl)}
                  disabled={saveMusicMutation.isPending}
                  data-testid="button-save-music-url"
                >
                  {saveMusicMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Kaydet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Site Ayarlari
                </CardTitle>
                <CardDescription>Site ismi ve gorsel ayarlari (Admin)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="siteName">Site Ismi</Label>
                  <Input
                    id="siteName"
                    placeholder="JOY"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    data-testid="input-site-name"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Turk Bayragi</p>
                    <p className="text-sm text-muted-foreground">
                      Header'da Turk bayragi goster
                    </p>
                  </div>
                  <Switch
                    checked={showFlag}
                    onCheckedChange={setShowFlag}
                    data-testid="switch-show-flag"
                  />
                </div>
                <Button
                  onClick={() => saveBrandingMutation.mutate({ siteName, showFlag })}
                  disabled={saveBrandingMutation.isPending}
                  data-testid="button-save-branding"
                >
                  {saveBrandingMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Kaydet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Ayin Elemanlari
                </CardTitle>
                <CardDescription>Dashboard'da gosterilecek en iyi 3 uye (Admin)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold text-black">1</span>
                      1. Sirada (Altin)
                    </Label>
                    <Select value={member1 || "none"} onValueChange={(v) => setMember1(v === "none" ? null : v)}>
                      <SelectTrigger data-testid="select-member1">
                        <SelectValue placeholder="Kullanici secin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Secilmedi</SelectItem>
                        {allUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.displayName} (@{u.username})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-xs font-bold text-black">2</span>
                      2. Sirada (Gumus)
                    </Label>
                    <Select value={member2 || "none"} onValueChange={(v) => setMember2(v === "none" ? null : v)}>
                      <SelectTrigger data-testid="select-member2">
                        <SelectValue placeholder="Kullanici secin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Secilmedi</SelectItem>
                        {allUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.displayName} (@{u.username})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold text-white">3</span>
                      3. Sirada (Bronz)
                    </Label>
                    <Select value={member3 || "none"} onValueChange={(v) => setMember3(v === "none" ? null : v)}>
                      <SelectTrigger data-testid="select-member3">
                        <SelectValue placeholder="Kullanici secin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Secilmedi</SelectItem>
                        {allUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.displayName} (@{u.username})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={() => saveFeaturedMutation.mutate({ member1, member2, member3 })}
                  disabled={saveFeaturedMutation.isPending}
                  data-testid="button-save-featured"
                >
                  {saveFeaturedMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Kaydet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
