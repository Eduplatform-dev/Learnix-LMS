import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

export type UserRole = "student" | "admin" | "instructor";

export type User = {
  _id:      string;
  email:    string;
  username: string;
  role:     UserRole;
};

type AuthContextType = {
  user:        User | null;
  token:       string | null;
  loading:     boolean;
  setAuthUser: (user: User, token: string) => void;
  logout:      () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

/** Client-side JWT expiry check */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now() + 10_000;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const originalFetchRef      = useRef<typeof fetch | null>(null);

  /* ─── LOGOUT ─────────────────────────── */
  const logout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  }, []);

  /* ─── RESTORE SESSION ────────────────── */
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser  = localStorage.getItem("user");

      if (storedToken && storedUser) {
        if (isTokenExpired(storedToken)) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        } else {
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
        }
      }
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ─── GLOBAL 401 INTERCEPTOR + TOKEN ATTACH ───────────────── */
  useEffect(() => {
    originalFetchRef.current = window.fetch.bind(window);

    const intercepted: typeof fetch = async (input, init = {}) => {
      const storedToken = localStorage.getItem("token");

      // ✅ Attach token WITHOUT changing logic
      const updatedInit = {
        ...init,
        headers: {
          ...(init.headers || {}),
          ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
        },
      };

      const response = await originalFetchRef.current!(input, updatedInit);

      // ❗ Your original 401 logic (unchanged)
      if (response.status === 401) {
        const url = input?.toString() ?? "";
        const isApiCall = url.includes("/api/");
        if (isApiCall) {
          setUser((currentUser) => {
            if (currentUser) {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              return null;
            }
            return currentUser;
          });
          setToken(null);
        }
      }

      return response;
    };

    window.fetch = intercepted;

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
    };
  }, []);

  /* ─── SET AUTH USER ──────────────────── */
  const setAuthUser = useCallback((user: User, token: string) => {
    localStorage.setItem("user",  JSON.stringify(user));
    localStorage.setItem("token", token);
    setUser(user);
    setToken(token);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, setAuthUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}