# Ubuntu Server Deploy Guide

**IP:** `72.56.39.78`
**URL (HTTPS):** `https://72-56-39-78.sslip.io`

## 1. SSH orqali serverga kirish

```bash
ssh root@72.56.39.78
```

## 2. Docker + Docker Compose o'rnatish (bir martagina)

```bash
# Docker rasmiy script
curl -fsSL https://get.docker.com | sh

# Docker Compose plugin
apt update
apt install -y docker-compose-plugin git

# Tekshirish
docker --version
docker compose version
```

## 3. Portlarni ochish

```bash
# UFW firewall faolmi tekshir
ufw status

# Agar faol bo'lsa, portlarni och
ufw allow 22/tcp       # SSH
ufw allow 80/tcp       # HTTP (Let's Encrypt uchun zarur)
ufw allow 443/tcp      # HTTPS
ufw reload
```

> ⚠️ **Muhim:** Port 80 ochiq bo'lishi shart — Caddy Let's Encrypt sertifikatini olish uchun shu port orqali validatsiya qiladi.

## 4. Loyihani klonlash

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/abdulazizDevop/gruz.git doorman
cd doorman
```

## 5. Build va ishga tushirish

```bash
docker compose up -d --build
```

Birinchi martada 2-5 daqiqa ketadi — image yasaladi va Caddy avtomatik SSL sertifikat oladi.

## 6. Logni ko'rish

```bash
# Jonli log
docker compose logs -f

# SSL sertifikat olinganini tekshirish
docker compose logs app | grep -i "certificate"
```

## 7. Ochish

Brauzerda: **https://72-56-39-78.sslip.io**

SSL avtomatik yashil qulf ko'rsatishi kerak. Agar "not secure" chiqsa, 1-2 daqiqa kutib qayta yangila — Caddy sertifikat olishi bilan avtomatik ulanadi.

---

## Push уведомления (FCM) — bir marta sozlash

Push uveldomlenielar (Готово / Отгрузить bosilganda telefonga chiqadi) ishlashi uchun **service account key** kerak. Bepul plan, oyiga 0$.

### 1. Firebase Console'da service account yaratish

1. https://console.firebase.google.com/project/gruz-azhab/settings/serviceaccounts/adminsdk oching
2. **"Generate new private key"** bosing → JSON fayl yuklanadi (masalan `gruz-azhab-firebase-adminsdk-xxxxx.json`)
3. Bu faylni **hech qayerda commit qilmang** — sirli kalit

### 2. JSON'ni base64 ga o'girib serverga qo'yish

Local (Mac/Linux) da:

```bash
base64 -w0 gruz-azhab-firebase-adminsdk-xxxxx.json
# Chiqqan uzun stringni copy qiling
```

Serverga SSH bilan kirib `.env` fayl yarating:

```bash
cd /opt/doorman
cat > .env << 'EOF'
FIREBASE_SERVICE_ACCOUNT=<base64-string-here>
EOF
chmod 600 .env
```

### 3. Qayta build va tekshirish

```bash
docker compose up -d --build

# Push tayyorligini tekshirish
curl -s https://72-56-39-78.sslip.io/api/health
# → {"ok":true,"service":"uploads","pushReady":true}
```

`pushReady: true` bo'lsa — hammasi joyida. `false` bo'lsa — `.env` faylini tekshirish yoki logni ko'rish: `docker compose logs uploads | grep push`

### 4. Foydalanuvchilar tomonidan

- Har bir foydalanuvchi (Asxab + adminlar) brauzerda ilovaga kirsin
- Brauzer "Разрешить уведомления?" so'rasa — **Разрешить** bosishlar
- Endi Готово yoki Отгрузить bosilganda avtomatik push keladi
- iOS'da PWA sifatida o'rnatilgan bo'lsa (Add to Home Screen) → yopiq holatda ham keladi

---

## Yangilanishlar (kelajakda)

Har safar yangi o'zgarish bo'lsa:

```bash
cd /opt/doorman
git pull
docker compose up -d --build
```

## Foydali komandalar

```bash
# To'xtatish
docker compose down

# Qayta ishga tushirish
docker compose restart

# Image va container'larni tozalash (diskni bo'shatish)
docker system prune -af

# Status
docker compose ps
```

## Muammolarni bartaraf etish

**Sertifikat olinmayapti?**
- Port 80 ochiqmi? `ufw status`
- DNS `72-56-39-78.sslip.io` IP'ga ishora qilyaptimi? `dig +short 72-56-39-78.sslip.io` → `72.56.39.78` bo'lishi kerak
- Caddy logi: `docker compose logs app | tail -50`

**Sayt ochilmayapti?**
- Container ishlayaptimi? `docker compose ps`
- 80/443 portlar band emasmi? `ss -tlnp | grep -E ':80|:443'`

**Firestore ishlamayapti?**
- Firebase Console'da Firestore rules test mode'da ekanligini tekshir
- Brauzer console'da xato borligini ko'r (F12 → Console)
