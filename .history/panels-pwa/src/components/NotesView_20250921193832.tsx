import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useTitleBarSlots } from '@/store/titleBarSlots';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { visitsCollection } from '@/firebase/paths';
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
  pinned?: boolean;
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
  const { data: allVisits, mutate } = useFirestoreCollection<VisitDoc>(visitsCollection());

  const [selectedCci, setSelectedCci] = useState<string>('all');
  const [range, setRange] = useState<DateRangeValue>({});

  // Pin/unpin functionality
  const handleTogglePin = async (visitId: string, currentPinned: boolean) => {
    try {
      await updateDocument('visits', visitId, { pinned: !currentPinned });
      await mutate(); // Refresh the data
      notify.success(currentPinned ? 'Note unpinned' : 'Note pinned');
    } catch (error) {
      notify.error('Failed to update pin status');
    }
  };

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
    const items = (allVisits || []).filter(v => {
      const d = timestampToDate(v.date);
      if (!d) return false;
      if (selectedCci !== 'all' && v.cci_id !== selectedCci) return false;
      if (range?.from && d < range.from) return false;
      if (range?.to && d > range.to) return false;
      return true;
    });
    
    const sorted = items.sort((a,b) => {
      const da = timestampToDate(a.date)!.getTime();
      const db = timestampToDate(b.date)!.getTime();
      return db - da; // most recent first
    });
    
    return {
      pinnedNotes: sorted.filter(v => v.pinned),
      regularNotes: sorted.filter(v => !v.pinned)
    };
  }, [allVisits, selectedCci, range]);

  // Helper component for rendering note cards
  const NoteCard: React.FC<{ visit: VisitDoc }> = ({ visit }) => {
    const date = timestampToDate(visit.date);
    return (
      <PinButton
        isPinned={visit.pinned || false}
        onToggle={() => handleTogglePin(visit.id, visit.pinned || false)}
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

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
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
    </div>
  );
};

export default NotesView;


