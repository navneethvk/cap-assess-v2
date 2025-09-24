import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useWeeklyVisitsCount } from '@/hooks/useInsightData'
// Removed date-fns imports - using native JavaScript date methods
import { PillSelector } from '@/components/ui/pill-selector'
import { UserCircle2, Users, CheckCircle2, Filter } from 'lucide-react'

const roleOptions = [
  { label: 'EM stats', value: 'EM', icon: UserCircle2, iconColor: 'text-primary' },
  { label: 'Visitor stats', value: 'Visitor', icon: Users, iconColor: 'text-muted-foreground' }
];

const filterOptions = [
  { label: 'All visits', value: 'all', icon: Filter, iconColor: 'text-muted-foreground' },
  { label: 'Complete only', value: 'complete', icon: CheckCircle2, iconColor: 'text-success' }
];

const Stats: React.FC = () => {
  // Note: Individual user data not available in pre-aggregated insights
  // Note: Admin status not needed for insight-only data

  // Note: Admin status check removed - not needed for insight-only data

  // Use only insight data (pre-aggregated)
  const { data: weeklyData, loading: isLoading, error } = useWeeklyVisitsCount(52); // Get up to 52 weeks of data

  const [roleMode, setRoleMode] = useState<'EM' | 'Visitor'>('EM')
  const [showOnlyComplete, setShowOnlyComplete] = useState<boolean>(true)

  const participants = useMemo(() => {
    // Use the new user-level aggregation data
    if (!weeklyData || weeklyData.length === 0) {
      return []
    }
    
    // Get the most recent week's data for user breakdown
    const mostRecentWeek = weeklyData[0]
    
    // Try to get participants from the new perUserStats structure first
    if (mostRecentWeek?.userBreakdown?.perUserStats) {
      const userEntries = Object.entries(mostRecentWeek.userBreakdown.perUserStats)
        .filter(([_, userData]) => {
          // Filter by current role mode
          if (roleMode === 'EM' && userData.role === 'EM') return true
          if (roleMode === 'Visitor' && userData.role === 'Visitor') return true
          return false
        })
        .map(([userKey, userData]) => ({
          uid: userData.uid,
          label: userData.username || userData.email || userData.uid,
          role: userData.role,
          visitCount: showOnlyComplete 
            ? userData.weeklyStats.completeVisits
            : userData.weeklyStats.totalVisits
        }))
        .filter(user => user.visitCount > 0) // Only show users with visits
        .sort((a, b) => b.visitCount - a.visitCount) // Sort by visit count
        
      if (userEntries.length > 0) {
        return userEntries
      }
    }
    
    // Fallback to topUsers structure
    if (mostRecentWeek?.userBreakdown?.topUsers) {
      return mostRecentWeek.userBreakdown.topUsers
        .filter(user => {
          // Filter by current role mode
          if (roleMode === 'EM' && user.role === 'EM') return true
          if (roleMode === 'Visitor' && user.role === 'Visitor') return true
          return false
        })
        .map(user => ({
          uid: user.uid,
          label: user.username || user.email || user.uid,
          role: user.role,
          visitCount: showOnlyComplete 
            ? (user.visitsByStatus?.complete || 0)
            : user.visitCount
        }))
        .filter(user => user.visitCount > 0) // Only show users with visits
    }
    
    return []
  }, [weeklyData, roleMode, showOnlyComplete])

  const rows = useMemo(() => {
    if (!weeklyData || error) {
      return { counts: new Map(), weeks: [] }
    }
    
    // Process insight data into the expected format
    const counts = new Map<string, Map<string, number>>()
    const weekMeta = new Map<string, { label: string; start: Date; end: Date }>()
    
    for (const weekData of weeklyData) {
      const weekStart = weekData.weekStart
      const weekEnd = weekData.weekEnd
      
      // Calculate financial year week number
      const getFinancialWeek = (date: Date): number => {
        const year = date.getFullYear()
        const april1 = new Date(year, 3, 1)
        const isBeforeApril = date < april1
        const financialYear = isBeforeApril ? year - 1 : year
        const financialApril1 = new Date(financialYear, 3, 1)
        const daysDiff = Math.floor((date.getTime() - financialApril1.getTime()) / (1000 * 60 * 60 * 24))
        return Math.floor(daysDiff / 7) + 1
      }
      
      const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-IN');
      }
      
      const formatDateKey = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      const weekNum = getFinancialWeek(weekStart)
      const label = `W${weekNum} - ${formatDate(weekStart)} - ${formatDate(weekEnd)}`
      const key = `${weekNum}-${formatDateKey(weekStart)}`
      
      weekMeta.set(key, { label, start: weekStart, end: weekEnd })
      
      // Use the new user-level aggregation data
      const userMap = new Map<string, number>()
      
      // Get user stats for this week using the new perUserStats structure
      if (weekData.userBreakdown?.perUserStats) {
        Object.entries(weekData.userBreakdown.perUserStats).forEach(([userKey, userData]) => {
          // Filter by role if needed
          if (roleMode === 'EM' && userData.role === 'EM') {
            const visitCount = showOnlyComplete 
              ? userData.weeklyStats.completeVisits
              : userData.weeklyStats.totalVisits
            if (visitCount > 0) {
              userMap.set(userData.uid, visitCount)
            }
          } else if (roleMode === 'Visitor' && userData.role === 'Visitor') {
            const visitCount = showOnlyComplete 
              ? userData.weeklyStats.completeVisits
              : userData.weeklyStats.totalVisits
            if (visitCount > 0) {
              userMap.set(userData.uid, visitCount)
            }
          }
        })
      }
      
      // Fallback to old userStats structure if perUserStats is not available
      if (userMap.size === 0 && weekData.userBreakdown?.userStats) {
        Object.entries(weekData.userBreakdown.userStats).forEach(([uid, userStat]) => {
          // Filter by role if needed
          if (roleMode === 'EM' && userStat.role === 'EM') {
            const visitCount = showOnlyComplete 
              ? (userStat.visitsByStatus.complete || 0)
              : userStat.visitCount
            if (visitCount > 0) {
              userMap.set(uid, visitCount)
            }
          } else if (roleMode === 'Visitor' && userStat.role === 'Visitor') {
            const visitCount = showOnlyComplete 
              ? (userStat.visitsByStatus.complete || 0)
              : userStat.visitCount
            if (visitCount > 0) {
              userMap.set(uid, visitCount)
            }
          }
        })
      }
      
      // Fallback to aggregated counts if no user-level data
      if (userMap.size === 0) {
        const roleCount = roleMode === 'EM' ? weekData.counts.byRole.em : weekData.counts.byRole.visitor
        if (roleCount > 0) {
          userMap.set('aggregated', roleCount)
        }
      }
      
      if (userMap.size > 0) {
        counts.set(key, userMap)
      }
    }
    
    const weeks = Array.from(weekMeta.entries()).sort((a, b) => a[1].start.getTime() - b[1].start.getTime())
    return { counts, weeks }
  }, [weeklyData, roleMode, error])

  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-600">
                Error loading stats: {error?.message || 'Unknown error'}
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
                <CardTitle className="flex items-center gap-2">
                  Weekly Visits
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Pre-aggregated
                  </span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Weeks are Monday–Saturday. A visit is complete when Debrief is not blank.
                  <span className="block text-xs text-muted-foreground mt-1">
                    Data updated daily at 12:00 AM IST
                    {weeklyData.length > 0 && (
                      <span className="block mt-1">
                        Last updated: {weeklyData[0].lastUpdatedDisplay}
                      </span>
                    )}
                  </span>
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-40">
                  <PillSelector
                    value={roleMode}
                    onChange={(v) => setRoleMode(v as 'EM' | 'Visitor')}
                    options={roleOptions}
                    size="md"
                    title="Audience"
                    titlePlacement="dropdown"
                    placeholder="Audience"
                    showDropdownIndicator
                    hidePlaceholderOptionInMenu={false}
                    showDropdownTitleWhenPlaceholder
                  />
                </div>
                <div className="w-full sm:w-48">
                  <PillSelector
                    value={showOnlyComplete ? 'complete' : 'all'}
                    onChange={(v) => setShowOnlyComplete(v === 'complete')}
                    options={filterOptions}
                    size="md"
                    title="Filter"
                    titlePlacement="dropdown"
                    placeholder="Filter"
                    showDropdownIndicator
                    hidePlaceholderOptionInMenu={false}
                    showDropdownTitleWhenPlaceholder
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="py-8 text-center">
                <div className="text-destructive mb-2">Failed to load insight data.</div>
                <div className="text-sm text-muted-foreground">
                  {error.message.includes('No insight data available') 
                    ? 'The Cloud Function may not have run yet to populate the data.'
                    : 'Please try again later.'}
                </div>
              </div>
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
                      <div className="flex bg-muted/50 border-b border-border">
                        <div className="flex-shrink-0 w-24 sm:w-32 p-1 md:p-2 text-center text-xs md:text-sm font-medium text-muted-foreground border-r border-border">
                          <span className="hidden sm:inline">Week</span>
                          <span className="sm:hidden">W</span>
                        </div>
                        {/* Individual participant headers not available with pre-aggregated data */}
                        <div className="flex-shrink-0 w-24 sm:w-32 p-1 md:p-2 text-center text-xs md:text-sm font-medium text-muted-foreground border-r border-border">
                          <div className="break-words text-[8px] md:text-xs">
                            {roleMode} Total
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-16 sm:w-20 p-1 md:p-2 text-center text-xs md:text-sm font-bold text-foreground bg-muted/50">
                          <span className="hidden sm:inline">Total</span>
                          <span className="sm:hidden">T</span>
                        </div>
                      </div>
                      
                      {/* Column Totals Row */}
                      <div className="flex bg-muted/30 border-b border-border">
                        <div className="flex-shrink-0 w-24 sm:w-32 p-1 md:p-2 text-center text-xs md:text-sm font-bold text-foreground border-r border-border">
                          <span className="hidden sm:inline">Total</span>
                          <span className="sm:hidden">T</span>
                        </div>
                        {/* Individual participant columns not available with pre-aggregated data */}
                        <div className="flex-shrink-0 w-24 sm:w-32 p-1 md:p-2 text-center text-xs md:text-sm font-bold text-foreground border-r border-border">
                          {roleMode}
                        </div>
                        <div className="flex-shrink-0 w-16 sm:w-20 p-1 md:p-2 text-center text-xs md:text-sm font-bold text-foreground bg-muted/30">
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
                          <div key={key} className="flex border-b border-border last:border-b-0">
                            <div className="flex-shrink-0 w-24 sm:w-32 p-1 md:p-2 text-center text-xs md:text-sm font-medium bg-card border-r border-border">
                              <div className="break-words">
                                <span className="hidden sm:inline">{meta.label}</span>
                                <span className="sm:hidden text-[8px]">
                                  W{key.split('-')[0]}<br />
                                  {meta.start.getMonth() + 1}/{meta.start.getDate()}-{meta.end.getMonth() + 1}/{meta.end.getDate()}
                                </span>
                              </div>
                            </div>
                            {/* Individual participant data not available with pre-aggregated data */}
                            <div className="flex-shrink-0 w-24 sm:w-32 p-1 md:p-2 text-center text-xs md:text-sm bg-card border-r border-border hover:bg-accent/40">
                              {rowTotal > 0 ? rowTotal : ''}
                            </div>
                            <div className="flex-shrink-0 w-16 sm:w-20 p-1 md:p-2 text-center text-xs md:text-sm font-bold bg-muted/40">
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

