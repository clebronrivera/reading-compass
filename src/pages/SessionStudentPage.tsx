import { useParams } from 'react-router-dom';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { useSession } from '@/lib/api/sessions';
import { useItemsByForm } from '@/lib/api/items';
import { isValidRouteId } from '@/lib/routeValidation';
import type { ItemContent } from '@/types/database';

export default function SessionStudentPage() {
  const { id } = useParams<{ id: string }>();

  // Poll session every 2 seconds for updates
  const { data: session, isLoading: sessionLoading, error: sessionError } = useSession(id || '', {
    refetchInterval: 2000,
  });
  const { data: items, isLoading: itemsLoading, error: itemsError } = useItemsByForm(session?.form_id || '');

  if (!id || !isValidRouteId(id)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <ErrorState title="Invalid session ID" />
      </div>
    );
  }

  if (sessionLoading || itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingState title="Loading..." />
      </div>
    );
  }

  if (sessionError || itemsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <ErrorState title="Failed to load session" error={sessionError || itemsError} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <ErrorState title="Session not found" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <ErrorState title="No items found" />
      </div>
    );
  }

  const currentIndex = session.current_item_index ?? 0;
  const currentItem = items[currentIndex];
  const content = currentItem?.content_payload as ItemContent;
  const stimulus = content?.stimulus || content?.text || '';

  // Show completion message if session is done
  if (session.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-4xl font-bold text-foreground">Session Complete</p>
          <p className="text-muted-foreground mt-4">Thank you!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="text-center max-w-4xl">
        <p className="text-8xl md:text-9xl font-bold text-foreground leading-tight">
          {stimulus}
        </p>
      </div>
    </div>
  );
}
