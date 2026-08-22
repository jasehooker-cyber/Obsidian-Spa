import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Josefin_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
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
const display = Josefin_Sans({
  weight: "300",
  variable: "--font-display",
  subsets: ["latin"],
});

/** Google Ads conversion tracking. Public by design — it ships in the page. */
const GOOGLE_ADS_ID = "AW-18369793323";

const description =
  "Premium men's spa in Midtown Manhattan. Signature, deep tissue, restorative, and express massages in a private, refined setting. Open daily 8 AM – 10 PM. Book online.";

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
      "Premium men's spa. Signature, deep tissue, restorative, and express massages. Open daily 8 AM – 10 PM.",
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
    "Premium men's spa in Midtown Manhattan offering signature, deep tissue, restorative, and express massages in a private, refined setting.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
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

        {/* Google Ads tag. Google's snippet says to paste it after <head>;
            next/script is the App Router equivalent and loads it on every
            route without duplicating it across client-side navigations. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-tag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`}
        </Script>
      </body>
    </html>
  );
}
