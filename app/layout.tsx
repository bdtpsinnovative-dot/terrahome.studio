// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Suspense } from "react"; // 1. นำเข้า Suspense เพิ่มเข้ามาครับนาย
import Script from "next/script";

// Cache Navbar category data for 1 hour; product categories rarely change.
export const revalidate = 3600;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://terrahome-studio.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Terra Home Studio | ของตกแต่งบ้านเซรามิกดีไซน์มินิมอล",
    template: "%s | Terra Home Studio",
  },
  description: "Discover premium ceramic vessels, decorative objects and tableware from Terra Home Studio. ค้นพบของตกแต่งบ้านและแจกันเซรามิกดีไซน์มินิมอล สไตล์ wabi-sabi และ Nordic เพื่อบ้านคุณ",
  keywords: ["ของตกแต่งบ้าน", "เซรามิก", "แจกัน", "minimalist home decor", "ceramic vase", "decorative objects", "Thailand", "terra home studio"],
  authors: [{ name: "Terra Home Studio" }],
  creator: "Terra Home Studio",
  icons: {
    icon: [
      { url: '/favicon-square.png', type: 'image/png' },
    ],
    apple: '/favicon-square.png',
  },
  openGraph: {
    title: "Terra Home Studio | Crafted for Calm Living",
    description: "Discover thoughtfully designed ceramic vessels, tableware, and decorative objects. ค้นพบของตกแต่งบ้านเซรามิก แจกัน และภาชนะบนโต๊ะอาหารดีไซน์มินิมอล",
    url: SITE_URL,
    siteName: "Terra Home Studio",
    images: [
      {
        url: "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780478880815-990.webp",
        width: 1200,
        height: 630,
        alt: "Terra Home Studio - Crafted for Calm Living",
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terra Home Studio | Crafted for Calm Living",
    description: "Discover thoughtfully designed ceramic vessels, tableware, and decorative objects.",
    images: ["https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780478880815-990.webp"],
  },
  alternates: {
    canonical: '/',
  },
  verification: {
    google: 'Luum1XRzh9flXi3H4mKPAirlJVzvgUqvbWpfTskynMc',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preload" href="/LINESeedSans_W_Rg.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/OPTIMA.TTF" as="font" type="font/ttf" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Google Analytics Setup */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="lazyOnload"
            />
            <Script id="google-analytics" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}

        {/* Meta Pixel (Facebook Pixel) */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1575029190933851');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1575029190933851&ev=PageView&noscript=1"
            alt="facebook-pixel"
          />
        </noscript>

        {/* JSON-LD Schema for Organization + WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "Terra Home Studio",
                "alternateName": "TERRA Home Studio",
                "url": SITE_URL,
                "logo": {
                  "@type": "ImageObject",
                  "url": `${SITE_URL}/logo.png`,
                  "width": 512,
                  "height": 512,
                },
                "description": "Thoughtfully designed ceramic vessels, tableware, and decorative objects for calm living. ของตกแต่งบ้านเซรามิก แจกัน และภาชนะบนโต๊ะอาหารดีไซน์มินิมอล สไตล์ minimalist, wabi-sabi, Nordic",
                "foundingDate": "2022",
                "areaServed": "TH",
                "sameAs": [],
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "Terra Home Studio",
                "url": SITE_URL,
                "description": "ของตกแต่งบ้านเซรามิก แจกัน และ Decorative Objects ดีไซน์มินิมอล จาก Terra Home Studio",
                "inLanguage": ["th", "en"],
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": `${SITE_URL}/prop?category={search_term_string}`,
                  },
                  "query-input": "required name=search_term_string",
                },
              },
            ]),
          }}
        />
        {/* 2. ห่อหุ้ม Navbar ด้วย Suspense เพื่อให้ฝั่ง Client สามารถดึง searchParams มาใช้ได้ตอน build */}
        <Suspense fallback={<div className="h-20 bg-[#F9F6F0] w-full animate-pulse" />}>
          <Navbar />
        </Suspense>

        <main className="flex-1 w-full">
          {/* 3. ห่อ children เผื่อหน้า _not-found หรือหน้าอื่นแอบเรียกใช้ searchParams ด้วยครับ */}
          <Suspense fallback={
            <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center font-serif text-[#4A3E3D]">
              Loading...
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </body>
    </html>
  );
}