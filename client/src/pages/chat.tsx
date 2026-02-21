import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { ChatMessage, ChatMessageSkeleton } from "@/components/chat-message";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoleBadge } from "@/components/role-badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ChatGroup, ChatMessage as ChatMessageType, User, UserRoleType } from "@shared/schema";
import { MessageSquare, Send, Users, Plus, Hash } from "lucide-react";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAnnouncement } from "@/hooks/use-announcement";


interface ChatMessageWithUser extends ChatMessageType {
  user?: User;
}

export default function Chat() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { hasAnnouncement } = useAnnouncement();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: groups, isLoading: groupsLoading } = useQuery<ChatGroup[]>({
    queryKey: ["/api/chat/groups"],
    enabled: isAuthenticated,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<ChatMessageWithUser[]>({
    queryKey: ["/api/chat/messages", selectedGroup],
    enabled: isAuthenticated && !!selectedGroup,
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/chat/messages", {
        groupId: selectedGroup,
        content,
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedGroup] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Mesaj gönderilemedi",
        variant: "destructive",
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest("DELETE", `/api/chat/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedGroup] });
      toast({ title: "Basarili", description: "Mesaj silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const canModerate = user?.role === "ADMIN" || user?.role === "MOD";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].id);
    }
  }, [groups, selectedGroup]);

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && selectedGroup) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const selectedGroupData = groups?.find((g) => g.id === selectedGroup);

  return (
    <div className={`min-h-screen bg-background flex flex-col ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)]">
          <Card className="lg:col-span-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-card-border flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                Gruplar
              </h2>
              <Button variant="ghost" size="icon" data-testid="button-create-group">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {groupsLoading ? (
                  <>
                    <div className="h-12 bg-muted rounded animate-pulse" />
                    <div className="h-12 bg-muted rounded animate-pulse" />
                    <div className="h-12 bg-muted rounded animate-pulse" />
                  </>
                ) : groups && groups.length > 0 ? (
                  groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group.id)}
                      className={`w-full text-left p-3 rounded-md transition-colors hover-elevate ${
                        selectedGroup === group.id
                          ? "bg-primary/10 border border-primary/30"
                          : ""
                      }`}
                      data-testid={`group-${group.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Hash className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{group.name}</p>
                          {group.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {group.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Henüz grup yok</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          <Card className="lg:col-span-3 flex flex-col overflow-hidden">
            {selectedGroup && selectedGroupData ? (
              <>
                <div className="p-4 border-b border-card-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Hash className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold">{selectedGroupData.name}</h2>
                      {selectedGroupData.description && (
                        <p className="text-xs text-muted-foreground">
                          {selectedGroupData.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" data-testid="button-group-members">
                    <Users className="w-4 h-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messagesLoading ? (
                      <>
                        <ChatMessageSkeleton />
                        <ChatMessageSkeleton isOwn />
                        <ChatMessageSkeleton />
                      </>
                    ) : messages && messages.length > 0 ? (
                      messages.map((msg) => (
                        <ChatMessage
                          key={msg.id}
                          id={msg.id}
                          content={msg.content}
                          senderName={msg.user?.displayName || "Kullanıcı"}
                          senderAvatar={msg.user?.avatar || undefined}
                          senderRole={(msg.user?.role as UserRoleType) || "USER"}
                          createdAt={new Date(msg.createdAt!)}
                          isOwn={msg.userId === user?.id}
                          canDelete={canModerate}
                          onDelete={(id) => deleteMessageMutation.mutate(id)}
                        />
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Henüz mesaj yok</p>
                          <p className="text-sm">İlk mesajı siz gönderin!</p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-card-border"
                >
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Mesajınızı yazın..."
                      className="flex-1"
                      data-testid="input-chat-message"
                    />
                    <Button
                      type="submit"
                      disabled={!message.trim() || sendMessageMutation.isPending}
                      data-testid="button-send-message"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Grup Seçin</h3>
                  <p className="text-sm">Sohbet etmek için sol taraftan bir grup seçin</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
