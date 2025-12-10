import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Toolbar } from '@/components/layouts/layout-17/components/toolbar.jsx';

export function Layout17Page() {
  return (
    <div className="container-fluid">
      <Toolbar />
      <Skeleton className="rounded-lg grow h-screen"></Skeleton>
    </div>
  );
}
