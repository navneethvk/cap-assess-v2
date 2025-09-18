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
  if (!before) return `Added: ${after}`;
  if (!after) return `Removed: ${before}`;
  if (before === after) return 'No changes';
  
  // Simple diff - in a real implementation, you might want to use a proper diff library
  const beforeWords = before.split(/\s+/);
  const afterWords = after.split(/\s+/);
  
  if (beforeWords.length !== afterWords.length) {
    return `Changed from ${beforeWords.length} words to ${afterWords.length} words`;
  }
  
  return 'Content modified';
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
        // Handle Firestore timestamp objects
        let timestamp = event.timestamp;
        if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
          timestamp = timestamp.toDate();
        }
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          return 'Invalid date';
        }
        return date.toLocaleString();
      } catch (error) {
        return 'Invalid date';
      }
    })(),
    user: event.userName,
  };
};
