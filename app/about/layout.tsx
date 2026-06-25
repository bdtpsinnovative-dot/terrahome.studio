import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | Terra Home Studio - Minimalist Home Decor & Objects (เกี่ยวกับเรา)',
  description: 'Our philosophy and story behind Terra Home Studio. ทำความรู้จักกับแบรนด์ของแต่งบ้านเซรามิกดีไซน์มินิมอล เพื่อบ้านที่อบอุ่นและสงบเงียบ',
  alternates: {
    canonical: '/about',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
