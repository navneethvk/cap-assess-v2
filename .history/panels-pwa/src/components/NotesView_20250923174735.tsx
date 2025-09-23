import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button, buttonConfigs } from '@/components/ui/button';
import { useTitleBarSlots } from '@/store/titleBarSlots';
import { useVisitsInRange } from '@/hooks/useVisitQueries';
import DateRangePicker from '@/components/ui/DateRangePicker';
import type { DateRangeValue } from '@/components/ui/DateRangePicker';
import { Pin, PinOff } from 'lucide-react';
import { useUserPinnedVisits } from '@/hooks/useUserPinnedVisits';
import type { VisitDoc } from '@/types/firestore';
import { timestampToDate } from '@/types/firestore';

// Helper function to parse date from string or Date
const parseDate = (dateInput: string | Date): Date | null => {
  try {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
};

const NotesView: React.FC = () => {
  const { setSlots, clearSlots } = useTitleBarSlots();
  // const { user } = useAuthStore();
  const { togglePin, pinnedVisits } = useUserPinnedVisits();

  const createDefaultRange = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from: startOfMonth, to: endOfMonth }
  }

  const [range, setRange] = useState<DateRangeValue>(createDefaultRange)
  const [selectedCci, setSelectedCci] = useState<string>('all')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

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

  // Handle card selection
  const handleCardClick = (visitId: string) => {
    setSelectedCardId(selectedCardId === visitId ? null : visitId);
  };

  // Fallback: if no notes are showing, show all visits without pinning
  const allNotes = [...pinnedNotes, ...regularNotes];
  const hasNotes = allNotes.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* TEMPORARY: Inline controls (Date range and CCI dropdown moved to title bar) */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-wrap gap-4 items-center">
          {selectedCardId && (
            <div className="flex items-center gap-2">
              <Button
                {...buttonConfigs.primarySmall}
                onClick={() => {
                  togglePin(selectedCardId);
                  setSelectedCardId(null);
                }}
                className="h-7 px-2 text-xs"
              >
                {pinnedVisits.includes(selectedCardId) ? (
                  <>
                    <PinOff className="h-3 w-3 mr-1" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-3 w-3 mr-1" />
                    Pin
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCardId(null)}
                className="h-7 px-2 text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="p-3 sm:p-4">
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
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Pin className="h-5 w-5 text-blue-600" />
                Pinned Notes ({pinnedNotes.length})
              </h2>
              <div className="space-y-4">
                {pinnedNotes.map((v: VisitDoc) => (
                  <Card
                    key={v.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedCardId === v.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
                    }`}
                    onClick={() => handleCardClick(v.id)}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{v.cci_name || 'Unknown CCI'}</h3>
                        <span className="text-sm text-gray-500">
                          {parseDate(v.date)?.toLocaleDateString() || 'Invalid Date'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {typeof v.notes === 'string' ? v.notes : 'No notes available'}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Regular Notes Section */}
          {regularNotes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">All Notes ({regularNotes.length})</h2>
              <div className="space-y-4">
                {regularNotes.map((v: VisitDoc) => (
                  <Card
                    key={v.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedCardId === v.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
                    }`}
                    onClick={() => handleCardClick(v.id)}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{v.cci_name || 'Unknown CCI'}</h3>
                        <span className="text-sm text-gray-500">
                          {parseDate(v.date)?.toLocaleDateString() || 'Invalid Date'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {typeof v.notes === 'string' ? v.notes : 'No notes available'}
                      </p>
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