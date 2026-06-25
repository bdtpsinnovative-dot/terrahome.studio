import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | Terra Home Studio',
  description: 'Get in touch with Terra Home Studio. Find our contact details, location, and send us a message.',
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
