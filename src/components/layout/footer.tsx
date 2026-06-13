import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-graphite bg-onyx px-6 py-12">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link
            href="/"
            className="font-inter text-[15px] font-[510] text-snow"
          >
            NovaPlan
          </Link>
          <p className="max-w-md text-center font-inter text-[14px] leading-relaxed text-fog md:text-left">
            Mengubah ide menjadi Product Requirements Document terstruktur dalam hitungan menit.
          </p>
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-2">
          <div className="flex gap-6">
            <Link href="/pricing" className="font-inter text-[14px] text-fog transition-colors hover:text-snow">
              Pricing
            </Link>
            <Link href="/register" className="font-inter text-[14px] text-fog transition-colors hover:text-snow">
              Daftar Gratis
            </Link>
          </div>
          <p className="font-inter text-[14px] text-slate">
            &copy; {new Date().getFullYear()} NovaPlan. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
