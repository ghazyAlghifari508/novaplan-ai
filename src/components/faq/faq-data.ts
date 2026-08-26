export interface FaqItem {
  q: string;
  a: string;
}
export interface FaqCategory {
  id: string;
  title: string;
  items: FaqItem[];
}
export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "akun-login",
    title: "Akun & Login",
    items: [
      { q: "Bagaimana cara login ke PrdFy?", a: "PrdFy mendukung login dengan Google dan GitHub. Klik tombol di halaman login, lalu otorisasi akun kamu." },
      { q: "Apakah PrdFy mendukung login dengan email dan password?", a: "Belum. Saat ini login hanya tersedia melalui Google dan GitHub OAuth." },
    ],
  },
  {
    id: "credit-paket",
    title: "Credit & Paket",
    items: [
      { q: "Apa itu credit dan kapan credit terpakai?", a: "1 credit = 1 generate (PRD, AC, atau Task). Revisi dokumen gratis dan tidak memakai credit." },
      { q: "Apa bedanya paket free, pro, dan hengker?", a: "Free (2 credit, PRD saja). Pro (30 credit, workflow lengkap + share link). Hengker (105 credit, workflow lengkap + version history tak terbatas)." },
    ],
  },
  {
    id: "cara-kerja",
    title: "Cara Kerja PrdFy",
    items: [
      { q: "Bagaimana alur membuat PRD di PrdFy?", a: "Masukkan ide produk → jawab pertanyaan klarifikasi → PrdFy menghasilkan PRD 8 bagian via AI → revisi sesukamu." },
    ],
  },
  {
    id: "pembayaran",
    title: "Pembayaran & Top-up",
    items: [
      { q: "Metode pembayaran apa yang didukung?", a: "Pembayaran diproses melalui Midtrans (Snap). Top-up credit tersedia di halaman Billing." },
    ],
  },
  {
    id: "lainnya",
    title: "Lainnya",
    items: [
      { q: "Di mana saya bisa melaporkan bug atau meminta fitur?", a: "Buka Settings → Feedback, lalu pilih tipe laporan (bug atau fitur baru)." },
    ],
  },
];
