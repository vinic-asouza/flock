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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://flockapp.com.br';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Flock — organize a vida da sua igreja",
    template: "%s | Flock",
  },
  description: "Feito para a igreja brasileira. Comece grátis até 100 membros.",
  keywords: [
    "igreja",
    "gestão de membros",
    "sistema eclesiástico",
    "congregação",
    "gestão religiosa",
    "software para igreja",
    "sistema de gestão eclesiástica",
    "controle de membros",
    "gestão de congregações",
    "sistema de igreja",
  ],
  authors: [{ name: "Flock" }],
  creator: "Flock",
  publisher: "Flock",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    title: "Flock — organize a vida da sua igreja",
    description: "Feito para a igreja brasileira. Comece grátis até 100 membros.",
    siteName: "Flock",
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 746,
        height: 1000,
        alt: "Flock - Sistema de Gerenciamento de Membros de Igrejas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flock — organize a vida da sua igreja",
    description: "Feito para a igreja brasileira. Comece grátis até 100 membros.",
    images: [`${siteUrl}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    // Adicione aqui quando tiver o código do Google Search Console
    // google: 'seu-codigo-verificacao',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Flock",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "BRL",
      "availability": "https://schema.org/InStock"
    },
    "description": "Organize a vida da sua igreja. Feito para a igreja brasileira.",
    "url": siteUrl,
    "screenshot": `${siteUrl}/demo/painel.png`,
    "featureList": [
      "Gestão de Membros",
      "Integração de Pré-Membros",
      "Gestão de Congregações",
      "Grupos (Ministérios, Células, Equipes)",
      "Calendário com Recorrência",
      "Relatórios Detalhados"
    ]
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Flock",
    "url": siteUrl,
    "logo": `${siteUrl}/flock-logo.svg`,
    "description": "Sistema de gerenciamento de membros de igrejas",
    "sameAs": []
  };

  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
        />
        {children}
        <Toaster
          position="top-center"
          containerStyle={{
            top: 'calc(4.5rem + env(safe-area-inset-top, 0px))',
          }}
          toastOptions={{
            style: {
              maxWidth: 'min(100vw - 2rem, 24rem)',
            },
          }}
        />
      </body>
    </html>
  );
}

