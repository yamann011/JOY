import { useState, useEffect } from "react";
import { Moon, Sun, User, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { useAnnouncement } from "@/hooks/use-announcement";
import { RoleBadge } from "@/components/role-badge";
import { HamburgerMenuTrigger } from "@/components/hamburger-menu";
import { Link } from "wouter";
import type { UserRoleType } from "@shared/schema";
import { useBackgroundMusic } from "@/components/background-music";

// Fake online user count hook
function useFakeOnlineCount() {
  const [count, setCount] = useState(() => Math.floor(Math.random() * 50) + 120);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const change = Math.floor(Math.random() * 7) - 3;
        return Math.max(100, Math.min(200, prev + change));
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return count;
}

export function TopBar() {
  const [isDark, setIsDark] = useState(true);
  const [topOffset, setTopOffset] = useState(16);
  const [isMuted, setIsMuted] = useState(false);

  const { hasAnnouncement } = useAnnouncement();
  const { youtubeId } = useBackgroundMusic();
  const { user, isAuthenticated, logout } = useAuth();
  const onlineCount = useFakeOnlineCount();

  const toggleMute = () => {
    const iframe = document.getElementById("youtube-music-player") as HTMLIFrameElement;
    if (iframe) {
      const message = isMuted
        ? '{"event":"command","func":"unMute","args":""}'
        : '{"event":"command","func":"mute","args":""}';
      iframe.contentWindow?.postMessage(message, "*");
    }
    setIsMuted(!isMuted);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("joy_theme");
    const prefersDark = savedTheme !== "light";
    setIsDark(prefersDark);

    if (prefersDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  useEffect(() => {
    setTopOffset(hasAnnouncement ? 44 : 16);
  }, [hasAnnouncement]);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }

    localStorage.setItem("joy_theme", newIsDark ? "dark" : "light");
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <div className="fixed left-2 sm:left-4 z-[60]" style={{ top: `${topOffset}px` }}>
        <HamburgerMenuTrigger />
      </div>

      <div
        className="fixed right-2 sm:right-4 z-[60] flex items-center gap-1 sm:gap-2"
        style={{ top: `${topOffset}px` }}
      >
        <div
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-background/95 border border-primary/30 text-xs"
          data-testid="online-count"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-primary font-medium">{onlineCount}</span>
          <span className="text-muted-foreground">online</span>
        </div>

        {youtubeId && (
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className="bg-background/95 border-primary/50 shadow-lg hover:bg-primary/20 w-8 h-8 sm:w-9 sm:h-9"
            data-testid="button-music-toggle"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            ) : (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            )}
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="bg-background/95 border-primary/50 shadow-lg hover:bg-primary/20 w-8 h-8 sm:w-9 sm:h-9"
          data-testid="button-theme-toggle"
        >
          {isDark ? (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          ) : (
            <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-background/95 border-primary/50 shadow-lg hover:bg-primary/20 p-0 overflow-hidden w-8 h-8 sm:w-9 sm:h-9"
              data-testid="button-profile-menu"
            >
              <Avatar className="w-8 h-8 sm:w-9 sm:h-9">
                <AvatarImage src={user?.avatar || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs sm:text-sm font-semibold">
                  {user?.displayName?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-10 h-10 border border-primary/30">
                    <AvatarImage src={user?.avatar || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {user?.displayName?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <RoleBadge role={(user?.role as UserRoleType) || "USER"} />
                  <span className="text-xs text-muted-foreground">Level {user?.level}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Profil Ayarlari
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive cursor-pointer"
              data-testid="menu-item-logout"
            >
              Cikis Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
