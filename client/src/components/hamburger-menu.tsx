import { useState, createContext, useContext } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Home, Calendar, MessageSquare, Users, Shield, Settings, LogOut, Ticket, Crown, Star, Film, Gamepad2, Newspaper, Tv2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { UserRole, type UserRoleType } from "@shared/schema";
import { useBranding } from "@/hooks/use-branding";

function TurkishFlag({ className = "w-6 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg">
      <rect width="30" height="20" fill="#E30A17"/>
      <circle cx="10.5" cy="10" r="6" fill="white"/>
      <circle cx="11.5" cy="10" r="4.8" fill="#E30A17"/>
      <polygon fill="white" points="16,10 12.5,8.5 13,11.5 11,8.8 14,11.2"/>
    </svg>
  );
}

const MenuContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({ isOpen: false, setIsOpen: () => {} });

const getRoleBadgeStyle = (role: UserRoleType) => {
  switch (role) {
    case UserRole.ADMIN:
      return "bg-primary text-primary-foreground border-primary";
    case UserRole.MOD:
      return "bg-amber-600 text-white border-amber-500";
    case UserRole.VIP:
      return "bg-rose-600 text-white border-rose-500";
    default:
      return "bg-secondary text-secondary-foreground border-secondary";
  }
};

const getRoleIcon = (role: UserRoleType) => {
  switch (role) {
    case UserRole.ADMIN:
      return <Shield className="w-3 h-3" />;
    case UserRole.MOD:
      return <Star className="w-3 h-3" />;
    case UserRole.VIP:
      return <Crown className="w-3 h-3" />;
    default:
      return null;
  }
};

interface MenuItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function MenuItem({ href, icon, label, isActive, onClick }: MenuItemProps) {
  return (
    <Link href={href} onClick={onClick}>
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 hover-elevate cursor-pointer ${
          isActive
            ? "bg-primary/10 text-primary border-l-2 border-primary"
            : "text-foreground/80 hover:text-foreground"
        }`}
        data-testid={`menu-item-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {icon}
        <span className="font-medium">{label}</span>
      </div>
    </Link>
  );
}

export function HamburgerMenuTrigger() {
  const { setIsOpen } = useContext(MenuContext);
  
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setIsOpen(true)}
      className="bg-background/95 border-primary/50 shadow-lg hover:bg-primary/20 w-8 h-8 sm:w-9 sm:h-9"
      data-testid="button-hamburger-menu"
    >
      <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-primary" strokeWidth={3} />
    </Button>
  );
}

export function HamburgerMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <MenuContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </MenuContext.Provider>
  );
}

export function HamburgerMenuSidebar() {
  const { isOpen, setIsOpen } = useContext(MenuContext);
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { siteName, showFlag } = useBranding();

  if (!isAuthenticated) {
    return null;
  }

  const userRole = (user?.role as UserRoleType) || UserRole.USER;
  const canAccessAdmin = userRole === UserRole.ADMIN;
  const canAccessMod = userRole === UserRole.ADMIN || userRole === UserRole.MOD;
  const canAccessVip = userRole === UserRole.VIP || userRole === UserRole.MOD || userRole === UserRole.ADMIN;
  
  const menuItems = [
    { href: "/dashboard", icon: <Home className="w-5 h-5" />, label: "Ana Sayfa", show: true },
    { href: "/events", icon: <Calendar className="w-5 h-5" />, label: "PK / Etkinlikler", show: true },
    { href: "/games", icon: <Gamepad2 className="w-5 h-5" />, label: "Oyunlar", show: true },
    { href: "/news", icon: <Newspaper className="w-5 h-5" />, label: "Haberler", show: true },
    { href: "/film", icon: <Film className="w-5 h-5" />, label: "Film", show: true },
    { href: "/cinema", icon: <Tv2 className="w-5 h-5" />, label: "Sinema Odaları", show: true },
    { href: "/vip", icon: <Crown className="w-5 h-5" />, label: "VIP Uygulamalar", show: canAccessVip },
    { href: "/tickets", icon: <Ticket className="w-5 h-5" />, label: "Destek", show: true },
    { href: "/management", icon: <Users className="w-5 h-5" />, label: "Yönetim", show: canAccessMod },
    { href: "/admin", icon: <Shield className="w-5 h-5" />, label: "Admin Panel", show: canAccessAdmin },
    { href: "/settings", icon: <Settings className="w-5 h-5" />, label: "Ayarlar", show: true },
  ];

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] fade-in"
          onClick={() => setIsOpen(false)}
          data-testid="menu-overlay"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-sidebar border-r border-sidebar-border z-[90] transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0 slide-in-left" : "-translate-x-full"
        }`}
        data-testid="sidebar-menu"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              {showFlag && <TurkishFlag className="w-6 h-4" />}
              <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center">
                <Crown className="w-4 h-4 text-black" />
              </div>
              <span className="text-lg font-bold text-gradient-gold">{siteName}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-menu"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-primary">
                <AvatarImage src={user?.avatar || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user?.displayName || user?.username}</p>
                <Badge
                  variant="outline"
                  className={`text-xs ${getRoleBadgeStyle(userRole)}`}
                >
                  {getRoleIcon(userRole)}
                  <span className="ml-1">{userRole}</span>
                </Badge>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems
              .filter((item) => item.show)
              .map((item) => (
                <MenuItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={location === item.href}
                  onClick={() => setIsOpen(false)}
                />
              ))}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function HamburgerMenu() {
  return null;
}
