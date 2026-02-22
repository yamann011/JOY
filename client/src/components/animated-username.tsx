import { UserRole, type UserRoleType } from "@shared/schema";

interface AnimatedUsernameProps {
  username: string;
  role: UserRoleType;
  specialPerms?: { animatedName?: boolean; expiresAt?: string | null } | null;
  isTop?: 1 | 2 | 3;
}

export function AnimatedUsername({ username, role, specialPerms, isTop }: AnimatedUsernameProps) {
  const hasAnimatedName = !!(specialPerms?.animatedName) &&
    (!specialPerms?.expiresAt || new Date(specialPerms.expiresAt) > new Date());

  if (isTop === 1) {
    return (
      <span className="relative inline-block">
        <style>{`
          @keyframes top1Gradient {
            0%   { background-position: 0% 50%; filter: brightness(1) drop-shadow(0 0 4px gold); }
            50%  { background-position: 100% 50%; filter: brightness(1.5) drop-shadow(0 0 8px gold); }
            100% { background-position: 0% 50%; filter: brightness(1) drop-shadow(0 0 4px gold); }
          }
        `}</style>
        <span
          className="font-extrabold bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 bg-clip-text text-transparent bg-[length:200%_auto]"
          style={{ animation: "top1Gradient 2s ease-in-out infinite" }}
        >
          {username}
        </span>
      </span>
    );
  }

  if (isTop === 2) {
    return (
      <span className="relative inline-block">
        <style>{`
          @keyframes top2Gradient {
            0%   { background-position: 0% 50%; filter: brightness(1) drop-shadow(0 0 3px silver); }
            50%  { background-position: 100% 50%; filter: brightness(1.4) drop-shadow(0 0 6px silver); }
            100% { background-position: 0% 50%; filter: brightness(1) drop-shadow(0 0 3px silver); }
          }
        `}</style>
        <span
          className="font-extrabold bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200 bg-clip-text text-transparent bg-[length:200%_auto]"
          style={{ animation: "top2Gradient 2.5s ease-in-out infinite" }}
        >
          {username}
        </span>
      </span>
    );
  }

  if (isTop === 3) {
    return (
      <span className="relative inline-block">
        <style>{`
          @keyframes top3Gradient {
            0%   { background-position: 0% 50%; filter: brightness(1) drop-shadow(0 0 3px #cd7f32); }
            50%  { background-position: 100% 50%; filter: brightness(1.4) drop-shadow(0 0 6px #cd7f32); }
            100% { background-position: 0% 50%; filter: brightness(1) drop-shadow(0 0 3px #cd7f32); }
          }
        `}</style>
        <span
          className="font-extrabold bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 bg-clip-text text-transparent bg-[length:200%_auto]"
          style={{ animation: "top3Gradient 3s ease-in-out infinite" }}
        >
          {username}
        </span>
      </span>
    );
  }

  if (hasAnimatedName) {
    return (
      <span className="relative inline-block">
        <style>{`
          @keyframes specialGradient {
            0%   { background-position: 0% 50%; }
            25%  { background-position: 50% 50%; }
            50%  { background-position: 100% 50%; }
            75%  { background-position: 50% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
        <span
          className="font-bold bg-gradient-to-r from-pink-500 via-purple-400 via-blue-400 via-cyan-400 to-pink-500 bg-clip-text text-transparent bg-[length:300%_auto]"
          style={{ animation: "specialGradient 3s ease-in-out infinite" }}
        >
          {username}
        </span>
      </span>
    );
  }

  if (role === UserRole.ADMIN) {
    return (
      <span className="relative inline-block">
        <style>{`
          @keyframes adminGradient {
            0%, 100% { background-position: 0% 50%; filter: brightness(1); }
            25%  { background-position: 25% 50%; filter: brightness(1.2); }
            50%  { background-position: 100% 50%; filter: brightness(1.4); }
            75%  { background-position: 75% 50%; filter: brightness(1.2); }
          }
        `}</style>
        <span
          className="font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 bg-clip-text text-transparent bg-[length:200%_auto]"
          style={{ animation: "adminGradient 3s ease-in-out infinite" }}
        >
          {username}
        </span>
      </span>
    );
  }

  if (role === UserRole.MOD) {
    return (
      <span className="relative inline-block">
        <style>{`
          @keyframes modGradient {
            0%, 100% { background-position: 0% 50%; filter: brightness(1); }
            25%  { background-position: 25% 50%; filter: brightness(1.2); }
            50%  { background-position: 100% 50%; filter: brightness(1.3); }
            75%  { background-position: 75% 50%; filter: brightness(1.2); }
          }
        `}</style>
        <span
          className="font-bold bg-gradient-to-r from-black via-yellow-400 to-black bg-clip-text text-transparent bg-[length:200%_auto]"
          style={{ animation: "modGradient 3s ease-in-out infinite" }}
        >
          {username}
        </span>
      </span>
    );
  }

  if (role === UserRole.VIP) {
    return (
      <span className="relative inline-block">
        <style>{`
          @keyframes vipGradient {
            0%, 100% { background-position: 0% 50%; filter: brightness(1); }
            25%  { background-position: 25% 50%; filter: brightness(1.2); }
            50%  { background-position: 100% 50%; filter: brightness(1.3); }
            75%  { background-position: 75% 50%; filter: brightness(1.2); }
          }
        `}</style>
        <span
          className="font-bold bg-gradient-to-r from-red-500 via-white to-red-500 bg-clip-text text-transparent bg-[length:200%_auto]"
          style={{ animation: "vipGradient 3s ease-in-out infinite" }}
        >
          {username}
        </span>
      </span>
    );
  }

  return <span className="font-semibold text-red-500">{username}</span>;
}
