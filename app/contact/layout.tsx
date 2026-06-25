import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | Terra Home Studio - Minimalist Home Decor (ติดต่อเรา)',
  description: 'Get in touch with Terra Home Studio. ติดต่อสอบถามเกี่ยวกับระบบของตกแต่งบ้านเซรามิก เช็คพิกัดสาขา หรือส่งข้อความถึงสตูดิโอเราได้เลยครับ',
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
