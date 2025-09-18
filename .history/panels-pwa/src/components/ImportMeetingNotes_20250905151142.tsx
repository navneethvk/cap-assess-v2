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
  const [built, setBuilt] = useState<boolean>(false)
  const [isImporting, setIsImporting] = useState(false)
  const { data: allVisits } = useFirestoreCollection<any>(visitsCollection())
  const [visitSearch, setVisitSearch] = useState('')
  const [visitSort, setVisitSort] = useState<'date_desc'|'date_asc'>('date_desc')
  // Aggregation maps: raw token -> selected id/uid
  const [cciMap, setCciMap] = useState<Record<string, string>>({})
  const [emMap, setEmMap] = useState<Record<string, string>>({})
  const [dateMap, setDateMap] = useState<Record<string, string>>({}) // token -> ISO yyyy-mm-dd
  const [showErrors, setShowErrors] = useState<boolean>(true)
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

  const buildPreview = () => { setBuilt(true) }

  const norm = (s?: string) => (s || '').trim().toLowerCase()

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

  // (suggestion helpers removed in simplified flow)
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

          {/* Error list removed in simplified flow */}

          {/* Row-level fix view removed in simplified flow */}
        </CardContent>
      </Card>

      {/* Aggregated mapping panels */}
      {(preview.length > 0) && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Map unique values</CardTitle>
              <CardDescription>Map unique CCI names, EM emails, and ambiguous dates. Mappings apply to all rows.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowMapCci(v => !v)}>{showMapCci ? 'Hide CCIs' : 'Show CCIs'}</Button>
              <Button variant="outline" size="sm" onClick={() => setShowMapEm(v => !v)}>{showMapEm ? 'Hide EMs' : 'Show EMs'}</Button>
              <Button variant="outline" size="sm" onClick={() => setShowMapDates(v => !v)}>{showMapDates ? 'Hide Dates' : 'Show Dates'}</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {showMapCci && (
              <div>
                <div className="text-sm font-medium mb-2">CCI mapping</div>
                <div className="space-y-2">
                  {Array.from(new Set(preview.map(p => p.rawCci).filter(Boolean))).map((tok) => (
                    <div key={tok} className="flex items-center gap-2">
                      <div className="text-xs w-56 truncate">{tok}</div>
                      <select className="border rounded-md h-8 px-2" value={cciMap[(tok||'').toLowerCase()] || ''} onChange={(e) => applyCciTokenMap(tok!, e.target.value)}>
                        <option value="">Pick CCI…</option>
                        {(ccis||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showMapEm && (
              <div>
                <div className="text-sm font-medium mb-2">EM mapping</div>
                <div className="space-y-2">
                  {Array.from(new Set(preview.map(p => p.rawEm).filter(Boolean))).map((tok) => (
                    <div key={tok} className="flex items-center gap-2">
                      <div className="text-xs w-56 truncate">{tok}</div>
                      <select className="border rounded-md h-8 px-2" value={emMap[(tok||'').toLowerCase()] || ''} onChange={(e) => applyEmTokenMap(tok!, e.target.value)}>
                        <option value="">Pick EM…</option>
                        {(users||[]).map(u => <option key={u.uid} value={u.uid}>{u.email}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showMapDates && (
              <div>
                <div className="text-sm font-medium mb-2">Date mapping</div>
                <div className="space-y-2">
                  {Array.from(new Set(preview.map(p => p.rawDate).filter(d => !((d ? new Date(d) : null) && !(isNaN(+new Date(d!))))))).map((tok) => (
                    <div key={tok} className="flex items-center gap-2">
                      <div className="text-xs w-56 truncate">{tok || '—'}</div>
                      <input className="border rounded-md h-8 px-2" type="date" value={dateMap[(tok||'').toLowerCase()] || ''} onChange={(e) => setDateMap(prev => ({ ...prev, [(tok||'').toLowerCase()]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
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


