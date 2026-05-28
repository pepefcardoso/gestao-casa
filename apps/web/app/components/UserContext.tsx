"use client";

import type React from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface House {
  id: string;
  name: string;
  location: string | null;
}

interface UserContextType {
  user: User | null;
  activeUserId: string;
  activeHouseId: string;
  role: "OWNER" | "COLLABORATOR" | "VIEWER" | null;
  usersList: User[];
  housesList: House[];
  isLoading: boolean;
  changeHouse: (houseId: string) => void;
  refreshContext: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (
    name: string,
    email: string,
    password: string,
    termsAccepted: boolean,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const PRESET_USERS: User[] = [
  {
    id: "a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0",
    name: "Alice (Proprietária)",
    email: "alice@exemplo.com",
  },
  {
    id: "b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0",
    name: "Bob (Colaborador)",
    email: "bob@exemplo.com",
  },
  {
    id: "c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0",
    name: "Charlie (Visualizador)",
    email: "charlie@exemplo.com",
  },
];

export const FALLBACK_HOUSE_ID = "9519c5f5-e74b-49dc-88d9-e484fda2c3c2";

export function UserProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [activeUserId, setActiveUserId] = useState<string>("");
  const [activeHouseId, setActiveHouseId] = useState<string>("");
  const [housesList, setHousesList] = useState<House[]>([]);
  const [role, setRole] = useState<"OWNER" | "COLLABORATOR" | "VIEWER" | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and fetch user session
  const fetchSession = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    const token = localStorage.getItem("gestao_casa_auth_token");
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setActiveUserId(data.user.id);
        localStorage.setItem("gestao_casa_user_id", data.user.id);
      } else {
        // Token is invalid/expired
        localStorage.removeItem("gestao_casa_auth_token");
        setUser(null);
      }
    } catch (err) {
      console.error("Erro ao carregar sessão:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Load house and role context
  const refreshContext = useCallback(async (): Promise<void> => {
    const currentUserId = activeUserId || localStorage.getItem("gestao_casa_user_id");
    const token = localStorage.getItem("gestao_casa_auth_token");
    if (!currentUserId) return;

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      } else {
        headers["x-user-id"] = currentUserId;
      }

      // 1. Fetch houses user has access to
      const res = await fetch("/api/houses", { headers });
      if (res.ok) {
        const housesData: House[] = await res.json();
        setHousesList(housesData);

        // Find or set active house ID
        let savedHouseId = localStorage.getItem("gestao_casa_house_id");
        if (!savedHouseId || !housesData.some((h) => h.id === savedHouseId)) {
          savedHouseId = housesData[0]?.id || FALLBACK_HOUSE_ID;
          localStorage.setItem("gestao_casa_house_id", savedHouseId);
        }
        setActiveHouseId(savedHouseId);

        // 2. Fetch role for active house
        const membersRes = await fetch(`/api/houses/${savedHouseId}/members`, { headers });
        if (membersRes.ok) {
          const members: { role: string; user: { id: string } }[] = await membersRes.json();
          const match = members.find((m) => m.user.id === currentUserId);
          setRole((match?.role as "OWNER" | "COLLABORATOR" | "VIEWER") || "VIEWER");
        } else {
          setRole(null);
        }
      }
    } catch (err) {
      console.error("Failed to load user context:", err);
    }
  }, [activeUserId]);

  useEffect(() => {
    if (activeUserId) {
      refreshContext();
    }
  }, [activeUserId, refreshContext]);

  const changeHouse = (houseId: string): void => {
    setActiveHouseId(houseId);
    localStorage.setItem("gestao_casa_house_id", houseId);
    refreshContext();
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "E-mail ou senha incorretos" };
      }

      localStorage.setItem("gestao_casa_auth_token", data.token);
      localStorage.setItem("gestao_casa_user_id", data.user.id);
      setUser(data.user);
      setActiveUserId(data.user.id);
      return { success: true };
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      return { success: false, error: "Falha na conexão com o servidor" };
    }
  };

  const registerUser = async (
    name: string,
    email: string,
    password: string,
    termsAccepted: boolean,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, termsAccepted }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Erro ao registrar usuário" };
      }

      localStorage.setItem("gestao_casa_auth_token", data.token);
      localStorage.setItem("gestao_casa_user_id", data.user.id);
      setUser(data.user);
      setActiveUserId(data.user.id);
      return { success: true };
    } catch (err) {
      console.error("Erro ao cadastrar:", err);
      return { success: false, error: "Falha na conexão com o servidor" };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Erro ao limpar sessão no backend:", err);
    }
    localStorage.removeItem("gestao_casa_auth_token");
    localStorage.removeItem("gestao_casa_user_id");
    setUser(null);
    setActiveUserId("");
    setHousesList([]);
    setRole(null);
  };

  // MONKEYPATCH fetch globally to inject JWT & House headers and handle 401 redirects
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      let url = "";
      if (typeof input === "string") {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else {
        url = input.url;
      }

      // Only intercept API calls
      if (url.startsWith("/api/")) {
        const headers = new Headers(init?.headers);
        const token = localStorage.getItem("gestao_casa_auth_token");
        const currentUserId = localStorage.getItem("gestao_casa_user_id") || "";
        const currentHouseId = localStorage.getItem("gestao_casa_house_id") || "";

        // 1. Inject Token or x-user-id fallback
        if (token) {
          if (!headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
          }
        } else if (currentUserId && !headers.has("x-user-id")) {
          headers.set("x-user-id", currentUserId);
        }

        // 2. Map FALLBACK_HOUSE_ID in URL to activeHouseId
        if (currentHouseId && url.includes(FALLBACK_HOUSE_ID)) {
          url = url.replace(FALLBACK_HOUSE_ID, currentHouseId);
        }

        // 3. Inject house_id query param for expenses & incomes if missing
        if (currentHouseId && (url.startsWith("/api/expenses") || url.startsWith("/api/incomes"))) {
          const isListing = !url.includes("/api/expenses/") && !url.includes("/api/incomes/");
          if (isListing && !url.includes("house_id=") && !url.includes("room_id=")) {
            const separator = url.includes("?") ? "&" : "?";
            url = `${url}${separator}house_id=${currentHouseId}`;
          }
        }

        // 4. Inject houseId payload for POST requests if missing
        let newBody = init?.body;
        if (
          currentHouseId &&
          init?.method?.toUpperCase() === "POST" &&
          init.body &&
          typeof init.body === "string" &&
          (url.startsWith("/api/expenses") ||
            url.startsWith("/api/incomes") ||
            url.startsWith("/api/rooms"))
        ) {
          try {
            const bodyObj = JSON.parse(init.body);
            if (!bodyObj.houseId) {
              bodyObj.houseId = currentHouseId;
              newBody = JSON.stringify(bodyObj);
            }
          } catch {
            // Ignore if body is not valid JSON
          }
        }

        const newInit = {
          ...init,
          headers,
          body: newBody,
        };

        const res = await originalFetch(url, newInit);

        // 5. Intercept 401 errors to trigger logout & login redirection
        if (
          res.status === 401 &&
          !url.includes("/api/auth/login") &&
          !url.includes("/api/auth/register")
        ) {
          const pathname = window.location.pathname;
          if (pathname !== "/login" && pathname !== "/register" && pathname !== "/") {
            localStorage.removeItem("gestao_casa_auth_token");
            localStorage.removeItem("gestao_casa_user_id");
            window.location.href = "/login";
          }
        }

        return res;
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        activeUserId,
        activeHouseId,
        role,
        usersList: PRESET_USERS,
        housesList,
        isLoading,
        changeHouse,
        refreshContext,
        login,
        registerUser,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
