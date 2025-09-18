import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { usersCollection, visitsCollection } from '@/firebase/paths'
import { startOfWeek, addDays, format } from 'date-fns'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface UserProfile {
  id: string
  uid: string
  email: string
  username?: string
  role: string
}

interface VisitDoc {
  id: string
  date: any
  debrief?: string
  filledByUid: string
}

const Stats: React.FC = () => {
  const { data: allUsers } = useFirestoreCollection<UserProfile>(usersCollection())
  const { data: visitsRaw, isLoading, error } = useFirestoreCollection<VisitDoc>(visitsCollection())

  const [roleMode, setRoleMode] = useState<'EM' | 'Visitor'>('EM')
  const [showOnlyComplete, setShowOnlyComplete] = useState<boolean>(true)

  const participants = useMemo(() => {
    // build unique userIds from visits matching selected role
    const ids = new Set<string>()
    for (const v of (visitsRaw || [])) {
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
  }, [visitsRaw, allUsers, roleMode, showOnlyComplete])

  const rows = useMemo(() => {
    const toDate = (val: any): Date => val?.toDate ? val.toDate() : new Date(val)
    const counts = new Map<string, Map<string, number>>()
    const weekMeta = new Map<string, { label: string; start: Date; end: Date }>()
    
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
    
    for (const v of (visitsRaw || [])) {
      const complete = !!v.debrief && v.debrief.trim() !== ''
      if (showOnlyComplete && !complete) continue
      if ((v as any).filledBy !== roleMode) continue
      const d = toDate(v.date)
      const weekStart = startOfWeek(d, { weekStartsOn: 1 })
      const weekEnd = addDays(weekStart, 5)
      const weekNum = getFinancialWeek(weekStart)
      const label = `W${weekNum} - ${format(weekStart, 'MMM do')} - ${format(weekEnd, 'MMM do')}`
      const key = `${weekNum}-${format(weekStart, 'yyyy-MM-dd')}`
      if (!counts.has(key)) counts.set(key, new Map())
      if (!weekMeta.has(key)) weekMeta.set(key, { label, start: weekStart, end: weekEnd })
      const emUid = v.filledByUid
      if (!emUid) continue
      const row = counts.get(key)!
      row.set(emUid, (row.get(emUid) || 0) + 1)
    }
    const weeks = Array.from(weekMeta.entries()).sort((a, b) => a[1].start.getTime() - b[1].start.getTime())
    return { counts, weeks }
  }, [visitsRaw, roleMode, showOnlyComplete])

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Weekly Visits</CardTitle>
                <CardDescription>Weeks are Monday–Saturday. A visit is complete when Debrief is not blank.</CardDescription>
              </div>
              <div className="flex gap-3">
                <div className="w-40">
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
                <div className="w-48">
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
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Week</TableHead>
                      {participants.map(p => (
                        <TableHead key={p.uid} className="min-w-[120px] text-center break-words">{p.label}</TableHead>
                      ))}
                      <TableHead className="whitespace-nowrap min-w-[80px] text-center font-bold bg-gray-100">Total</TableHead>
                    </TableRow>
                    {/* Column totals row */}
                    <TableRow className="bg-gray-100">
                      <TableHead className="sticky left-0 bg-gray-100 z-10 min-w-[200px] font-bold">Total</TableHead>
                      {participants.map(p => {
                        const colTotal = rows.weeks.reduce((sum, [key]) => {
                          const row = rows.counts.get(key) || new Map<string, number>()
                          return sum + (row.get(p.uid) || 0)
                        }, 0)
                        return (
                          <TableHead key={p.uid} className="min-w-[120px] text-center font-bold break-words">{colTotal}</TableHead>
                        )
                      })}
                      <TableHead className="whitespace-nowrap min-w-[80px] text-center font-bold bg-gray-100">
                        {rows.weeks.reduce((sum, [key]) => {
                          const row = rows.counts.get(key) || new Map<string, number>()
                          return sum + Array.from(row.values()).reduce((rowSum, count) => rowSum + count, 0)
                        }, 0)}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.weeks.map(([key, meta]) => {
                      const row = rows.counts.get(key) || new Map<string, number>()
                      const rowTotal = Array.from(row.values()).reduce((sum, count) => sum + count, 0)
                      return (
                        <TableRow key={key}>
                          <TableCell className="font-medium sticky left-0 bg-background z-10 min-w-[200px]">{meta.label}</TableCell>
                          {participants.map(p => (
                            <TableCell key={p.uid} className="text-center">{row.get(p.uid) || 0}</TableCell>
                          ))}
                          <TableCell className="text-center font-bold bg-gray-100">{rowTotal}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Stats


