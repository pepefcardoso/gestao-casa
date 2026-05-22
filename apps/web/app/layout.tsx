import type React from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestão Casa - Financiamento",
  description: "Painel de controle financeiro e amortização de financiamento imobiliário.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-[#f0f4f4] text-[#0e1717]">
        {children}
      </body>
    </html>
  );
}
