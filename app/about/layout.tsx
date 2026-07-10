import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://terrahome-studio.vercel.app';

const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "name": "About Terra Home Studio",
  "description": "เรื่องราวและปรัชญาของ Terra Home Studio แบรนด์ของตกแต่งบ้านเซรามิกดีไซน์มินิมอล สไตล์ wabi-sabi และ Nordic จาก Bangkok",
  "url": `${SITE_URL}/about`,
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": "About", "item": `${SITE_URL}/about` },
    ],
  },
};

export const metadata: Metadata = {
  title: 'About | Terra Home Studio - เรื่องราวของแบรนด์',
  description: 'เรื่องราวและปรัชญาของ Terra Home Studio แบรนด์ของตกแต่งบ้านเซรามิกดีไซน์มินิมอล สไตล์ wabi-sabi และ Nordic ก่อตั้งโดยทีมนักออกแบบที่หลงใหลในความเรียบง่ายและงานคราฟท์',
  keywords: ['terra home studio', 'เกี่ยวกับเรา', 'แบรนด์ของแต่งบ้าน', 'minimalist', 'wabi-sabi', 'ceramic design'],
  alternates: {
    canonical: '/about',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
      />
      {children}
    </>
  );
}
