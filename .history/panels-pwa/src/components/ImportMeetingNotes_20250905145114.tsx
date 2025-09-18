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
      const date = dateStr ? new Date(dateStr) : null
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
        rawEm: emEmail
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
              <CardHeader>
                <CardTitle className="text-destructive text-base">Validation issues</CardTitle>
                <CardDescription>Fix mapping or correct data and rebuild the preview.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </CardContent>
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


