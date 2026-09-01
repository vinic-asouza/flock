import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Admin OPS — Flock",
    template: "%s | Admin OPS",
  },
  description:
    "Centro operacional interno da plataforma Flock. Uso exclusivo da equipe da plataforma — não é o Painel da Igreja.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
