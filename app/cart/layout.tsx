import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shopping Cart | Terra Home Studio (ตะกร้าสินค้า)',
  description: 'View your shopping cart and securely checkout premium minimalist ceramic vessels and home decor items. จัดการตะกร้าสินค้าและทำรายการสั่งซื้อของตกแต่งบ้านเซรามิกดีไซน์มินิมอลกับเรา',
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
