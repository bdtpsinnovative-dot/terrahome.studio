import PropFilterClient from "./PropFilterClient"
import Footer from "../components/Footer"
import type { Metadata } from "next"

export const runtime = 'edge'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://terrahome-studio.com'

export const metadata: Metadata = {
  title: 'คอลเล็กชันของตกแต่งบ้าน | Terra Home Studio - เซรามิก แจกัน Decorative Objects',
  description: 'ช้อปของตกแต่งบ้านเซรามิก แจกัน Decorative Objects และ Vessels จาก Terra Home Studio คอลเล็กชันดีไซน์มินิมอล สไตล์ wabi-sabi และ Nordic เช็คสต็อกสาขาได้ทันที',
  keywords: ['ของตกแต่งบ้าน', 'เซรามิก', 'แจกัน', 'decorative objects', 'vessels', 'minimalist', 'wabi-sabi', 'ซื้อของแต่งบ้าน'],
  alternates: {
    canonical: '/prop',
  },
  openGraph: {
    title: 'คอลเล็กชันของตกแต่งบ้าน | Terra Home Studio',
    description: 'ช้อปของตกแต่งบ้านเซรามิก แจกัน และ Decorative Objects ดีไซน์มินิมอล สไตล์ wabi-sabi เช็คสต็อกสาขาได้ทันที',
    url: `${SITE_URL}/prop`,
    siteName: 'Terra Home Studio',
    images: [
      {
        url: 'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780478880815-990.webp',
        width: 1200,
        height: 630,
        alt: 'Terra Home Studio Collections - Ceramic Decorative Objects',
      },
    ],
    locale: 'th_TH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'คอลเล็กชันของตกแต่งบ้าน | Terra Home Studio',
    description: 'ช้อปของตกแต่งบ้านเซรามิก แจกัน และ Decorative Objects ดีไซน์มินิมอล',
    images: ['https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780478880815-990.webp'],
  },
}

export default function PropCollectionsPage() {
  return (
    <div className="min-h-screen bg-[#EBE8E1] text-[#3A3835] font-sans selection:bg-[#C8A97E]/20 flex flex-col">
      <PropFilterClient />
      <Footer />
    </div>
  )
}
