<h1 align="center">Password Studio</h1>

<p align="center">Pembuat kata sandi dan vault lokal dengan enkripsi di browser.</p>

<p align="center">
  <img alt="Stack" src="https://img.shields.io/badge/HTML%20%C2%B7%20CSS%20%C2%B7%20JavaScript-tanpa%20build-f0db4f?style=flat-square" />
  <img alt="Enkripsi" src="https://img.shields.io/badge/enkripsi-AES--GCM%20256-2d9d78?style=flat-square" />
  <img alt="Data" src="https://img.shields.io/badge/data-lokal-555?style=flat-square" />
  <img alt="Backend" src="https://img.shields.io/badge/backend-tidak%20ada-555?style=flat-square" />
</p>

<p align="center">
  <a href="#fitur">Fitur</a> ·
  <a href="#menjalankan">Menjalankan</a> ·
  <a href="#keamanan-dan-batasan">Keamanan dan batasan</a>
</p>

---

## Ringkasan

Password Studio membuat kata sandi acak dengan panjang dan jenis karakter yang bisa diatur, lalu menyimpannya ke vault lokal di browser. Setiap kata sandi dienkripsi dengan kunci yang Anda masukkan saat menyimpan, sehingga tidak tersimpan sebagai teks biasa. Tidak ada server, akun, maupun sinkronisasi.

## Fitur

- **Generator** dengan panjang yang dapat diatur dan pilihan huruf besar, huruf kecil, angka, dan simbol.
- **Indikator kekuatan** (Sedang, Kuat, Sangat kuat) berdasarkan panjang dan variasi karakter.
- **Vault lokal** berisi nama akun, keterangan (situs atau username), tanggal simpan, dan kata sandi terenkripsi.
- **Enkripsi per entri:** AES-GCM 256-bit, kunci diturunkan dengan PBKDF2-SHA-256 (120.000 iterasi), salt dan IV acak untuk setiap entri.
- **Buka, salin, dan hapus** entri; **Buka semua** dengan satu kunci, serta **Hapus semua**.
- Tanpa Node.js, dependensi, maupun backend.

## Menjalankan

Sajikan folder ini melalui server HTTP statis:

```sh
python -m http.server 8080
```

Buka `http://localhost:8080`. Untuk GitHub Pages, gunakan folder root sebagai sumber publikasi.

## Struktur

```text
index.html   Antarmuka
app.js       Generator, enkripsi, dan vault
style.css    Gaya
```

## Keamanan dan batasan

- Vault disimpan di `localStorage` browser pada perangkat ini. Menghapus data situs akan menghapus vault.
- **Kunci enkripsi tidak disimpan.** Bila kunci hilang, entri tidak dapat dipulihkan.
- Enkripsi AES-GCM memerlukan **Web Crypto**, yang hanya tersedia pada konteks aman (HTTPS atau `localhost`). Bila tidak tersedia, kode memakai cadangan `simple-xor` yang **tidak aman**. Jalankan hanya melalui HTTPS atau `localhost`.
- Generator memakai `crypto.getRandomValues` bila tersedia.
- Halaman memuat font Inter dari Google Fonts, sehingga permintaan font berjalan ke layanan tersebut.
- Proyek ini adalah alat sederhana dan belum diaudit. Untuk kebutuhan sensitif, gunakan pengelola kata sandi yang sudah mapan.

## Status validasi

Pemeriksaan sintaks, aset, dan pembukaan halaman di Chrome headless lulus tanpa exception JavaScript (22 November 2026). Belum ada suite pengujian otomatis.
