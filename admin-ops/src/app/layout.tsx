import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
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
        <div className="min-h-screen flex flex-col">
          <header className="bg-primary text-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <p className="text-sm font-semibold tracking-wide">
                Flock · Admin OPS
              </p>
              <p className="text-xs text-white/70">Operação da plataforma</p>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
