import { FAQ_CATEGORIES } from "./faq-data";

export function Faq() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">FAQ</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Pertanyaan yang sering ditanyakan
        </h1>
        <p className="m-0 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          Temukan jawaban seputar akun, credit, cara kerja, dan pembayaran PrdFy.
        </p>
        <div className="mt-8 space-y-8">
          {FAQ_CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <h2 className="mb-3 text-xl font-semibold text-[var(--sea-ink)]">{cat.title}</h2>
              <div className="divide-y divide-graphite rounded-xl border border-graphite">
                {cat.items.map((item, i) => (
                  <details key={i} className="group p-4">
                    <summary className="cursor-pointer list-none font-[510] text-[var(--sea-ink)] marker:hidden">
                      <span className="flex items-center justify-between">
                        {item.q}
                        <span className="text-fog transition-transform group-open:rotate-45">+</span>
                      </span>
                    </summary>
                    <p className="mt-2 text-sm leading-7 text-[var(--sea-ink-soft)]">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
