import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://terrahome-studio.com';

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "Terra Home Studio Journal",
  "description": "บทความและแรงบันดาลใจด้านการตกแต่งบ้านสไตล์มินิมอล wabi-sabi และ Nordic จาก Terra Home Studio",
  "url": `${SITE_URL}/journal`,
  "publisher": {
    "@type": "Organization",
    "name": "Terra Home Studio",
    "logo": {
      "@type": "ImageObject",
      "url": `${SITE_URL}/logo.png`,
    },
  },
  "inLanguage": ["th", "en"],
};

export const metadata: Metadata = {
  title: 'Journal & Insights | Terra Home Studio - ไอเดียและแรงบันดาลใจตกแต่งบ้าน',
  description: 'อ่านบทความ ไอเดีย และแรงบันดาลใจเรื่องการตกแต่งบ้านสไตล์มินิมอล wabi-sabi และการจัดวาง decorative objects จาก Terra Home Studio',
  keywords: ['ตกแต่งบ้าน', 'minimalist interior', 'wabi-sabi', 'ไอเดียแต่งบ้าน', 'ceramic decor', 'บทความ'],
  alternates: {
    canonical: '/journal',
  },
};

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      {children}
    </>
  );
}
