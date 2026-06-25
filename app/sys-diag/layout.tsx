import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Diagnostics | Terra Home Studio',
  description: 'Internal barcode scanning and product diagnostic tools for Terra Home Studio product inventory.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SysDiagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
