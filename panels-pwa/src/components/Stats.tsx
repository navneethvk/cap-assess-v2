import React, { useMemo, useState, useEffect } from 'react'
import useAuthStore from '../store/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { useUserVisits } from '@/hooks/useUserVisits'
import { useUsersForVisits } from '@/hooks/useUsersForVisits'
import { visitsCollection } from '@/firebase/paths'
// Removed date-fns imports - using native JavaScript date methods
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface VisitDoc {
  id: string
  date: any
  debrief?: string
  filledByUid: string
}

const Stats: React.FC = () => {
  const { user } = useAuthStore()
  const { data: allUsers } = useUsersForVisits()
  const [isAdmin, setIsAdmin] = useState(false)

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

  // Always call both hooks to maintain hook order, but only use the appropriate one
  const { data: visitsRawAdmin, isLoading: isLoadingAdmin, error: errorAdmin } = useFirestoreCollection<VisitDoc>(visitsCollection())
  const { data: visitsRawUser, isLoading: isLoadingUser, error: errorUser } = useUserVisits<VisitDoc>(visitsCollection())
  
  // Select the appropriate data based on admin status
  const visitsRaw = isAdmin ? visitsRawAdmin : visitsRawUser
  const isLoading = isAdmin ? isLoadingAdmin : isLoadingUser
  const error = isAdmin ? errorAdmin : errorUser

  const [roleMode, setRoleMode] = useState<'EM' | 'Visitor'>('EM')
  const [showOnlyComplete, setShowOnlyComplete] = useState<boolean>(true)

  const participants = useMemo(() => {
    if (!visitsRaw || error) {
      return []
    }
    
    // build unique userIds from visits matching selected role
    const ids = new Set<string>()
    for (const v of visitsRaw) {
      const complete = !!v.debrief && v.debrief.trim() !== ''
      if (showOnlyComplete && !complete) continue
      if ((v as any).filledBy !== roleMode) continue
      if (v.filledByUid) ids.add(v.filledByUid)
    }
    const list = Array.from(ids)
    // map to labels via users, fallback to uid prefix
    return list.map(uid => {
      const user = (allUsers || []).find(u => u.uid === uid)
      const label = user?.username || user?.email || `${uid.slice(0,6)}…`
      return { uid, label }
    })
  }, [visitsRaw, allUsers, roleMode, showOnlyComplete, error])

  const rows = useMemo(() => {
    if (!visitsRaw || error) {
      return { counts: new Map(), weeks: [] }
    }
    
    const toDate = (val: any): Date | null => {
      try {
        if (!val) return null;
        const date = val?.toDate ? val.toDate() : new Date(val);
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    }
    
    const counts = new Map<string, Map<string, number>>()
    const weekMeta = new Map<string, { label: string; start: Date; end: Date }>()
    
    // Helper function to get start of week (Monday)
    const getStartOfWeek = (date: Date): Date => {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      return new Date(date.setDate(diff));
    }
    
    // Helper function to add days to a date
    const addDays = (date: Date, days: number): Date => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    }
    
    // Helper function to format date as MMM do (e.g., "Jan 1st")
    const formatDate = (date: Date): string => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = date.getDate();
      const suffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                    day === 2 || day === 22 ? 'nd' : 
                    day === 3 || day === 23 ? 'rd' : 'th';
      return `${months[date.getMonth()]} ${day}${suffix}`;
    }
    
    // Helper function to format date as yyyy-MM-dd
    const formatDateKey = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Calculate financial year week number (starting from April 1st)
    const getFinancialWeek = (date: Date): number => {
      const year = date.getFullYear()
      const april1 = new Date(year, 3, 1) // April 1st (month is 0-indexed)
      const isBeforeApril = date < april1
      const financialYear = isBeforeApril ? year - 1 : year
      const financialApril1 = new Date(financialYear, 3, 1)
      const daysDiff = Math.floor((date.getTime() - financialApril1.getTime()) / (1000 * 60 * 60 * 24))
      return Math.floor(daysDiff / 7) + 1
    }
    
    for (const v of visitsRaw) {
      const complete = !!v.debrief && v.debrief.trim() !== ''
      if (showOnlyComplete && !complete) continue
      if ((v as any).filledBy !== roleMode) continue
      
      const d = toDate(v.date)
      if (!d) continue; // Skip invalid dates
      
      const weekStart = getStartOfWeek(new Date(d)) // Create new date to avoid mutation
      const weekEnd = addDays(new Date(weekStart), 5)
      const weekNum = getFinancialWeek(weekStart)
      const label = `W${weekNum} - ${formatDate(weekStart)} - ${formatDate(weekEnd)}`
      const key = `${weekNum}-${formatDateKey(weekStart)}`
      if (!counts.has(key)) counts.set(key, new Map())
      if (!weekMeta.has(key)) weekMeta.set(key, { label, start: weekStart, end: weekEnd })
      const emUid = v.filledByUid
      if (!emUid) continue
      const row = counts.get(key)!
      row.set(emUid, (row.get(emUid) || 0) + 1)
    }
    const weeks = Array.from(weekMeta.entries()).sort((a, b) => a[1].start.getTime() - b[1].start.getTime())
    return { counts, weeks }
  }, [visitsRaw, roleMode, showOnlyComplete, error])

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-600">
                Error loading stats: {error.message || 'Unknown error'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-10 lg:py-12 xl:py-16">
        <Card>
          <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Weekly Visits</CardTitle>
                <CardDescription className="text-sm">Weeks are Monday–Saturday. A visit is complete when Debrief is not blank.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-40">
                  <Select value={roleMode} onValueChange={(v) => setRoleMode(v as 'EM' | 'Visitor')}>
                    <SelectTrigger className="rounded-full">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent style={{ backgroundColor: 'white', backdropFilter: 'none' }}>
                      <SelectItem value="EM" style={{ backgroundColor: 'white' }}>EM stats</SelectItem>
                      <SelectItem value="Visitor" style={{ backgroundColor: 'white' }}>Visitor stats</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={showOnlyComplete ? 'complete' : 'all'} onValueChange={(v) => setShowOnlyComplete(v === 'complete')}>
                    <SelectTrigger className="rounded-full">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent style={{ backgroundColor: 'white', backdropFilter: 'none' }}>
                      <SelectItem value="complete" style={{ backgroundColor: 'white' }}>Complete visits only</SelectItem>
                      <SelectItem value="all" style={{ backgroundColor: 'white' }}>All visits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="py-8 text-center text-destructive">Failed to load.</div>
            ) : participants.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No participants found for {roleMode}.</div>
            ) : !rows || rows.weeks.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No completed visits found.</div>
            ) : (
              <div className="flex justify-center -mx-4 sm:mx-0">
                <div className="overflow-x-auto w-full max-w-full">
                  <div className="min-w-max px-2 sm:px-0">
                    {/* Month Calendar Style Grid - Dynamic Columns */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden min-w-full">
                      {/* Header Row - Week Column + All Participants + Row Total */}
                      <div className="flex bg-gray-100 border-b border-gray-200">
                        <div className="flex-shrink-0 w-24 sm:w-32 p-1 md:p-2 text-center text-xs md:text-sm font-medium text-gray-600 border-r border-gray-200">
                          <span className="hidden sm:inline">Week</span>
                          <span className="sm:hidden">W</span>
                        </div>
                        {participants.map(p => (
                          <div key={p.uid} className="flex-shrink-0 w-16 sm:w-20 p-1 md:p-2 text-center text-xs md:text-sm font-medium text-gray-600 border-r border-gray-200">
                            <div className="break-words text-[8px] md:text-xs">
                              {p.label.length > 8 ? `${p.label.slice(0, 6)}...` : p.label}
                            </div>
                          </div>
                        ))}
                        <div className="flex-shrink-0 w-16 sm:w-20 p-1 md:p-2 text-center text-xs md:text-sm font-bold text-gray-700 bg-gray-100">
                          <span className="hidden sm:inline">Total</span>
                          <span className="sm:hidden">T</span>
                        </div>
                      </div>
                      
                      {/* Column Totals Row */}
                      <div className="flex bg-gray-100 border-b border-gray-200">
                        <div className="flex-shrink-0 w-24 sm:w-32 p-1 md:p-2 text-center text-xs md:text-sm font-bold text-gray-700 border-r border-gray-200">
                          <span className="hidden sm:inline">Total</span>
                          <span className="sm:hidden">T</span>
                        </div>
                        {participants.map(p => {
                          const colTotal = rows.weeks.reduce((sum, [key]) => {
                            const row = rows.counts.get(key) || new Map<string, number>()
                            return sum + (row.get(p.uid) || 0)
                          }, 0)
                          return (
                            <div key={p.uid} className="flex-shrink-0 w-16 sm:w-20 p-1 md:p-2 text-center text-xs md:text-sm font-bold text-gray-700 border-r border-gray-200">
                              {colTotal}
                            </div>
                          )
                        })}
                        <div className="flex-shrink-0 w-16 sm:w-20 p-1 md:p-2 text-center text-xs md:text-sm font-bold text-gray-700 bg-gray-100">
                          {rows.weeks.reduce((sum: number, [key]) => {
                            const row = rows.counts.get(key) || new Map<string, number>()
                            return sum + Array.from(row.values()).reduce((rowSum: number, count: unknown) => rowSum + (count as number), 0)
                          }, 0).toString()}
                        </div>
                      </div>
                      
                      {/* Data Rows */}
                      {rows.weeks.map(([key, meta]) => {
                        const row = rows.counts.get(key) || new Map<string, number>()
                        const rowTotal = Array.from(row.values() as number[]).reduce((sum: number, count: number) => sum + count, 0)
                        return (
                          <div key={key} className="flex border-b border-gray-200 last:border-b-0">
                            <div className="flex-shrink-0 w-24 sm:w-32 p-1 md:p-2 text-center text-xs md:text-sm font-medium bg-white border-r border-gray-200">
                              <div className="break-words">
                                <span className="hidden sm:inline">{meta.label}</span>
                                <span className="sm:hidden text-[8px]">
                                  W{key.split('-')[0]}<br />
                                  {meta.start.getMonth() + 1}/{meta.start.getDate()}-{meta.end.getMonth() + 1}/{meta.end.getDate()}
                                </span>
                              </div>
                            </div>
                            {participants.map(p => (
                              <div key={p.uid} className="flex-shrink-0 w-16 sm:w-20 p-1 md:p-2 text-center text-xs md:text-sm bg-white border-r border-gray-200 hover:bg-gray-50">
                                {row.get(p.uid) || 0}
                              </div>
                            ))}
                            <div className="flex-shrink-0 w-16 sm:w-20 p-1 md:p-2 text-center text-xs md:text-sm font-bold bg-gray-100">
                              {rowTotal.toString()}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Stats


