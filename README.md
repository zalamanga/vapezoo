# VAPEZOO — dokumentasi teknis

Alur halaman statis, kontrol navigasi dan batas formulir dijelaskan di [CODE_FLOW](docs/CODE_FLOW.md).

Website statis tujuh halaman dengan HTML, CSS, dan JavaScript. Tidak memerlukan PHP, database, atau proses build frontend. Node.js hanya dipakai untuk pengujian pengembangan.

Perapihan ini mempertahankan konten dan gambar sumber, memperbaiki referensi lokal, kontrol keyboard, serta inisialisasi JavaScript. Versi Laravel dan prototipe lain merupakan aplikasi terpisah.

## Menjalankan dengan Docker

Gunakan Docker Desktop dengan Linux containers atau Docker Engine dan Compose:

```powershell
git clone https://github.com/zalamanga/vapezoo.git
Set-Location -LiteralPath '.\vapezoo'
docker compose up -d --build
docker compose ps
```

Buka [http://127.0.0.1:18088](http://127.0.0.1:18088). Untuk mengganti port:

```powershell
$env:APP_PORT = '18089'
docker compose up -d --build
```

Alternatifnya, salin `.env.example` menjadi `.env` dan sesuaikan `APP_PORT`. Hentikan project dengan `docker compose down`. Perubahan source memerlukan build ulang.

Nginx berjalan sebagai pengguna `nginx`, memakai filesystem baca saja dan direktori sementara `/tmp`. Port hanya diikat ke komputer lokal. Image hanya menyertakan tujuh HTML dan `assets/`; data Git, konfigurasi hosting lama, dependency tes dan cadangan privat tidak ikut disajikan. Server menolak POST dan akses berkas tersembunyi.

## Menjalankan tanpa Docker

Python 3 dapat menyediakan server HTTP lokal, dari root project:

```powershell
python tests/serve.py --port 8080
```

Buka `http://127.0.0.1:8080`. Hentikan dengan `Ctrl+C`. Helper Python memakai HTTP/1.1 dan antrean koneksi yang lebih besar untuk memuat aset secara bersamaan. Python hanya untuk pengembangan; konfigurasi Nginx pada Docker menerapkan pembatasan akses tambahan.

## Halaman dan struktur

| File | Halaman sumber |
| --- | --- |
| `index.html` | Beranda |
| `about.html` | Profil |
| `produk.html` | Konten katalog sumber |
| `hexohm.html` | Halaman informasi sumber |
| `news.html` | Berita contoh |
| `faq.html` | FAQ |
| `kontak.html` | Informasi kontak dan formulir nonaktif |

```text
assets/css/style.css       Stylesheet project
assets/js/main.js          Navigasi, kontrol halaman, inisialisasi library
assets/img/                Gambar sumber
assets/vendor/             Bootstrap, AOS, Swiper, ikon, dan particles.js
docker/nginx.conf          Server statis lokal
tests/                     Pemeriksaan sumber dan browser
```

## Perbaikan teknis

- Referensi favicon yang hilang menggunakan aset yang tersedia. Tautan halaman yang tidak tersedia dikeluarkan dari navigasi.
- Tautan footer diarahkan ke halaman yang tersedia; tujuan contoh yang belum ada ditandai nonaktif.
- ID elemen dibuat unik. Menu mobile, indikator carousel, dan FAQ menggunakan kontrol keyboard serta atribut aksesibilitas.
- Halaman utama tetap dikenali saat dibuka melalui `/`. Hash kosong tidak lagi diteruskan sebagai selector CSS.
- Inisialisasi AOS, Swiper, indikator dan particles diperiksa sesuai elemen/library yang tersedia. Konten tetap terbaca jika AOS gagal dimuat atau JavaScript dinonaktifkan.
- Preferensi pengurangan gerakan dihormati; kontras menu ponsel, penanda fokus keyboard dan tata letak fieldset diperbaiki.

## Formulir dan koneksi luar

Formulir kontak dan newsletter belum memiliki layanan penerima. Keduanya dikunci dengan pemberitahuan; data tidak dikirim dan tidak disimpan. Script contoh Express/Nodemailer lama pada `forms/index.js` tidak menjadi bagian runtime saat ini. Implementasi sebelumnya dapat dilihat dalam riwayat Git.

Google Fonts masih dimuat dari layanan eksternal. Halaman kontak mempertahankan sematan Google Maps sumber dengan lazy loading. Tautan kontak eksternal tetap berasal dari source awal; pengujian tidak membukanya atau mengirim pesan. Detail kontak, peta dan materi contoh belum diverifikasi sebagai informasi operasional terkini.

Tanpa internet, font akan memakai fallback sistem dan sematan peta mungkin tidak tersedia. Bootstrap, AOS, Swiper, ikon serta gambar website tersedia secara lokal. Ini bukan paket frontend yang sepenuhnya offline.

## Pengujian

Node.js 22 dipakai dalam pengembangan. Pemeriksaan sumber tidak memerlukan dependency:

```powershell
npm test
```

Untuk tes browser:

```powershell
npm ci
npm run test:browser
```

Konfigurasi memakai Microsoft Edge terpasang pada Windows. Pada Linux/macOS, pasang Chromium pengujian dengan `npx playwright install chromium`. `PLAYWRIGHT_CHANNEL` dapat memilih channel lain yang sudah tersedia.

Playwright menjalankan server Python lokal otomatis. Untuk menguji Docker yang sudah berjalan:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:18088'
npm run test:browser
```

Tes mencakup tujuh halaman, referensi HTML/CSS, ID/fragmen, menu keyboard, carousel, formulir nonaktif, serta viewport 320/390/768 piksel. Semua koneksi eksternal dan request selain GET/HEAD diblokir ketika tes browser berjalan. Permintaan font/peta yang diblokir dicatat terpisah dari kegagalan sumber daya lokal.

Profil browser sementara diarahkan ke `node_modules/.cache/playwright-temp` dalam project dan dibersihkan oleh Playwright setelah selesai. Artefak tes diabaikan Git; simpan checkout di D: jika ingin cache ini berada di D:.

## Sumber dan arsip

Salinan HTML pada folder hosting, clone lokal lama, dan arsip utama telah dibandingkan dengan baseline GitHub. Isinya setara setelah perbedaan LF/CRLF diperhitungkan; tidak ada source lokal tambahan yang perlu digabung. Versi hosting memiliki metadata deployment yang tetap privat.

Prototipe lain, template lama, dan versi Laravel tidak digabung ke website statis ini. Sumber asli serta riwayatnya disimpan dalam cadangan privat di luar repository. Aset dan berkas library mempertahankan materi/lisensi yang sudah ada; perapihan ini tidak menambahkan klaim lisensi baru atas aset pihak ketiga.
