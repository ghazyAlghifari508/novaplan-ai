"use client";

import { useRouter } from "next/navigation";
import { GridBackground } from "@/components/layout";
import { FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <main className="flex flex-col min-h-screen bg-onyx">
      <section
        className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-20"
        style={{ background: "var(--bg-page)" }}
      >
        <GridBackground />

        <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center gap-8">
          <div className="flex flex-col items-center gap-6">
            <span className="rounded-full bg-graphite/50 border border-graphite px-4 py-1.5 font-inter text-sm font-medium text-fog backdrop-blur-sm">
              Error 404
            </span>
            <h1 className="font-inter text-4xl font-light leading-tight text-snow md:text-5xl lg:text-6xl">
              Halaman tidak ditemukan
            </h1>
            <p className="max-w-[500px] font-inter text-[17px] font-normal leading-[1.6] text-fog">
              Halaman yang kamu cari tidak ada atau sudah dipindahkan. Jangan khawatir, kamu masih bisa buat PRD keren dari sini.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
            <button
              onClick={() => router.back()}
              className="group flex h-11 items-center justify-center gap-2 rounded-md border border-graphite bg-charcoal px-6 font-inter text-[15px] font-medium text-snow transition-all hover:bg-graphite hover:text-white"
            >
              Kembali
            </button>
            <Link
              href="/"
              className="btn-primary group flex h-11 items-center justify-center gap-2 rounded-md px-6 font-inter text-[15px] font-medium transition-all hover:brightness-110"
            >
              Ke Beranda
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="mt-12 flex w-full flex-col sm:flex-row items-center justify-center gap-4">
             <Link href="/prd" className="flex w-full sm:w-auto items-center gap-3 rounded-lg border border-graphite bg-charcoal/50 p-4 transition-colors hover:bg-graphite/80 backdrop-blur-sm text-left">
                <div className="rounded-md bg-graphite p-2 text-snow">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-inter text-[15px] font-medium text-snow">Lihat Proyek Saya</h3>
                  <p className="font-inter text-sm text-fog">Kelola PRD yang sudah kamu buat</p>
                </div>
             </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
