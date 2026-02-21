import { Sparkles } from "lucide-react";
import { useAnnouncement } from "@/hooks/use-announcement";

export function GlobalAnnouncement() {
  const { announcement, hasAnnouncement } = useAnnouncement();

  if (!hasAnnouncement || !announcement) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-primary/90 py-2.5 overflow-hidden h-10">
      <div className="animate-marquee whitespace-nowrap flex items-center gap-8">
        <div className="flex items-center gap-3 text-primary-foreground font-medium px-4">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{announcement.content}</span>
        </div>
        <div className="flex items-center gap-3 text-primary-foreground font-medium px-4">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{announcement.content}</span>
        </div>
        <div className="flex items-center gap-3 text-primary-foreground font-medium px-4">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{announcement.content}</span>
        </div>
        <div className="flex items-center gap-3 text-primary-foreground font-medium px-4">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{announcement.content}</span>
        </div>
      </div>
    </div>
  );
}
