import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

// Configurar fonte Inter usando next/font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flock - Sistema de Gerenciamento de Membros de Igrejas",
  description: "Gerencie membros, cargos e congregações da sua igreja de forma simples e eficiente. Sistema completo para gestão eclesiástica.",
  keywords: ["igreja", "gestão de membros", "sistema eclesiástico", "congregação", "gestão religiosa"],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: "Flock - Sistema de Gerenciamento de Membros de Igrejas",
    description: "Gerencie membros, cargos e congregações da sua igreja de forma simples e eficiente.",
    type: "website",
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
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

