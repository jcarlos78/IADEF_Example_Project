import type { ReactNode } from "react";

export const metadata = {
  title: "Planning Poker",
  description: "Estimativa colaborativa em tempo real",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
