import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/layouts/layout-18/components/toolbar.jsx';

export function Layout18Page() {
  return (
    <>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Team Settings</ToolbarPageTitle>
          <ToolbarDescription>Some info tells the story</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline">Setup Rules</Button>
        </ToolbarActions>
      </Toolbar>

      <Skeleton className="rounded-lg grow h-screen"></Skeleton>
    </>
  );
}
