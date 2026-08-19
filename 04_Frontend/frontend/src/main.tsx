import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AppErrorBoundary } from './components/errors/AppErrorBoundary';
import { bootstrapDharaTheme } from './theme/apply-dhara-theme';
import { DharaThemeProvider } from './theme/ThemeProvider';
import './index.css';
import './styles/dhara-themes.css';
import './styles/midnight-dark-trial.css';

bootstrapDharaTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DharaThemeProvider>
            <App />
          </DharaThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
