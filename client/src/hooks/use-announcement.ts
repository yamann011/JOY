import { useQuery } from "@tanstack/react-query";
import type { Announcement } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

export function useAnnouncement() {
  const { isAuthenticated } = useAuth();
  
  const { data: announcement, isLoading, isFetched } = useQuery<Announcement | null>({
    queryKey: ["/api/announcements/active"],
    queryFn: async () => {
      const res = await fetch("/api/announcements/active", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  const hasAnnouncement = isAuthenticated && !!announcement;

  return {
    announcement,
    isLoading,
    isFetched,
    hasAnnouncement,
  };
}
