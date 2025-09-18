import React, { useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { PrimaryPopupButton } from '@/components/ui/primary-button'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { usersCollection, ccisCollection, visitsCollection } from '@/firebase/paths'
import { addDocument } from '@/firebase/firestoreService'
import { notify } from '@/utils/notify'

interface User { uid: string; email: string; role: string }
interface CCI { id: string; name: string; city?: string }

type RawRow = Record<string, string>

const columnsNeeded = ['cci', 'date', 'em', 'agenda', 'debrief'] as const
type Needed = typeof columnsNeeded[number]

const ImportMeetingNotes: React.FC = () => {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const { data: users } = useFirestoreCollection<User>(usersCollection())
  const { data: ccis } = useFirestoreCollection<CCI>(ccisCollection())
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [mapping, setMapping] = useState<Record<Needed, string>>({ cci: '', date: '', em: '', agenda: '', debrief: '' })
  const [preview, setPreview] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const { data: allVisits } = useFirestoreCollection<any>(visitsCollection())
  const [visitSearch, setVisitSearch] = useState('')
  const [visitSort, setVisitSort] = useState<'date_desc'|'date_asc'>('date_desc')
  // Aggregation maps: raw token -> selected id/uid
  const [cciMap, setCciMap] = useState<Record<string, string>>({})
  const [emMap, setEmMap] = useState<Record<string, string>>({})
  const [dateMap, setDateMap] = useState<Record<string, string>>({}) // token -> ISO yyyy-mm-dd
  const [showErrors, setShowErrors] = useState<boolean>(true)
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true)
  const [showMapCci, setShowMapCci] = useState<boolean>(true)
  const [showMapEm, setShowMapEm] = useState<boolean>(true)
  const [showMapDates, setShowMapDates] = useState<boolean>(true)

  const parseCsv = (text: string): RawRow[] => {
    const lines = text.replace(/\r/g, '').split('\n').filter(Boolean)
    if (lines.length === 0) return []
    const headers = lines[0].split(',').map(h => h.trim())
    const rows: RawRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const fields: string[] = []
      let cur = ''; let q = false
      const line = lines[i]
      for (let j = 0; j < line.length; j++) {
        const ch = line[j]
        if (ch === '"') { if (q && line[j+1] === '"') { cur += '"'; j++ } else { q = !q } }
        else if (ch === ',' && !q) { fields.push(cur); cur = '' }
        else { cur += ch }
      }
      fields.push(cur)
      // skip completely blank
      if (fields.every(f => (f || '').trim() === '')) continue
      const obj: RawRow = {}
      headers.forEach((h, idx) => obj[h] = (fields[idx] ?? '').trim())
      rows.push(obj)
    }
    return rows
  }

  const triggerUpload = () => fileRef.current?.click()
  const onFile = async (f: File | null) => {
    if (!f) return
    const text = await f.text()
    const rows = parseCsv(text)
      .filter(r => Object.values(r).some(v => (v || '').trim() !== ''))
    setRawRows(rows)
    // Auto-guess mapping by header names
    const hdrs = Object.keys(rows[0] || {})
    const guess = (name: Needed, alts: string[]) => hdrs.find(h => [name, ...alts].some(a => h.toLowerCase().includes(a))) || ''
    setMapping({
      cci: guess('cci', ['institution','cci name','name']),
      date: guess('date', ['visited on','meeting date']),
      em: guess('em', ['user','owner','filledby','email']),
      agenda: guess('agenda', ['subject','topic']),
      debrief: guess('debrief', ['notes','summary'])
    })
  }

  const emByEmail = useMemo(() => new Map((users||[]).map(u => [u.email?.toLowerCase(), u])), [users])
  const cciByName = useMemo(() => new Map((ccis||[]).map(c => [(c.name||'').toLowerCase(), c])), [ccis])

  const buildPreview = () => {
    const errs: string[] = []
    const out = rawRows.map((r, idx) => {
      const emEmail = (r[mapping.em] || '').toLowerCase()
      let em = emByEmail.get(emEmail)
      // apply cached mapping if available (email may differ from uid mapping; we cache by email token)
      const emOverrideUid = emMap[emEmail]
      if (!em && emOverrideUid) em = (users||[]).find(u => u.uid === emOverrideUid)
      if (!em) errs.push(`Row ${idx+1}: EM not found (${r[mapping.em]})`)
      const cciName = (r[mapping.cci] || '').toLowerCase()
      let cci = cciByName.get(cciName)
      const cciOverrideId = cciMap[cciName]
      if (!cci && cciOverrideId) cci = (ccis||[]).find(c => c.id === cciOverrideId)
      if (!cci) errs.push(`Row ${idx+1}: CCI not found (${r[mapping.cci]})`)
      const dateStr = r[mapping.date]
      // if we have a manual map for this token, use that
      const mappedIso = dateMap[(dateStr||'').toLowerCase()]
      const date = mappedIso ? new Date(mappedIso) : (dateStr ? new Date(dateStr) : null)
      if (!date || isNaN(+date)) errs.push(`Row ${idx+1}: Invalid date (${dateStr})`)
      return {
        ok: !!(em && cci && date && !isNaN(+date)),
        em,
        cci,
        date,
        agenda: r[mapping.agenda] || '',
        debrief: r[mapping.debrief] || '',
        raw: r,
        rawCci: cciName,
        rawEm: emEmail,
        rawDate: dateStr
      }
    })
    setPreview(out)
    setErrors(errs)
  }

  const computeOk = (row: any) => !!(row.em && row.cci && row.date && !isNaN(+row.date))

  const updateRow = (index: number, updates: Partial<{ em: User; cci: CCI; date: Date; agenda: string; debrief: string }>) => {
    // Prepare aggregation maps if needed
    let newCciMap: Record<string, string> | null = null
    let newEmMap: Record<string, string> | null = null
    setPreview(prev => {
      let next = [...prev]
      // Apply update to target row first
      let row = { ...next[index], ...updates }
      row.ok = computeOk(row)
      next[index] = row
      // Aggregate per raw token across rows
      if (updates.cci) {
        const key = (row.rawCci || '').toLowerCase()
        newCciMap = { ...cciMap, [key]: updates.cci.id }
        next = next.map((r) => {
          if ((r.rawCci || '').toLowerCase() === key) {
            const nr = { ...r, cci: updates.cci }
            nr.ok = computeOk(nr)
            return nr
          }
          return r
        })
      }
      if (updates.em) {
        const key = (row.rawEm || '').toLowerCase()
        newEmMap = { ...emMap, [key]: updates.em.uid }
        next = next.map((r) => {
          if ((r.rawEm || '').toLowerCase() === key) {
            const nr = { ...r, em: updates.em }
            nr.ok = computeOk(nr)
            return nr
          }
          return r
        })
      }
      return next
    })
    if (newCciMap) setCciMap(newCciMap)
    if (newEmMap) setEmMap(newEmMap)
  }

  const importNow = async () => {
    setIsImporting(true)
    try {
      const valid = preview.filter(p => p.ok)
      const tasks = valid.map(p => addDocument(visitsCollection(), {
        date: p.date,
        cci_id: p.cci.id,
        cci_name: p.cci.name,
        filledBy: 'EM',
        filledByUid: p.em.uid,
        agenda: p.agenda,
        debrief: p.debrief,
        notes: [],
        createdAt: new Date(),
        order: Date.now()
      }))
      await Promise.all(tasks)
      const failed = preview.length - valid.length
      notify.success(`Imported ${tasks.length} notes${failed ? `, ${failed} unresolved` : ''}`)
    } catch (e) {
      notify.error('Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  // Fuzzy and collapsible helpers
  const levenshtein = (a: string, b: string) => {
    a = (a||'').toLowerCase(); b = (b||'').toLowerCase()
    const m = a.length, n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost)
      }
    }
    return dp[m][n]
  }
  const suggestForToken = (token: string, pool: { key: string; label: string; id: string }[], top = 3) => {
    const t = (token||'').toLowerCase()
    return pool.map(p => ({ ...p, d: levenshtein(t, p.key) })).sort((a, b) => a.d - b.d).slice(0, top)
  }
  const unmatchedCciTokens = useMemo(() => {
    const set = new Set<string>()
    preview.forEach(p => { if (!p.cci) set.add(p.rawCci || '') })
    return Array.from(set).filter(Boolean)
  }, [preview])
  const unmatchedEmTokens = useMemo(() => {
    const set = new Set<string>()
    preview.forEach(p => { if (!p.em) set.add(p.rawEm || '') })
    return Array.from(set).filter(Boolean)
  }, [preview])
  const cciPool = useMemo(() => (ccis||[]).map(c => ({ key: (c.name||'').toLowerCase(), label: c.name, id: c.id })), [ccis])
  const emPool = useMemo(() => (users||[]).map(u => ({ key: (u.email||'').toLowerCase(), label: u.email, id: u.uid })), [users])
  const applyCciTokenMap = (token: string, id: string) => {
    const key = (token||'').toLowerCase()
    setCciMap(prev => ({ ...prev, [key]: id }))
    setPreview(prev => prev.map(r => {
      if ((r.rawCci || '').toLowerCase() === key) {
        const c = (ccis||[]).find(x => x.id === id)
        const nr = { ...r, cci: c }
        nr.ok = !!(nr.em && nr.cci && nr.date && !isNaN(+nr.date))
        return nr
      }
      return r
    }))
  }
  const applyEmTokenMap = (token: string, uid: string) => {
    const key = (token||'').toLowerCase()
    setEmMap(prev => ({ ...prev, [key]: uid }))
    setPreview(prev => prev.map(r => {
      if ((r.rawEm || '').toLowerCase() === key) {
        const u = (users||[]).find(x => x.uid === uid)
        const nr = { ...r, em: u }
        nr.ok = !!(nr.em && nr.cci && nr.date && !isNaN(+nr.date))
        return nr
      }
      return r
    }))
  }

  const hasMapping = columnsNeeded.every(k => mapping[k])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Meeting Notes</CardTitle>
          <CardDescription>Upload CSV, map columns, validate, and import into visits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <PrimaryPopupButton onClick={triggerUpload}>Upload CSV</PrimaryPopupButton>
            <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => onFile(e.target.files?.[0] || null)} />
            {rawRows.length > 0 && (
              <Button variant="outline" onClick={buildPreview} disabled={!hasMapping}>Build preview</Button>
            )}
            {preview.length > 0 && (
              <PrimaryPopupButton onClick={importNow} disabled={isImporting || preview.every(p => !p.ok)}>
                {isImporting ? 'Importing…' : 'Import valid rows'}
              </PrimaryPopupButton>
            )}
          </div>

          {rawRows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {columnsNeeded.map((k) => (
                <div key={k} className="space-y-1">
                  <div className="text-xs text-muted-foreground">Map: {k.toUpperCase()}</div>
                  <select className="w-full border rounded-md h-9 px-2" value={mapping[k]} onChange={(e) => setMapping({ ...mapping, [k]: e.target.value })}>
                    <option value="">— choose column —</option>
                    {Object.keys(rawRows[0]).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          {errors.length > 0 && (
            <Card className="border-destructive/40">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-destructive text-base">Validation issues</CardTitle>
                  <CardDescription>Fix mapping or correct data and rebuild the preview.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowErrors(v => !v)}>{showErrors ? 'Hide' : 'Show'}</Button>
              </CardHeader>
              {showErrors && (
                <CardContent>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </CardContent>
              )}
            </Card>
          )}

          {preview.length > 0 && (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CCI</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>EM</TableHead>
                    <TableHead>Agenda</TableHead>
                    <TableHead>Debrief</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((p, i) => (
                    <TableRow key={i} className={!p.ok ? 'bg-destructive/10' : ''}>
                      <TableCell>
                        {p.ok ? (
                          p.cci?.name
                        ) : (
                          <select className="border rounded-md h-8 px-2" value={p.cci?.id || ''} onChange={(e) => updateRow(i, { cci: (ccis||[]).find(c => c.id === e.target.value)! })}>
                            <option value="">Pick CCI…</option>
                            {(ccis||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.ok ? (
                          p.date ? new Date(p.date).toLocaleDateString() : '—'
                        ) : (
                          <input className="border rounded-md h-8 px-2 w-36" type="date" onChange={(e) => updateRow(i, { date: e.target.value ? new Date(e.target.value) : (undefined as any) })} />
                        )}
                      </TableCell>
                      <TableCell>
                        {p.ok ? (
                          p.em?.email
                        ) : (
                          <select className="border rounded-md h-8 px-2" value={p.em?.uid || ''} onChange={(e) => updateRow(i, { em: (users||[]).find(u => u.uid === e.target.value)! })}>
                            <option value="">Pick EM…</option>
                            {(users||[]).map(u => <option key={u.uid} value={u.uid}>{u.email}</option>)}
                          </select>
                        )}
                      </TableCell>
                      <TableCell className="truncate max-w-[240px]">
                        <input className="w-full border rounded-md h-8 px-2" value={p.agenda} onChange={(e) => updateRow(i, { agenda: e.target.value })} />
                      </TableCell>
                      <TableCell className="truncate max-w-[240px]">
                        <input className="w-full border rounded-md h-8 px-2" value={p.debrief} onChange={(e) => updateRow(i, { debrief: e.target.value })} />
                      </TableCell>
                      <TableCell>{p.ok ? 'Ready' : 'Needs fix'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fuzzy suggestions for unmatched tokens */}
      {(preview.length > 0) && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Suggestions</CardTitle>
              <CardDescription>Click a suggestion to apply mapping to all matching rows.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSuggestions(v => !v)}>{showSuggestions ? 'Hide' : 'Show'}</Button>
          </CardHeader>
          {showSuggestions && (
            <CardContent className="space-y-4">
              {unmatchedCciTokens.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Unmatched CCI names</div>
                  <div className="space-y-2">
                    {unmatchedCciTokens.map(tok => (
                      <div key={tok} className="flex items-center gap-2">
                        <div className="text-xs w-56 truncate">{tok}</div>
                        {suggestForToken(tok, cciPool).map(s => (
                          <Button key={s.id} variant="outline" size="sm" onClick={() => applyCciTokenMap(tok, s.id)}>{s.label}</Button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {unmatchedEmTokens.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Unmatched EM emails</div>
                  <div className="space-y-2">
                    {unmatchedEmTokens.map(tok => (
                      <div key={tok} className="flex items-center gap-2">
                        <div className="text-xs w-56 truncate">{tok}</div>
                        {suggestForToken(tok, emPool).map(s => (
                          <Button key={s.id} variant="outline" size="sm" onClick={() => applyEmTokenMap(tok, s.id)}>{s.label}</Button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Existing visits table with basic sort/filter */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Visits</CardTitle>
          <CardDescription>Quick view with search and sort</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-center">
            <input className="border rounded-md h-9 px-3 w-64" placeholder="Search CCI or EM email" value={visitSearch} onChange={(e) => setVisitSearch(e.target.value)} />
            <select className="border rounded-md h-9 px-2" value={visitSort} onChange={(e) => setVisitSort(e.target.value as any)}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
            </select>
          </div>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>CCI</TableHead>
                  <TableHead>EM</TableHead>
                  <TableHead>Agenda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((allVisits||[]) as any[])
                  .map(v => ({
                    ...v,
                    _date: v.date?.toDate ? v.date.toDate() : new Date(v.date),
                    _em: (users||[]).find(u => u.uid === v.filledByUid)?.email || v.filledByUid
                  }))
                  .filter(v => {
                    const q = visitSearch.trim().toLowerCase()
                    if (!q) return true
                    return (v.cci_name || '').toLowerCase().includes(q) || (v._em || '').toLowerCase().includes(q)
                  })
                  .sort((a, b) => visitSort === 'date_desc' ? (b._date - a._date) : (a._date - b._date))
                  .slice(0, 200)
                  .map((v, i) => (
                    <TableRow key={i}>
                      <TableCell>{v._date ? new Date(v._date).toLocaleDateString() : ''}</TableCell>
                      <TableCell>{v.cci_name}</TableCell>
                      <TableCell>{v._em}</TableCell>
                      <TableCell className="truncate max-w-[320px]">{v.agenda}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ImportMeetingNotes


