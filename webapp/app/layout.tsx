import type { Metadata, Viewport } from "next"
import { Inter, EB_Garamond, Libre_Baskerville, Bodoni_Moda, Besley, Work_Sans, Nunito_Sans, IBM_Plex_Sans, Libre_Franklin, Playfair_Display } from "next/font/google"
import "./globals.css"
import { FONT_CSS_VARS } from "@/lib/config/fonts"

const inter = Inter({ subsets: ["latin"] })
const ebGaramond = EB_Garamond({ subsets: ["latin"] })
const libreBaskerville = Libre_Baskerville({ weight: ["400", "700"], subsets: ["latin"] })
const bodoniModa = Bodoni_Moda({ subsets: ["latin"] })
const besley = Besley({ subsets: ["latin"] })
const workSans = Work_Sans({ subsets: ["latin"] })
const nunitoSans = Nunito_Sans({ subsets: ["latin"] })
const ibmPlexSans = IBM_Plex_Sans({ subsets: ["latin"] })
const libreFranklin = Libre_Franklin({ subsets: ["latin"] })
const playfairDisplay = Playfair_Display({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
}

export const metadata: Metadata = {
  // Basic Meta
  title: "Swiss Grid Generator – Modular Typographic Grids Based on Müller-Brockmann",
  description: "Free online tool and CLI for generating Swiss-style typographic grid systems inspired by Josef Müller-Brockmann's 'Grid Systems in Graphic Design'. Customize modular grids (1×1 to 13×13), A-series formats (A0–A6), three margin methods (Progressive 1:2:3, Van de Graaf 2:3:4:6, grid-based), baseline-aligned 10-style typography, and export JSON, TXT, PDF. Perfect for print, editorial, and digital design.",
  keywords: "swiss grid generator, muller-brockmann grid, typographic grid calculator, modular grid tool, baseline grid generator, swiss design tool, international typographic style, grid systems in graphic design, a4 grid calculator, print design grid",
  robots: "index, follow",
  alternates: {
    canonical: "https://preview.swissgridgenerator.com/",
  },
  // Icons
  icons: {
    icon: "/favicon.ico",
  },

  // Open Graph (for Facebook, LinkedIn, etc.)
  openGraph: {
    title: "Swiss Grid Generator – Based on Müller-Brockmann's Classic",
    description: "Generate authentic Swiss-style grids with baseline harmony, custom margins, and typography. Free web app + CLI. Inspired by 'Grid Systems in Graphic Design'.",
    type: "website",
    url: "https://preview.swissgridgenerator.com/",
    siteName: "Swiss Grid Generator",
    images: [
      {
        url: "https://preview.swissgridgenerator.com/og-image.jpg",
        alt: "Swiss Grid Generator preview with 9x9 modular grid on A4",
        width: 1200,
        height: 630,
      },
    ],
  },

  // Twitter Cards (now X)
  twitter: {
    card: "summary_large_image",
    title: "Swiss Grid Generator – Müller-Brockmann Inspired Tool",
    description: "Free modular grid generator for Swiss design: A-series, baseline typography, margin methods, exports. Web + CLI.",
    images: ["https://preview.swissgridgenerator.com/twitter-image.jpg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className} style={FONT_CSS_VARS as React.CSSProperties}>{children}</body>
    </html>
  )
}
