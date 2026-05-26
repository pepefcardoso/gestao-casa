import { useEffect, useState } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
}

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

let activeUserId: string = PRESET_USERS[0].id;
let activeUserRole: "OWNER" | "COLLABORATOR" | "VIEWER" = "OWNER";

const listeners = new Set<() => void>();

export const globalState = {
  getActiveUserId(): string {
    return activeUserId;
  },
  setActiveUserId(id: string): void {
    activeUserId = id;
    listeners.forEach((l) => {
      l();
    });
  },
  getActiveUserRole(): "OWNER" | "COLLABORATOR" | "VIEWER" {
    return activeUserRole;
  },
  setActiveUserRole(role: "OWNER" | "COLLABORATOR" | "VIEWER"): void {
    activeUserRole = role;
    listeners.forEach((l) => {
      l();
    });
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useMobileUser(): {
  userId: string;
  role: "OWNER" | "COLLABORATOR" | "VIEWER";
  changeUser: (newUserId: string) => Promise<void>;
} {
  const [userId, setUserId] = useState<string>(globalState.getActiveUserId());
  const [role, setRole] = useState<"OWNER" | "COLLABORATOR" | "VIEWER">(
    globalState.getActiveUserRole(),
  );

  useEffect((): (() => void) => {
    return globalState.subscribe((): void => {
      setUserId(globalState.getActiveUserId());
      setRole(globalState.getActiveUserRole());
    });
  }, []);

  const changeUser = async (newUserId: string): Promise<void> => {
    globalState.setActiveUserId(newUserId);
    // Fetch role from backend
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${API_URL}/houses/9519c5f5-e74b-49dc-88d9-e484fda2c3c2/members`, {
        headers: { "x-user-id": newUserId },
      });
      if (res.ok) {
        const members: { role: string; user: { id: string } }[] = await res.json();
        const match = members.find((m) => m.user.id === newUserId);
        if (match) {
          globalState.setActiveUserRole(match.role as "OWNER" | "COLLABORATOR" | "VIEWER");
        }
      }
    } catch (err) {
      console.error("Failed to fetch role for mobile user:", err);
    }
  };

  return { userId, role, changeUser };
}

export const THEME = {
  colors: {
    canvasFrost: "#F5F5F7",
    textPrimary: "#1D1D1F",
    textMuted: "#86868B",
    brandEmerald: "#10B981",
    white: "#FFFFFF",
  },
} as const;
