import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Journal & Insights | Terra Home Studio',
  description: 'Read our latest articles, insights, and stories on system tech, database management, and design trends.',
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
