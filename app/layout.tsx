import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "hard to book 🥀 — NYC reservation mission control",
  description:
    "Live drop countdowns, tonight's walk-in playbook, and exactly when to set your alarm for NYC's hardest reservations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-ink text-paper">
        {children}
      </body>
    </html>
  );
}
