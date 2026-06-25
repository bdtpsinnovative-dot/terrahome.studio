// app/prop/[groupId]/[sku]/page.tsx
import { Metadata } from 'next'
import { createClient } from "../../../../src/supabase/server" // ⚡ ดึงโค้ด Supabase ของนายกลับมา
import ProductDetailClient from './ProductDetailClient'

type Props = {
  params: Promise<{ groupId: string; sku: string }> // ⚡ ปรับเป็น Promise ตามมาตรฐาน Next.js ใหม่
}

export const revalidate = 0

// ⚡ ฟังก์ชันทำ SEO (generateMetadata) แบบรองรับ Next.js ใหม่
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params // 👈 แก้ตรงนี้: ต้องใช้ await เพื่อแกะข้อมูลออกมาก่อนครับนาย!
  const currentGroupId = decodeURIComponent(resolvedParams.groupId)
  const currentSku = decodeURIComponent(resolvedParams.sku)

  const supabase = await createClient()
  const { data: products } = await supabase
    .from("products")
    .select("name, image_url")
    .eq("sku", currentSku)
    .single()

  const title = products ? `${products.name} | Terra Home Studio` : "Product Details | Terra Home Studio"
  const description = products 
    ? `Discover minimalist home decor ${products.name} from the ${currentGroupId} collection. เช็คสินค้าและสาขาที่จำหน่าย ณ Terra Home Studio` 
    : `เช็คสต็อกสินค้ากลุ่ม ${currentGroupId} และสาขาที่พร้อมจำหน่ายในสต็อกปัจจุบัน`

  return {
    title: title,
    description: description,
    alternates: {
      canonical: `/prop/${encodeURIComponent(currentGroupId)}/${encodeURIComponent(currentSku)}`,
    },
    openGraph: {
      title: title,
      description: description,
      url: `https://terrahome-studio.vercel.app/prop/${encodeURIComponent(currentGroupId)}/${encodeURIComponent(currentSku)}`,
      siteName: 'Terra Home Studio',
      images: products?.image_url ? [{ url: products.image_url }] : [],
      type: 'article',
    },
  }
}

// ⚡ หน้าตา Page หลัก (ปรับใช้ await params เหมือนกัน)
export default async function ProductDetailWithGroupSidebarPage({ params }: Props) {
  const resolvedParams = await params // 👈 แก้ตรงนี้: แกะ Promise ออกมาให้เรียบร้อย
  const currentGroupId = decodeURIComponent(resolvedParams.groupId)
  const currentSku = decodeURIComponent(resolvedParams.sku)

  const supabase = await createClient()

  const { data: groupProducts, error } = await supabase
    .from("products")
    .select(`
      *,
      stock (
        qty,
        branches (
          id,
          branch_name,
          latitude,
          longitude
        )
      )
    `)
    .eq("collection_group_id", currentGroupId)
    .order("sku", { ascending: true })

  if (error || !groupProducts || groupProducts.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-slate-500">
        <p className="text-lg mb-4">ไม่พบข้อมูลสินค้ากลุ่มนี้ในระบบ</p>
      </div>
    )
  }

  return (
    <ProductDetailClient 
      groupProducts={groupProducts}
      currentGroupId={currentGroupId}
      initialSku={currentSku}
    />
  )
}