import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://terrahome-studio.vercel.app';

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "Store",
  "name": "Terra Home Studio",
  "alternateName": "TERRA Home Studio",
  "description": "ร้านขายของตกแต่งบ้านเซรามิกดีไซน์มินิมอล สไตล์ wabi-sabi และ Nordic ที่ Bangkok และ Nonthaburi",
  "url": SITE_URL,
  "logo": `${SITE_URL}/logo.png`,
  "image": "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780478880815-990.webp",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "TH",
    "addressRegion": "Bangkok",
  },
  "areaServed": [
    { "@type": "City", "name": "Bangkok" },
    { "@type": "City", "name": "Nonthaburi" },
  ],
  "priceRange": "฿฿",
  "currenciesAccepted": "THB",
  "paymentAccepted": "Cash, Credit Card, PromptPay",
  "openingHoursSpecification": [],
  "sameAs": [],
};

export const metadata: Metadata = {
  title: 'Contact Us | Terra Home Studio - ติดต่อสอบถาม',
  description: 'ติดต่อ Terra Home Studio สอบถามสินค้าของตกแต่งบ้านเซรามิก เช็คพิกัดสาขา Bangkok และ Nonthaburi หรือส่งข้อความถึงสตูดิโอได้เลย',
  keywords: ['ติดต่อ', 'terra home studio', 'ร้านของแต่งบ้าน', 'Bangkok', 'Nonthaburi', 'เซรามิก'],
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      {children}
    </>
  );
}
