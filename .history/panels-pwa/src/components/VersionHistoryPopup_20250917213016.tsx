import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Clock, User, FileText, Plus, Edit, Trash2, Calendar, ChevronDown, ChevronRight, Archive } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { visitEventsCollection, visitSnapshotsCollection } from '@/firebase/paths';
import { formatVersionEvent } from '@/utils/versionHistory';
import type { VersionEvent } from '@/utils/versionHistory';
import { format } from 'date-fns';
import { orderBy } from 'firebase/firestore';

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

  // Fetch snapshots (versioned groups of events)
  const { data: snapshots, isLoading: snapshotsLoading } = useFirestoreCollection<Snapshot>(
    visitSnapshotsCollection(visitId)
  );

  // Fetch all events (without ordering to avoid index issues)
  const { data: allEvents, isLoading: eventsLoading } = useFirestoreCollection<VersionEvent>(
    visitEventsCollection(visitId)
  );

  // Get all event IDs that are in snapshots
  const snapshottedEventIds = new Set<string>();
  snapshots?.forEach(snapshot => {
    snapshot.eventIds?.forEach(eventId => snapshottedEventIds.add(eventId));
  });

  // Sort snapshots by version (newest first)
  const sortedSnapshots = snapshots?.sort((a, b) => b.version - a.version) || [];

  // Sort events by timestamp (newest first) and filter recent events
  const sortedEvents = allEvents?.sort((a, b) => {
    const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
    const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
    return bTime.getTime() - aTime.getTime(); // Newest first
  }) || [];

  const recentEvents = sortedEvents.filter(event => 
    event.id && !snapshottedEventIds.has(event.id)
  );

  const isLoading = snapshotsLoading || eventsLoading;
  const hasData = (snapshots && snapshots.length > 0) || (recentEvents && recentEvents.length > 0);

  // Debug logging
  React.useEffect(() => {
    if (isOpen) {
      console.log('VersionHistoryPopup Debug:', {
        visitId,
        snapshots: sortedSnapshots?.length || 0,
        allEvents: allEvents?.length || 0,
        recentEvents: recentEvents?.length || 0,
        snapshotsLoading,
        eventsLoading,
        hasData
      });
    }
  }, [isOpen, visitId, sortedSnapshots, allEvents, recentEvents, snapshotsLoading, eventsLoading, hasData]);

  if (!isOpen) return null;

  const getEventIcon = (type: VersionEvent['type']) => {
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
        return <Calendar className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEventBadgeColor = (type: VersionEvent['type']) => {
    switch (type) {
      case 'agenda_edit':
        return 'bg-blue-100 text-blue-800';
      case 'debrief_edit':
        return 'bg-green-100 text-green-800';
      case 'note_add':
        return 'bg-emerald-100 text-emerald-800';
      case 'note_edit':
        return 'bg-yellow-100 text-yellow-800';
      case 'note_delete':
        return 'bg-red-100 text-red-800';
      case 'visit_edit':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: any) => {
    try {
      // Handle Firestore timestamp objects
      let ts = timestamp;
      if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
        ts = ts.toDate();
      }
      const date = new Date(ts);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return format(date, 'MMM dd, yyyy HH:mm');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const renderEvent = (event: VersionEvent, index: number) => {
    const formatted = formatVersionEvent(event);
    return (
      <div
        key={event.id || index}
        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getEventIcon(event.type)}
            <div>
              <div className="font-medium text-sm">{formatted.title}</div>
              <div className="text-xs text-gray-600">{formatted.description}</div>
            </div>
          </div>
          <Badge className={`text-xs ${getEventBadgeColor(event.type)}`}>
            {event.type.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {formatted.user}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimestamp(event.timestamp)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-white">
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
              <div className="text-gray-500">Loading version history...</div>
            </div>
          )}
          
          {!isLoading && !hasData && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">No version history available</div>
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
                          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
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
                                <div className="text-sm text-gray-600">{snapshot.summary}</div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatTimestamp(snapshot.createdAt)}
                            </div>
                          </div>
                        </div>
                        
                        {expandedSnapshot === snapshot.id && (
                          <div className="border-t p-4 bg-gray-50">
                            <div className="space-y-2">
                              {snapshot.eventIds?.map(eventId => {
                                const event = allEvents?.find(e => e.id === eventId);
                                return event ? renderEvent(event, 0) : null;
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
};

export default VersionHistoryPopup;