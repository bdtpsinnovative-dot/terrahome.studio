import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | Terra Home Studio - Minimalist Home Decor & Objects',
  description: 'Our philosophy and the story behind Terra Home Studio. Discover our commitment to calm living and mindful design.',
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
