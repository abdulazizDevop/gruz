export const formatPhone = (input) => {
  if (!input) return '';
  let digits = String(input).replace(/\D/g, '');
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);

  const d = digits.slice(1);
  let out = '+7';
  if (d.length > 0) out += ' (' + d.slice(0, 3);
  if (d.length >= 3) out += ')';
  if (d.length >= 3) out += ' ' + d.slice(3, 6);
  if (d.length >= 6) out += '-' + d.slice(6, 8);
  if (d.length >= 8) out += '-' + d.slice(8, 10);
  return out;
};

export const isValidPhone = (phone) => {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 11;
};

export const formatMoneyInput = (input) => {
  if (input === '' || input === null || input === undefined) return '';
  const digits = String(input).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

export const parseMoneyInput = (input) => {
  const digits = String(input || '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

export const required = (value, label = 'Поле') => {
  if (value === undefined || value === null) return `${label} обязательно`;
  if (typeof value === 'string' && !value.trim()) return `${label} обязательно`;
  return null;
};

export const minLength = (value, min, label = 'Поле') => {
  if (!value || String(value).trim().length < min) {
    return `${label}: минимум ${min} симв.`;
  }
  return null;
};

export const nonNegativeNumber = (value, label = 'Значение') => {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return `${label}: введите число ≥ 0`;
  return null;
};

export const positiveInteger = (value, label = 'Количество') => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return `${label}: введите целое число ≥ 0`;
  return null;
};
