import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/role-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, ChatGroup, UserRoleType, Ticket } from "@shared/schema";
import { Shield, Users, Plus, Trash2, Edit, Save, MessageSquare, Hash, UserPlus, UserMinus, Ticket as TicketIcon, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Redirect } from "wouter";
import { useAnnouncement } from "@/hooks/use-announcement";
import { format } from "date-fns";
import { tr } from "date-fns/locale";


export default function Management() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { hasAnnouncement } = useAnnouncement();
  const { toast } = useToast();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });

  const isAdmin = user?.role === "ADMIN";
  const isMod = user?.role === "MOD";
  const canAccess = isAdmin || isMod;

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && canAccess,
  });

  const { data: groups, isLoading: groupsLoading } = useQuery<ChatGroup[]>({
    queryKey: ["/api/chat/groups"],
    enabled: isAuthenticated && canAccess,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    enabled: isAuthenticated && canAccess,
  });

  const pendingTickets = tickets?.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS") || [];

  const createGroupMutation = useMutation({
    mutationFn: async (data: typeof newGroup) => {
      const response = await apiRequest("POST", "/api/chat/groups", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/groups"] });
      setIsCreateGroupOpen(false);
      setNewGroup({ name: "", description: "" });
      toast({ title: "Basarili", description: "Grup olusturuldu" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/chat/groups/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/groups"] });
      toast({ title: "Basarili", description: "Grup silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const clearGroupMessagesMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await apiRequest("DELETE", `/api/chat/groups/${groupId}/messages`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      toast({ title: "Basarili", description: "Mesajlar temizlendi" });
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

  if (!canAccess) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-8">
        
        <Tabs defaultValue="tickets">
          <TabsList className="flex-wrap">
            <TabsTrigger value="tickets" data-testid="tab-mgmt-tickets">
              <TicketIcon className="w-4 h-4 mr-2" />
              Destek Talepleri
              {pendingTickets.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">{pendingTickets.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-mgmt-users">
              <Users className="w-4 h-4 mr-2" />
              Kullanicilar
            </TabsTrigger>
            {(isAdmin || isMod) && (
              <TabsTrigger value="groups" data-testid="tab-mgmt-groups">
                <MessageSquare className="w-4 h-4 mr-2" />
                Sohbet Gruplari
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="tickets" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TicketIcon className="w-5 h-5 text-primary" />
                  Destek Talepleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ticketsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : tickets && tickets.length > 0 ? (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-start gap-4 p-4 rounded-lg bg-card border border-card-border hover-elevate"
                        data-testid={`mgmt-ticket-${ticket.id}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          ticket.status === "OPEN" ? "bg-red-500/10" :
                          ticket.status === "IN_PROGRESS" ? "bg-amber-500/10" :
                          "bg-green-500/10"
                        }`}>
                          {ticket.status === "OPEN" ? (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          ) : ticket.status === "IN_PROGRESS" ? (
                            <Clock className="w-5 h-5 text-amber-500" />
                          ) : (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <h3 className="font-semibold truncate">{ticket.subject}</h3>
                            <Badge variant={
                              ticket.status === "OPEN" ? "destructive" :
                              ticket.status === "IN_PROGRESS" ? "outline" :
                              "default"
                            }>
                              {ticket.status === "OPEN" ? "Acik" :
                               ticket.status === "IN_PROGRESS" ? "Islemde" :
                               "Kapali"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {ticket.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Kullanici ID: {ticket.userId}</span>
                            {ticket.createdAt && (
                              <span>
                                {format(new Date(ticket.createdAt), "d MMM yyyy, HH:mm", { locale: tr })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TicketIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Henuz destek talebi yok</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Kullanici Listesi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-1/4 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-1/6 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : users && users.length > 0 ? (
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-card border border-card-border"
                        data-testid={`mgmt-user-row-${u.id}`}
                      >
                        <Avatar className="w-10 h-10 border border-primary/30">
                          <AvatarImage src={u.avatar || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {u.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{u.displayName}</span>
                            <RoleBadge role={(u.role as UserRoleType) || "USER"} size="sm" />
                            {u.isOnline && (
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">@{u.username}</span>
                        </div>
                        <Badge variant="outline">Level {u.level}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Henuz kullanici yok</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-primary" />
                  Sohbet Grubu Yonetimi
                </CardTitle>
                <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-group">
                      <Plus className="w-4 h-4 mr-2" />
                      Grup Olustur
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Yeni Sohbet Grubu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Grup Adi</Label>
                        <Input
                          data-testid="input-group-name"
                          value={newGroup.name}
                          onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                          placeholder="Grup adi"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Aciklama (Opsiyonel)</Label>
                        <Textarea
                          data-testid="input-group-description"
                          value={newGroup.description}
                          onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                          placeholder="Grup aciklamasi"
                          rows={3}
                        />
                      </div>
                      <Button
                        className="w-full"
                        data-testid="button-submit-create-group"
                        onClick={() => createGroupMutation.mutate(newGroup)}
                        disabled={createGroupMutation.isPending || !newGroup.name.trim()}
                      >
                        {createGroupMutation.isPending ? "Olusturuluyor..." : "Grup Olustur"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : groups && groups.length > 0 ? (
                  <div className="space-y-3">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between gap-4 p-4 rounded-lg bg-card border border-card-border"
                        data-testid={`group-item-${group.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Hash className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{group.name}</h4>
                            {group.description && (
                              <p className="text-sm text-muted-foreground">{group.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm("Bu gruptaki tum mesajlari silmek istediginize emin misiniz?")) {
                                clearGroupMessagesMutation.mutate(group.id);
                              }
                            }}
                            data-testid={`button-clear-messages-${group.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Mesajlari Temizle
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("Bu grubu silmek istediginize emin misiniz?")) {
                                  deleteGroupMutation.mutate(group.id);
                                }
                              }}
                              data-testid={`button-delete-group-${group.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Henuz sohbet grubu yok</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
