import { useEffect, useState } from 'react';
import { AppView, User } from '../types';
import { STORAGE_KEYS } from '../constants';

export const useSession = () => {
  const [view, setView] = useState<AppView>(AppView.SPLASH);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      setUser(u);
      setView(AppView.HOME);
    } else {
      setTimeout(() => setView(AppView.LOGIN), 2500);
    }
  }, []);

  const login = (u: User) => {
    setUser(u);
    setView(AppView.HOME);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.PROFILES);
    localStorage.removeItem(STORAGE_KEYS.FAMILY_TREES);
    setUser(null);
    setView(AppView.LOGIN);
  };

  return { view, setView, user, setUser, login, logout };
};
