const UPLOAD_ENDPOINT = '/api/upload';

// Фото с телефона — 4–6 МБ. На мобильном интернете такое грузится 30–60 с,
// индикатора не было, и админ жал «Добавить» снова и снова: на сервере
// лежат четыре копии одного файла по 5,7 МБ, а в заказе — ни одной. Для
// карточки заказа хватает 1600 px по длинной стороне: это ~300 КБ, в
// 15–20 раз меньше и быстрее.
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.82;

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadBitmap = async (file) => {
  if (typeof createImageBitmap === 'function') {
    // imageOrientation: 'from-image' — иначе снятое вертикально фото
    // после перерисовки на canvas ляжет на бок.
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Старый Safari не знает опций — пробуем без них ниже через <img>.
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('IMAGE_DECODE_FAILED'));
    };
    img.src = url;
  });
};

// Похоже ли это на картинку. Часть Android-камер отдаёт файл без типа
// (type === ''), судить приходится по расширению — иначе фото с такой
// камеры вообще не пыталось бы сжаться и уходило как есть.
const looksLikeImage = (file) =>
  (file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(file.name || '');

// Уменьшает картинку до MAX_SIDE и пересохраняет в JPEG. Если что-то пошло
// не так (не картинка, браузер не смог декодировать, canvas недоступен) —
// возвращает исходный файл: лучше медленно, чем никак. GIF не трогаем,
// чтобы не потерять анимацию.
export const compressImage = async (file) => {
  if (!file || !looksLikeImage(file) || file.type === 'image/gif') return file;
  try {
    const bitmap = await loadBitmap(file);
    const width = bitmap.naturalWidth || bitmap.width;
    const height = bitmap.naturalHeight || bitmap.height;
    if (!width || !height) return file;
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    // Уже маленькая и уже JPEG — пересжимать нечего.
    if (scale === 1 && file.type === 'image/jpeg' && file.size < 600 * 1024) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (typeof bitmap.close === 'function') bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    // Пустой blob — canvas не справился (так бывает на iPhone с очень большим
    // снимком); отправляем оригинал, сервер примет до 25 МБ.
    if (!blob || blob.size === 0) return file;
    if (blob.size >= file.size && file.type === 'image/jpeg') return file;
    const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (err) {
    console.warn('[compressImage] оставляем оригинал:', err?.message || err);
    return file;
  }
};

// Человеческое объяснение ошибки загрузки — для alert'ов в формах. Коды
// приходят от upload-service (server.js); всё остальное — сеть.
export const describeUploadError = (err) => {
  const code = String(err?.message || err || '');
  if (code === 'FILE_TOO_LARGE' || code === 'HTTP_413') return 'файл слишком большой (больше 25 МБ)';
  if (code === 'INVALID_TYPE' || code === 'HTTP_415') return 'такой формат файла не поддерживается — нужна фотография (JPG, PNG, HEIC)';
  if (code === 'ORIGIN_NOT_ALLOWED' || code === 'HTTP_403') return 'приложение открыто по неправильному адресу — откройте 72-56-39-78.sslip.io';
  if (code === 'RATE_LIMITED' || code === 'HTTP_429') return 'слишком много загрузок подряд, подождите минуту';
  if (code === 'HTTP_502' || code === 'HTTP_503' || code === 'HTTP_504') return 'сервер загрузки не отвечает';
  if (/^HTTP_\d+$/.test(code)) return `сервер ответил ошибкой ${code.slice(5)}`;
  if (code === 'NO_FILE') return 'файл не выбран';
  return 'нет связи с сервером — проверьте интернет';
};

export const uploadImage = async (file) => {
  if (!file) throw new Error('NO_FILE');

  const prepared = await compressImage(file);
  try {
    const form = new FormData();
    form.append('file', prepared, prepared.name || 'photo.jpg');
    const res = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: form });

    if (res.ok) {
      const data = await res.json();
      if (data?.url) return data.url;
      throw new Error('NO_URL_IN_RESPONSE');
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP_${res.status}`);
  } catch (networkErr) {
    // Раньше любой сбой молча превращался в base64 всего файла. В деве это
    // удобно (сервиса загрузки нет), а в проде фото на 5 МБ становилось
    // строкой на 7 МБ внутри документа Firestore с лимитом 1 МБ — и заказ
    // не сохранялся вовсе. В проде сбой должен быть виден как сбой.
    console.error('[uploadImage]', networkErr?.message || networkErr, {
      name: file.name, type: file.type || '-', size: file.size, sent: prepared.size,
    });
    if (import.meta.env.DEV) {
      console.warn('[uploadImage] Fallback to base64:', networkErr.message);
      return fileToBase64(prepared);
    }
    throw networkErr;
  }
};

export const uploadImages = async (files) => {
  const results = [];
  for (const file of files) {
    try {
      results.push(await uploadImage(file));
    } catch (err) {
      console.error('[uploadImages] Skipping file:', err);
    }
  }
  return results;
};

export const isRemoteUrl = (src) =>
  typeof src === 'string' && (src.startsWith('/uploads/') || src.startsWith('http'));
