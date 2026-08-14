import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Julius_Sans_One } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BUSINESS } from "@/lib/config/business-rules";
import { CAL_SERVICES, basePrice } from "@/lib/config/cal-events";
import { getEnv } from "@/lib/config/env-public";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the wordmark and headings — thin, wide, geometric,
// matching the lettering in the Obsidian Spa logo. Body text stays Geist.
const julius = Julius_Sans_One({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const description =
  "Premium men's spa in Midtown Manhattan. Signature, deep tissue, full body, and express massages in a private, refined setting. Open daily 8 AM – 10 PM. Book online.";

export const metadata: Metadata = {
  metadataBase: new URL(getEnv().siteUrl),
  title: {
    default: "Obsidian Men's Spa — Premium Massage & Luxury Treatments",
    template: "%s | Obsidian Men's Spa",
  },
  description,
  keywords: [
    "men's spa NYC",
    "men's spa Midtown Manhattan",
    "massage for men NYC",
    "deep tissue massage Manhattan",
    "sports massage Midtown",
    "express massage NYC",
    "luxury spa New York",
    "men's massage therapy",
  ],
  openGraph: {
    title: "Obsidian Men's Spa",
    description,
    type: "website",
    siteName: "Obsidian Men's Spa",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Obsidian Men's Spa",
    description:
      "Premium men's spa. Signature, deep tissue, full body, and express massages. Open daily 8 AM – 10 PM.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#131009",
};

// LocalBusiness structured data for search engines (rich results, local SEO)
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "DaySpa",
  name: BUSINESS.name,
  description:
    "Premium men's spa in Midtown Manhattan offering signature, deep tissue, full body, and express massages in a private, refined setting.",
  url: getEnv().siteUrl,
  telephone: BUSINESS.contact.phone,
  email: BUSINESS.contact.email,
  priceRange: "$100-$240",
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.address.street,
    addressLocality: BUSINESS.address.city,
    addressRegion: BUSINESS.address.state,
    postalCode: BUSINESS.address.zip,
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 40.7643,
    longitude: -73.9814,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    opens: BUSINESS.hours.open,
    closes: BUSINESS.hours.close,
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Spa Services",
    itemListElement: CAL_SERVICES.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.name,
        description: service.description,
      },
      price: (basePrice(service) / 100).toFixed(0),
      priceCurrency: "USD",
    })),
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
      className={`${geistSans.variable} ${geistMono.variable} ${julius.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
