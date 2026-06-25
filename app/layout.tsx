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

export const metadata: Metadata = {
  metadataBase: new URL('https://terrahome-studio.vercel.app'),
  title: "Terra Home Studio | ของตกแต่งบ้านเซรามิกดีไซน์มินิมอล",
  description: "Discover premium ceramic vessels from Terra Home Studio. ค้นพบของตกแต่งบ้านและแจกันเซรามิกดีไซน์มินิมอลเพื่อบ้านคุณ",
  icons: {
    icon: '/favicon-square.png',
  },
  openGraph: {
    title: "Terra Home Studio | Crafted for Calm Living",
    description: "Discover thoughtfully designed ceramic vessels, tableware, and decorative objects. ค้นพบของตกแต่งบ้านเซรามิก แจกัน และภาชนะบนโต๊ะอาหารดีไซน์มินิมอล",
    url: "https://terrahome-studio.vercel.app",
    siteName: "Terra Home Studio",
    images: [
      {
        url: "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780478880815-990.webp",
        width: 1200,
        height: 630,
        alt: "Terra Home Studio - Crafted for Calm Living",
      },
    ],
    locale: "en_US",
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

type NavbarCollectionGroup = {
  product_sup: string | null;
  products: { id: string | number }[] | null;
};

const getCollectionsData = unstable_cache(
  async (): Promise<NavbarCollectionGroup[]> => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn("Supabase credentials missing. Skipping cache collections fetch.");
        return [];
      }

      const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from("collection_groups")
        .select(`
          product_sup,
          products ( id )
        `);

      if (error) {
        console.error("Navbar Supabase error:", error.message);
        return [];
      }

      const activeData = ((data ?? []) as NavbarCollectionGroup[]).filter(
        (item) => item.products && item.products.length > 0
      );

      console.log("Navbar cached categories count:", activeData.length);
      return activeData;
    } catch (error) {
      console.error("Navbar data cache error:", error);
      return [];
    }
  },
  ["navbar-collection-groups"],
  { revalidate: 3600 }
);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const collections = await getCollectionsData();

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
        {/* JSON-LD Schema for Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Terra Home Studio",
              "url": "https://terrahome-studio.vercel.app",
              "logo": "https://terrahome-studio.vercel.app/logo.png",
              "description": "Thoughtfully designed ceramic vessels, tableware, and decorative objects for calm living. ของตกแต่งบ้านเซรามิก แจกัน และภาชนะบนโต๊ะอาหารดีไซน์มินิมอล",
            }),
          }}
        />
        {/* 2. ห่อหุ้ม Navbar ด้วย Suspense เพื่อให้ฝั่ง Client สามารถดึง searchParams มาใช้ได้ตอน build */}
        <Suspense fallback={<div className="h-20 bg-[#F9F6F0] w-full animate-pulse" />}>
          <Navbar collections={collections} />
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