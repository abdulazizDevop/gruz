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
import { DEFAULT_DYNAMIC_LABELS } from '../lib/roles';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const DEFAULT_USERS = [
  { id: '1', name: 'Асхаб', password: '5055', role: 'superadmin' },
  { id: '2', name: 'Админ 1', password: '123', role: 'admin' },
  { id: '3', name: 'Сборщик 1', password: '123', role: 'Сборщик' },
  { id: '4', name: 'Склад 1', password: '123', role: 'warehouse' },
];

const seedUsersIfEmpty = async () => {
  const snap = await getDocs(collection(db, 'users'));
  if (!snap.empty) return;
  const batch = writeBatch(db);
  DEFAULT_USERS.forEach(u => {
    batch.set(doc(db, 'users', u.id), u);
  });
  await batch.commit();
};

const seedRolesIfEmpty = async () => {
  const snap = await getDocs(collection(db, 'roles'));
  if (!snap.empty) return;
  const batch = writeBatch(db);
  DEFAULT_DYNAMIC_LABELS.forEach((label, idx) => {
    const id = `role_${Date.now()}_${idx}`;
    batch.set(doc(db, 'roles', id), {
      id,
      key: label,
      label,
      createdAt: new Date().toISOString(),
    });
  });
  await batch.commit();
};

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('doorman_currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    seedUsersIfEmpty().catch(err => console.error('Seed users failed', err));
    seedRolesIfEmpty().catch(err => console.error('Seed roles failed', err));

    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setUsers(list);
      setLoaded(true);
    });
    const unsubRoles = onSnapshot(collection(db, 'roles'), snap => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setRoles(list);
    });
    return () => {
      unsubUsers();
      unsubRoles();
    };
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

  const addRole = async (rawLabel) => {
    const label = (rawLabel || '').trim();
    if (!label) throw new Error('EMPTY_LABEL');
    if (label.length < 2) throw new Error('TOO_SHORT');
    const normalized = label.toLowerCase();
    const existsSystem = ['admin', 'warehouse', 'superadmin', 'главный', 'админ', 'склад']
      .includes(normalized);
    if (existsSystem) throw new Error('RESERVED');
    const existsDynamic = roles.some(r => (r.label || '').toLowerCase() === normalized);
    if (existsDynamic) throw new Error('DUPLICATE');
    const id = `role_${Date.now()}`;
    await setDoc(doc(db, 'roles', id), {
      id,
      key: label,
      label,
      createdAt: new Date().toISOString(),
    });
    return id;
  };

  const deleteRole = async (id) => {
    const role = roles.find(r => r.id === id);
    if (!role) return;
    const usedBy = users.filter(u => u.role === role.key).length;
    if (usedBy > 0) throw new Error(`IN_USE:${usedBy}`);
    await deleteDoc(doc(db, 'roles', id));
  };

  const countUsersByRole = (roleKey) => users.filter(u => u.role === roleKey).length;

  return (
    <AuthContext.Provider
      value={{
        currentUser, users, roles, loaded,
        login, logout,
        addUser, deleteUser, updateUser, updateSelf,
        addRole, deleteRole, countUsersByRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
