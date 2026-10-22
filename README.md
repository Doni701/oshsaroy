# OshSaroy

## Ishga tushirish

- Node.js 22.13 yoki yangiroq versiyasini o‘rnating.
- `npm install` buyrug‘ini bajaring.
- Buyurtmalarni Telegramga yuborish uchun `BOT_TOKEN` qiymatini maxfiy `.env` fayliga kiriting.
- `npm start` buyrug‘ini bajaring va saytni `http://localhost:3000` orqali oching. HTML faylni bevosita ochish akkaunt API’sini ishga tushirmaydi.
- `npm test` akkaunt va sessiya API sinovlarini ishga tushiradi.

## Akkauntlar

Lokal ishga tushirishda akkauntlar SQLite bazasida (`.data/oshsaroy.sqlite`) server tomonida saqlanadi. `DATABASE_PATH` orqali boshqa SQLite faylini ko‘rsatish mumkin. Render kabi deploy muhitida doimiy saqlash uchun PostgreSQL ulang va servisning Environment bo‘limiga PostgreSQL’ning **Internal Database URL** qiymatini `DATABASE_URL` nomi bilan kiriting. Server PostgreSQL jadvallarini birinchi ishga tushishda o‘zi yaratadi. `DATABASE_URL` bo‘lmasa, server lokal SQLite’dan foydalanadi.

Render’da sozlash:

1. Render Dashboard’da **New → PostgreSQL** orqali baza yarating. Web Service va baza bir xil region’da bo‘lsin.
2. Baza sahifasidagi **Internal Database URL** qiymatini nusxalang.
3. Web Service → **Environment** bo‘limida `DATABASE_URL` nomli environment variable yarating va nusxalangan URL’ni qiymatiga qo‘ying. URL’ni kodga yoki GitHub’ga joylamang.
4. Saqlab, Web Service’ni redeploy qiling. Deploy jurnallarida `Akkauntlar bazasini ishga tushirib bo‘lmadi` xatosi yo‘qligini tekshiring.
5. Saytda yangi akkaunt yarating. SQLite’dagi lokal akkauntlar PostgreSQL’ga avtomatik ko‘chmaydi; lokal va Render bazalarida foydalanuvchi ma’lumotlari alohida saqlanadi.

`DATABASE_URL` sozlangach, Render PostgreSQL’da yaratilgan yangi akkauntlar va sessiyalar deploy yoki restartdan keyin ham saqlanadi. Akkaunt yaratish uchun ism, telefon raqami va 4 xonali PIN kifoya. PIN scrypt bilan xeshlanadi, sessiya HttpOnly cookie’da saqlanadi. Avvaldan ro‘yxatdan o‘tgan foydalanuvchilar eski paroli bilan kirishi mumkin.

SMS orqali telefonni tasdiqlash va PIN’ni tiklash xizmati ulanmagan; shu sabab telefon raqamining egasi ekanini tasdiqlash hozircha amalga oshmaydi.

## Karta to‘lovlari

Karta ulash hozircha faollashtirilmagan: Click merchant akkaunti hamda Click tasdiqlagan karta-tokenlash integratsiyasi kerak. Bular taqdim etilmaguncha kabinetdagi karta ulash boshqaruvi o‘chiq turadi. Sayt karta raqami yoki CVV so‘ramaydi va saqlamaydi. Merchant tasdiqlari olingach, karta ma’lumotlari faqat provayderning xavfsiz sahifasi orqali tokenlanishi kerak.
