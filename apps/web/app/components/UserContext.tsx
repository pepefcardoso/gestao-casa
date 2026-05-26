"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

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
  activeUserId: string;
  activeHouseId: string;
  role: "OWNER" | "COLLABORATOR" | "VIEWER" | null;
  usersList: User[];
  housesList: House[];
  changeUser: (userId: string) => void;
  changeHouse: (houseId: string) => void;
  refreshContext: () => Promise<void>;
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
  const [activeUserId, setActiveUserId] = useState<string>("");
  const [activeHouseId, setActiveHouseId] = useState<string>("");
  const [housesList, setHousesList] = useState<House[]>([]);
  const [role, setRole] = useState<"OWNER" | "COLLABORATOR" | "VIEWER" | null>(null);

  // Load initial state from localStorage
  useEffect(() => {
    const savedUserId = localStorage.getItem("gestao_casa_user_id") || PRESET_USERS[0].id;
    const savedHouseId = localStorage.getItem("gestao_casa_house_id") || FALLBACK_HOUSE_ID;

    setActiveUserId(savedUserId);
    setActiveHouseId(savedHouseId);
  }, []);

  const refreshContext = useCallback(async (): Promise<void> => {
    if (!activeUserId) return;

    try {
      // 1. Fetch houses user has access to
      const res = await fetch("/api/houses", {
        headers: { "x-user-id": activeUserId },
      });
      if (res.ok) {
        const housesData: House[] = await res.json();
        setHousesList(housesData);

        // Find or set active house ID
        let currentHouseId = activeHouseId;
        if (!currentHouseId || !housesData.some((h) => h.id === currentHouseId)) {
          currentHouseId = housesData[0]?.id || FALLBACK_HOUSE_ID;
          setActiveHouseId(currentHouseId);
          localStorage.setItem("gestao_casa_house_id", currentHouseId);
        }

        // 2. Fetch role for active house
        const membersRes = await fetch(`/api/houses/${currentHouseId}/members`, {
          headers: { "x-user-id": activeUserId },
        });
        if (membersRes.ok) {
          const members: { role: string; user: { id: string } }[] = await membersRes.json();
          const match = members.find((m) => m.user.id === activeUserId);
          setRole((match?.role as "OWNER" | "COLLABORATOR" | "VIEWER") || "VIEWER");
        } else {
          setRole(null);
        }
      }
    } catch (err) {
      console.error("Failed to load user context:", err);
    }
  }, [activeUserId, activeHouseId]);

  useEffect(() => {
    refreshContext();
  }, [refreshContext]);

  const changeUser = (userId: string): void => {
    setActiveUserId(userId);
    localStorage.setItem("gestao_casa_user_id", userId);
  };

  const changeHouse = (houseId: string): void => {
    setActiveHouseId(houseId);
    localStorage.setItem("gestao_casa_house_id", houseId);
  };

  // MONKEYPATCH fetch globally to transparently inject user header & active house ID
  useEffect(() => {
    if (!activeUserId || !activeHouseId) return;

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

        // 1. Inject active user ID
        if (!headers.has("x-user-id")) {
          headers.set("x-user-id", activeUserId);
        }

        // 2. Map FALLBACK_HOUSE_ID in URL to activeHouseId
        if (url.includes(FALLBACK_HOUSE_ID)) {
          url = url.replace(FALLBACK_HOUSE_ID, activeHouseId);
        }

        // 3. Inject house_id query param for expenses & incomes if missing
        if (url.startsWith("/api/expenses") || url.startsWith("/api/incomes")) {
          const isListing = !url.includes("/api/expenses/") && !url.includes("/api/incomes/");
          if (isListing && !url.includes("house_id=") && !url.includes("room_id=")) {
            const separator = url.includes("?") ? "&" : "?";
            url = `${url}${separator}house_id=${activeHouseId}`;
          }
        }

        // 4. Inject houseId payload for POST requests if missing
        let newBody = init?.body;
        if (
          init?.method?.toUpperCase() === "POST" &&
          init.body &&
          typeof init.body === "string" &&
          (url.startsWith("/api/expenses") || url.startsWith("/api/incomes") || url.startsWith("/api/rooms"))
        ) {
          try {
            const bodyObj = JSON.parse(init.body);
            if (!bodyObj.houseId) {
              bodyObj.houseId = activeHouseId;
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

        return originalFetch(url, newInit);
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [activeUserId, activeHouseId]);

  return (
    <UserContext.Provider
      value={{
        activeUserId,
        activeHouseId,
        role,
        usersList: PRESET_USERS,
        housesList,
        changeUser,
        changeHouse,
        refreshContext,
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
