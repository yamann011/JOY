import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { GlobalAnnouncement } from "@/components/global-announcement";
import { HamburgerMenuProvider, HamburgerMenuSidebar } from "@/components/hamburger-menu";
import { TopBar } from "@/components/top-bar";
import { BackgroundMusicPlayer } from "@/components/background-music";
import { FloatingChat } from "@/components/floating-chat";
import { useScreenshotProtection, AndroidScreenshotProtection } from "@/hooks/use-screenshot-protection";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import Chat from "@/pages/chat";
import Tickets from "@/pages/tickets";
import Admin from "@/pages/admin";
import Management from "@/pages/management";
import Settings from "@/pages/settings";
import UsersPage from "@/pages/users";
import FilmPage from "@/pages/film";
import CinemaPage from "@/pages/cinema";
import VipPage from "@/pages/vip";
import GamesPage from "@/pages/games";
import NewsPage from "@/pages/news";
import NewsDetailPage from "@/pages/news-detail";
import NotFound from "@/pages/not-found";

// Basit loader (istersen tasarımla süslersin)
function FullScreenLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      Yükleniyor...
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/events" component={Events} />
      <Route path="/chat" component={Chat} />
      <Route path="/games" component={GamesPage} />
      <Route path="/news/:id" component={NewsDetailPage} />
      <Route path="/news" component={NewsPage} />
      <Route path="/tickets" component={Tickets} />
      <Route path="/admin" component={Admin} />
      <Route path="/management" component={Management} />
      <Route path="/settings" component={Settings} />
      <Route path="/users" component={UsersPage} />
      <Route path="/film" component={FilmPage} />
      <Route path="/cinema" component={CinemaPage} />
      <Route path="/vip" component={VipPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  // Screenshot koruma
  useScreenshotProtection();

  // Auth kontrolü bitmeden hiçbir şey patlamasın
  if (isLoading) return <FullScreenLoader />;

  // Login ekranında "user isteyen" bileşenleri hiç render etme
  const isLoginPage = location.startsWith("/login");

  // Login değilken ama auth yokken de (guest) bu bileşenler patlatıyorsa sakla
  const showProtectedLayout = !isLoginPage && isAuthenticated;

  return (
    <>
      <AndroidScreenshotProtection />
      <Toaster />
      <Router />

      {showProtectedLayout && (
        <>
          <GlobalAnnouncement />
          <BackgroundMusicPlayer />
          <HamburgerMenuProvider>
            <HamburgerMenuSidebar />
            <TopBar />
            <FloatingChat />
          </HamburgerMenuProvider>
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
