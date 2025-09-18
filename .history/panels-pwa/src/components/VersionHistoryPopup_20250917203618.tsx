import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Clock, User, FileText, Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { visitEventsCollection } from '@/firebase/paths';
import { formatVersionEvent } from '@/utils/versionHistory';
import type { VersionEvent } from '@/utils/versionHistory';
import { format } from 'date-fns';
import { orderBy } from 'firebase/firestore';

interface VersionHistoryPopupProps {
  visitId: string;
  isOpen: boolean;
  onClose: () => void;
}

const VersionHistoryPopup: React.FC<VersionHistoryPopupProps> = ({
  visitId,
  isOpen,
  onClose,
}) => {
  const { data: events, isLoading, error } = useFirestoreCollection(
    visitEventsCollection(visitId),
    {
      queryConstraints: [orderBy('timestamp', 'desc')],
    }
  );

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

  const getEventColor = (type: VersionEvent['type']) => {
    switch (type) {
      case 'agenda_edit':
      case 'debrief_edit':
        return 'bg-blue-100 text-blue-800';
      case 'note_add':
        return 'bg-green-100 text-green-800';
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
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
        
        <CardContent className="overflow-y-auto max-h-[60vh]">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading history...</div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center py-8">
              <div className="text-red-500">
                Failed to load history: {error.message || 'Unknown error'}
              </div>
            </div>
          )}
          
          {!isLoading && !error && (!events || events.length === 0) && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">No version history available</div>
            </div>
          )}
          
          {!isLoading && !error && events && events.length > 0 && (
            <div className="space-y-4">
              {events.map((eventData: any, index: number) => {
                try {
                  const event = eventData as VersionEvent;
                  const formatted = formatVersionEvent(event);
                return (
                  <div
                    key={event.id || index}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-gray-100">
                          {getEventIcon(event.type)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {formatted.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {formatted.description}
                          </p>
                        </div>
                      </div>
                      <Badge className={getEventColor(event.type)}>
                        {event.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {formatted.user}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {(() => {
                          try {
                            const date = new Date(event.timestamp);
                            if (isNaN(date.getTime())) {
                              return 'Invalid date';
                            }
                            return format(date, 'MMM dd, yyyy HH:mm');
                          } catch (error) {
                            return 'Invalid date';
                          }
                        })()}
                      </div>
                    </div>
                    
                    {/* Show before/after diff for significant changes */}
                    {(event.beforeValue || event.afterValue) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {event.beforeValue && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-500 mb-1">Before:</h5>
                              <div className="text-sm bg-red-50 p-2 rounded border-l-2 border-red-200 max-h-20 overflow-y-auto">
                                {event.beforeValue.length > 200 
                                  ? `${event.beforeValue.substring(0, 200)}...` 
                                  : event.beforeValue
                                }
                              </div>
                            </div>
                          )}
                          {event.afterValue && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-500 mb-1">After:</h5>
                              <div className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-200 max-h-20 overflow-y-auto">
                                {event.afterValue.length > 200 
                                  ? `${event.afterValue.substring(0, 200)}...` 
                                  : event.afterValue
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
                } catch (error) {
                  console.error('Error rendering version event:', error, eventData);
                  return (
                    <div key={index} className="border rounded-lg p-4 bg-red-50">
                      <div className="text-red-600">Error loading version event</div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VersionHistoryPopup;
