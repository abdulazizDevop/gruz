// Order deadline helpers.
//
// The deadline is stored on the order as `deadlineDays` — an integer count
// of days the assembler was given at creation time. Everything else is
// derived from `createdAt + deadlineDays` at read time so there's no daily
// job that needs to run and no separate "days remaining" field to keep in
// sync in Firestore.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (d) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

// Returns integer days remaining until the deadline. Negative when overdue,
// 0 on the day the deadline is reached. Returns null when the order has no
// deadline (older orders created before this feature landed).
export const daysLeftFor = (order, now = new Date()) => {
  if (!order?.createdAt || !order?.deadlineDays) return null;
  const created = startOfDay(new Date(order.createdAt));
  const today = startOfDay(now);
  const deadline = new Date(created.getTime() + order.deadlineDays * MS_PER_DAY);
  const diffDays = Math.round((deadline.getTime() - today.getTime()) / MS_PER_DAY);
  return diffDays;
};

// Russian pluralisation for "день / дня / дней".
const russianDayWord = (n) => {
  const abs = Math.abs(Math.trunc(n));
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
};

// UI text for the countdown badge. Matches client's spec:
//   > 0  → "Осталось: N дней"
//   = 0  → "Осталось: 0 дней"
//   < 0  → "Просрочено: -N дней"  (no emoji, minus sign preserved)
export const deadlineLabel = (daysLeft) => {
  if (daysLeft === null || daysLeft === undefined) return null;
  if (daysLeft >= 0) {
    return `Осталось: ${daysLeft} ${russianDayWord(daysLeft)}`;
  }
  const overdue = Math.abs(daysLeft);
  return `Просрочено: -${overdue} ${russianDayWord(overdue)}`;
};

// Visual severity: 'normal' > 5 days, 'warning' 1–5 days, 'urgent' 0,
// 'overdue' negative. Consumers map to their own colour classes.
export const deadlineSeverity = (daysLeft) => {
  if (daysLeft === null || daysLeft === undefined) return 'none';
  if (daysLeft < 0) return 'overdue';
  if (daysLeft === 0) return 'urgent';
  if (daysLeft <= 5) return 'warning';
  return 'normal';
};

// Filter used by the Urgent section: only orders that have hit or passed
// their deadline AND haven't been marked done yet. Once a worker marks the
// order ✅ Сделано it's out of the Заказы list anyway and out of Urgent.
export const isDeadlineHit = (order, now = new Date()) => {
  if (order?.status?.includes('✅')) return false;
  const left = daysLeftFor(order, now);
  return left !== null && left <= 0;
};
