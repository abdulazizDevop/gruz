const UPLOAD_ENDPOINT = '/api/upload';

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const uploadImage = async (file) => {
  if (!file) throw new Error('NO_FILE');

  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: form });

    if (res.ok) {
      const data = await res.json();
      if (data?.url) return data.url;
      throw new Error('NO_URL_IN_RESPONSE');
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP_${res.status}`);
  } catch (networkErr) {
    console.warn('[uploadImage] Fallback to base64:', networkErr.message);
    return fileToBase64(file);
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
