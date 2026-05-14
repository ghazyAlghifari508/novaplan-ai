"use client";

import { NotFound, NotFoundLink } from "@/components/ui/not-found-1";
import { FileText, Sparkles, CreditCard, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const novaplanLinks: NotFoundLink[] = [
  {
    title: "Buat PRD Baru",
    subtitle: "Mulai generate PRD pertamamu dengan bantuan AI NovaPlan",
    icon: Sparkles,
    href: "/prd",
  },
  {
    title: "Lihat Proyek Saya",
    subtitle: "Temukan dan kelola semua PRD yang sudah kamu buat",
    icon: FileText,
    href: "/prd",
  },
  {
    title: "Paket & Harga",
    subtitle: "Upgrade ke Hengker untuk akses unlimited & fitur premium",
    icon: CreditCard,
    href: "/pricing",
  },
  {
    title: "Hubungi Kami",
    subtitle: "Ada pertanyaan atau kendala? Tim kami siap membantu kamu",
    icon: MessageCircle,
    href: "mailto:support@novaplan.ai",
  },
];

export default function NotFoundPage() {
  const router = useRouter();

  const handleBackClick = () => {
    router.back();
  };

  const handleHomeClick = () => {
    router.push("/");
  };

  return (
    <NotFound
      errorCode="404 error"
      title="Halaman tidak ditemukan"
      description="Halaman yang kamu cari tidak ada atau sudah dipindahkan. Jangan khawatir, kamu masih bisa buat PRD keren dari sini!"
      links={novaplanLinks}
      onBackClick={handleBackClick}
      onHomeClick={handleHomeClick}
      backButtonText="Kembali"
      homeButtonText="Ke Beranda"
    />
  );
}
