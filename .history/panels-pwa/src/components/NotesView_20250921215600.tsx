import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useTitleBarSlots } from '@/store/titleBarSlots';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { useUserVisits } from '@/hooks/useUserVisits';
import useAuthStore from '@/store/authStore';
// import { visitsCollection } from '@/firebase/paths'; // Temporarily disabled
import DateRangePicker from '@/components/ui/DateRangePicker';
import type { DateRangeValue } from '@/components/ui/DateRangePicker';
import PinButton from './PinButton';
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
  const { togglePin, isLoading: isPinning, pinnedVisits } = useUserPinnedVisits();

  const [selectedCci, setSelectedCci] = useState<string>('all');
  const [range, setRange] = useState<DateRangeValue>({});
  const [isAdmin, setIsAdmin] = useState(false);

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
  console.log('NotesView: isAdmin:', isAdmin);
  console.log('NotesView: visitsRaw count:', visitsRaw?.length || 0);
  console.log('NotesView: userVisits count:', userVisits?.length || 0);
  console.log('NotesView: allVisits count:', allVisits?.length || 0);
  console.log('NotesView: user:', user?.uid);
  console.log('NotesView: pinnedVisits:', pinnedVisits);
  console.log('NotesView: isPinning:', isPinning);

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
      customRight: null,
    });
    return () => clearSlots();
  }, [setSlots, clearSlots, cciOptions, selectedCci, range]);

  // Filter and sort notes
  const { pinnedNotes, regularNotes } = useMemo(() => {
    console.log('NotesView: allVisits count:', allVisits?.length || 0);
    console.log('NotesView: selectedCci:', selectedCci);
    console.log('NotesView: range:', range);
    console.log('NotesView: allVisits sample:', allVisits?.slice(0, 2));
    
    const items = (allVisits || []).filter(v => {
      const d = timestampToDate(v.date);
      console.log('NotesView: filtering visit:', v.id, 'date:', v.date, 'parsed:', d);
      if (!d) {
        console.log('NotesView: skipping visit due to invalid date:', v.id);
        return false;
      }
      if (selectedCci !== 'all' && v.cci_id !== selectedCci) {
        console.log('NotesView: skipping visit due to CCI filter:', v.id, 'cci_id:', v.cci_id, 'selectedCci:', selectedCci);
        return false;
      }
      if (range?.from && d < range.from) {
        console.log('NotesView: skipping visit due to date range (before):', v.id, 'date:', d, 'from:', range.from);
        return false;
      }
      if (range?.to && d > range.to) {
        console.log('NotesView: skipping visit due to date range (after):', v.id, 'date:', d, 'to:', range.to);
        return false;
      }
      console.log('NotesView: visit passed all filters:', v.id);
      return true;
    });
    
    console.log('NotesView: filtered items count:', items.length);
    console.log('NotesView: filtered items:', items.map(v => ({ id: v.id, cci_name: v.cci_name, date: v.date })));
    
    const sorted = items.sort((a,b) => {
      const da = timestampToDate(a.date)!.getTime();
      const db = timestampToDate(b.date)!.getTime();
      return db - da; // most recent first
    });
    
    const pinned = sorted.filter(v => pinnedVisits.includes(v.id));
    const regular = sorted.filter(v => !pinnedVisits.includes(v.id));
    
    console.log('NotesView: pinned count:', pinned.length);
    console.log('NotesView: regular count:', regular.length);
    
    return {
      pinnedNotes: pinned,
      regularNotes: regular
    };
  }, [allVisits, selectedCci, range, isPinned]);

  // Helper component for rendering note cards
  const NoteCard: React.FC<{ visit: VisitDoc }> = ({ visit }) => {
    const date = timestampToDate(visit.date);
    return (
      <PinButton
        isPinned={isPinned(visit.id)}
        onToggle={() => togglePin(visit.id)}
        className="h-full"
      >
        <Card 
          className="p-3 cursor-pointer hover:shadow-md transition-shadow h-full" 
          onClick={() => (window.location.href = `/meeting-notes/${visit.id}?mode=view`)}
        >
          <div className="text-[10px] text-gray-500 mb-1">{date ? date.toLocaleDateString() : ''}</div>
          <div className="font-semibold text-sm mb-1 truncate">{visit.cci_name}</div>
          <div className="text-xs text-gray-700 line-clamp-5 whitespace-pre-wrap">
            {(visit.debrief || visit.agenda || '').replace(/<[^>]*>/g, '')}
          </div>
        </Card>
      </PinButton>
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
                  <NoteCard key={v.id} visit={v} />
                ))}
              </div>
            </div>
          )}

          {/* Regular Notes Section */}
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-800">
              All Notes ({regularNotes.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {regularNotes.map((v) => (
                <NoteCard key={v.id} visit={v} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotesView;


