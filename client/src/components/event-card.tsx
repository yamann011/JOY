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

export function EventCard({ event, onClick }: EventCardProps) {
  const scheduledDate = new Date(event.scheduledAt);
  const formattedDate = format(scheduledDate, "d MMMM yyyy", { locale: tr });
  const formattedTime = format(scheduledDate, "HH:mm", { locale: tr });

  const hasVSParticipants = event.participant1Name && event.participant2Name;

  return (
    <Card
      className={`relative overflow-visible ${
        event.isLive ? "gold-glow border-primary" : "border-border"
      } hover-elevate cursor-pointer transition-all duration-200`}
      onClick={onClick}
      data-testid={`event-card-${event.id}`}
    >
      {event.isLive && (
        <Badge
          className="absolute -top-2 -right-2 bg-red-500 text-white animate-pulse z-10"
          data-testid="badge-live"
        >
          CANLI
        </Badge>
      )}

      {hasVSParticipants ? (
        <div className="p-4">
          <div className="text-center mb-4">
            <Badge variant="outline" className="mb-2">{event.agencyName}</Badge>
            <h3 className="font-bold text-lg text-primary" data-testid="text-event-title">
              {event.title}
            </h3>
          </div>

          <div className="flex items-center justify-center gap-4 py-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Avatar className={`w-20 h-20 border-3 ${event.isLive ? "border-primary ring-2 ring-primary/50" : "border-muted"}`}>
                <AvatarImage src={event.participant1Avatar || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
                  {event.participant1Name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm text-center max-w-[80px] truncate">
                {event.participant1Name}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Swords className="w-8 h-8 text-primary" />
              <span className="text-2xl font-black text-gradient-gold">VS</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Avatar className={`w-20 h-20 border-3 ${event.isLive ? "border-primary ring-2 ring-primary/50" : "border-muted"}`}>
                <AvatarImage src={event.participant2Avatar || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
                  {event.participant2Name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm text-center max-w-[80px] truncate">
                {event.participant2Name}
              </span>
            </div>
          </div>

          {event.description && (
            <p className="text-sm text-muted-foreground mt-4 text-center line-clamp-2">
              {event.description}
            </p>
          )}

          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span data-testid="text-participant-count">{event.participantCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formattedTime}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-l-4 border-l-primary/50">
          <div className="flex items-start gap-4">
            <Avatar className={`w-16 h-16 border-2 ${event.isLive ? "border-primary" : "border-muted"}`}>
              <AvatarImage src={event.agencyLogo || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                {event.agencyName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-primary truncate" data-testid="text-event-title">
                {event.title}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid="text-agency-name">
                {event.agencyName}
              </p>

              {event.description && (
                <p className="text-sm text-foreground/70 mt-2 line-clamp-2">
                  {event.description}
                </p>
              )}

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span data-testid="text-participant-count">{event.participantCount}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{formattedTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export function EventCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="text-center mb-4">
        <div className="h-5 w-24 bg-muted rounded animate-pulse mx-auto mb-2" />
        <div className="h-6 w-3/4 bg-muted rounded animate-pulse mx-auto" />
      </div>
      <div className="flex items-center justify-center gap-4 py-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-8 w-12 bg-muted rounded animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="flex justify-center gap-4 mt-4">
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
      </div>
    </Card>
  );
}
