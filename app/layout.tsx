import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    themeColor: "#020617",
};

export const metadata: Metadata = {
    title: "GodMode — AI Code That Actually Ships",
    description:
          "The AI coding platform that refuses to ship bad code. Spec → Generate → Scan → Review → Ship.",
    keywords: ["vibecoding", "AI coding", "code security", "OWASP", "code review"],
    openGraph: {
          title: "GodMode — AI Code That Actually Ships",
          description: "Spec-driven AI coding with built-in security scanning and code review.",
          type: "website",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
          <html lang="en">
                <body className="bg-[#020617] text-slate-200 antialiased">{children}</body>body>
          </html>html>
        );
}</html>
