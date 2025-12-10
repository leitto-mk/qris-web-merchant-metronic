import { Skeleton } from '@/components/ui/skeleton.jsx';
import { useLayout } from '@/components/layouts/layout-16/components/context.jsx';
import { HeaderTitle } from '@/components/layouts/layout-16/components/header-title.jsx';

export function Layout16Page() {
  const { isMobile } = useLayout();

  return (
    <div className="container-fluid">
      {isMobile && <HeaderTitle />}
      <Skeleton className="rounded-lg grow h-screen"></Skeleton>
    </div>
  );
}
