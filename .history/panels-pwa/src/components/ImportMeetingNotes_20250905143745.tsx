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
      const em = emByEmail.get(emEmail)
      if (!em) errs.push(`Row ${idx+1}: EM not found (${r[mapping.em]})`)
      const cciName = (r[mapping.cci] || '').toLowerCase()
      const cci = cciByName.get(cciName)
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
        raw: r
      }
    })
    setPreview(out)
    setErrors(errs)
  }

  const importNow = async () => {
    setIsImporting(true)
    try {
      const tasks = preview.filter(p => p.ok).map(p => addDocument(visitsCollection(), {
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
      notify.success(`Imported ${tasks.length} meeting notes`)
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
                      <TableCell>{p.cci?.name || '—'}</TableCell>
                      <TableCell>{p.date ? new Date(p.date).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{p.em?.email || '—'}</TableCell>
                      <TableCell className="truncate max-w-[240px]">{p.agenda}</TableCell>
                      <TableCell className="truncate max-w-[240px]">{p.debrief}</TableCell>
                      <TableCell>{p.ok ? 'Ready' : 'Needs fix'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ImportMeetingNotes


