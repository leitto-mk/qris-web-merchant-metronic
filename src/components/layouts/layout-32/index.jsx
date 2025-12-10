import { Helmet } from 'react-helmet-async';
import { LayoutProvider } from './components/context';
import { Wrapper } from './components/wrapper';

export function Layout32() {
  return (
    <>
      <Helmet>
        <title>BSGQris Merchant - Terminal</title>
      </Helmet>

      <LayoutProvider
        headerStickyOffset={100}
        style={{
          '--header-height': '60px',
          '--header-height-sticky': '60px',
          '--header-height-mobile': '60px',
        }}
      >
        <Wrapper />
      </LayoutProvider>
    </>
  );
}
