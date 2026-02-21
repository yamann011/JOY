import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, Users, Swords } from "lucide-react";
import type { Event } from "@shared/schema";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface EventCardProps {
  event: Event;
  onClick?: () => void;
}

type Participant = { name: string; avatar?: string };

function parseParticipants(ev: Event): Participant[] {
  // Try participantsData JSON first
  if ((ev as any).participantsData) {
    try {
      const arr = JSON.parse((ev as any).participantsData);
      if (Array.isArray(arr) && arr.length > 0) return arr.slice(0, 8);
    } catch {}
  }
  // Fall back to legacy participant1/2 fields
  const result: Participant[] = [];
  if (ev.participant1Name) result.push({ name: ev.participant1Name, avatar: ev.participant1Avatar || undefined });
  if (ev.participant2Name) result.push({ name: ev.participant2Name, avatar: ev.participant2Avatar || undefined });
  return result;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const scheduledDate = new Date(event.scheduledAt);
  const formattedDate = format(scheduledDate, "d MMMM yyyy", { locale: tr });
  const formattedTime = format(scheduledDate, "HH:mm", { locale: tr });
  const participants = parseParticipants(event);
  const hasCover = !!(event as any).coverImage;

  return (
    <Card
      className={`relative overflow-hidden ${event.isLive ? "gold-glow border-primary" : "border-border"} hover-elevate cursor-pointer transition-all duration-200`}
      onClick={onClick}
      data-testid={`event-card-${event.id}`}
    >
      {event.isLive && (
        <Badge className="absolute top-2 right-2 bg-red-500 text-white animate-pulse z-10">CANLI</Badge>
      )}

      {/* Kapak resmi */}
      {hasCover && (
        <div className="w-full h-32 overflow-hidden">
          <img src={(event as any).coverImage} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-4">
        <div className="mb-3">
          <Badge variant="outline" className="mb-1 text-xs">{event.agencyName}</Badge>
          <h3 className="font-bold text-base text-primary leading-tight" data-testid="text-event-title">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
          )}
        </div>

        {/* Katılımcılar */}
        {participants.length === 2 ? (
          // VS düzeni — 2 kişi
          <div className="flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg mb-3">
            {participants.map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Avatar className={`w-16 h-16 border-2 ${event.isLive ? "border-primary ring-2 ring-primary/40" : "border-muted"}`}>
                  <AvatarImage src={p.avatar} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                    {p.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-center max-w-[72px] truncate">{p.name}</span>
                {i === 0 && (
                  <div className="flex flex-col items-center -mt-1">
                    <Swords className="w-6 h-6 text-primary" />
                    <span className="text-lg font-black text-gradient-gold leading-none">VS</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : participants.length > 0 ? (
          // Grid düzeni — 3-8 kişi
          <div className={`grid gap-2 mb-3 ${participants.length <= 4 ? "grid-cols-4" : "grid-cols-4"}`}>
            {participants.map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Avatar className="w-12 h-12 border border-muted">
                  <AvatarImage src={p.avatar} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {p.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-medium text-center w-full truncate">{p.name}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span data-testid="text-participant-count">{participants.length || event.participantCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function EventCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
      <div className="h-6 w-3/4 bg-muted rounded animate-pulse mb-4" />
      <div className="flex items-center justify-center gap-4 py-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-14 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-8 w-10 bg-muted rounded animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-14 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="flex justify-center gap-4 mt-4">
        <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        <div className="h-3 w-12 bg-muted rounded animate-pulse" />
      </div>
    </Card>
  );
}
