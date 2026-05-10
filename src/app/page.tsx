export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-8 text-center">
        <span className="inline-flex rounded-full bg-dark-badge px-4 py-1.5 text-sm font-medium text-accent-green">
          &#x1F389; New — NovaPlan v1.0
        </span>
        <h1 className="font-fustat text-5xl font-bold leading-tight tracking-tight md:text-7xl lg:text-[80px]">
          Dari ide ke PRD
          <br />
          dalam 5 menit.
        </h1>
        <p className="max-w-lg text-lg text-text-gray font-inter">
          Describe produk kamu secara natural dan AI akan generate Product
          Requirements Document yang lengkap dan profesional.
        </p>
        <div className="flex gap-4">
          <a
            href="/login"
            className="inline-flex h-14 items-center justify-center rounded-xl bg-primary-black px-8 text-lg font-medium text-white transition-colors hover:bg-text-gray"
          >
            Mulai Sekarang
          </a>
          <a
            href="/pricing"
            className="inline-flex h-14 items-center justify-center rounded-xl border border-border-subtle px-8 text-lg font-medium transition-colors hover:bg-light-gray-bg"
          >
            Lihat Pricing
          </a>
        </div>
      </div>
    </main>
  );
}