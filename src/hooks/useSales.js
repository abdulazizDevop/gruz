import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useSales = (enabled = true) => {
  const [salesHistory, setSalesHistory] = useState([]);

  useEffect(() => {
    if (!enabled) {
      setSalesHistory([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'sales'),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        // Coerce to string defensively — a legacy sales doc with a
        // Firestore Timestamp or a number in shippedAt used to make
        // localeCompare throw INSIDE the snapshot callback, which
        // silently killed the whole subscription and left Архив
        // stuck on the empty state forever ("висит" as the manager
        // reported).
        list.sort((a, b) =>
          String(b.shippedAt || '').localeCompare(String(a.shippedAt || '')),
        );
        setSalesHistory(list);
      },
      (err) => {
        console.warn('[useSales] snapshot error:', err);
        // Never leave the caller staring at an empty page with no
        // signal. Keep whatever we had; if we had nothing, the empty
        // state message will render, which is at least honest.
      },
    );
    return unsub;
  }, [enabled]);

  return salesHistory;
};
