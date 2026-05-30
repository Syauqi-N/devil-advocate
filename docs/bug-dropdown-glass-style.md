# Bug: Dropdown & Custom Persona Card — Belum Glass Style

**Tanggal ditemukan:** 29 Mei 2026  
**Halaman:** Home / Persona Selector  
**URL:** debate.soqisoqi.my.id  
**Device:** Mobile

## Deskripsi

Beberapa elemen UI belum menggunakan glass style yang konsisten dengan desain keseluruhan app:

1. **Dropdown persona** — background solid gelap, belum frosted glass
2. **Selector "Default"** (di bawah list dropdown) — belum glass style
3. **Card Custom Persona** (`+ Custom Persona`) — belum glass style

## Screenshot

![Bug Dropdown Glass Style](/root/.hermes/image_cache/img_e2b56a474641.jpg)

## Elemen yang Perlu Diupdate

- Dropdown container (list persona)
- Item "Default" selector dengan chevron
- Card/button `+ Custom Persona` di bagian bawah dropdown

## Expected Behavior

Semua elemen dropdown dan card persona menggunakan glass morphism style — `backdrop-filter: blur`, background semi-transparan, border subtle — konsisten dengan elemen lain di app.

## Status

- [ ] Belum diinvestigasi
- [ ] Belum di-fix
