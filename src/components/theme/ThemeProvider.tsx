import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { dataAccess } from '@/services/dataAccess';

export type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  React.useEffect(() => {
    // Sincroniza o tema inicial persistido nas configurações do sistema
    dataAccess.getSettings().then(s => {
      if (s?.theme) {
        const root = document.documentElement;
        if (s.theme === 'dark') {
          root.classList.add('dark');
        } else if (s.theme === 'light') {
          root.classList.remove('dark');
        } else {
          const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.toggle('dark', isSystemDark);
        }
      }
    });
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
