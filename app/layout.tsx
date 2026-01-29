import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "hard to book",
  description: "Track NYC's hardest-to-book restaurants. Release times, booking tips, and strategies.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
