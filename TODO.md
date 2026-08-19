printilan printilan yang harus diperbaiki : 

---HALAMAN QUESTION---


---user experience---

---clitool---

---teknis (hard)---
-bikin halaman admin untuk monitoring
-setup keamanan dan authorize admin
-prd di revisi -> ac masih generate prd versi sebelum di revisi
-perbaiki engine biar ainya ga lama generate prd,ac dan task karena sekarang masih lamaa banget sekita 3menit lebih
-updgrade implementaasi prompt ai agent
-menyusun diagram... (Jika tidak tampil, AI melakukan kesalahan syntax)
-==DONE== di prd

 ada beberapa kejanggalan yang harus lu verifikasi kenapa ini bisa terjadi pada aplikasi novaplan ini

  1. mengapa setiap kali gw bikin projek, pertanyaan yang digenerate selalu 6 pertanyaan? padahal yang gw inginkan adalah pertanyaan itu
  WAJIB DIBIKIN FLEXIBEL sesuai kompleksitas aplikasi yang ingin dibuat. pertanyaan yang di generate gaboleh hardcode selalu 6 atau apapun
  itu gw mau pertanyaan yang digenerate itu banyak dan detail serta berkelanjutan supaya aplikasi yang dibuat bisa sesuai harapan user.

  2. mengapa pada saat gw melakukan revisi prd di halaman prd (misal : gw ingin mengganti payment gateway dari xendit ke midtrans) itu
  entah kenapa pada saat gw melakukan generate ac, si ac yang sudah jadi tersebut tidak mengikuti prd terbaru yang telah di revisi
  (dibagian ac itu masih xendit, padahal jelas jelas gw melakukan revisi untuk menggunakan midtrans) begitu juga pada saat generate task.

  3. apakah task task yang digenerate oleh ai sudah lengkap, detail dan sangat sesuai dengan prd dan ac? karena yang saat ini gw alami
  adalah ketika ai coding agent mulai mengerjakan implementasi sesuai task task yang digenerate entah kenapa aplikasinya itu terlalu
  simple banget kamu bisa lihat ini C:\Coding\Web Development\React\padelkuy dan C:\Coding\Web Development\Next\padelskuy kedua aplikasi
  tersebut itu gw bikin pake ai berdasarkan projek dan task  yang ada di aplikasi novaplan ini yaitu projek 'padel booking'. kamu lihat
  sedniri kedua aplikasi tersebut jadinya tuh sangat simple dan jelek serta ga detail. aplikasinya tuh ga sesuai sama yang gw inginkan. yang dimana kedua aplikasi tersebut cuma nampilin beberapa ui aja seperti jadwal booking, dll seharusnya itu kan aplikasinya itu dibikin
  lebih matang gitu, seperti ada landing pagenya, untuk role user berarti ada halaman pilih lapangan, profile, riwayat booking dll. untuk
  halaman adminnya berarti akan ada dashboard, dll. jadi bisa dibilang sepertinya ini ada masalah di bagian task yang digenerate karena
  ai coding agent benar benar ngikutin apa yang ada di task saja dia tidak melakukan improvisasi, jadi kalau tasknya ga detail maka
  aplikasinya akan menjadi simple. nah gw ingin si ai coding agent ini dia melakukan improvisasi dari task task nya gitu namun tetep ga
  keluar konteks si task, subtask dan detail tasknya. 
4. perbaiki engine biar ainya ga lama generate prd,ac dan task karena sekarang masih lamaa banget sekita 3menit lebih
5. perbaiki sistem output model ai baik free, pro dan hengker karena kan versi sekarang itu dibedakan output prd, ac dan tasknya di masing masing tier model (free, pro, hengker) nah gw mau outputnya sama aja di semua tier model untuk saat ini kan output yang paling lengkap dan detail adadi tier hengker nah gw mau output semua model itu pake output yang di tier hengker sekarang. jadi gw itu pengennya yang membedakan output prd, ac dan tasknya di masing-masing tier model itu ada di kepintaran modelnya murni gitu bukan malah di hardcode atau makah diatur. kamu paham ga maksud saya? kalau ga paham silahkan bertanya

question/prd/ac/task itu KENAPA LAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA BANGET DAH ANJING. MODEL ISSUE? 9ROUTER ISSUE? CODEBASE ISSUE? ATAU APA??
