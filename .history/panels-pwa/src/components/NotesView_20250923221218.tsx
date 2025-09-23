import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
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
  
  // Selection mode functionality
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  
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

  // Centralized query system automatically handles permissions
  const { visits: allVisits, isLoading, error: notesError } = useVisitsInRange(
    notesRange.from, 
    notesRange.to
  );


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

  // Selection mode handlers (defined early to avoid dependency issues)
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedCards(new Set());
  }, []);

  const handlePinSelected = useCallback(() => {
    selectedCards.forEach(visitId => {
      if (!pinnedVisits.includes(visitId)) {
        togglePin(visitId);
      }
    });
    exitSelectionMode();
  }, [selectedCards, pinnedVisits, togglePin, exitSelectionMode]);

  const handleUnpinSelected = useCallback(() => {
    selectedCards.forEach(visitId => {
      if (pinnedVisits.includes(visitId)) {
        togglePin(visitId);
      }
    });
    exitSelectionMode();
  }, [selectedCards, pinnedVisits, togglePin, exitSelectionMode]);

  const selectAll = useCallback(() => {
    // Get all visit IDs from the current visits data
    const allVisitIds = new Set(allVisits.map(v => v.id));
    setSelectedCards(allVisitIds);
  }, [allVisits]);

  // Memoized selection mode JSX elements
  const selectionModeJSX = useMemo(() => {
    if (!isSelectionMode) return null;

    const selectedCount = selectedCards.size;
    const selectedPinnedCount = Array.from(selectedCards).filter(id => pinnedVisits.includes(id)).length;
    const selectedUnpinnedCount = selectedCount - selectedPinnedCount;

    return {
      customLeft: (
        <div className="flex items-center gap-2">
          <button
            onClick={exitSelectionMode}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
        </div>
      ),
      customCenter: (
        <button
          onClick={selectAll}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Select All
        </button>
      ),
      customRight: (
        <div className="flex items-center gap-2">
          {selectedUnpinnedCount > 0 && (
            <button
              onClick={handlePinSelected}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              <Pin className="h-4 w-4" />
              Pin ({selectedUnpinnedCount})
            </button>
          )}
          {selectedPinnedCount > 0 && (
            <button
              onClick={handleUnpinSelected}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              <Pin className="h-4 w-4" />
              Unpin ({selectedPinnedCount})
            </button>
          )}
        </div>
      ),
    };
  }, [isSelectionMode, selectedCards, pinnedVisits, exitSelectionMode, selectAll, handlePinSelected, handleUnpinSelected]);

  // Title bar slots - different content for selection mode vs normal mode
  useEffect(() => {
    if (isSelectionMode && selectionModeJSX) {
      // Selection mode: use memoized JSX
      setSlots(selectionModeJSX);
    } else {
      // Normal mode: show date range picker and CCI dropdown
      setSlots({
        customLeft: dateRangePickerJSX,
        customCenter: cciDropdownJSX,
      });
    }
    return () => clearSlots();
  }, [setSlots, clearSlots, dateRangePickerJSX, cciDropdownJSX, isSelectionMode, selectionModeJSX]);

  // Helper function to extract notes text from all content fields
  const getNotesText = (visit: VisitDoc): string => {
    const contentParts: string[] = [];
    
    // Add agenda content
    if (visit.agenda && visit.agenda.trim()) {
      // Strip HTML tags for preview
      const cleanAgenda = visit.agenda.replace(/<[^>]*>/g, '').trim();
      if (cleanAgenda) {
        contentParts.push(cleanAgenda);
      }
    }
    
    // Add debrief content
    if (visit.debrief && visit.debrief.trim()) {
      // Strip HTML tags for preview
      const cleanDebrief = visit.debrief.replace(/<[^>]*>/g, '').trim();
      if (cleanDebrief) {
        contentParts.push(cleanDebrief);
      }
    }
    
    // Add notes content
    if (visit.notes && Array.isArray(visit.notes) && visit.notes.length > 0) {
      const notesText = visit.notes
        .map(note => note.text)
        .filter(text => text && text.trim())
        .join(' ');
      if (notesText) {
        contentParts.push(notesText);
      }
    }
    
    // Combine all content
    const combinedText = contentParts.join(' ').trim();
    return combinedText; // Return empty string if no content
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

  // Handle card click - navigate to meeting notes or toggle selection
  const handleCardClick = (visitId: string) => {
    if (isSelectionMode) {
      // In selection mode, toggle card selection
      const newSelected = new Set(selectedCards);
      if (newSelected.has(visitId)) {
        newSelected.delete(visitId);
      } else {
        newSelected.add(visitId);
      }
      setSelectedCards(newSelected);
    } else {
      // Normal mode, navigate to meeting notes
      navigate(`/meeting-notes/${visitId}`);
    }
  };

  // Long press handlers - enter selection mode
  const handleMouseDown = (visitId: string) => {
    setIsLongPressing(true);
      const timer = setTimeout(() => {
      // Enter selection mode and select this card
      setIsSelectionMode(true);
      setSelectedCards(new Set([visitId]));
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
      // Enter selection mode and select this card
      setIsSelectionMode(true);
      setSelectedCards(new Set([visitId]));
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
    <div className="min-h-screen bg-background">
      <div className="p-4">
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">Loading notes…</div>
      )}
      {notesError && !isLoading && (
        <div className="text-center py-8 text-red-500">Error loading notes: {String(notesError)}</div>
      )}
      {!hasNotes && !isLoading && !notesError && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No notes found for the selected criteria.</p>
            <p className="text-sm mt-2">Try adjusting the date range or CCI filter.</p>
        </div>
      )}
      {hasNotes && (
        <>
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <Pin className="h-5 w-5 text-primary" />
                  Pinned Notes ({pinnedNotes.length})
              </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {pinnedNotes.map((v: VisitDoc) => {
                    const isSelected = selectedCards.has(v.id);
                    return (
                    <Card
                      key={v.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 bg-card border border-border rounded-lg overflow-hidden ${
                        isLongPressing ? 'scale-95' : ''
                      } ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      } ${
                        isSelectionMode ? 'relative' : ''
                      }`}
                      onClick={() => handleCardClick(v.id)}
                      onMouseDown={() => handleMouseDown(v.id)}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseLeave}
                      onTouchStart={() => handleTouchStart(v.id)}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="p-4 h-48 flex flex-col">
                        {/* Selection indicator and pin indicator */}
                        <div className="flex justify-between items-start mb-2">
                          {isSelectionMode && (
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          )}
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
                    );
                  })}
                </div>
            </div>
          )}

          {/* Regular Notes Section */}
            {regularNotes.length > 0 && (
          <div>
                <h2 className="text-lg font-semibold mb-4 text-foreground">
                All Notes ({regularNotes.length})
              </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {regularNotes.map((v: VisitDoc) => {
                    const isSelected = selectedCards.has(v.id);
                    return (
                    <Card
                      key={v.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 bg-card border border-border rounded-lg overflow-hidden ${
                        isLongPressing ? 'scale-95' : ''
                      } ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      } ${
                        isSelectionMode ? 'relative' : ''
                      }`}
                      onClick={() => handleCardClick(v.id)}
                      onMouseDown={() => handleMouseDown(v.id)}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseLeave}
                      onTouchStart={() => handleTouchStart(v.id)}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="p-4 h-48 flex flex-col">
                        {/* Selection indicator */}
                        {isSelectionMode && (
                          <div className="flex justify-start mb-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )}
                        
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
                    );
                  })}
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