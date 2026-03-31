import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GodMode — AI Code That Actually Ships",
  description: "The AI coding platform that refuses to ship bad code. Spec → Generate → Scan → Review → Ship.",
  keywords: ["vibecoding", "AI coding", "code security", "OWASP", "code review"],
  openGraph: {
    title: "GodMode — AI Code That Actually Ships",
    description: "Spec-driven AI coding with built-in security scanning and code review.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
