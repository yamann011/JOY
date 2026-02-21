import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Eye, Heart, MessageSquare, ExternalLink, Play } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { AnimatedUsername } from "@/components/animated-username";

interface NewsAuthor {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

interface CommentUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatar?: string;
}

interface NewsComment {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser | null;
}

interface NewsDetail {
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
  author: NewsAuthor | null;
  createdAt: string;
  comments: NewsComment[];
  userLiked: boolean;
}

export default function NewsDetailPage() {
  const [, params] = useRoute("/news/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const { data: news, isLoading } = useQuery<NewsDetail>({
    queryKey: [`/api/news/${params?.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/news/${params?.id}`);
      if (!res.ok) throw new Error("Haber yüklenemedi");
      return res.json();
    },
    enabled: !!params?.id,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/news/${params?.id}/like`, { 
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Beğeni başarısız");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/news/${params?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Beğeni işlemi başarısız oldu",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/news/${params?.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Yorum eklenemedi");
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: [`/api/news/${params?.id}`] });
      toast({
        title: "Başarılı",
        description: "Yorumunuz eklendi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Yorum eklenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    if (!isAuthenticated) {
      toast({
        title: "Giriş Gerekli",
        description: "Beğenmek için giriş yapmalısınız",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate();
  };

  const handleComment = () => {
    if (!isAuthenticated) {
      toast({
        title: "Giriş Gerekli",
        description: "Yorum yapmak için giriş yapmalısınız",
        variant: "destructive",
      });
      return;
    }
    if (!commentText.trim()) {
      toast({
        title: "Uyarı",
        description: "Yorum boş olamaz",
        variant: "destructive",
      });
      return;
    }
    commentMutation.mutate(commentText);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-64 bg-muted rounded" />
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-medium">Haber bulunamadı</p>
            <Button onClick={() => setLocation("/news")} className="mt-4">
              Haberlere Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/news")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge>{news.category}</Badge>
              <span className="text-sm text-muted-foreground">
                {format(new Date(news.createdAt), "d MMMM yyyy HH:mm", { locale: tr })}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{news.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AnimatedUsername
                username={news.author?.displayName || "Anonim"}
                role={news.author?.role as any}
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {news.imageUrl && (
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={news.imageUrl}
                  alt={news.title}
                  className="w-full h-auto"
                />
              </div>
            )}

            {news.videoUrl && (
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <iframe
                  src={news.videoUrl}
                  className="w-full h-full"
                  allowFullScreen
                  title="Video"
                />
              </div>
            )}

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap">{news.content}</p>
            </div>

            {news.externalLink && (
              <a
                href={news.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Daha fazla bilgi için tıklayın
              </a>
            )}

            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="w-5 h-5" />
                <span>{news.viewCount} görüntülenme</span>
              </div>

              <Button
                variant={news.userLiked ? "default" : "outline"}
                size="sm"
                onClick={handleLike}
                disabled={likeMutation.isPending}
              >
                <Heart className={`w-4 h-4 mr-2 ${news.userLiked ? "fill-current" : ""}`} />
                {news.likeCount}
              </Button>

              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="w-5 h-5" />
                <span>{news.comments.length} yorum</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-xl font-bold">Yorumlar ({news.comments.length})</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAuthenticated && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Yorumunuzu yazın..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button
                  onClick={handleComment}
                  disabled={commentMutation.isPending || !commentText.trim()}
                >
                  Yorum Yap
                </Button>
              </div>
            )}

            {news.comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Henüz yorum yok. İlk yorumu siz yapın!
              </p>
            ) : (
              <div className="space-y-4">
                {news.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-4 rounded-lg bg-muted/50">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={comment.user?.avatar} />
                      <AvatarFallback>
                        {comment.user?.displayName?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AnimatedUsername
                          username={comment.user?.displayName || "Anonim"}
                          role={comment.user?.role as any}
                        />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), "d MMMM yyyy HH:mm", { locale: tr })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
