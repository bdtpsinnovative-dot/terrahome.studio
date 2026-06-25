import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | Terra Home Studio',
  description: 'Sign in to your Terra Home Studio account to manage your orders, save favorites, and experience a seamless checkout.',
  alternates: {
    canonical: '/login',
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
