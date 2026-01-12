/**
 * Reusable component for rendering ASR section content
 * Extracted from ASRDetailPage.tsx for reuse across the codebase
 */

interface SectionContentProps {
  section: Record<string, unknown>;
  maxArrayPreview?: number;
}

export function SectionContent({ section, maxArrayPreview = 50 }: SectionContentProps) {
  if (!section || Object.keys(section).length === 0) {
    return <p className="text-muted-foreground italic">No data available</p>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(section).map(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        
        if (Array.isArray(value)) {
          if (value.length === 0) return null;
          
          // Check if array contains objects
          if (typeof value[0] === 'object' && value[0] !== null) {
            const displayItems = value.length > maxArrayPreview 
              ? value.slice(0, maxArrayPreview) 
              : value;
            const hasMore = value.length > maxArrayPreview;
            
            return (
              <div key={key} className="space-y-2">
                <p className="font-medium text-sm">
                  {label} <span className="text-muted-foreground font-normal">({value.length} items)</span>:
                </p>
                <div className="pl-4 space-y-2">
                  {displayItems.map((item, idx) => (
                    <div key={idx} className="text-sm bg-muted/50 p-2 rounded border">
                      {typeof item === 'object' ? (
                        <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(item, null, 2)}
                        </pre>
                      ) : (
                        String(item)
                      )}
                    </div>
                  ))}
                  {hasMore && (
                    <p className="text-xs text-muted-foreground italic">
                      ...and {value.length - maxArrayPreview} more items
                    </p>
                  )}
                </div>
              </div>
            );
          }
          
          // String/primitive array
          return (
            <div key={key}>
              <span className="font-medium text-sm">
                {label} <span className="text-muted-foreground font-normal">({value.length} items)</span>:
              </span>
              <ul className="list-disc list-inside text-sm text-muted-foreground pl-2">
                {value.slice(0, maxArrayPreview).map((item, idx) => (
                  <li key={idx}>{String(item)}</li>
                ))}
                {value.length > maxArrayPreview && (
                  <li className="italic">...and {value.length - maxArrayPreview} more</li>
                )}
              </ul>
            </div>
          );
        }
        
        if (typeof value === 'object' && value !== null) {
          return (
            <div key={key} className="space-y-1">
              <p className="font-medium text-sm">{label}:</p>
              <pre className="text-xs bg-muted/50 p-2 rounded border whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          );
        }
        
        if (typeof value === 'boolean') {
          return (
            <p key={key} className="text-sm">
              <span className="font-medium">{label}:</span>{' '}
              <span className="text-muted-foreground">{value ? 'Yes' : 'No'}</span>
            </p>
          );
        }
        
        return (
          <p key={key} className="text-sm">
            <span className="font-medium">{label}:</span>{' '}
            <span className="text-muted-foreground">{String(value)}</span>
          </p>
        );
      })}
    </div>
  );
}
