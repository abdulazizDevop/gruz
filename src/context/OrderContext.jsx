import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs,
  writeBatch,
  runTransaction,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { showBrowserNotification } from '../lib/notifications';

const OrderContext = createContext();

export const useOrders = () => useContext(OrderContext);

const DEFAULT_INVENTORY = [
  { id: 'p1', name: 'Дверь Стандарт', qty: 100, price: 15000 },
  { id: 'p2', name: 'Дверь Люкс', qty: 50, price: 25000 },
  { id: 'p3', name: 'Замок Мастер', qty: 200, price: 2000 },
];

const DEFAULT_WHOLESALERS = [
  { id: 'w1', name: 'Андрей', phone: '+79001234567', info: 'Постоянный клиент' },
  { id: 'w2', name: 'Магомед', phone: '+79007654321', info: 'Оптовик 10%' },
];

const seedIfEmpty = async (collName, defaults) => {
  const snap = await getDocs(collection(db, collName));
  if (!snap.empty) return;
  const batch = writeBatch(db);
  defaults.forEach(item => {
    batch.set(doc(db, collName, item.id), item);
  });
  await batch.commit();
};

const ensureMeta = async () => {
  const counterRef = doc(db, 'meta', 'counter');
  const counterSnap = await getDoc(counterRef);
  if (!counterSnap.exists()) {
    await setDoc(counterRef, { nextOrderNumber: 370 });
  }
  const backupRef = doc(db, 'meta', 'backup');
  const backupSnap = await getDoc(backupRef);
  if (!backupSnap.exists()) {
    await setDoc(backupRef, { intervalDays: 1, lastBackup: null });
  }
};

export const OrderProvider = ({ children }) => {
  const { currentUser } = useAuth();

  const [orders, setOrders] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [wholesalers, setWholesalers] = useState([]);
  const [nextOrderNumber, setNextOrderNumber] = useState(370);
  const [backupConfig, setBackupConfigState] = useState({ intervalDays: 1, lastBackup: null });

  const [notifications, setNotifications] = useState([]);

  const prevOrderStatusRef = useRef(new Map());
  const firstOrderLoadRef = useRef(true);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const addNotification = useCallback((notif) => {
    setNotifications(prev => [...prev, notif]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }, 6000);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          seedIfEmpty('inventory', DEFAULT_INVENTORY),
          seedIfEmpty('wholesalers', DEFAULT_WHOLESALERS),
          ensureMeta(),
        ]);
      } catch (err) {
        console.error('Seed/meta init failed', err);
      }
    })();

    const unsubs = [];

    unsubs.push(onSnapshot(collection(db, 'orders'), snap => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      const prev = prevOrderStatusRef.current;
      const next = new Map();
      list.forEach(o => next.set(o.id, o.status));

      if (!firstOrderLoadRef.current) {
        list.forEach(o => {
          const prevStatus = prev.get(o.id);
          if (prevStatus && prevStatus !== o.status && o.status === '✅ Сделано') {
            handleReadyTransition(o);
          }
        });
      }
      firstOrderLoadRef.current = false;
      prevOrderStatusRef.current = next;

      setOrders(list);
    }));

    unsubs.push(onSnapshot(collection(db, 'sales'), snap => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      list.sort((a, b) => (b.shippedAt || '').localeCompare(a.shippedAt || ''));
      setSalesHistory(list);
    }));

    unsubs.push(onSnapshot(collection(db, 'inventory'), snap => {
      setInventory(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }));

    unsubs.push(onSnapshot(collection(db, 'wholesalers'), snap => {
      setWholesalers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }));

    unsubs.push(onSnapshot(doc(db, 'meta', 'counter'), snap => {
      if (snap.exists()) setNextOrderNumber(snap.data().nextOrderNumber || 370);
    }));

    unsubs.push(onSnapshot(doc(db, 'meta', 'backup'), snap => {
      if (snap.exists()) setBackupConfigState(snap.data());
    }));

    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReadyTransition = (order) => {
    const user = currentUserRef.current;
    if (!user) return;
    const isAdminRole = user.role === 'admin' || user.role === 'superadmin';
    if (!isAdminRole) return;
    const isOwnOrder = user.role === 'superadmin' || order.adminId === user.id;
    if (!isOwnOrder) return;

    const title = `Заказ #${order.code} готов!`;
    const who = order.assemblerName ? order.assemblerName : 'Мастер';
    const message = `${who} завершил работу над заказом.`;

    addNotification({
      id: Date.now() + Math.random(),
      title,
      message,
      targetAdminId: order.adminId,
      type: 'success',
    });

    showBrowserNotification(title, {
      body: message,
      tag: `order-${order.id}`,
      requireInteraction: false,
    });
  };

  const createOrder = async (orderData) => {
    if (!currentUser) throw new Error('Not logged in');
    const id = Date.now().toString();

    const counterRef = doc(db, 'meta', 'counter');
    const orderCode = await runTransaction(db, async tx => {
      const snap = await tx.get(counterRef);
      const current = snap.exists() ? snap.data().nextOrderNumber || 370 : 370;
      tx.set(counterRef, { nextOrderNumber: current + 1 }, { merge: true });
      return current;
    });

    const newOrder = {
      ...orderData,
      id,
      code: orderCode,
      status: orderData.isUrgent ? '🚨 Срочное' : '💭 В процессе',
      createdAt: new Date().toISOString(),
      adminId: currentUser.id,
      adminName: currentUser.name,
      responseRoom: [],
    };

    await setDoc(doc(db, 'orders', id), newOrder);
    await deductFromInventory(orderData.items || []);

    return newOrder;
  };

  const deductFromInventory = async (items) => {
    const batch = writeBatch(db);
    for (const orderItem of items) {
      const invItem = inventory.find(i => i.id === orderItem.id);
      if (invItem) {
        const newQty = Math.max(0, (invItem.qty || 0) - (orderItem.qty || 0));
        batch.update(doc(db, 'inventory', invItem.id), { qty: newQty });
      }
    }
    await batch.commit();
  };

  const updateOrderStatus = async (orderId, newStatus, userId, userName) => {
    const patch = { status: newStatus };
    if (newStatus === '✅ Сделано') {
      patch.assemblerId = userId || null;
      patch.assemblerName = userName || null;
      patch.readyAt = new Date().toISOString();
    }
    await updateDoc(doc(db, 'orders', orderId), patch);
  };

  const updateOrder = async (orderId, patch) => {
    const immutable = ['id', 'code', 'createdAt', 'adminId', 'adminName', 'status', 'responseRoom', 'assemblerId', 'assemblerName', 'readyAt'];
    const safe = { ...patch };
    immutable.forEach(k => delete safe[k]);
    safe.updatedAt = new Date().toISOString();
    await updateDoc(doc(db, 'orders', orderId), safe);
  };

  const addResponse = async (orderId, message, userId, userName, extra = {}) => {
    await updateDoc(doc(db, 'orders', orderId), {
      responseRoom: arrayUnion({
        userId,
        userName,
        message,
        image: extra.image || null,
        type: extra.type || 'message',
        timestamp: new Date().toISOString(),
      }),
    });
  };

  const markShipped = async (orderId) => {
    const orderToShip = orders.find(o => o.id === orderId);
    if (orderToShip) {
      const saleRecord = {
        id: orderToShip.id,
        code: orderToShip.code,
        createdAt: orderToShip.createdAt || null,
        shippedAt: new Date().toISOString(),
        // Client snapshot
        client: orderToShip.client || null,
        clientName: orderToShip.client?.name || '',
        clientPhone: orderToShip.client?.phone || '',
        clientAddress: orderToShip.client?.address || '',
        // Door specs
        model: orderToShip.model || '',
        size: orderToShip.size || '',
        canvas: orderToShip.canvas || '',
        color: orderToShip.color || '',
        casing: orderToShip.casing || '',
        glass: orderToShip.glass || '',
        grille: orderToShip.grille || '',
        hardware: orderToShip.hardware || '',
        threshold: orderToShip.threshold || '',
        crown: orderToShip.crown || '',
        panelOuter: orderToShip.panelOuter || '',
        panelInner: orderToShip.panelInner || '',
        transom: orderToShip.transom || '',
        note: orderToShip.note || '',
        // Payment
        price: orderToShip.price || orderToShip.total || 0,
        advance: orderToShip.advance || 0,
        total: orderToShip.price || orderToShip.total || 0,
        // Team
        adminId: orderToShip.adminId || null,
        adminName: orderToShip.adminName || '',
        assemblerId: orderToShip.assemblerId || null,
        assemblerName: orderToShip.assemblerName || '',
        // Extras
        wholesaler: orderToShip.wholesaler || null,
        photos: orderToShip.photos || [],
        responseRoom: orderToShip.responseRoom || [],
        items: (orderToShip.items || []).map(i => ({
          name: i.name,
          qty: i.qty,
          price: i.price,
        })),
      };
      await setDoc(doc(db, 'sales', orderToShip.id), saleRecord);
    }
    await deleteDoc(doc(db, 'orders', orderId));
  };

  const addInventoryItem = async (item) => {
    const id = Date.now().toString();
    await setDoc(doc(db, 'inventory', id), { ...item, id });
  };

  const updateInventoryItem = async (id, updates) => {
    await updateDoc(doc(db, 'inventory', id), updates);
  };

  const deleteInventoryItem = async (id) => {
    await deleteDoc(doc(db, 'inventory', id));
  };

  const addWholesaler = async (wholesaler) => {
    const id = Date.now().toString();
    await setDoc(doc(db, 'wholesalers', id), { ...wholesaler, id });
  };

  const updateWholesaler = async (id, updates) => {
    await updateDoc(doc(db, 'wholesalers', id), updates);
  };

  const deleteWholesaler = async (id) => {
    await deleteDoc(doc(db, 'wholesalers', id));
  };

  const setBackupConfig = async (updates) => {
    const next = typeof updates === 'function' ? updates(backupConfig) : updates;
    await setDoc(doc(db, 'meta', 'backup'), next, { merge: true });
  };

  const setNextOrderNumberValue = async (value) => {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) throw new Error('INVALID_NUMBER');
    await setDoc(doc(db, 'meta', 'counter'), { nextOrderNumber: n }, { merge: true });
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        salesHistory,
        inventory,
        wholesalers,
        notifications,
        nextOrderNumber,
        createOrder,
        updateOrder,
        updateOrderStatus,
        addResponse,
        markShipped,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        addWholesaler,
        updateWholesaler,
        deleteWholesaler,
        setBackupConfig,
        backupConfig,
        setNextOrderNumberValue,
        addNotification,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};
