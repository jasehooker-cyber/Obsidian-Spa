import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Obsidian Men's Spa",
    template: "%s | Obsidian Men's Spa",
  },
  description:
    "Premium men's spa experience. Signature massages, couples sessions, and luxury treatments in a private, refined setting.",
  openGraph: {
    title: "Obsidian Men's Spa",
    description:
      "Premium men's spa experience. Signature massages, couples sessions, and luxury treatments in a private, refined setting.",
    type: "website",
    siteName: "Obsidian Men's Spa",
  },
  twitter: {
    card: "summary",
    title: "Obsidian Men's Spa",
    description:
      "Premium men's spa. Signature massages, couples sessions, and luxury treatments.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
