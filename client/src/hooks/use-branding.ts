import { useQuery } from "@tanstack/react-query";

interface BrandingSettings {
  siteName: string;
  showFlag: boolean;
}

export function useBranding() {
  const { data } = useQuery<BrandingSettings>({
    queryKey: ["/api/settings/branding"],
    queryFn: async () => {
      const res = await fetch("/api/settings/branding");
      if (!res.ok) return { siteName: "JOY", showFlag: true };
      return res.json();
    },
    staleTime: 60000,
  });

  return {
    siteName: data?.siteName || "JOY",
    showFlag: data?.showFlag !== false,
  };
}
