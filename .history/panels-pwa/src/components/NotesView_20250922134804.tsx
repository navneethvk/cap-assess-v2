import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTitleBarSlots } from '@/store/titleBarSlots';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { useUserVisits } from '@/hooks/useUserVisits';
import useAuthStore from '@/store/authStore';
// import { visitsCollection } from '@/firebase/paths'; // Temporarily disabled
import DateRangePicker from '@/components/ui/DateRangePicker';
import type { DateRangeValue } from '@/components/ui/DateRangePicker';
import { Pin, PinOff, Plus } from 'lucide-react';
import { useUserPinnedVisits } from '@/hooks/useUserPinnedVisits';

interface VisitDoc {
  id: string;
  date: any;
  cci_id: string;
  cci_name: string;
  agenda?: string;
  debrief?: string;
  filledByUid: string;
}

const timestampToDate = (val: any): Date | null => {
  try {
    if (!val) return null;
    if (val.toDate && typeof val.toDate === 'function') {
      const d = val.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === 'object' && 'seconds' in val) {
      const ms = val.seconds * 1000 + (val.nanoseconds || 0) / 1_000_000;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
};

const NotesView: React.FC = () => {
  const { setSlots, clearSlots } = useTitleBarSlots();
  const { user } = useAuthStore();
  const { togglePin, pinnedVisits } = useUserPinnedVisits();

  const [selectedCci, setSelectedCci] = useState<string>('all');
  const [range, setRange] = useState<DateRangeValue>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult(true);
          const role = idTokenResult.claims.role as string;
          setIsAdmin(role === 'Admin');
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user]);

  // Data fetching - use same pattern as MonthCalendar
  const { data: visitsRaw, mutate: mutateVisitsRaw } = useFirestoreCollection<VisitDoc>('visits', { revalidateOnFocus: false });
  const { data: userVisits, mutate: mutateUserVisits } = useUserVisits('visits');

  // Use the appropriate data source based on admin status
  const allVisits = isAdmin ? visitsRaw : userVisits;

  // Debug logging
  console.log('NotesView: allVisits count:', allVisits?.length || 0);

  // Refresh data when component mounts to clear any cache issues
  useEffect(() => {
    const refreshData = async () => {
      try {
        await Promise.all([mutateVisitsRaw(), mutateUserVisits()]);
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    };
    refreshData();
  }, [mutateVisitsRaw, mutateUserVisits]);

  // Build list of CCIs user has in the data set
  const cciOptions = useMemo(() => {
    const map = new Map<string, string>();
    (allVisits || []).forEach((v) => {
      if (v.cci_id) map.set(v.cci_id, v.cci_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allVisits]);

  useEffect(() => {
    // Inject controls into the global title bar
    setSlots({
      customLeft: (
        <DateRangePicker value={range} onChange={setRange} />
      ),
      customCenter: (
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
      ),
      customRight: selectedCardId ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
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
      ) : null,
    });
    return () => clearSlots();
  }, [setSlots, clearSlots, cciOptions, selectedCci, range, selectedCardId, pinnedVisits, togglePin]);

  // Filter and sort notes
  const { pinnedNotes, regularNotes } = useMemo(() => {
    if (!allVisits || allVisits.length === 0) {
      return { pinnedNotes: [], regularNotes: [] };
    }
    
    const items = allVisits.filter(v => {
      const d = timestampToDate(v.date);
      if (!d) return false;
      if (selectedCci !== 'all' && v.cci_id !== selectedCci) return false;
      if (range?.from && d < range.from) return false;
      if (range?.to && d > range.to) return false;
      return true;
    });
    
    const sorted = items.sort((a,b) => {
      const da = timestampToDate(a.date);
      const db = timestampToDate(b.date);
      if (!da || !db) return 0; // Keep original order if dates are invalid
      return db.getTime() - da.getTime(); // most recent first
    });
    
    const pinned = sorted.filter(v => pinnedVisits.includes(v.id));
    const regular = sorted.filter(v => !pinnedVisits.includes(v.id));
    
    return {
      pinnedNotes: pinned,
      regularNotes: regular
    };
  }, [allVisits, selectedCci, range, pinnedVisits]);

  // Helper component for rendering note cards
  const NoteCard: React.FC<{ visit: VisitDoc }> = ({ visit }) => {
    const date = timestampToDate(visit.date);
    const isPinned = pinnedVisits.includes(visit.id);
    const isSelected = selectedCardId === visit.id;
    
    const handlePressAndHold = () => {
      setSelectedCardId(visit.id);
    };
    
    const handleClick = () => {
      if (!isSelected) {
        window.location.href = `/meeting-notes/${visit.id}?mode=view`;
      }
    };
    
    return (
      <div className="relative h-full">
        <Card 
          className={`p-3 cursor-pointer hover:shadow-md transition-all duration-200 h-full ${
            isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
          }`}
          onClick={handleClick}
          onMouseDown={handlePressAndHold}
          onTouchStart={handlePressAndHold}
        >
          <div className="text-[10px] text-gray-500 mb-1">{date ? date.toLocaleDateString('en-IN') : ''}</div>
          <div className="font-semibold text-sm mb-1 truncate">{visit.cci_name}</div>
          <div className="text-xs text-gray-700 line-clamp-5 whitespace-pre-wrap">
            {(visit.debrief || visit.agenda || '').replace(/<[^>]*>/g, '')}
          </div>
        </Card>
        
        {/* Pin indicator */}
        {isPinned && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-md z-10">
            <Pin className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  };

  // Fallback: if no notes are showing, show all visits without pinning
  const allNotes = [...pinnedNotes, ...regularNotes];
  const hasNotes = allNotes.length > 0;


  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
      {!hasNotes && (
        <div className="text-center py-8 text-gray-500">
          <p>No notes found. Check console for debugging info.</p>
          <p className="text-sm mt-2">Total visits: {allVisits?.length || 0}</p>
          <p className="text-sm mt-2">Filtered notes: {allNotes.length}</p>
          <p className="text-sm mt-2">Pinned: {pinnedNotes.length}, Regular: {regularNotes.length}</p>
        </div>
      )}

      {hasNotes && (
        <>
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                📌 Pinned Notes ({pinnedNotes.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {pinnedNotes.map((v) => (
                  <NoteCard key={v.id} visit={v as VisitDoc} />
                ))}
              </div>
            </div>
          )}

          {/* Regular Notes Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">
                All Notes ({regularNotes.length})
              </h2>
              <Button
                onClick={() => {
                  const today = new Date();
                  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
                  window.location.href = `/meeting-notes/new?mode=edit&date=${todayStr}`;
                }}
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                title="Add New Note"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {regularNotes.map((v) => (
                <NoteCard key={v.id} visit={v as VisitDoc} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotesView;


