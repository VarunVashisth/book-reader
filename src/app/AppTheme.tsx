import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type AppTheme = 'light' | 'dark';
type AppThemeValue = { theme: AppTheme; toggleTheme: () => void };
const ThemeContext = createContext<AppThemeValue>({ theme: 'light', toggleTheme: () => undefined });

function initialTheme(): AppTheme {
  const saved = localStorage.getItem('leaf-app-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);
  useEffect(() => { document.documentElement.dataset.appTheme = theme; localStorage.setItem('leaf-app-theme', theme); }, [theme]);
  const value = useMemo(() => ({ theme, toggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark') }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useAppTheme = () => useContext(ThemeContext);
