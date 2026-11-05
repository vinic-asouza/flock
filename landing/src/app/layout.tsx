import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { isClosedLaunch } from "@/utils/launchMode";

// Configurar fonte Inter usando next/font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://flockapp.com.br';
const closedLaunch = isClosedLaunch();
const siteDescription = closedLaunch
  ? 'A gestão da sua igreja, em um só lugar. Programa Igrejas Parceiras: 3 meses para testar e 50% de desconto nos 12 meses seguintes.'
  : 'A gestão da sua igreja, em um só lugar. Centralize informações e comece grátis até 100 membros.';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Flock — a gestão da sua igreja, em um só lugar",
    template: "%s | Flock",
  },
  description: siteDescription,
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
    title: "Flock — a gestão da sua igreja, em um só lugar",
    description: siteDescription,
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
    title: "Flock — a gestão da sua igreja, em um só lugar",
    description: siteDescription,
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
    ...(closedLaunch
      ? {}
      : {
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "BRL",
            availability: "https://schema.org/InStock",
          },
        }),
    "description": siteDescription,
    "url": siteUrl,
    "featureList": [
      "Gestão de Membros",
      "Integração de Pré-Membros",
      "Gestão de Congregações",
      "Ministérios",
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
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-lg"
        >
          Pular para o conteúdo
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
        />
        <MotionProvider>{children}</MotionProvider>
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

