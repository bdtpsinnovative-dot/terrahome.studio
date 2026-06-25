import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Profile | Terra Home Studio',
  description: 'Manage your personal details, view your order history, and update your preferences at Terra Home Studio.',
  alternates: {
    canonical: '/profile',
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
