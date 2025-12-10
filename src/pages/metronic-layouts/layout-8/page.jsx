import { Download, MessageCircleMore, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { SearchDialog } from '@/components/layouts/layout-1/shared/dialogs/search/search-dialog.jsx';
import { ChatSheet } from '@/components/layouts/layout-1/shared/topbar/chat-sheet.jsx';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/components/layouts/layout-8/components/toolbar.jsx';

export function Layout8Page() {
  return (
    <>
      <Toolbar>
        <ToolbarHeading />
        <ToolbarActions>
          <SearchDialog
            trigger={
              <Button
                variant="ghost"
                mode="icon"
                className="hover:[&_svg]:text-primary"
              >
                <Search className="size-4.5!" />
              </Button>
            }
          />

          <ChatSheet
            trigger={
              <Button
                variant="ghost"
                mode="icon"
                className="hover:[&_svg]:text-primary"
              >
                <MessageCircleMore className="size-4.5!" />
              </Button>
            }
          />

          <Button
            variant="outline"
            asChild
            className="ms-2.5 hover:text-primary hover:[&_svg]:text-primary"
          >
            <Link to={'#'}>
              <Download />
              Export
            </Link>
          </Button>
        </ToolbarActions>
      </Toolbar>
      <div className="container">
        <Skeleton className="rounded-lg grow h-screen"></Skeleton>
      </div>
    </>
  );
}
