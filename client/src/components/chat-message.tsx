import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/role-badge";
import { AnimatedUsername } from "@/components/animated-username";
import type { UserRoleType } from "@shared/schema";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Trash2 } from "lucide-react";

interface ChatMessageProps {
  id: string;
  content: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: UserRoleType;
  createdAt: Date;
  isOwn: boolean;
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}

export function ChatMessage({
  id,
  content,
  senderName,
  senderAvatar,
  senderRole,
  createdAt,
  isOwn,
  canDelete = false,
  onDelete,
}: ChatMessageProps) {
  const formattedTime = format(new Date(createdAt), "HH:mm", { locale: tr });

  return (
    <div
      className={`flex gap-3 group ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      data-testid={`chat-message-${id}`}
    >
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={senderAvatar} />
        <AvatarFallback className="bg-primary/20 text-primary text-xs">
          {senderName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
          <AnimatedUsername username={senderName} role={senderRole} />
          <RoleBadge role={senderRole} size="sm" showIcon={false} />
        </div>

        <div className="flex items-center gap-2">
          {isOwn && canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={() => onDelete?.(id)}
              data-testid={`button-delete-message-${id}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
          <div
            className={`px-4 py-2 rounded-lg ${
              isOwn
                ? "bg-primary text-primary-foreground rounded-tr-none"
                : "bg-card border border-card-border rounded-tl-none"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          </div>
          {!isOwn && canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={() => onDelete?.(id)}
              data-testid={`button-delete-message-${id}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>

        <span className="text-xs text-muted-foreground mt-1">{formattedTime}</span>
      </div>
    </div>
  );
}

export function ChatMessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-16 w-48 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
