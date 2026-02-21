import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserRole, type UserRoleType } from "@shared/schema";

interface NotificationProps {
  id: string;
  avatar?: string;
  displayName: string;
  role: UserRoleType;
  level: number;
  message?: string;
  onDismiss: (id: string) => void;
}

const getRoleColor = (role: UserRoleType) => {
  switch (role) {
    case UserRole.ADMIN:
      return "border-primary bg-primary/20";
    case UserRole.MOD:
      return "border-amber-500 bg-amber-500/20";
    case UserRole.VIP:
      return "border-rose-500 bg-rose-500/20";
    default:
      return "border-secondary bg-secondary/20";
  }
};

const getRoleIcon = (role: UserRoleType) => {
  switch (role) {
    case UserRole.ADMIN:
      return <Shield className="w-4 h-4 text-primary" />;
    case UserRole.MOD:
      return <Star className="w-4 h-4 text-amber-500" />;
    case UserRole.VIP:
      return <Crown className="w-4 h-4 text-rose-500" />;
    default:
      return null;
  }
};

function NotificationCard({
  id,
  avatar,
  displayName,
  role,
  level,
  message,
  onDismiss,
}: NotificationProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(id), 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 300);
  };

  return (
    <div
      className={`relative flex items-center gap-3 p-4 bg-card border border-card-border rounded-lg shadow-lg ${
        isExiting ? "animate-slide-out-right" : "animate-slide-in-right"
      }`}
      data-testid={`notification-${id}`}
    >
      <Avatar className={`w-12 h-12 border-2 ${getRoleColor(role)}`}>
        <AvatarImage src={avatar} />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{displayName}</span>
          {getRoleIcon(role)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {role}
          </Badge>
          <span className="text-xs text-muted-foreground">Level {level}</span>
        </div>
        {message && (
          <p className="text-sm text-muted-foreground mt-1 truncate">{message}</p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 w-6 h-6"
        onClick={handleDismiss}
        data-testid="button-dismiss-notification"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface Notification {
  id: string;
  avatar?: string;
  displayName: string;
  role: UserRoleType;
  level: number;
  message?: string;
}

interface NotificationContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function NotificationContainer({
  notifications,
  onDismiss,
}: NotificationContainerProps) {
  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full"
      data-testid="notification-container"
    >
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          {...notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, "id">) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setNotifications((prev) => [...prev, { ...notification, id }]);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return {
    notifications,
    addNotification,
    dismissNotification,
  };
}
