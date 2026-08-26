import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/src/supabase/server";
import CollectionLookClient from "./CollectionLookClient";

type Props = {
  params: Promise<{ slug: string; imageId: string }>;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://terrahome-studio.com";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, imageId } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("journal_categories")
    .select("title_en, title_th, description_en, description_th")
    .eq("slug", slug)
    .single();

  const { data: image } = await supabase
    .from("journal_images")
    .select("image_url, sort_order")
    .eq("id", Number(imageId))
    .single();

  const title = category 
    ? `${category.title_en} (Look #${image?.sort_order || 1}) | Terra Home Studio Journal`
    : "Collection Look | Terra Home Studio";

  const description = category?.description_th || category?.description_en || "ชมไอเดียการจัดวางของตกแต่งบ้านเซรามิก แจกัน และ Decorative Objects จาก Terra Home Studio";

  const canonicalUrl = `/collections/${slug}/${imageId}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${canonicalUrl}`,
      siteName: "Terra Home Studio",
      images: image?.image_url ? [{ url: image.image_url, width: 1200, height: 900, alt: title }] : [],
      type: "article",
    },
  };
}

export default async function CollectionLookPage({ params }: Props) {
  const { slug, imageId } = await params;
  const imageIdNum = Number(imageId);

  if (!Number.isSafeInteger(imageIdNum)) {
    notFound();
  }

  const supabase = await createClient();

  // 1. ดึง Category
  const { data: category, error: catError } = await supabase
    .from("journal_categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (catError || !category) {
    notFound();
  }

  // 2. ดึงรูปภาพปัจจุบัน
  const { data: currentImage, error: imgError } = await supabase
    .from("journal_images")
    .select("*")
    .eq("id", imageIdNum)
    .single();

  if (imgError || !currentImage) {
    notFound();
  }

  // 3. ดึงส่วนลดที่ Active อยู่
  const { data: activeDiscounts } = await supabase
    .from("discounts")
    .select(`id, discount_type, value, start_date, end_date, discount_rules ( product_id )`)
    .eq("active", true);

  // 4. ดึงรูปภาพทั้งหมดในหมวดนี้สำหรับ More Looks
  const { data: allCatImages } = await supabase
    .from("journal_images")
    .select("id, image_url, sort_order")
    .eq("category_id", category.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // 5. ดึงสินค้าที่ผูกไว้กับรูปนี้จาก journal_image_products พร้อม stock และสาขา
  const { data: linkedRows } = await supabase
    .from("journal_image_products")
    .select(`
      sort_order,
      product:products (
        id,
        name,
        sku,
        price,
        image_url,
        status,
        collection_group_id,
        category_id,
        specs,
        stock (
          qty,
          branches (
            id,
            branch_name,
            latitude,
            longitude
          )
        )
      )
    `)
    .eq("journal_image_id", imageIdNum)
    .order("sort_order", { ascending: true });

  const now = new Date();

  const linkedProducts = (linkedRows || [])
    .map((row: any) => {
      const product = row.product;
      if (!product) return null;

      let applicableDiscount = null;
      if (activeDiscounts && activeDiscounts.length > 0) {
        applicableDiscount = activeDiscounts.find((discount: any) => {
          const isStarted = !discount.start_date || new Date(discount.start_date) <= now;
          const isNotEnded = !discount.end_date || new Date(discount.end_date) >= now;
          if (!isStarted || !isNotEnded) return false;
          return discount.discount_rules.some((rule: any) => rule.product_id === product.id || rule.product_id === null);
        });
      }

      const normalizedDiscountValue = applicableDiscount && applicableDiscount.value !== null && applicableDiscount.value !== undefined
        ? Number(applicableDiscount.value)
        : null;
      const hasValidDiscountValue = normalizedDiscountValue !== null && Number.isFinite(normalizedDiscountValue) && normalizedDiscountValue > 0;

      return {
        ...product,
        id: Number(product.id),
        name: product.name || "ไม่มีชื่อสินค้า",
        sku: product.sku || null,
        price: product.price !== null ? Number(product.price) : null,
        discount_value: hasValidDiscountValue ? normalizedDiscountValue : null,
        discount_type: applicableDiscount ? applicableDiscount.discount_type : null,
        sortOrder: Number(row.sort_order || 0),
      };
    })
    .filter(Boolean);

  const otherLooks = (allCatImages || [])
    .filter((img) => img.id !== imageIdNum)
    .map((img) => ({
      id: Number(img.id),
      imageUrl: img.image_url,
      sortOrder: Number(img.sort_order || 1),
    }));

  return (
    <CollectionLookClient
      collectionImage={{
        id: Number(currentImage.id),
        imageUrl: currentImage.image_url,
        sortOrder: Number(currentImage.sort_order || 1),
        altText: currentImage.alt_text,
      }}
      category={{
        id: category.id,
        slug: category.slug,
        titleEn: category.title_en,
        titleTh: category.title_th || category.title_en,
        descriptionEn: category.description_en,
        descriptionTh: category.description_th,
        categoryQuery: category.category_query,
        sortOrder: Number(category.sort_order || 1),
      }}
      linkedProducts={linkedProducts}
      otherLooks={otherLooks}
    />
  );
}
