import { AppRouting } from '@/routing/app-routing';
import { ThemeProvider } from 'next-themes';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { LoadingBarContainer } from 'react-top-loading-bar';
import { Toaster } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function App() {
  const metaURL = document.querySelector('meta[name="app_url"]')?.getAttribute('content') ?? null;
  const metaENV = document.querySelector('meta[name="app_env"]')?.getAttribute('content') ?? null;

  const URL = metaURL || import.meta.env.VITE_APP_API_URL;
  const ENV = metaENV || import.meta.env.VITE_APP_ENV;

  window.APP_URL = URL;
  window.APP_ENV = ENV;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      storageKey="qris-web-merchant-theme"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <HelmetProvider>
        <LoadingBarContainer>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <Toaster />
              <AppRouting />
            </BrowserRouter>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </LoadingBarContainer>
      </HelmetProvider>
    </ThemeProvider>
  );
}
