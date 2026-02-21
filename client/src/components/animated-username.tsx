import { UserRole, type UserRoleType } from "@shared/schema";

interface AnimatedUsernameProps {
  username: string;
  role: UserRoleType;
}

export function AnimatedUsername({ username, role }: AnimatedUsernameProps) {
  if (role === UserRole.ADMIN) {
    return (
      <span className="relative inline-block">
        <style>{`
          @keyframes adminGradient {
            0%, 100% { 
              background-position: 0% 50%;
              filter: brightness(1);
            }
            25% { 
              background-position: 25% 50%;
              filter: brightness(1.2);
            }
            50% { 
              background-position: 100% 50%;
              filter: brightness(1.4);
            }
            75% { 
              background-position: 75% 50%;
              filter: brightness(1.2);
            }
          }
        `}</style>
        <span 
          className="font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 bg-clip-text text-transparent bg-[length:200%_auto]"
          style={{
            animation: 'adminGradient 3s ease-in-out infinite',
          }}
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
            0%, 100% { 
              background-position: 0% 50%;
              filter: brightness(1);
            }
            25% { 
              background-position: 25% 50%;
              filter: brightness(1.2);
            }
            50% { 
              background-position: 100% 50%;
              filter: brightness(1.3);
            }
            75% { 
              background-position: 75% 50%;
              filter: brightness(1.2);
            }
          }
        `}</style>
        <span 
          className="font-bold bg-gradient-to-r from-black via-yellow-400 to-black bg-clip-text text-transparent bg-[length:200%_auto]"
          style={{
            animation: 'modGradient 3s ease-in-out infinite',
          }}
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
            0%, 100% { 
              background-position: 0% 50%;
              filter: brightness(1);
            }
            25% { 
              background-position: 25% 50%;
              filter: brightness(1.2);
            }
            50% { 
              background-position: 100% 50%;
              filter: brightness(1.3);
            }
            75% { 
              background-position: 75% 50%;
              filter: brightness(1.2);
            }
          }
        `}</style>
        <span 
          className="font-bold bg-gradient-to-r from-red-500 via-white to-red-500 bg-clip-text text-transparent bg-[length:200%_auto]"
          style={{
            animation: 'vipGradient 3s ease-in-out infinite',
          }}
        >
          {username}
        </span>
      </span>
    );
  }
  
  // USER - static red
  return <span className="font-semibold text-red-500">{username}</span>;
}
