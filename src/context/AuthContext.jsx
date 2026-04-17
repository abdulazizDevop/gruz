import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const DEFAULT_USERS = [
  { id: '1', name: 'Асхаб', password: '5055', role: 'superadmin' },
  { id: '2', name: 'Админ 1', password: '123', role: 'admin' },
  { id: '3', name: 'Сборщик 1', password: '123', role: 'assembler' },
  { id: '4', name: 'Склад 1', password: '123', role: 'warehouse' },
];

const seedIfEmpty = async () => {
  const snap = await getDocs(collection(db, 'users'));
  if (!snap.empty) return;
  const batch = writeBatch(db);
  DEFAULT_USERS.forEach(u => {
    batch.set(doc(db, 'users', u.id), u);
  });
  await batch.commit();
};

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('doorman_currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    seedIfEmpty().catch(err => console.error('Seed failed', err));
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setUsers(list);
      setLoaded(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('doorman_currentUser', JSON.stringify(currentUser));
      const fresh = users.find(u => u.id === currentUser.id);
      if (fresh && (fresh.name !== currentUser.name || fresh.password !== currentUser.password || fresh.role !== currentUser.role)) {
        setCurrentUser(fresh);
      }
    } else {
      localStorage.removeItem('doorman_currentUser');
    }
  }, [currentUser, users]);

  const login = (name, password) => {
    const user = users.find(
      u => u.name.toLowerCase() === name.toLowerCase() && u.password === password
    );
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const addUser = async (userData) => {
    const id = Date.now().toString();
    const newUser = { ...userData, id };
    await setDoc(doc(db, 'users', id), newUser);
  };

  const deleteUser = async (id) => {
    if (id === '1') return;
    await deleteDoc(doc(db, 'users', id));
  };

  const updateUser = async (id, updates) => {
    await updateDoc(doc(db, 'users', id), updates);
  };

  const updateSelf = async (updates) => {
    if (!currentUser) return;
    await updateUser(currentUser.id, updates);
    setCurrentUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, users, loaded, login, logout, addUser, deleteUser, updateUser, updateSelf }}
    >
      {children}
    </AuthContext.Provider>
  );
};
