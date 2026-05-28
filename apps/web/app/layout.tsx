import type { Metadata } from "next";
import type React from "react";
import "./globals.css";
import Header from "./components/Header";
import { UserProvider } from "./components/UserContext";

export const metadata: Metadata = {
  title: "Pillar - Finanças & Amortização",
  description: "Painel de controle financeiro, amortização de financiamento imobiliário e cômodos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-canvas-frost text-text-primary">
        <UserProvider>
          <Header />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
