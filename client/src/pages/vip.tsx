import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Crown, Download, Smartphone, Shield, Plus, Trash2, Loader2, Image } from "lucide-react";
import { Redirect } from "wouter";
import { useAnnouncement } from "@/hooks/use-announcement";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";


interface VipApp {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  downloadUrl: string;
  version: string;
  size: string;
}

export default function VipPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { hasAnnouncement } = useAnnouncement();
  const { toast } = useToast();
  const isAdmin = user?.role === "ADMIN";
  const isVipOrHigher = user?.role === "VIP" || user?.role === "MOD" || user?.role === "ADMIN";
  
  const [newApp, setNewApp] = useState<Partial<VipApp>>({
    name: "",
    description: "",
    imageUrl: "",
    downloadUrl: "",
    version: "",
    size: "",
  });

  const { data: apps = [], isLoading: appsLoading } = useQuery<VipApp[]>({
    queryKey: ["/api/vip/apps"],
    queryFn: async () => {
      const res = await fetch("/api/vip/apps", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated && isVipOrHigher,
  });

  const addAppMutation = useMutation({
    mutationFn: async (app: Partial<VipApp>) => {
      return apiRequest("POST", "/api/vip/apps", app);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vip/apps"] });
      toast({ title: "Basarili", description: "Uygulama eklendi" });
      setNewApp({ name: "", description: "", imageUrl: "", downloadUrl: "", version: "", size: "" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteAppMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/vip/apps/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vip/apps"] });
      toast({ title: "Basarili", description: "Uygulama silindi" });
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

  if (!isVipOrHigher) {
    return (
      <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
        <main className="max-w-4xl mx-auto px-4 py-12 pl-16 sm:pl-4">
          <Card className="text-center py-12">
            <CardContent>
              <Crown className="w-16 h-16 text-primary/30 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">VIP Erisim Gerekli</h2>
              <p className="text-muted-foreground">
                Bu bolume erisim icin VIP veya daha yuksek bir role sahip olmaniz gerekiyor.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full gold-gradient flex items-center justify-center">
            <Crown className="w-7 h-7 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">VIP Uygulamalar</h1>
            <p className="text-muted-foreground">Ozel APK dosyalari ve uygulamalar</p>
          </div>
        </div>

        {isAdmin && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Yeni Uygulama Ekle
              </CardTitle>
              <CardDescription>VIP uyeler icin yeni bir APK/uygulama ekleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appName">Uygulama Adi</Label>
                  <Input
                    id="appName"
                    placeholder="Ornek: Premium VPN"
                    value={newApp.name}
                    onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                    data-testid="input-app-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appVersion">Versiyon</Label>
                  <Input
                    id="appVersion"
                    placeholder="v1.0.0"
                    value={newApp.version}
                    onChange={(e) => setNewApp({ ...newApp, version: e.target.value })}
                    data-testid="input-app-version"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="appDescription">Aciklama</Label>
                <Textarea
                  id="appDescription"
                  placeholder="Uygulama hakkinda kisa bir aciklama..."
                  value={newApp.description}
                  onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
                  rows={3}
                  data-testid="input-app-description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appImage">Resim URL</Label>
                  <Input
                    id="appImage"
                    placeholder="https://..."
                    value={newApp.imageUrl}
                    onChange={(e) => setNewApp({ ...newApp, imageUrl: e.target.value })}
                    data-testid="input-app-image"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appSize">Boyut</Label>
                  <Input
                    id="appSize"
                    placeholder="25 MB"
                    value={newApp.size}
                    onChange={(e) => setNewApp({ ...newApp, size: e.target.value })}
                    data-testid="input-app-size"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appDownload">Indirme Linki</Label>
                <Input
                  id="appDownload"
                  placeholder="https://download.example.com/app.apk"
                  value={newApp.downloadUrl}
                  onChange={(e) => setNewApp({ ...newApp, downloadUrl: e.target.value })}
                  data-testid="input-app-download"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => addAppMutation.mutate(newApp)}
                disabled={addAppMutation.isPending || !newApp.name || !newApp.downloadUrl}
                data-testid="button-add-app"
              >
                {addAppMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ekleniyor...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Uygulama Ekle
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appsLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : apps.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Smartphone className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Henuz uygulama eklenmemis</p>
            </div>
          ) : (
            apps.map((app) => (
              <Card key={app.id} className="overflow-hidden hover-elevate transition-all duration-300" data-testid={`vip-app-${app.id}`}>
                <div className="relative h-48 bg-muted">
                  {app.imageUrl ? (
                    <img
                      src={app.imageUrl}
                      alt={app.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                    <Crown className="w-3 h-3 mr-1" />
                    VIP
                  </Badge>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{app.name}</CardTitle>
                    {app.version && (
                      <Badge variant="outline" className="text-xs">
                        {app.version}
                      </Badge>
                    )}
                  </div>
                  {app.size && (
                    <p className="text-xs text-muted-foreground">{app.size}</p>
                  )}
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {app.description || "Aciklama yok"}
                  </p>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    className="flex-1 gold-gradient text-black font-semibold"
                    onClick={() => window.open(app.downloadUrl, "_blank")}
                    data-testid={`button-download-${app.id}`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Indir
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteAppMutation.mutate(app.id)}
                      disabled={deleteAppMutation.isPending}
                      data-testid={`button-delete-${app.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))
          )}
        </div>

        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="flex items-center gap-4 py-6">
            <Shield className="w-10 h-10 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-semibold">Guvenlik Notu</h3>
              <p className="text-sm text-muted-foreground">
                Tum uygulamalar guvenlik taramasindan gecmistir. Yine de bilinmeyen kaynaklardan uygulama yuklemeden once dikkatli olun.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
