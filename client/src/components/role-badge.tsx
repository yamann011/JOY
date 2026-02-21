import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Star, User, Briefcase, UserCheck } from "lucide-react";
import { UserRole, type UserRoleType } from "@shared/schema";

interface RoleBadgeProps {
  role: UserRoleType | string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const roleConfig: Record<string, { label: string; icon: any; className: string }> = {
  [UserRole.ADMIN]: {
    label: "ADMIN",
    icon: Shield,
    className: "bg-primary text-primary-foreground border-primary",
  },
  [UserRole.AJANS_SAHIBI]: {
    label: "PATRON",
    icon: Crown,
    className: "bg-yellow-500 text-black border-yellow-400",
  },
  [UserRole.MOD]: {
    label: "MOD",
    icon: Star,
    className: "bg-amber-600 text-white border-amber-500",
  },
  [UserRole.ASISTAN]: {
    label: "ASİSTAN",
    icon: UserCheck,
    className: "bg-blue-600 text-white border-blue-500",
  },
  [UserRole.VIP]: {
    label: "VIP",
    icon: Briefcase,
    className: "bg-rose-600 text-white border-rose-500",
  },
  [UserRole.USER]: {
    label: "USER",
    icon: User,
    className: "bg-secondary text-secondary-foreground border-secondary",
  },
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
  lg: "text-sm px-2.5 py-1",
};

export function RoleBadge({ role, showIcon = true, size = "md" }: RoleBadgeProps) {
  const config = roleConfig[role] || roleConfig[UserRole.USER];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${sizeClasses[size]} font-semibold`}
      data-testid={`badge-role-${role.toLowerCase()}`}
    >
      <span className="flex items-center gap-1">
        {showIcon && <Icon className="w-3 h-3" />}
        {config.label}
      </span>
    </Badge>
  );
}

export function getRoleLabel(role: string): string {
  return roleConfig[role]?.label ?? role;
}
