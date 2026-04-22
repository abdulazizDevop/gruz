# Gruz (Dveri) - Eshik ishlab chiqarish va buyurtma tizimi

## Maqsad
Eshik ishlab chiqarish korxonasi uchun buyurtma boshqaruv tizimi. Admin buyurtma yaratadi, sborshik (yig'uvchi) qabul qiladi, jarayon push-xabarnomalar bilan kuzatiladi.

## Tech Stack
- **Frontend:** React 19, Vite, React Router DOM 7, Tailwind CSS, Framer Motion
- **Backend/DB:** Firebase (Firestore + Storage)
- **Auth:** Firebase Authentication
- **PWA:** Ha, iOS/Android uchun Add to Home Screen
- **Deploy:** Docker + Ubuntu server (72.56.39.78)

## Arxitektura
```
src/
  App.jsx        — Routing
  components/    — UI komponentlari
  context/       — Auth, state context
  lib/           — Firebase config
  pages/         — Admin, Sborshik panellari
```

## Rollar
- **Admin** — buyurtma yaratish, xodim qo'shish, barcha zakazlarni ko'rish
- **Sborshik** (yig'uvchi) — buyurtmani qabul qilish, "tayyor" tugmasi
- **Konstruktor**, Montajchi, Texnolog, Menejer — dinamik rollar (admin qo'shadi)

## Muhim logika
- Push-xabarnomalar: sborshik "Tayyor" bosganda adminga pop-up notification
- Validatsiya va avtoformat barcha formlarda
- Mobil adaptiv: bottom navigation, swipe menu
- Multi-session: bir qurilmada bir vaqtda faqat bitta akkaunt
- Firebase Storage: server o'zida saqlash (bulutga emas)

## Oxirgi ishlar (2026-04)
- Docker deploy Ubuntu serverga
- PWA sozlash (iOS icon, manifest.json)
- Dinamik rollar funksiyasi
- Mobil UI/UX yaxshilash (bottom nav, responsive jadvallar)
- Gorizontal scroll jadvallar uchun
- Qora ekran/sekin yuklash bug tuzatish
