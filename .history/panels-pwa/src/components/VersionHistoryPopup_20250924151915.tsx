import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Clock, User, FileText, Plus, Edit, Trash2, ChevronDown, ChevronRight, Archive } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { visitEventsCollection, visitSnapshotsCollection } from '@/firebase/paths';
import { formatVersionEvent } from '@/utils/versionHistory';
import type { VersionEventDoc } from '@/types/firestore';

interface VersionHistoryPopupProps {
  visitId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Snapshot {
  id: string;
  version: number;
  title: string;
  eventIds: string[]; // Array of event IDs, not full event data
  createdAt: any;
  eventCount: number;
  summary: string;
}

const VersionHistoryPopup: React.FC<VersionHistoryPopupProps> = ({
  visitId,
  isOpen,
  onClose,
}) => {
  const [expandedSnapshot, setExpandedSnapshot] = useState<string | null>(null);

  // Utility function to safely convert Firestore timestamps to Date
  const firestoreTimestampToDate = (timestamp: any): Date | null => {
    try {
      if (!timestamp) return null;
      
      // Handle Firestore Timestamp objects (most common case)
      if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
        return (timestamp as any).toDate();
      }
      
      // Handle serialized Firestore timestamps
      if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
        const ts = timestamp as any;
        return new Date(ts.seconds * 1000 + ts.nanoseconds / 1000000);
      }
      
      // Try direct conversion
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Fetch snapshots (versioned groups of events)
  const { data: snapshots, isLoading: snapshotsLoading } = useFirestoreCollection<Snapshot>(
    visitSnapshotsCollection(visitId)
  );

  // Fetch all events (without ordering to avoid index issues)
  const { data: allEvents, isLoading: eventsLoading } = useFirestoreCollection<VersionEventDoc>(
    visitEventsCollection(visitId)
  );

  // Get all event IDs that are in snapshots
  const snapshottedEventIds = new Set<string>();
  snapshots?.forEach(snapshot => {
    snapshot.eventIds?.forEach(eventId => snapshottedEventIds.add(eventId));
  });

  // Sort snapshots by version (newest first)
  const sortedSnapshots = snapshots?.sort((a, b) => b.version - a.version) || [];

  // Filter out events with invalid timestamps first
  const validEvents = allEvents?.filter(event => {
    return firestoreTimestampToDate(event.timestamp) !== null;
  }) || [];

  // Helper function to convert timestamp to Date for sorting
  const timestampToDate = (timestamp: any): Date => {
    return firestoreTimestampToDate(timestamp) || new Date(0);
  };

  // Sort events by timestamp (newest first) and filter recent events
  const sortedEvents = validEvents?.sort((a, b) => {
    try {
      const aTime = timestampToDate(a.timestamp);
      const bTime = timestampToDate(b.timestamp);
      
      return bTime.getTime() - aTime.getTime(); // Newest first
    } catch (error) {
      console.error('Error sorting events by timestamp:', error);
      return 0; // Keep original order on error
    }
  }) || [];

  const recentEvents = sortedEvents.filter(event => 
    event.id && !snapshottedEventIds.has(event.id)
  );

  const isLoading = snapshotsLoading || eventsLoading;
  const hasData = (sortedSnapshots && sortedSnapshots.length > 0) || (recentEvents && recentEvents.length > 0);

  // Debug logging
  React.useEffect(() => {
    if (isOpen) {
      console.log('VersionHistoryPopup Debug:', {
        visitId,
        snapshots: sortedSnapshots?.length || 0,
        allEvents: allEvents?.length || 0,
        validEvents: validEvents?.length || 0,
        recentEvents: recentEvents?.length || 0,
        snapshotsLoading,
        eventsLoading,
        hasData
      });
      
      // Debug first few events to see their structure
      if (allEvents && allEvents.length > 0) {
        console.log('Sample events:', allEvents.slice(0, 3).map(event => ({
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          timestampType: typeof event.timestamp,
          hasToDate: event.timestamp && typeof event.timestamp === 'object' && 'toDate' in event.timestamp
        })));
      }
      
      // Debug invalid events
      const invalidEvents = allEvents?.filter(event => {
        try {
          if (!event.timestamp) return true;
          let ts = event.timestamp;
          if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
            ts = ts.toDate();
          }
          const date = firestoreTimestampToDate(ts) || new Date();
          return isNaN(date.getTime());
        } catch (error) {
          return true;
        }
      }) || [];
      
      if (invalidEvents.length > 0) {
        console.warn('Invalid events found:', invalidEvents.length, invalidEvents);
      }
    }
  }, [isOpen, visitId, sortedSnapshots, allEvents, recentEvents, snapshotsLoading, eventsLoading, hasData]);

  if (!isOpen) return null;

  // Safety check - if we have data issues, show a simple message
  if (allEvents && allEvents.some(event => !event.timestamp)) {
    console.warn('Some events have missing timestamps:', allEvents.filter(e => !e.timestamp));
  }

  const getEventIcon = (type: VersionEventDoc['type']) => {
    switch (type) {
      case 'agenda_edit':
      case 'debrief_edit':
        return <FileText className="h-4 w-4" />;
      case 'note_add':
        return <Plus className="h-4 w-4" />;
      case 'note_edit':
        return <Edit className="h-4 w-4" />;
      case 'note_delete':
        return <Trash2 className="h-4 w-4" />;
      case 'visit_edit':
        return <Edit className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEventBadgeColor = (type: VersionEventDoc['type']) => {
    switch (type) {
      case 'agenda_edit':
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'debrief_edit':
        return 'bg-green-500/20 text-green-600 dark:text-green-400';
      case 'note_add':
        return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
      case 'note_edit':
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'note_delete':
        return 'bg-red-500/20 text-red-600 dark:text-red-400';
      case 'visit_edit':
        return 'bg-purple-500/20 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimestamp = (timestamp: any) => {
    const date = firestoreTimestampToDate(timestamp);
    if (!date) {
      return 'No date';
    }
    return date.toLocaleString();
  };

  const isValidTimestamp = (timestamp: any) => {
    return firestoreTimestampToDate(timestamp) !== null;
  };

  const renderEvent = (event: VersionEventDoc, index: number) => {
    try {
      // Convert VersionEventDoc to VersionEvent format for the utility function
      const versionEvent = {
        id: event.id,
        type: event.type,
        field: event.field,
        beforeValue: event.beforeValue || '',
        afterValue: event.afterValue || '',
        userId: event.userId,
        userName: event.userName,
        timestamp: firestoreTimestampToDate(event.timestamp) || new Date(),
        metadata: {}
      };
      const formatted = formatVersionEvent(versionEvent);
      return (
        <div
          key={event.id || index}
          className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {getEventIcon(event.type)}
              <div className="flex-1">
                <div className="font-medium text-sm">{formatted.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatted.description}</div>
                
                {/* Show detailed diff preview */}
                {event.beforeValue || event.afterValue ? (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                    {event.beforeValue && (
                      <div className="text-red-600 mb-1">
                        <span className="font-medium">Before:</span> {stripHtmlAndTruncate(event.beforeValue, 150)}
                      </div>
                    )}
                    {event.afterValue && (
                      <div className="text-green-600">
                        <span className="font-medium">After:</span> {stripHtmlAndTruncate(event.afterValue, 150)}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <Badge className={`text-xs ${getEventBadgeColor(event.type)}`}>
              {event.type.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {formatted.user}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {isValidTimestamp(event.timestamp) ? formatTimestamp(event.timestamp) : '-'}
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering event:', error, event);
      return (
        <div key={event.id || index} className="border rounded-lg p-3 bg-destructive/10">
          <div className="text-sm text-destructive">Error rendering event</div>
        </div>
      );
    }
  };

  // Helper function to strip HTML tags and truncate text
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

  try {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl font-semibold">Version History</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
        
        <CardContent className="space-y-6 max-h-[60vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading version history...</div>
            </div>
          )}
          
          {!isLoading && !hasData && (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No version history available</div>
            </div>
          )}
          
          {!isLoading && hasData && (
            <div className="space-y-6">
              {/* Recent Edits Section */}
              {recentEvents && recentEvents.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Recent Edits
                  </h3>
                  <div className="space-y-2">
                    {recentEvents.map((event, index) => renderEvent(event, index))}
                  </div>
                </div>
              )}

              {/* Snapshots Section */}
              {sortedSnapshots && sortedSnapshots.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Archive className="h-5 w-5" />
                    Version Snapshots
                  </h3>
                  <div className="space-y-3">
                    {sortedSnapshots.map((snapshot) => (
                      <div key={snapshot.id} className="border rounded-lg">
                        <div
                          className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => setExpandedSnapshot(
                            expandedSnapshot === snapshot.id ? null : snapshot.id
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {expandedSnapshot === snapshot.id ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <div>
                                <div className="font-medium">{snapshot.title}</div>
                                <div className="text-sm text-muted-foreground">{snapshot.summary}</div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {isValidTimestamp(snapshot.createdAt) ? formatTimestamp(snapshot.createdAt) : '-'}
                            </div>
                          </div>
                        </div>
                        
                        {expandedSnapshot === snapshot.id && (
                          <div className="border-t p-4 bg-muted/50">
                            <div className="space-y-2">
                              {snapshot.eventIds?.map((eventId, index) => {
                                const event = allEvents?.find(e => e.id === eventId);
                                return event ? renderEvent(event, index) : (
                                  <div key={eventId} className="border rounded-lg p-3 bg-yellow-500/10">
                                    <div className="text-sm text-yellow-600">Event not found: {eventId}</div>
                                  </div>
                                );
                              }).filter(Boolean)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
  } catch (error) {
    console.error('Error rendering VersionHistoryPopup:', error);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl font-semibold">Version History</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p className="text-lg font-medium">Error loading version history</p>
              <p className="text-sm mt-2">Please try again or contact support if the issue persists.</p>
              <p className="text-xs mt-4 text-muted-foreground">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
};

export default VersionHistoryPopup;