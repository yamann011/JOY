import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  refetchUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchMe(): Promise<User | null> {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  // 401/403 ise net: oturum yok -> null dön
  if (res.status === 401 || res.status === 403) return null;

  if (!res.ok) {
    // Burada hata logla ama uygulamayı kilitleme
    const txt = await res.text().catch(() => "");
    console.error("Auth /me failed:", res.status, txt);
    return null;
  }

  try {
    return (await res.json()) as User;
  } catch (e) {
    console.error("Auth /me json parse failed:", e);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const me = await fetchMe();
        if (!alive) return;
        setUser(me);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      // Ne olursa olsun local state temizle (UI saçmalamasın)
      setUser(null);
    }
  };

  const refetchUser = async () => {
    const me = await fetchMe();
    setUser(me);
    return me;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
