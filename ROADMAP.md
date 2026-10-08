# 🗺️ Private Chat — Production map

Shaxsiy real-time chat (1-ga-1): matn, rasm, video, ovozli xabar va fayllar.
**Asosan telefonda ishlatiladi** — shuning uchun hammasi mobile-first.

**Ish tartibi:** bosqichlar **ketma-ket** bajariladi. Har bosqich to'liq tugatiladi va
tekshiriladi, keyin keyingisiga o'tiladi — hech narsa chala qolmaydi.
(Siz tanlagansiz: bosqichlar orasida to'xtamasdan oxirigacha.)

---

## 1. Arxitektura

```
                              PRIVATE CHAT
                                   │
              ┌────────────────────┴────────────────────┐
           FRONTEND                                   BACKEND
   Next.js 16 + TypeScript                    Django 6 + DRF + Channels
   Tailwind 4 + motion (animatsiyalar)        JWT (httpOnly cookie)
              │                                         │
  Brauzer ──► Next.js (:3000) ── /api, /media, /ws ──► Django (:8000)
              │        (bitta manzil — CORS/cookie muammosi yo'q)
              │                                         │
              │   REST: xabar yuborish, tarix, fayllar  │
              │   WebSocket: real-time hodisalar        │
                                                        │
                         ┌──────────────────────────────┼─────────────────────┐
                    PostgreSQL                        Redis                 Media
                   (ma'lumotlar)          (WS kanallari, cache,       (avatar, rasm, video,
                                           online status)              audio, fayl)
```

**Xabar oqimi:** Siz → `POST /api/chats/{id}/messages/` → Django saqlaydi →
Redis orqali hodisa → suhbatdosh (va sizning boshqa qurilmalaringiz) WebSocket'da **darhol** oladi.

| Qatlam | Texnologiya |
|---|---|
| Frontend | Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript, Tailwind CSS 4, motion, lucide ikonkalar |
| Backend | Python 3.14, Django 6.0, DRF 3.18, SimpleJWT, Channels 4.3 + Daphne |
| Ma'lumot | PostgreSQL (hozircha SQLite), Redis (hozircha xotira) |
| Fayllar | `backend/media/` — faqat chat a'zolariga beriladi |

---

## 2. Qabul qilingan qarorlar (va sababi)

| Qaror | Sabab |
|---|---|
| Brauzer faqat Next.js bilan gaplashadi; `/api`, `/media`, `/ws` Django'ga uzatiladi | localhost, telefon (Wi-Fi) va production'da bir xil ishlaydi; CORS yo'q, cookie oddiy |
| JWT **httpOnly cookie**da | JavaScript tokenni o'qiy olmaydi (XSS'dan himoya); WebSocket ham shu cookie bilan autentifikatsiya |
| Yuborish — REST, qabul qilish — WebSocket | Katta fayllar HTTP'da ishonchli (progress, validatsiya); bitta WS har foydalanuvchiga |
| `messages/` → **`messaging/`** | Django'ning o'zidagi `django.contrib.messages` bilan to'qnashadi |
| `Chat` ga `participants` + unikal juftlik kaliti | Bir juft odam uchun faqat bitta chat — baza darajasida kafolat |
| Message turiga `VIDEO` va metadata | Video qo'llab-quvvatlash, o'lcham, davomiylik, ovoz to'lqini |
| `DATABASE_URL`/`REDIS_URL` bo'lmaguncha SQLite/xotira | Hech narsa o'rnatmasdan ishlaydi; PostgreSQL+Redis'ga `.env` da 2 qator bilan o'tiladi |
| Login'ga hujumdan himoya — **akkaunt bo'yicha** limit | Next.js proxy orqali haqiqiy IP kelmaydi; akkaunt bo'yicha limit hamma joyda ishlaydi |
| Interfeys tili — **English** | Sizning tanlovingiz |
| Qo'ng'iroq (call) — **yo'q** | Skrinshot faqat dizayn namunasi edi |

---

## 3. Papka tuzilmasi (maqsad)

```
chat/
├── ROADMAP.md
├── app/                         Next.js sahifalari
│   ├── layout.tsx
│   ├── page.tsx                 boshlash ekrani (ism + avatar); kirgan bo'lsangiz → /chat
│   ├── chat/page.tsx            chatlar ro'yxati + ochiq chat (/chat?id=12)
│   └── profile/page.tsx
├── components/
│   ├── chat/                    ChatWindow, ChatHeader, MessageList, MessageItem,
│   │                            MessageInput, VoiceRecorder, ImageUploader,
│   │                            FileUploader, OnlineStatus, ...
│   └── ui/                      Avatar, Button, Input, Sheet, Toast, ...
├── lib/                         api.ts, socket.ts, types.ts, format.ts, store
├── proxy.ts                     sahifalarni himoyalash (FAQAT sahifalar, /api emas!)
├── next.config.ts               /api, /media, /ws → Django
└── backend/
    ├── manage.py, requirements.txt, .env.example, README.md
    ├── config/                  settings, urls, asgi, routing, views (health)
    ├── users/                   User modeli, auth, profil
    ├── chats/                   Chat modeli, WebSocket consumer, routing
    ├── messaging/               Message modeli, xabarlar API, fayllar
    └── media/                   avatars/, images/, videos/, audio/, files/
```

---

## 4. Ma'lumotlar modeli

```
User                         Chat                          Message
├── id                       ├── id                        ├── id
├── username                 ├── participants (2 kishi)    ├── chat → Chat
├── password (hash)          ├── private_key (unikal)      ├── sender → User
├── first_name, last_name    ├── created_at                ├── type: TEXT | IMAGE | VIDEO | AUDIO | FILE
├── avatar, avatar_preset    └── updated_at (oxirgi xabar) ├── text (yoki caption)
├── bio                                                    ├── image | video | audio | file
├── is_online                ChatMember                    ├── thumbnail (video posteri), preview (xira)
├── last_seen                ├── chat → Chat               ├── file_name, file_size, mime_type
└── created_at               ├── user → User               ├── duration, width, height, waveform
                                                           ├── reply_to → Message
                             └── joined_at                 ├── is_read
                                                           ├── client_id (optimistic UI uchun)
                                                           └── created_at
```

## 5. API (REST, `/api/...`)

| Metod | Yo'l | Vazifa |
|---|---|---|
| POST | `/api/auth/guest/` | boshlash ekrani: ism + avatar → akkaunt va cookie |
| GET | `/api/users/people/` | boshqa odamlar ("Start chat" uchun) |
| POST | `/api/auth/register/` | ro'yxatdan o'tish (API uchun saqlangan, ilovada ishlatilmaydi) |
| POST | `/api/auth/login/` | kirish |
| POST | `/api/auth/refresh/` | access tokenni yangilash |
| POST | `/api/auth/logout/` | chiqish (token qora ro'yxatga) |
| GET | `/api/auth/me/` | joriy foydalanuvchi |
| PATCH | `/api/users/me/` | profilni tahrirlash (ism, bio, avatar) |
| DELETE | `/api/users/me/` | akkauntni butunlay o'chirish (chatlar, xabarlar, fayllar bilan) |
| POST | `/api/users/me/password/` | parolni almashtirish |
| GET | `/api/users/?search=ali` | foydalanuvchi qidirish |
| GET | `/api/users/{id}/` | boshqa foydalanuvchi profili |
| GET | `/api/chats/` | mening chatlarim (suhbatdosh, oxirgi xabar, o'qilmaganlar) |
| POST | `/api/chats/` | foydalanuvchi bilan chat ochish/yaratish (`user_id`) |
| GET | `/api/chats/{id}/` | chat ma'lumoti |
| POST | `/api/chats/{id}/read/` | o'qildi deb belgilash |
| GET | `/api/chats/{id}/messages/?before=ID` | xabarlar tarixi (cursor pagination) |
| POST | `/api/chats/{id}/messages/` | xabar yuborish (matn/fayl, reply) |
| DELETE | `/api/messages/{id}/` | xabarni o'chirish (hamma uchun) |
| GET | `/api/messages/{id}/attachment/` | himoyalangan fayl (faqat a'zolar, Range) |
| GET | `/api/messages/{id}/thumbnail/` | video posteri (himoyalangan) |
| GET | `/api/health/` | server holati ✅ |

## 6. WebSocket (`/ws/`)

| Yo'nalish | Hodisa | Mazmuni |
|---|---|---|
| server → client | `ready` | ulanish tayyor `{user_id}` |
| server → client | `message.created` | `{chat_id, message}` yangi xabar |
| server → client | `message.deleted` | `{chat_id, message_id}` |
| server → client | `messages.read` | `{chat_id, reader_id, last_read_id}` → ✓✓ |
| server → client | `typing` | `{chat_id, user_id, action: typing / recording / stop}` |
| server → client | `presence` | `{user_id, is_online, last_seen}` |
| server → client | `user.updated` | `{user}` — suhbatdosh ismi/avatari o'zgardi |
| server → client | `chat.deleted` | `{chat_id}` — suhbatdosh akkauntini o'chirdi, chat yo'qoladi |
| server → client | `account.deleted` | akkaunt boshqa qurilmada o'chirildi → boshlash ekraniga |
| server → client | `error` | `{detail}` — noto'g'ri so'rov |
| client → server | `typing` | `{chat_id, action}` "yozyapman / ovoz yozyapman / to'xtadim" |
| client → server | `ping` → `pong` | har 25 soniyada: ulanish tirik + online status |
| yopilish kodi | `4401` | sessiya eskirgan → refresh → qayta ulanish |

---

## 7. Dizayn (siz yuborgan skrinshotlar asosida)

- **Mobile-first**: telefonda chatlar ro'yxati va ochiq chat — alohida ekranlar (iOS'dagidek slide);
  kompyuterda — 2 ustun.
- **Light mavzu**: oq / juda och kulrang, havodor, yumaloq. Tepada suzuvchi "pill" panel
  (yumaloq ← tugma, o'rtada ism va status, yumaloq `…` tugma).
- **Pastki input** (skrinshotingizdagidek): `📎 | Message... | 😊 | 🎤`. Yozishni boshlasangiz,
  🎤 silliq animatsiya bilan ➤ (yuborish) tugmasiga aylanadi.
- **Dark mavzu**: deyarli qora (qo'ng'iroq ekranidagidek), yumaloq-kvadrat tugmalar.
- **Animatsiyalar**: xabar paydo bo'lishi (spring), ekranlar o'tishi, bottom sheet, "typing..." nuqtalari,
  ovoz yozish pulsatsiyasi, rasmni ochish (zoom), o'qilmaganlar belgisi.
- Telefon detallari: safe-area (notch / home indicator), klaviatura chiqqanda to'g'ri joylashuv, `100dvh`,
  tugmalar ≥ 44px, swipe bilan reply, uzoq bosish → amallar menyusi.

---

## 8. Bosqichlar

### ✅ 0-bosqich: Poydevor
- [x] `bacend` → `backend`, ortiqcha `bacend/bacend` qavat olib tashlandi
- [x] Virtual muhit `.venv` + `requirements.txt` (versiyalar qotirilgan)
- [x] `.env` / `.env.example` — barcha sozlamalar `.env` dan o'qiladi
- [x] Baza: `DATABASE_URL` bo'lsa PostgreSQL (connection pool bilan), bo'lmasa SQLite
- [x] Redis: `REDIS_URL` bo'lsa Redis cache + channel layer, bo'lmasa xotira
- [x] ASGI (Daphne): HTTP + WebSocket bitta serverda; noma'lum WS yo'l xushmuomalalik bilan rad etiladi
- [x] `/api/health/` — baza, cache, channel layer holati (biror narsa ishlamasa 503)
- [x] Production xavfsizlik sozlamalari (`DJANGO_DEBUG=False` da), logging, WhiteNoise
- [x] `.gitignore` (`.env`, `.venv`, `media/`, `db.sqlite3`), `backend/README.md`

### ✅ 1-bosqich: Users + Auth (backend)
- [x] `users` app: custom `User` (avatar, bio, is_online, last_seen) — birinchi migratsiyadan oldin;
      username katta-kichik harfdan qat'i nazar unikal
- [x] Admin panel (custom User uchun formalar bilan)
- [x] SimpleJWT: access 15 daq / refresh 30 kun, rotation + blacklist, httpOnly cookie;
      parol almashtirilsa eski tokenlar darhol bekor bo'ladi
- [x] CSRF himoyasi (`X-Requested-With` header), login uchun akkaunt bo'yicha bloklash (10 xato → 15 daq),
      register/login/parol uchun rate limit
- [x] register / login / refresh / logout / me — xatolar bir xil formatda `{detail, code, errors}`
- [x] Profil: `PATCH /api/users/me/` (ism, bio, username, avatar → 512×512 WebP, EXIF/GPS o'chiriladi), parol almashtirish
      (boshqa qurilmalardan chiqariladi)
- [x] Foydalanuvchi qidirish (username / ism, bir nechta so'z, aniq moslik birinchi)
- [x] Avatar fayllarini xavfsiz berish (`/media/avatars/`, boshqa media papkalar yopiq)
- [x] Testlar: 40 ta, hammasi o'tadi (keyinroq: boshlash ekrani va akkaunt o'chirish testlari qo'shildi)

### ✅ 2-bosqich: Chats + Messages (backend REST)
- [x] `chats`: Chat + ChatMember, juftlik uchun bitta chat (bir vaqtda ochilsa ham)
- [x] `messaging`: Message (TEXT/IMAGE/VIDEO/AUDIO/FILE), indekslar (o'qilmaganlar uchun qisman indeks)
- [x] Chatlar ro'yxati: suhbatdosh, oxirgi xabar, o'qilmaganlar soni — chatlar soni qancha bo'lmasin 4 ta so'rov
- [x] Chat ochish/yaratish (idempotent)
- [x] Xabarlar tarixi: `?before=` (eskilari), `?after=` (uzilishdan keyin yangilarini olish)
- [x] Xabar yuborish: matn + fayllar, reply, `client_id` bilan dublikatsiz qayta yuborish
  - rasm → max 2048px WebP, EXIF/GPS o'chiriladi, animatsiyali GIF saqlanadi, xira preview
  - video/audio → formati faylning birinchi baytlaridan aniqlanadi; video poster (thumbnail)
  - fayl → xavfsiz nom, diskda tasodifiy nom; har tur uchun hajm limiti, juda katta so'rov darhol 413
- [x] O'qildi belgisi (`up_to` gacha), xabarni o'chirish (faqat yuboruvchi, fayllari ham o'chadi)
- [x] Himoyalangan fayl berish: faqat a'zolarga, Range (206), ETag/304, HEAD, ASGI'da xotirani to'ldirmasdan stream;
      `chat_media` cookie — access token eskirsa ham rasm/video yuklanaveradi
- [x] Testlar: jami 82 ta, hammasi o'tadi + jonli server sinovi

### ✅ 3-bosqich: Real-time (Channels)
- [x] WebSocket autentifikatsiyasi (access cookie yoki `Bearer` header); token eskirsa — `4401` kod bilan
      yopiladi, ilova tokenni yangilab qayta ulanadi
- [x] Har foydalanuvchiga bitta `user.<id>` guruh (barcha tab/qurilmalar)
- [x] Hodisalar: message.created / deleted, messages.read, typing (+ recording), presence, user.updated
- [x] Bazaga yozilgandan keyin broadcast (`transaction.on_commit`)
- [x] Online / last seen: bir nechta tabda to'g'ri; 8 soniyalik "grace" (qayta yuklashda miltillamaydi);
      server o'chib qolsa ham "abadiy online" bo'lib qolmaydi (heartbeat + 90 s oyna)
- [x] Heartbeat (ping/pong), typing'ga server tomonda ham limit
- [x] Testlar: jami 92 ta (10 tasi haqiqiy WebSocket ulanishlari bilan) + Node.js bilan jonli sinov

### ✅ 4-bosqich: Frontend poydevor
- [x] Dizayn tizimi: CSS o'zgaruvchilar (light/dark, tizim sozlamasi bo'yicha ham), tizim shrifti
      (iPhone'da SF Pro), safe-area, mavzu sahifa chizilishidan oldin qo'yiladi (miltillamaydi)
- [x] `next.config.ts`: `/api`, `/media`, `/ws`, `/admin` → Django; trailing slash saqlanadi;
      katta yuklamalar uchun body limiti 130 MB va timeout 10 daqiqa (jonli tekshirildi: 15 MB, WebSocket)
- [x] API client: cookie bilan, 401 → refresh → qayta urinish (bir nechta tabda refresh bitta — Web Locks),
      xatolar bir xil formatda
- [x] `proxy.ts`: kirmaganlar boshlash ekraniga `/?next=...`, kirganlar `/` dan `/chat` ga (faqat sahifalar)
- [x] ~~Login va Register~~ → **Boshlash ekrani** (sizning so'rovingiz bo'yicha): 12 ta avatardan birini tanlash +
      ism → "Start chatting". Parol yo'q, akkaunt shu qurilmada saqlanadi; xatoda "silkinish",
      "Dynamic Island" uslubidagi bildirishnomalar
- [x] Bo'sh chatlar ro'yxatida "People" — boshqa odamlar ism/avatar bilan, "Start chat" tugmasi
      (2 kishi uchun: ikkinchisi birinchisini darhol ko'radi); hech kim bo'lmasa — saytga havolani nusxalash
- [x] Auth holati (zustand), sessiya tugasa avtomatik boshlash ekraniga, logout (to'liq tozalash bilan)
- [x] Tekshiruv: `tsc`, `eslint`, `next build` toza; Chrome'da telefon o'lchamida to'liq oqim sinovi

### ✅ 5-bosqich: Chat UI
- [x] Telefon: ro'yxat ⇄ chat ekranlari (iOS'dagidek slide, chap chetdan surib orqaga qaytish,
      telefonning "orqaga" tugmasi ham ishlaydi); kompyuter: 2 ustun
- [x] Chatlar ro'yxati (katta sarlavha, tartib o'zgarishi animatsiyali), odam qidirish, yangi chat boshlash
- [x] ChatHeader (suzuvchi pill), MessageList (sana ajratgich, yuqoriga surganda eski xabarlar, "↓" tugma + sanoq)
- [x] MessageItem: bubble'lar guruhlanadi, vaqt, ✓/✓✓, reply iqtibosi (bosilsa o'sha xabarga o'tadi),
      havolalar bosiladi, faqat emoji'li xabar katta ko'rinadi
- [x] MessageInput: `📎 | Message... | 😊 | 🎤/➤` (🎤 ⇄ ➤ animatsiyali), har chat uchun qoralama saqlanadi
- [x] Xabar amallari: reply (chapga surish / ikki marta bosish), nusxalash, o'chirish (tasdiqlash bilan)
- [x] Klaviatura chiqqanda input ko'rinib turadi (visualViewport), safe-area
- [x] Tekshiruv: telefon + kompyuter brauzerida 10 qadamli ssenariy, light/dark

### ✅ 6-bosqich: Real-time frontend
- [x] WebSocket client: auto-reconnect (backoff + jitter), heartbeat (javob kelmasa — qayta ulanish),
      ilova fonidan qaytganda yoki internet qaytganda darhol ulanish, "Connecting…" / "Waiting for network…"
- [x] Jonli xabarlar (ro'yxatda ham, ochiq chatda ham), o'qilmaganlar soni
- [x] "typing…" / "recording voice…" indikatori (header, ro'yxat va chat ichida)
- [x] Online / "last seen ..." (avtomatik yangilanadi)
- [x] Optimistic yuborish; internet yo'qligida yozilgan xabar ulanish qaytgach o'zi qayta yuboriladi (dublikatsiz)
- [x] Uzilishdan keyin o'tkazib yuborilgan xabarlar avtomatik olinadi; token eskirsa ham real-time uzilmaydi
- [x] ✓✓ o'qildi — real-time (topilgan poyga holati tuzatildi: ✓✓ hech qachon ✓ ga qaytmaydi)
- [x] Tekshiruv: ikki brauzerda 14 ta jonli tekshiruv, hammasi o'tdi

### ✅ 7-bosqich: Media
- [x] Rasm/video: yuborishdan oldin ko'rish ekrani (caption bilan), yuklash progressi (aylana) va bekor qilish,
      video posteri telefonning o'zida kesib olinadi; rasm chiqqunicha xira preview
- [x] Fayl yuborish (📎 → File), drag & drop, paste (Ctrl+V), har tur uchun hajm limiti oldindan tekshiriladi
- [x] VoiceRecorder: yozish, jonli to'lqin, taymer, bekor qilish; suhbatdoshda "recording voice…"
- [x] Ovozli xabar pleyeri (to'lqin, bosib o'tkazish, 1×/1.5×/2×, bir vaqtda bittasi), video pleyer
- [x] Media viewer: rasm pufakchadan kattalashib ochiladi, pastga surib / Esc bilan yopiladi, yuklab olish
- [x] Emoji panel (8 bo'lim + oxirgi ishlatilganlar)
- [x] Tekshiruv: brauzerda 9 ta media tekshiruvi (mikrofon simulyatsiyasi bilan) — hammasi o'tdi;
      topilgan xato tuzatildi: tugma ichida tugma (yuklash halqasi)

### ✅ 8-bosqich: Profil
- [x] Chatlar ro'yxatida chap tepada **o'z avataringiz ✏️ belgisi va ismingiz** — bosilsa profil ochiladi
- [x] Profil sahifasi: ism, username (band bo'lsa ogohlantiradi), "About" (bio); o'zgarish bo'lmasa "Save" o'chiq;
      yangi ism/avatar suhbatdoshda **darhol** (real-time) yangilanadi
- [x] Avatar: 12 ta tayyor avatardan tanlash, o'z rasmingizni yuklash yoki olib tashlash
- [x] ~~Parol almashtirish~~ — kerak emas: kirish parolsiz (boshlash ekrani orqali)
- [x] Mavzu: light / dark / system (qayta yuklashda saqlanadi)
- [x] Akkauntdan chiqish (tasdiqlash oynasi bilan), suhbatdosh profilini ko'rish (chat headeridan)
- [x] **Akkauntni butunlay o'chirish** (sizning so'rovingiz bo'yicha): "DELETE" deb yozib tasdiqlanadi;
      profil, avatar, barcha chatlar, xabarlar va fayllar ikkala tomonda o'chadi; suhbatdoshda chat darhol
      yo'qoladi ("… deleted their account"), shu akkauntning boshqa qurilmalari boshlash ekraniga qaytadi
- [x] Tekshiruv: profil — 13 ta, akkaunt o'chirish — 13 ta brauzer tekshiruvi + 7 ta backend testi, hammasi o'tdi

### ✅ 9-bosqich: Production
- [x] Bo'sh holatlar va skeleton loading (avvalgi bosqichlarda), xato sahifalari: `error.tsx`
      ("Try again"), `global-error.tsx`, o'z dizayni bilan 404 sahifa
- [x] Telefon o'lchamida sinov (Chrome'da iPhone emulyatsiyasi, safe-area, klaviatura) — har bosqichda;
      haqiqiy iPhone / Android'da sinash — siz tomondan (README'da qanday qilish yozilgan)
- [x] Telefonda HTTPS: `npm run dev:https` (mikrofon uchun shart) — README'da yo'riqnoma
- [x] PWA: manifest, ikonkalar (192/512, maskable, Apple), favicon — bosh ekranga qo'shsa to'liq ekranda ochiladi
- [x] Xavfsizlik ko'rigi: sahifalarga CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
      (faqat mikrofon); yuklangan fayllar `nosniff` + sandbox CSP bilan (HTML/SVG fayl ishga tushmaydi);
      cookie'lar httpOnly; rate limit; production'da CSP buzilishlari yo'qligi tekshirildi
- [x] `npm run build`, `lint`, `typecheck`, backend testlar (108 ta) — hammasi yashil
- [x] Yakuniy README: ishga tushirish, telefonda ochish, HTTPS, PostgreSQL + Redis, nginx bilan deploy namunasi
- [x] Sana va vaqt hamma joyda inglizcha (interfeys tili bilan bir xil), 24 soatlik format

---

## 9. Tuzoqlar (e'tibor berish kerak)

1. **`proxy.ts` faqat sahifalar uchun.** U so'rovda ishlasa, Next.js body'ni 10MB gacha xotirada
   saqlaydi va qolganini **jimgina kesib tashlaydi** — video yuklash buziladi.
2. Next.js rewrite proxy HTTP uchun 30s timeout — katta video uchun oshiriladi (`experimental.proxyTimeout`).
3. Next.js proxy `/api` so'rovlariga mijozning haqiqiy IP'sini qo'shmaydi — production'da oldiga nginx qo'yiladi.
4. Telefonda mikrofon (ovozli xabar) **faqat HTTPS**da ishlaydi (localhost'da ham ishlaydi).
5. Xotiradagi channel layer bitta jarayonda ishlaydi — production'da Redis majburiy.
6. Custom `User` modeli birinchi `migrate` dan oldin bo'lishi shart (Django qoidasi).
7. `cacheComponents` yoqilgan: dinamik qismlar `<Suspense>` ichida; Next.js sahifalarni yashirin saqlaydi
   (Activity) — logout'da to'liq sahifa qayta yuklanadi.
