"use client";

import { apiClient, configureApiClient } from "@gestao-casa/shared-logic/api-client/index";
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

  // Initialize API Client on startup
  useEffect(() => {
    configureApiClient({
      baseUrl: "",
      getHeaders: (): Record<string, string> => {
        const headers: Record<string, string> = {};
        const token = localStorage.getItem("gestao_casa_auth_token");
        const currentUserId = localStorage.getItem("gestao_casa_user_id");
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        } else if (currentUserId) {
          headers["x-user-id"] = currentUserId;
        }
        return headers;
      },
    });
  }, []);

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
      const data = await apiClient.get("/api/auth/me");
      setUser(data.user);
      setActiveUserId(data.user.id);
      localStorage.setItem("gestao_casa_user_id", data.user.id);
    } catch (err) {
      console.error("Erro ao carregar sessão:", err);
      localStorage.removeItem("gestao_casa_auth_token");
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
    if (!currentUserId) return;

    try {
      // 1. Fetch houses user has access to
      const housesData = await apiClient.get("/api/houses");
      setHousesList(housesData);

      // Find or set active house ID
      let savedHouseId = localStorage.getItem("gestao_casa_house_id");
      if (!savedHouseId || !housesData.some((h) => h.id === savedHouseId)) {
        savedHouseId = housesData[0]?.id || FALLBACK_HOUSE_ID;
        localStorage.setItem("gestao_casa_house_id", savedHouseId);
      }
      setActiveHouseId(savedHouseId);

      // 2. Fetch role for active house
      try {
        const members = await apiClient.get("/api/houses/{id}/members", {
          params: { id: savedHouseId },
        });
        const match = members.find((m) => m.user.id === currentUserId);
        setRole((match?.role as "OWNER" | "COLLABORATOR" | "VIEWER") || "VIEWER");
      } catch {
        setRole(null);
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
      const data = await apiClient.post("/api/auth/login", {
        body: { email, password },
      });

      localStorage.setItem("gestao_casa_auth_token", data.token);
      localStorage.setItem("gestao_casa_user_id", data.user.id);
      setUser(data.user);
      setActiveUserId(data.user.id);
      return { success: true };
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      const message = err instanceof Error ? err.message : "Falha na conexão com o servidor";
      return { success: false, error: message };
    }
  };

  const registerUser = async (
    name: string,
    email: string,
    password: string,
    termsAccepted: boolean,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await apiClient.post("/api/auth/register", {
        body: { name, email, password, termsAccepted: termsAccepted as true },
      });

      localStorage.setItem("gestao_casa_auth_token", data.token);
      localStorage.setItem("gestao_casa_user_id", data.user.id);
      setUser(data.user);
      setActiveUserId(data.user.id);
      return { success: true };
    } catch (err) {
      console.error("Erro ao cadastrar:", err);
      const message = err instanceof Error ? err.message : "Falha na conexão com o servidor";
      return { success: false, error: message };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.post("/api/auth/logout");
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
