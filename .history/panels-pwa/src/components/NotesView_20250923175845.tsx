import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useTitleBarSlots } from '@/store/titleBarSlots';
import { useVisitsInRange } from '@/hooks/useVisitQueries';
import DateRangePicker from '@/components/ui/DateRangePicker';
import type { DateRangeValue } from '@/components/ui/DateRangePicker';
import { Pin, Calendar, User } from 'lucide-react';
import { useUserPinnedVisits } from '@/hooks/useUserPinnedVisits';
import { useNavigate } from 'react-router-dom';
import type { VisitDoc } from '@/types/firestore';
import { timestampToDate } from '@/types/firestore';

// Helper function to parse date from string, Date, or Timestamp
const parseDate = (dateInput: any): Date | null => {
  try {
    // Use timestampToDate for Firestore Timestamps
    if (dateInput && typeof dateInput === 'object' && dateInput.seconds !== undefined) {
      return timestampToDate(dateInput);
    }
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
};

const NotesView: React.FC = () => {
  const { setSlots, clearSlots } = useTitleBarSlots();
  // const { user } = useAuthStore();
  const { togglePin, pinnedVisits } = useUserPinnedVisits();
  const navigate = useNavigate();

  const createDefaultRange = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from: startOfMonth, to: endOfMonth }
  }

  const [range, setRange] = useState<DateRangeValue>(createDefaultRange)
  const [selectedCci, setSelectedCci] = useState<string>('all')
  
  // Long press functionality
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [isLongPressing, setIsLongPressing] = useState(false)

  // Create stable range timestamps for memoization
  const rangeTimestamps = useMemo(() => ({
    from: range?.from?.getTime() ?? createDefaultRange().from.getTime(),
    to: range?.to?.getTime() ?? createDefaultRange().to.getTime(),
  }), [range?.from, range?.to]);

  // Create stable default range ref
  const defaultRangeRef = useRef(createDefaultRange());

  // Create notes range from the selected range
  const notesRange = useMemo(() => {
    const from = range?.from ?? defaultRangeRef.current.from
    const to = range?.to ?? defaultRangeRef.current.to
    return { from, to }
  }, [rangeTimestamps.from, rangeTimestamps.to])

  const { visits: allVisits, isLoading, error: notesError } = useVisitsInRange(notesRange.from, notesRange.to)

  // Build list of CCIs user has in the data set - use stable reference
  const cciOptionsRef = useRef<Array<{ id: string; name: string }>>([]);
  const cciOptions = useMemo(() => {
    if (!allVisits || allVisits.length === 0) {
      if (cciOptionsRef.current.length === 0) return cciOptionsRef.current;
      cciOptionsRef.current = [];
      return [];
    }
    
    const map = new Map<string, string>();
    allVisits.forEach((v: VisitDoc) => {
      if (v.cci_id && v.cci_name) map.set(v.cci_id, v.cci_name);
    });
    const newOptions = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    
    // Only update if the options actually changed
    if (cciOptionsRef.current.length !== newOptions.length ||
        !cciOptionsRef.current.every((opt, i) => opt.id === newOptions[i]?.id && opt.name === newOptions[i]?.name)) {
      cciOptionsRef.current = newOptions;
    }
    
    return cciOptionsRef.current;
  }, [allVisits]);

  // Create stable date range picker JSX
  const dateRangePickerJSX = useMemo(() => (
    <DateRangePicker value={range} onChange={setRange} />
  ), [range?.from?.getTime(), range?.to?.getTime()]);

  // Create stable CCI dropdown JSX
  const cciDropdownJSX = useMemo(() => (
    <select
      className="text-xs sm:text-sm h-7 px-2 border rounded-md bg-background w-full min-w-0 max-w-[260px]"
      value={selectedCci}
      onChange={(e) => setSelectedCci(e.target.value)}
    >
      <option value="all">All CCIs</option>
      {cciOptions.map(o => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  ), [selectedCci, cciOptions]);

  // TESTING: Date range picker and CCI dropdown in title bar
  useEffect(() => {
    console.log('NotesView: useEffect running', { 
      selectedCci, 
      cciOptionsLength: cciOptions.length,
      rangeFrom: range?.from?.getTime(),
      rangeTo: range?.to?.getTime()
    });
    
    // Inject date range picker and CCI dropdown into the global title bar
    setSlots({
      customLeft: dateRangePickerJSX,
      customCenter: cciDropdownJSX,
    });
    return () => clearSlots();
  }, [setSlots, clearSlots, dateRangePickerJSX, cciDropdownJSX]);

  // Helper function to extract notes text
  const getNotesText = (visit: VisitDoc): string => {
    if (!visit.notes || !Array.isArray(visit.notes) || visit.notes.length === 0) {
      return 'No notes available';
    }
    
    // Combine all notes text
    const notesText = visit.notes
      .map(note => note.text)
      .filter(text => text && text.trim())
      .join(' ');
    
    return notesText || 'No notes available';
  };

  // Filter and sort notes
  const { pinnedNotes, regularNotes } = useMemo(() => {
    if (!allVisits || allVisits.length === 0) {
      return { pinnedNotes: [], regularNotes: [] };
    }

    let filteredVisits = allVisits;

    // Filter by CCI if selected
    if (selectedCci !== 'all') {
      filteredVisits = filteredVisits.filter((v: VisitDoc) => v.cci_id === selectedCci);
    }

    // Separate pinned and regular notes
    const pinned = filteredVisits.filter((v: VisitDoc) => pinnedVisits.includes(v.id));
    const regular = filteredVisits.filter((v: VisitDoc) => !pinnedVisits.includes(v.id));

    // Sort by date (newest first)
    const sortByDate = (a: VisitDoc, b: VisitDoc) => {
      const dateA = parseDate(a.date) || new Date(0);
      const dateB = parseDate(b.date) || new Date(0);
      return dateB.getTime() - dateA.getTime();
    };

    return {
      pinnedNotes: pinned.sort(sortByDate),
      regularNotes: regular.sort(sortByDate),
    };
  }, [allVisits, selectedCci, rangeTimestamps.from, rangeTimestamps.to, pinnedVisits]);

  // Handle card click - navigate to meeting notes
  const handleCardClick = (visitId: string) => {
    navigate(`/meeting-notes/${visitId}`);
  };

  // Long press handlers
  const handleMouseDown = (visitId: string) => {
    setIsLongPressing(true);
    const timer = setTimeout(() => {
      togglePin(visitId);
      setIsLongPressing(false);
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (visitId: string) => {
    setIsLongPressing(true);
    const timer = setTimeout(() => {
      togglePin(visitId);
      setIsLongPressing(false);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
  };

  // Fallback: if no notes are showing, show all visits without pinning
  const allNotes = [...pinnedNotes, ...regularNotes];
  const hasNotes = allNotes.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        {isLoading && (
          <div className="text-center py-8 text-gray-500">Loading notes…</div>
        )}
        {notesError && (
          <div className="text-center py-8 text-red-500">Error loading notes: {String(notesError)}</div>
        )}
        {!hasNotes && !isLoading && !notesError && (
          <div className="text-center py-12 text-gray-500">
            <p>No notes found for the selected criteria.</p>
            <p className="text-sm mt-2">Try adjusting the date range or CCI filter.</p>
          </div>
        )}
        {hasNotes && (
          <>
            {/* Pinned Notes Section */}
            {pinnedNotes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-700">
                  <Pin className="h-5 w-5 text-blue-600" />
                  Pinned Notes ({pinnedNotes.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {pinnedNotes.map((v: VisitDoc) => (
                    <Card
                      key={v.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 bg-white border border-gray-200 rounded-lg overflow-hidden ${
                        isLongPressing ? 'scale-95' : ''
                      }`}
                      onClick={() => handleCardClick(v.id)}
                      onMouseDown={() => handleMouseDown(v.id)}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseLeave}
                      onTouchStart={() => handleTouchStart(v.id)}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="p-4 h-48 flex flex-col">
                        {/* Pin indicator */}
                        <div className="flex justify-end mb-2">
                          <Pin className="h-4 w-4 text-blue-600" />
                        </div>
                        
                        {/* CCI Name */}
                        <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                          {v.cci_name || 'Unknown CCI'}
                        </h3>
                        
                        {/* Notes content */}
                        <div className="flex-1 overflow-hidden">
                          <p className="text-gray-600 text-xs line-clamp-6 leading-relaxed">
                            {getNotesText(v)}
                          </p>
                        </div>
                        
                        {/* Footer with date and user */}
                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{parseDate(v.date)?.toLocaleDateString() || 'Invalid Date'}</span>
                          </div>
                          {v.filledBy && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-16">{v.filledBy}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Notes Section */}
            {regularNotes.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-gray-700">
                  All Notes ({regularNotes.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {regularNotes.map((v: VisitDoc) => (
                    <Card
                      key={v.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 bg-white border border-gray-200 rounded-lg overflow-hidden ${
                        isLongPressing ? 'scale-95' : ''
                      }`}
                      onClick={() => handleCardClick(v.id)}
                      onMouseDown={() => handleMouseDown(v.id)}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseLeave}
                      onTouchStart={() => handleTouchStart(v.id)}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="p-4 h-48 flex flex-col">
                        {/* CCI Name */}
                        <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                          {v.cci_name || 'Unknown CCI'}
                        </h3>
                        
                        {/* Notes content */}
                        <div className="flex-1 overflow-hidden">
                          <p className="text-gray-600 text-xs line-clamp-6 leading-relaxed">
                            {getNotesText(v)}
                          </p>
                        </div>
                        
                        {/* Footer with date and user */}
                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{parseDate(v.date)?.toLocaleDateString() || 'Invalid Date'}</span>
                          </div>
                          {v.filledBy && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-16">{v.filledBy}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotesView;