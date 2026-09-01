import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/app/components/Footer";
import CollectionsHeroBanner from "./CollectionsHeroBanner";

export const metadata: Metadata = {
  title: "Home Decor Collection | Terra Home Studio - ของตกแต่งบ้าน 9 หมวดหมู่",
  description:
    "สำรวจคอลเล็กชันของตกแต่งบ้านเซรามิก แจกัน ประติมากรรม และของแต่งบ้านสไตล์มินิมอลกว่า 1,000 ชิ้น จาก Terra Home Studio",
  alternates: {
    canonical: "/collections",
  },
  openGraph: {
    title: "Home Decor Collection | Terra Home Studio",
    description:
      "9 Categories · 1,000+ Pieces of curated ceramic vessels, sculptures, and home decor.",
    url: "https://terrahome-studio.com/collections",
    siteName: "Terra Home Studio",
    images: [
      {
        url: "/collections/vase-and-vessels.webp",
        width: 800,
        height: 800,
        alt: "Terra Home Studio Collections",
      },
    ],
  },
};

interface CollectionCategory {
  title: string;
  image: string;
  href: string;
  priority?: boolean;
}

const ROW_1_CATEGORIES: CollectionCategory[] = [
  {
    title: "Vase & Vessels",
    image: "/collections/vase-and-vessels.webp",
    href: `/prop?category=${encodeURIComponent("VASE & VESSELS")}`,
    priority: true,
  },
  {
    title: "Figure",
    image: "/collections/figure.webp",
    href: `/prop?category=${encodeURIComponent("FIGURE")}`,
    priority: true,
  },
  {
    title: "Sculpture",
    image: "/collections/sculpture.webp",
    href: `/prop?category=${encodeURIComponent("SCULPTURE")}`,
    priority: true,
  },
  {
    title: "Bookend",
    image: "/collections/bookend.webp",
    href: `/prop?category=${encodeURIComponent("BOOKED")}`,
    priority: true,
  },
];

const ROW_2_CATEGORIES: CollectionCategory[] = [
  {
    title: "Candle holders",
    image: "/collections/candle-holders.webp",
    href: `/prop?category=${encodeURIComponent("CANDLE HOLDERS")}`,
  },
  {
    title: "Dining & Tableware",
    image: "/collections/dining-and-tableware.webp",
    href: `/prop?category=${encodeURIComponent("DINING & TABLEWARE")}`,
  },
  {
    title: "Dressing & Bath",
    image: "/collections/dressing-and-bath.webp",
    href: `/prop?category=${encodeURIComponent("DRESSING & BATH")}`,
  },
  {
    title: "Art & walldecor",
    image: "/collections/art-and-walldecor.webp",
    href: `/prop?category=${encodeURIComponent("ART & WALL DECOR")}`,
  },
  {
    title: "Accessories",
    image: "/collections/accessories.webp",
    href: `/prop?category=${encodeURIComponent("ACCESSORIES")}`,
  },
];

const ALL_CATEGORIES = [...ROW_1_CATEGORIES, ...ROW_2_CATEGORIES];

function CategoryCard({ category }: { category: CollectionCategory }) {
  return (
    <Link
      href={category.href}
      className="group flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 select-none"
    >
      {/* Sharp square container - No rounded corners */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#DECFC2] shadow-sm transition-all duration-500 ease-out group-hover:shadow-xl">
        <Image
          src={category.image}
          alt={category.title}
          width={800}
          height={800}
          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 18vw"
          priority={category.priority}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>
      <span className="mt-3 block font-serif text-[15px] sm:text-[16px] lg:text-[17px] font-medium tracking-wide text-[#55473A] transition-colors duration-300 group-hover:text-[#A5573C]">
        {category.title}
      </span>
    </Link>
  );
}

export default function CollectionsPage() {
  return (
    <div className="min-h-screen bg-[#E5DDD3] text-[#4A3E33] flex flex-col font-sans selection:bg-[#A5573C] selection:text-[#FAF7F2]">
      
      {/* 🌟 Top Hero Banner Slider */}
      <CollectionsHeroBanner />

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 md:pt-16 pb-24 md:pb-32">
        
        {/* Top Header Section */}
        <div className="w-full mb-10 sm:mb-12 md:mb-16 text-center">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] tracking-[0.14em] text-[#55473A] uppercase font-normal leading-tight">
            HOME DECOR COLLECTION
          </h1>
          <p className="mt-2 sm:mt-2.5 text-xs sm:text-[13px] md:text-sm tracking-[0.26em] text-[#7A6D60] uppercase font-medium">
            9 CATEGORIES &middot; 1,000+ PIECES
          </p>
        </div>

        {/* Desktop Layout (4 cards on Row 1, 5 cards on Row 2) - Sharp Square Corners */}
        <div className="hidden lg:flex flex-col space-y-10">
          {/* Row 1: 4 Categories */}
          <div className="grid grid-cols-4 gap-8 max-w-[1080px] mx-auto w-full">
            {ROW_1_CATEGORIES.map((cat) => (
              <CategoryCard key={cat.title} category={cat} />
            ))}
          </div>

          {/* Row 2: 5 Categories */}
          <div className="grid grid-cols-5 gap-6 max-w-[1320px] mx-auto w-full">
            {ROW_2_CATEGORIES.map((cat) => (
              <CategoryCard key={cat.title} category={cat} />
            ))}
          </div>
        </div>

        {/* Tablet / Mobile Layout (Responsive 2 to 3 columns) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 lg:hidden max-w-3xl mx-auto">
          {ALL_CATEGORIES.map((cat) => (
            <CategoryCard key={cat.title} category={cat} />
          ))}
        </div>

      </main>

      <Footer />
    </div>
  );
}
