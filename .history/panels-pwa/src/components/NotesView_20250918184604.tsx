import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useSelectedDateStore } from '@/store/selectedDate';
import { useTitleBarSlots } from '@/store/titleBarSlots';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { visitsCollection } from '@/firebase/paths';
import { Select } from '@/components/ui/select';
import DateRangePicker from '@/components/ui/DateRangePicker';
import type { DateRangeValue } from '@/components/ui/DateRangePicker';

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
  const { selectedDate } = useSelectedDateStore();
  const { setSlots, clearSlots } = useTitleBarSlots();
  const { data: allVisits } = useFirestoreCollection<VisitDoc>(visitsCollection());

  const [selectedCci, setSelectedCci] = useState<string>('all');
  const [range, setRange] = useState<DateRangeValue>({});

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
  const filtered = useMemo(() => {
    const items = (allVisits || []).filter(v => {
      const d = timestampToDate(v.date);
      if (!d) return false;
      if (selectedCci !== 'all' && v.cci_id !== selectedCci) return false;
      if (range?.from && d < range.from) return false;
      if (range?.to && d > range.to) return false;
      return true;
    });
    return items.sort((a,b) => {
      const da = timestampToDate(a.date)!.getTime();
      const db = timestampToDate(b.date)!.getTime();
      return db - da; // most recent first
    });
  }, [allVisits, selectedCci, range]);

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {(filtered || []).map((v) => {
          const date = timestampToDate(v.date);
          return (
            <Card key={v.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => (window.location.href = `/meeting-notes/${v.id}?mode=view`)}>
              <div className="text-[10px] text-gray-500 mb-1">{date ? date.toLocaleDateString() : ''}</div>
              <div className="font-semibold text-sm mb-1 truncate">{v.cci_name}</div>
              <div className="text-xs text-gray-700 line-clamp-5 whitespace-pre-wrap">
                {(v.debrief || v.agenda || '').replace(/<[^>]*>/g, '')}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default NotesView;


