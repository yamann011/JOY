import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAnnouncement } from "@/hooks/use-announcement";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertTicketSchema,
  insertTicketMessageSchema,
  type InsertTicket,
  type InsertTicketMessage,
  type Ticket,
  type TicketMessage,
} from "@shared/schema";
import {
  Ticket as TicketIcon,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  MessageSquare,
  Image as ImageIcon,
} from "lucide-react";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "open":
      return <Badge className="bg-blue-500">Açık</Badge>;
    case "in_progress":
      return <Badge className="bg-amber-500">İşlemde</Badge>;
    case "resolved":
      return <Badge className="bg-green-500">Çözüldü</Badge>;
    case "closed":
      return <Badge variant="secondary">Kapalı</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "open":
      return <Clock className="w-4 h-4 text-blue-500" />;
    case "in_progress":
      return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
    case "resolved":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "closed":
      return <XCircle className="w-4 h-4 text-muted-foreground" />;
    default:
      return null;
  }
};

const CATEGORY_OPTIONS = [
  { value: "ABUSE", label: "Küfür ve Hakaret" },
  { value: "BAN", label: "Yasaklanma" },
  { value: "QUOTA", label: "Kota Destek" },
  { value: "COINS", label: "Coins Destek" },
  { value: "OTHER", label: "Diğer" },
] as const;

function categoryLabel(v?: string | null) {
  const found = CATEGORY_OPTIONS.find((x) => x.value === v);
  return found?.label || "Diğer";
}

export default function Tickets() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { hasAnnouncement } = useAnnouncement();
  const { toast } = useToast();

  const canModerateTickets = user?.role === "ADMIN" || user?.role === "MOD";

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Ticket detay dialog
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

  // Create form: attachments url list
  const [attachmentInput, setAttachmentInput] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

  const createForm = useForm<InsertTicket>({
    resolver: zodResolver(insertTicketSchema),
    defaultValues: {
      category: "OTHER" as any,
      subject: "",
      message: "",
      attachments: [],
    } as any,
  });

  const replyForm = useForm<InsertTicketMessage>({
    resolver: zodResolver(insertTicketMessageSchema),
    defaultValues: {
      ticketId: "",
      message: "",
      attachments: [],
    } as any,
  });

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    enabled: isAuthenticated,
  });

  const messagesQueryKey = useMemo(() => {
    return openTicket ? [`/api/tickets/${openTicket.id}/messages`] : ["/api/tickets/_/messages"];
  }, [openTicket]);

  const { data: messages, isLoading: messagesLoading } = useQuery<TicketMessage[]>({
    queryKey: messagesQueryKey,
    enabled: isAuthenticated && !!openTicket?.id && isTicketDialogOpen,
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${openTicket!.id}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Mesajlar alınamadı");
      return (await res.json()) as TicketMessage[];
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: InsertTicket) => {
      return apiRequest("POST", "/api/tickets", data);
    },
    onSuccess: async () => {
      toast({ title: "Başarılı", description: "Destek talebiniz oluşturuldu." });
      setIsDialogOpen(false);
      setAttachments([]);
      setAttachmentInput("");
      createForm.reset({ category: "OTHER" as any, subject: "", message: "", attachments: [] } as any);
      await queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Talep oluşturulamadı.",
        variant: "destructive",
      });
    },
  });

  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/tickets/${id}`, { status });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Başarılı", description: "Ticket durumu güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/tickets/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Başarılı", description: "Ticket silindi" });
      if (openTicket) {
        setIsTicketDialogOpen(false);
        setOpenTicket(null);
      }
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: async (payload: { ticketId: string; message: string; attachments?: string[] }) => {
      const body: any = { message: payload.message };
      if (payload.attachments?.length) body.attachments = payload.attachments;
      return apiRequest("POST", `/api/tickets/${payload.ticketId}/messages`, body);
    },
    onSuccess: async () => {
      replyForm.reset({ ticketId: openTicket?.id || "", message: "", attachments: [] } as any);
      await queryClient.invalidateQueries({ queryKey: messagesQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["/api/tickets"] }); // admin reply status in_progress yapabilir
      toast({ title: "Gönderildi", description: "Cevap eklendi." });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Cevap gönderilemedi", variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Redirect to="/login" />;

  const onSubmitCreate = (data: InsertTicket) => {
    const payload: any = {
      ...data,
      attachments: attachments.length ? attachments : undefined,
    };
    createTicketMutation.mutate(payload);
  };

  const openTicketDialog = (t: Ticket) => {
    setOpenTicket(t);
    setIsTicketDialogOpen(true);
    replyForm.reset({ ticketId: t.id, message: "", attachments: [] } as any);
  };

  const addAttachmentUrl = () => {
    const url = attachmentInput.trim();
    if (!url) return;
    if (!/^https?:\/\/.+/i.test(url)) {
      toast({ title: "Hata", description: "Geçerli bir URL gir (https://...)", variant: "destructive" });
      return;
    }
    if (attachments.includes(url)) {
      toast({ title: "Bilgi", description: "Bu link zaten ekli." });
      return;
    }
    setAttachments((prev) => [...prev, url]);
    setAttachmentInput("");
  };

  const removeAttachmentUrl = (url: string) => setAttachments((prev) => prev.filter((x) => x !== url));

  return (
    <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gradient-gold">Destek</h1>
            <p className="text-sm text-muted-foreground">Destek taleplerinizi yönetin</p>
          </div>

          {/* Create Ticket Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-ticket">
                <Plus className="w-4 h-4" />
                Yeni Talep
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Destek Talebi</DialogTitle>
              </DialogHeader>

              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
                  {/* Category */}
                  <FormField
                    control={createForm.control}
                    name={"category" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Konu Başlığı</FormLabel>
                        <FormControl>
                          <Select value={field.value as any} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Subject */}
                  <FormField
                    control={createForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlık</FormLabel>
                        <FormControl>
                          <Input placeholder="Örn: Ban itirazı" data-testid="input-ticket-subject" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Message */}
                  <FormField
                    control={createForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mesaj</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Sorununuzu detaylı açıklayın..."
                            rows={4}
                            data-testid="input-ticket-message"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Attachments (URL list) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <FormLabel className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Fotoğraf Linkleri (opsiyonel)
                      </FormLabel>
                      <span className="text-xs text-muted-foreground">{attachments.length}/5</span>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={attachmentInput}
                        onChange={(e) => setAttachmentInput(e.target.value)}
                        placeholder="https://... (imgur, discord, vs)"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          if (attachments.length >= 5) {
                            toast({ title: "Hata", description: "En fazla 5 link ekleyebilirsin.", variant: "destructive" });
                            return;
                          }
                          addAttachmentUrl();
                        }}
                      >
                        Ekle
                      </Button>
                    </div>

                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        {attachments.map((u) => (
                          <div key={u} className="flex items-center gap-2">
                            <a href={u} target="_blank" rel="noreferrer" className="text-xs underline truncate flex-1">
                              {u}
                            </a>
                            <Button type="button" size="sm" variant="ghost" onClick={() => removeAttachmentUrl(u)}>
                              Sil
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={createTicketMutation.isPending}>
                    {createTicketMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      "Gönder"
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Ticket Detail Dialog */}
        <Dialog open={isTicketDialogOpen} onOpenChange={(v) => setIsTicketDialogOpen(v)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2">
                <span className="truncate">{openTicket?.subject || "Ticket"}</span>
                {openTicket?.status ? getStatusBadge(openTicket.status) : null}
              </DialogTitle>
            </DialogHeader>

            {!openTicket ? (
              <div className="text-sm text-muted-foreground">Ticket seçilmedi.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Konu: </span>
                    {categoryLabel((openTicket as any).category)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {openTicket.createdAt
                      ? format(new Date(openTicket.createdAt), "d MMMM yyyy, HH:mm", { locale: tr })
                      : null}
                  </div>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="text-sm font-medium">İlk Mesaj</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{openTicket.message}</div>

                    {(openTicket as any).attachments?.length ? (
                      <div className="pt-2 space-y-2">
                        <div className="text-xs text-muted-foreground">Ekler</div>
                        <div className="flex flex-col gap-2">
                          {(openTicket as any).attachments.map((u: string) => (
                            <a key={u} href={u} target="_blank" rel="noreferrer" className="text-xs underline truncate">
                              {u}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Admin/Mod tools */}
                {canModerateTickets ? (
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Select
                        value={openTicket.status}
                        onValueChange={(status) => {
                          updateTicketStatusMutation.mutate({ id: openTicket.id, status });
                          setOpenTicket((prev) => (prev ? ({ ...prev, status } as any) : prev));
                        }}
                      >
                        <SelectTrigger className="w-40 h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Açık</SelectItem>
                          <SelectItem value="in_progress">İşlemde</SelectItem>
                          <SelectItem value="resolved">Çözüldü</SelectItem>
                          <SelectItem value="closed">Kapalı</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Bu ticket'i silmek istediğinize emin misiniz?")) {
                            deleteTicketMutation.mutate(openTicket.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Sil
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Messages */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Cevaplar
                      </div>
                      {messagesLoading ? <span className="text-xs text-muted-foreground">Yükleniyor...</span> : null}
                    </div>

                    <div className="space-y-3 max-h-72 overflow-auto pr-1">
                      {messages && messages.length > 0 ? (
                        messages.map((m) => (
                          <div key={m.id} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs">
                                <span className="font-semibold">{m.role}</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {m.createdAt
                                  ? format(new Date(m.createdAt), "d MMMM yyyy, HH:mm", { locale: tr })
                                  : ""}
                              </div>
                            </div>
                            <div className="text-sm mt-2 whitespace-pre-wrap">{m.message}</div>
                            {(m as any).attachments?.length ? (
                              <div className="mt-2 space-y-1">
                                {(m as any).attachments.map((u: string) => (
                                  <a
                                    key={u}
                                    href={u}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs underline truncate block"
                                  >
                                    {u}
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">Henüz cevap yok.</div>
                      )}
                    </div>

                    {/* Reply box */}
                    <Form {...replyForm}>
                      <form
                        onSubmit={replyForm.handleSubmit((data) => {
                          if (!openTicket) return;
                          sendReplyMutation.mutate({
                            ticketId: openTicket.id,
                            message: data.message,
                            attachments: (data as any).attachments || undefined,
                          });
                        })}
                        className="space-y-2"
                      >
                        <FormField
                          control={replyForm.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cevap Yaz</FormLabel>
                              <FormControl>
                                <Textarea rows={3} placeholder="Cevabınızı yazın..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end">
                          <Button type="submit" disabled={sendReplyMutation.isPending}>
                            {sendReplyMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Gönderiliyor...
                              </>
                            ) : (
                              "Gönder"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-muted rounded animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-1/3 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-1/4 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="hover-elevate transition-all cursor-pointer"
                data-testid={`ticket-${ticket.id}`}
                onClick={() => openTicketDialog(ticket)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {getStatusIcon(ticket.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{ticket.subject}</h3>
                        {getStatusBadge(ticket.status)}
                      </div>

                      <div className="text-xs text-muted-foreground mb-2">
                        Konu: <span className="text-foreground/80">{categoryLabel((ticket as any).category)}</span>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{ticket.message}</p>

                      <p className="text-xs text-muted-foreground">
                        {ticket.createdAt &&
                          format(new Date(ticket.createdAt), "d MMMM yyyy, HH:mm", {
                            locale: tr,
                          })}
                      </p>
                    </div>

                    {canModerateTickets && (
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={ticket.status}
                          onValueChange={(status) => updateTicketStatusMutation.mutate({ id: ticket.id, status })}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-status-${ticket.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Açık</SelectItem>
                            <SelectItem value="in_progress">İşlemde</SelectItem>
                            <SelectItem value="resolved">Çözüldü</SelectItem>
                            <SelectItem value="closed">Kapalı</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Bu ticket'i silmek istediğinize emin misiniz?")) {
                              deleteTicketMutation.mutate(ticket.id);
                            }
                          }}
                          data-testid={`button-delete-ticket-${ticket.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <TicketIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Henüz Talep Yok</h3>
            <p className="text-muted-foreground mb-4">
              Bir sorun yaşıyorsanız destek talebi oluşturabilirsiniz.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-ticket">
              <Plus className="w-4 h-4 mr-2" />
              İlk Talebi Oluştur
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
