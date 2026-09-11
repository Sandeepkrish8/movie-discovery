import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './index.css';

/**
 * Client-side query defaults.
 *
 * retry: 1 — the SERVER already retries TMDB twice with backoff, so retrying
 * hard here would multiply into six upstream attempts for one user action.
 * One extra try covers a dropped browser request without stacking.
 *
 * refetchOnWindowFocus: false — movie data does not change while the user is
 * reading it, and silent refetches on tab focus are wasted requests.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
