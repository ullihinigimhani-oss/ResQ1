import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';

export type AppTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'resq1-theme';

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isAppTheme(value: string | null): value is AppTheme {
  return value === 'light' || value === 'dark';
}

function browserTheme(): AppTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isAppTheme(savedTheme)) {
    return savedTheme;
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyBrowserTheme(theme: AppTheme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  themeColor?.setAttribute('content', theme === 'dark' ? '#172033' : '#F6F9FC');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(() => (
    Platform.OS === 'web' ? 'light' : Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  ));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (Platform.OS === 'web') {
      applyBrowserTheme(theme);
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      return;
    }

    Appearance.setColorScheme(theme);
    void SecureStore.setItemAsync(THEME_STORAGE_KEY, theme);
  }, [isReady, theme]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setTheme(browserTheme());
      setIsReady(true);
      return;
    }

    let active = true;
    void SecureStore.getItemAsync(THEME_STORAGE_KEY).then((savedTheme) => {
      if (!active) {
        return;
      }

      setTheme(isAppTheme(savedTheme)
        ? savedTheme
        : Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
      setIsReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: (nextTheme) => setTheme(nextTheme),
    toggleTheme: () => setTheme((current) => (current === 'light' ? 'dark' : 'light')),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider.');
  }

  return context;
}
