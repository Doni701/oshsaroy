# OshSaroy

## Ishga tushirish

- Node.js 22.13 yoki yangiroq versiyasini o‘rnating.
- `npm install` buyrug‘ini bajaring.
- Buyurtmalarni Telegramga yuborish uchun `BOT_TOKEN` qiymatini maxfiy `.env` fayliga kiriting.
- `npm start` buyrug‘ini bajaring va saytni `http://localhost:3000` orqali oching. HTML faylni bevosita ochish akkaunt API’sini ishga tushirmaydi.
- `npm test` akkaunt va sessiya API sinovlarini ishga tushiradi.

## Akkauntlar

Akkauntlar SQLite bazasida (`.data/oshsaroy.sqlite`) server tomonida saqlanadi. Parollar scrypt bilan xeshlanadi; sessiyalar HttpOnly cookie orqali saqlanadi. Telefon raqami akkaunt identifikatori sifatida ishlatiladi.

Telefon orqali SMS tasdiqlash/SMS-kod va parolni tiklash xizmati hali ulanmagan; hozir telefon raqami + parol bilan ro‘yxatdan o‘tish va kirish ishlaydi.

## Karta to‘lovlari

Karta ulash hozircha faollashtirilmagan: Click merchant akkaunti hamda Click tasdiqlagan karta-tokenlash integratsiyasi kerak. Bular taqdim etilmaguncha kabinetdagi karta ulash boshqaruvi o‘chiq turadi. Sayt karta raqami yoki CVV so‘ramaydi va saqlamaydi. Merchant tasdiqlari olingach, karta ma’lumotlari faqat provayderning xavfsiz sahifasi orqali tokenlanishi kerak.
