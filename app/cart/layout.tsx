import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shopping Cart | Terra Home Studio',
  description: 'View your shopping cart and securely checkout your selected ceramic vessels and decorative objects at Terra Home Studio.',
  alternates: {
    canonical: '/cart',
  },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
