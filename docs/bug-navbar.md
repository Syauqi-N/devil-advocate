# Bug: Navbar Duplikat

**Tanggal ditemukan:** 29 Mei 2026  
**Halaman:** Login (`/login` atau halaman auth)  
**URL:** debate.soqisoqi.my.id  
**Device:** Tablet/Android browser

## Deskripsi

Dua navbar muncul sekaligus di bagian atas halaman login — navbar pertama (lebih gelap, ~54px) dan navbar kedua (sedikit lebih terang, ~40px) bertumpuk.

**Perbedaan keduanya:**
- Navbar 1: logo DA + teks "Devil's Advocate" + tombol "Masuk" di kanan
- Navbar 2: logo DA + teks "Devil's Advocate" + **tidak ada tombol** di kanan

## Screenshot

![Bug Navbar](/root/.hermes/image_cache/img_b082e5cbfff1.jpg)

## Root Cause (dugaan)

Navbar di-render dua kali karena:
- Navbar sudah ada di root layout (`_layout` / `layout.tsx`)
- Halaman login juga merender navbar-nya sendiri secara terpisah

Atau kondisi route/auth tidak menyembunyikan salah satu navbar di halaman auth.

## Fix yang Disarankan

1. Cek `app/layout.tsx` — pastikan `<Navbar />` hanya ada di sana
2. Cek komponen halaman login — hapus jika ada `<Navbar />` di sana
3. Atau gunakan conditional rendering: sembunyikan navbar root di halaman auth via route check

## Status

- [ ] Belum diinvestigasi
- [ ] Belum di-fix
