import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Journal & Design Insights | Terra Home Studio (บทความของแต่งบ้าน)',
  description: 'Read our latest articles and styling insights on minimalist design trends, ceramics, and database prop tracking systems. บทความเคล็ดลับและไอเดียการจัดของแต่งบ้านสไตล์มินิมอล',
  alternates: {
    canonical: '/journal',
  },
};

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
