import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { usersCollection, visitsCollection } from '@/firebase/paths'
import { startOfWeek, addDays, getISOWeek, format } from 'date-fns'

interface UserProfile {
  id: string
  uid: string
  email: string
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

  const emUsers = useMemo(() => (allUsers || []).filter(u => u.role === 'EM'), [allUsers])

  const rows = useMemo(() => {
    const toDate = (val: any): Date => val?.toDate ? val.toDate() : new Date(val)
    const counts = new Map<string, Map<string, number>>()
    const weekMeta = new Map<string, { label: string; start: Date; end: Date }>()
    for (const v of (visitsRaw || [])) {
      if (!v.debrief || v.debrief.trim() === '') continue
      const d = toDate(v.date)
      const weekStart = startOfWeek(d, { weekStartsOn: 1 })
      const weekEnd = addDays(weekStart, 5)
      const weekNum = getISOWeek(weekStart)
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
  }, [visitsRaw])

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Visits by Embedded Manager</CardTitle>
            <CardDescription>Weeks are Monday–Saturday. A visit is complete when Debrief is not blank.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="py-8 text-center text-destructive">Failed to load.</div>
            ) : emUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No EM users found.</div>
            ) : !rows || rows.weeks.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No completed visits found.</div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      {emUsers.map(u => (
                        <TableHead key={u.uid} className="whitespace-nowrap">{u.email}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.weeks.map(([key, meta]) => {
                      const row = rows.counts.get(key) || new Map<string, number>()
                      return (
                        <TableRow key={key}>
                          <TableCell className="font-medium whitespace-nowrap">{meta.label}</TableCell>
                          {emUsers.map(u => (
                            <TableCell key={u.uid} className="text-center">{row.get(u.uid) || 0}</TableCell>
                          ))}
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


