import React, { useEffect, useMemo, useState } from 'react'
import useAuthStore from '../store/authStore'
import { useSelectedDateStore } from '@/store/selectedDate';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { addDocument } from '@/firebase/firestoreService'
import { ccisCollection, cciUserLinksCollection, visitsCollection } from '@/firebase/paths'
import { notify } from '@/utils/notify'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface CCI { id: string; name: string; city?: string; cohort?: string; status?: string }
interface CciUserLink { id?: string; user_id: string; cci_id: string[]; isEM: 'yes' | 'no' }

interface AddVisitProps {
  position?: 'top' | 'bottom' | 'inline';
  className?: string;
}

const AddVisit: React.FC<AddVisitProps> = ({ position = 'inline', className = '' }) => {
  const { selectedDate } = useSelectedDateStore()
  const { user } = useAuthStore()
  const { data: ccis } = useFirestoreCollection<CCI>(ccisCollection())
  const { data: links } = useFirestoreCollection<CciUserLink>(cciUserLinksCollection(), { revalidateOnFocus: false })

  const [showAll, setShowAll] = useState(false)
  const [selectedCciId, setSelectedCciId] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const allocatedIds = useMemo(() => {
    if (!user || !links) return [] as string[]
    const link = links.find(l => l.id === user.uid)
    return link?.cci_id ?? []
  }, [links, user])

  const cciOptions = useMemo(() => {
    const list = (ccis ?? []).filter(c => c.status !== 'inactive')
    const filtered = showAll ? list : list.filter(c => allocatedIds.includes(c.id))
    return filtered.sort((a, b) => a.name.localeCompare(b.name))
  }, [ccis, allocatedIds, showAll])

  useEffect(() => {
    if (!selectedCciId) return
    if (!cciOptions.some(c => c.id === selectedCciId)) setSelectedCciId('')
  }, [cciOptions, selectedCciId])

  const selectedCci = cciOptions.find(c => c.id === selectedCciId) || (ccis ?? []).find(c => c.id === selectedCciId)

  const handleCreate = async () => {
    if (!user || !selectedCci) { 
      notify.error('Please select a CCI'); 
      return; 
    }
    setSubmitting(true)
    try {
      const filledBy = allocatedIds.includes(selectedCci.id) ? 'EM' : 'Visitor'
      
      const payload = {
        date: selectedDate,
        cci_id: selectedCci.id,
        cci_name: selectedCci.name,
        filledBy,
        filledByUid: user.uid,
        agenda: '',
        debrief: '',
        notes: [],
        createdAt: new Date(),
        position: position, // Store position for reference
      }
      await addDocument(visitsCollection(), payload)
      notify.success('Visit created successfully.')
      setOpen(false) // Close modal on success
      setSelectedCciId('') // Reset selection
      
      // Emit custom event with position information
      try { 
        window.dispatchEvent(new CustomEvent('visits:changed', { 
          detail: { position, visitId: 'new' } 
        })) 
      } catch {}
    } catch (error) {
      notify.error('Failed to create visit')
    } finally {
      setSubmitting(false)
    }
  }

  const noAllocated = !showAll && allocatedIds.length === 0

  return (
    <>
      {/* Timeline + Button */}
      <div className={`relative ${position === 'top' ? 'mb-4' : position === 'bottom' ? 'mt-4' : 'my-4'} ${className}`}>
        {/* Vertical Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
        
        {/* + Button */}
        <div className="relative flex items-center justify-center">
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full bg-primary" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen(true)}
            className="ml-8 h-8 w-8 p-0 rounded-full border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-2xl rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">
                Add a Visit • {selectedDate.toLocaleDateString()}
                {position === 'top' && ' (Above existing visits)'}
                {position === 'bottom' && ' (Below existing visits)'}
              </div>
              <button className="text-sm" onClick={() => setOpen(false)}>Close</button>
            </div>

            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs flex items-center gap-2">
                    <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
                    View all CCIs
                  </label>
                </div>
                <div>
                  <label className="text-xs block mb-1">Select Institution</label>
                  <Select value={selectedCciId} onValueChange={setSelectedCciId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={noAllocated ? 'No assigned CCIs (toggle view all?)' : 'Choose a CCI'} />
                    </SelectTrigger>
                    <SelectContent>
                      {cciOptions.map(cci => (
                        <SelectItem key={cci.id} value={cci.id}>{cci.name}{cci.city ? ` — ${cci.city}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreate} disabled={submitting || !selectedCciId}>
                    {submitting ? 'Creating…' : `Create Visit ${position === 'top' ? 'Above' : position === 'bottom' ? 'Below' : ''}`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AddVisit
