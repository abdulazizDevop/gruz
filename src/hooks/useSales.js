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
    const unsub = onSnapshot(collection(db, 'sales'), (snap) => {
      const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      list.sort((a, b) => (b.shippedAt || '').localeCompare(a.shippedAt || ''));
      setSalesHistory(list);
    });
    return unsub;
  }, [enabled]);

  return salesHistory;
};
