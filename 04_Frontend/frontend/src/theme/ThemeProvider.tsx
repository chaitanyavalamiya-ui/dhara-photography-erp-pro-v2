import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { applyDharaTheme, readDharaTheme } from './apply-dhara-theme';
import { DharaThemeId } from './dhara-themes';

interface DharaThemeContextValue {
  theme: DharaThemeId;
  setTheme: (theme: DharaThemeId) => void;
}

const DharaThemeContext = createContext<DharaThemeContextValue | null>(null);

export function DharaThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DharaThemeId>(() => {
    const initial = readDharaTheme();
    applyDharaTheme(initial);
    return initial;
  });

  useLayoutEffect(() => {
    applyDharaTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: DharaThemeId) => {
    const resolved = applyDharaTheme(next);
    setThemeState(resolved);
  }, []);

  const value = useMemo<DharaThemeContextValue>(
    () => ({
      theme,
      setTheme,
    }),
    [theme, setTheme],
  );

  return (
    <DharaThemeContext.Provider value={value}>
      <div className="dhara-theme-scope min-h-screen" data-dhara-theme={theme}>
        {children}
      </div>
    </DharaThemeContext.Provider>
  );
}

export function useDharaTheme(): DharaThemeContextValue {
  const context = useContext(DharaThemeContext);
  if (!context) {
    throw new Error('useDharaTheme must be used within DharaThemeProvider');
  }
  return context;
}
