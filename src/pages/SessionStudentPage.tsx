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

  // Detect assessment type for specialized displays
  const isORFSession = session.assessment_id === 'FL-ORF';
  const isOnsetRimeSession = session.assessment_id === 'PA-OONS';

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

  // ORF sessions show full passage for reading aloud
  if (isORFSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="max-w-4xl">
          <p className="text-3xl md:text-4xl font-serif text-foreground leading-relaxed text-justify">
            {stimulus}
          </p>
        </div>
      </div>
    );
  }

  // Onset-Rime sessions: blank listening indicator (student doesn't see text)
  if (isOnsetRimeSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 animate-pulse" />
          </div>
          <p className="text-3xl font-medium text-foreground">Listening...</p>
          <p className="text-lg text-muted-foreground mt-2">
            Item {currentIndex + 1} of {items.length}
          </p>
        </div>
      </div>
    );
  }

  // Default: single-item stimulus display
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
