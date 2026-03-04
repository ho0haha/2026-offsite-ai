import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Coding CTF",
  description: "Yum Brands Engineering Leadership - AI Coding Challenge",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased relative">
        {/* Subtle top gradient overlay */}
        <div
          className="pointer-events-none fixed inset-x-0 top-0 h-40 z-0"
          style={{
            background:
              "linear-gradient(to bottom, hsl(190 95% 55% / 0.04), transparent)",
          }}
          aria-hidden="true"
        />
        {children}
      </body>
    </html>
  );
}
