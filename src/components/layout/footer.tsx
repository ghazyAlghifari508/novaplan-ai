import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-white py-12 px-6">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link
            href="/"
            className="font-schibsted text-[20px] font-semibold tracking-[-1.2px] text-primary-black"
          >
            NovaPlan
          </Link>
          <p className="font-schibsted text-[14px] text-text-gray text-center md:text-left">
            Mengubah ide menjadi Product Requirements Document terstruktur dalam hitungan menit.
          </p>
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-2">
          <div className="flex gap-6">
            <Link href="/pricing" className="font-schibsted text-[14px] text-text-gray hover:text-primary-black transition-colors">
              Pricing
            </Link>
            <Link href="/register" className="font-schibsted text-[14px] text-text-gray hover:text-primary-black transition-colors">
              Daftar Gratis
            </Link>
          </div>
          <p className="font-schibsted text-[14px] text-text-gray">
            &copy; {new Date().getFullYear()} NovaPlan. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
