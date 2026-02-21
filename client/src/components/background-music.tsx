import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function useBackgroundMusic() {
  const { data } = useQuery<{ musicUrl: string }>({
    queryKey: ["/api/settings/music"],
  });

  const musicUrl = data?.musicUrl || "";
  const youtubeId = musicUrl ? extractYoutubeId(musicUrl) : null;

  return { youtubeId, musicUrl };
}

export function BackgroundMusicPlayer() {
  const { youtubeId } = useBackgroundMusic();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!youtubeId) {
    return null;
  }

  return (
    <iframe
      ref={iframeRef}
      id="youtube-music-player"
      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&mute=0&enablejsapi=1&controls=0&modestbranding=1&playsinline=1`}
      className="hidden"
      allow="autoplay; encrypted-media"
      title="Background Music"
    />
  );
}
