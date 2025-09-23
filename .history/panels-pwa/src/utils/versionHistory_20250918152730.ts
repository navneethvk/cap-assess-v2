import { addDocument } from '@/firebase/firestoreService';
import { visitEventsCollection } from '@/firebase/paths';

export interface VersionEvent {
  id?: string;
  type: 'agenda_edit' | 'debrief_edit' | 'note_add' | 'note_edit' | 'note_delete' | 'visit_edit';
  field?: string; // For specific field edits
  beforeValue: string;
  afterValue: string;
  userId: string;
  userName: string;
  timestamp: Date;
  metadata?: {
    noteId?: string; // For note-specific events
    fieldName?: string; // For specific field names
  };
}

/**
 * Captures a version history event when content is modified
 */
export const captureVersionEvent = async (
  visitId: string,
  event: Omit<VersionEvent, 'id' | 'timestamp'>
): Promise<void> => {
  try {
    const versionEvent: VersionEvent = {
      ...event,
      timestamp: new Date(),
    };

    const collectionPath = visitEventsCollection(visitId);
    console.log('Capturing version event:', { 
      visitId, 
      collectionPath, 
      event: versionEvent 
    });
    
    await addDocument(collectionPath, versionEvent);
    console.log('Version event captured successfully');
  } catch (error) {
    console.error('Failed to capture version event:', error);
    console.error('Collection path was:', visitEventsCollection(visitId));
    // Don't throw error to avoid breaking the main operation
  }
};

/**
 * Creates a simple text diff for display purposes
 */
export const createSimpleDiff = (before: string, after: string): string => {
  if (!before && !after) return 'No changes';
  if (!before) return `Added: ${stripHtmlAndTruncate(after, 100)}`;
  if (!after) return `Removed: ${stripHtmlAndTruncate(before, 100)}`;
  if (before === after) return 'No changes';
  
  // Strip HTML for comparison
  const beforeStripped = before.replace(/<[^>]*>/g, '');
  const afterStripped = after.replace(/<[^>]*>/g, '');
  
  if (beforeStripped === afterStripped) return 'Formatting changed';
  
  // Show a preview of what changed
  const beforeWords = beforeStripped.split(/\s+/);
  const afterWords = afterStripped.split(/\s+/);
  
  if (beforeWords.length !== afterWords.length) {
    return `Changed from ${beforeWords.length} words to ${afterWords.length} words`;
  }
  
  // Try to find the first difference
  const maxLength = Math.min(beforeStripped.length, afterStripped.length, 200);
  for (let i = 0; i < maxLength; i++) {
    if (beforeStripped[i] !== afterStripped[i]) {
      const start = Math.max(0, i - 20);
      const end = Math.min(maxLength, i + 20);
      const beforeSnippet = beforeStripped.substring(start, end);
      const afterSnippet = afterStripped.substring(start, end);
      return `Changed: "${stripHtmlAndTruncate(beforeSnippet, 50)}" → "${stripHtmlAndTruncate(afterSnippet, 50)}"`;
    }
  }
  
  return 'Content modified';
};

/**
 * Helper function to strip HTML tags and truncate text
 */
const stripHtmlAndTruncate = (text: string, maxLength: number): string => {
  if (!text) return '';
  
  // Strip HTML tags
  const stripped = text.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  const decoded = stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Truncate if needed
  if (decoded.length <= maxLength) return decoded;
  return decoded.substring(0, maxLength - 3) + '...';
};

/**
 * Formats a version event for display
 */
export const formatVersionEvent = (event: VersionEvent): {
  title: string;
  description: string;
  timestamp: string;
  user: string;
} => {
  const getEventTitle = (type: VersionEvent['type']): string => {
    switch (type) {
      case 'agenda_edit': return 'Agenda Updated';
      case 'debrief_edit': return 'Debrief Updated';
      case 'note_add': return 'Note Added';
      case 'note_edit': return 'Note Edited';
      case 'note_delete': return 'Note Deleted';
      case 'visit_edit': return 'Visit Details Updated';
      default: return 'Content Modified';
    }
  };

  return {
    title: getEventTitle(event.type),
    description: createSimpleDiff(event.beforeValue, event.afterValue),
    timestamp: (() => {
      try {
        if (!event.timestamp) {
          return 'No date';
        }
        
        // Handle Firestore Timestamp objects (most common case)
        if (event.timestamp && typeof event.timestamp === 'object' && 'toDate' in event.timestamp && typeof event.timestamp.toDate === 'function') {
          const date = (event.timestamp as any).toDate();
          return date.toLocaleString();
        }
        
        // Handle serialized Firestore timestamps
        if (event.timestamp && typeof event.timestamp === 'object' && 'seconds' in event.timestamp && 'nanoseconds' in event.timestamp) {
          const ts = event.timestamp as any;
          const date = new Date(ts.seconds * 1000 + ts.nanoseconds / 1000000);
          return date.toLocaleString();
        }
        
        // Try direct conversion
        const date = new Date(event.timestamp);
        if (isNaN(date.getTime())) {
          console.warn('Invalid timestamp in formatVersionEvent:', event.timestamp);
          return 'Invalid date';
        }
        
        return date.toLocaleString();
      } catch (error) {
        console.error('Error formatting timestamp in formatVersionEvent:', error, event.timestamp);
        return 'Invalid date';
      }
    })(),
    user: event.userName,
  };
};
