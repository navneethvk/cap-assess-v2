import React, { useEffect, useMemo, useState } from 'react'
import useAuthStore from '../store/authStore'
import { useSelectedDateStore } from '@/store/selectedDate';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { useCciLinksForVisits } from '@/hooks/useCciLinksForVisits'
import { addDocument } from '@/firebase/firestoreService'
import { ccisCollection, visitsCollection } from '@/firebase/paths'
import { notify } from '@/utils/notify'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { FilterChips } from '@/components/ui/filter-chips'
import { Plus } from 'lucide-react'

interface CCI { id: string; name: string; city?: string; cohort?: string; status?: string }

interface AddVisitProps {
  position?: 'top' | 'bottom' | 'inline';
  className?: string;
  variant?: 'default' | 'spine'; // spine renders centered + button with no side line
  fixedOrder?: number; // optional precomputed order
}

const AddVisit: React.FC<AddVisitProps> = ({ position = 'inline', className = '', variant = 'default', fixedOrder }) => {
  const { selectedDate } = useSelectedDateStore()
  const { user } = useAuthStore()
  const { data: ccis } = useFirestoreCollection<CCI>(ccisCollection())
  const { data: links } = useCciLinksForVisits()
  const { data: allVisits } = useFirestoreCollection<any>(visitsCollection(), { revalidateOnFocus: false })

  const [showAll, setShowAll] = useState(false)
  const [selectedCciId, setSelectedCciId] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [externalOrder, setExternalOrder] = useState<number | undefined>(fixedOrder)
  const [cityFilters, setCityFilters] = useState<string[]>([])
  // Listen for global open requests with a fixed order
  useEffect(() => {
    const handler = (e: any) => {
      if (!e || !e.detail) return
      setExternalOrder(e.detail.order)
      setOpen(true)
    }
    window.addEventListener('addvisit:open', handler as any)
    return () => window.removeEventListener('addvisit:open', handler as any)
  }, [])

  const allocatedIds = useMemo(() => {
    if (!user || !links) return [] as string[]
    const link = links.find(l => l.id === user.uid)
    return link?.cci_id ?? []
  }, [links, user])

  // Get available cities from CCIs
  const availableCities = useMemo(() => {
    const list = (ccis ?? []).filter(c => c.status !== 'inactive')
    const filtered = showAll ? list : list.filter(c => allocatedIds.includes(c.id))
    const cities = [...new Set(filtered.map(c => c.city).filter((city): city is string => Boolean(city)))].sort()
    return cities
  }, [ccis, allocatedIds, showAll])

  const cciOptions = useMemo(() => {
    const list = (ccis ?? []).filter(c => c.status !== 'inactive')
    const filtered = showAll ? list : list.filter(c => allocatedIds.includes(c.id))
    
    // Apply city filters
    const cityFiltered = cityFilters.length === 0 
      ? filtered 
      : filtered.filter(c => c.city && cityFilters.includes(c.city))
    
    return cityFiltered.sort((a, b) => a.name.localeCompare(b.name))
  }, [ccis, allocatedIds, showAll, cityFilters])

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
      
      // Create a custom order value based on provided order or position
      let order: number;
      if (externalOrder !== undefined) {
        order = externalOrder
      } else if (position === 'top') {
        // For top position, use a very low order value to appear first
        order = -999999;
        console.log('Creating visit ABOVE with order:', order);
      } else if (position === 'bottom') {
        // For bottom position, find the highest existing order and add to it
        const existingVisits = allVisits?.filter(v => {
          const ts: any = v.date
          const d = ts?.toDate ? ts.toDate() : new Date(ts)
          const visitDate = new Date(selectedDate)
          return d.getDate() === visitDate.getDate() && 
                 d.getMonth() === visitDate.getMonth() && 
                 d.getFullYear() === visitDate.getFullYear()
        }) || []
        
        if (existingVisits.length > 0) {
          const highestOrder = Math.max(...existingVisits.map(v => (v as any).order ?? 0))
          order = highestOrder + 1000; // Add 1000 to ensure it's above the highest
          console.log('Found highest existing order:', highestOrder, 'Setting new order to:', order)
        } else {
          order = 1000; // Default if no existing visits
        }
        console.log('Creating visit BELOW with order:', order);
      } else {
        // For inline position, use current timestamp
        order = Date.now();
        console.log('Creating visit INLINE with order:', order);
      }
      
      // Determine status based on date
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset time to start of day
      const visitDate = new Date(selectedDate)
      visitDate.setHours(0, 0, 0, 0) // Reset time to start of day
      
      const status = visitDate >= today ? 'Scheduled' : 'Scheduled' // Default to Scheduled for now
      
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
        order: order, // Custom ordering field
        position: position, // Store position for reference
        status: status, // Schedule status
        personMet: 'none', // Person met - none by default
        quality: 'none', // Quality - none by default
      }
      
      console.log('Creating visit with payload:', payload);
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
      {variant === 'spine' ? null : (
        <div className={`relative ${position === 'top' ? 'mb-4' : position === 'bottom' ? 'mt-4' : 'my-4'} ${className}`}>
          {/* Vertical Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          {/* + Button to the left */}
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
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-2xl rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">
                Add a Visit • {selectedDate.toLocaleDateString()}
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
                
                {/* City Filters */}
                {availableCities.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs block">Filter by City</label>
                    <FilterChips
                      className="flex-wrap"
                      options={[
                        { label: 'All', value: 'All' },
                        ...availableCities.filter(city => city).map(city => ({ label: city, value: city }))
                      ]}
                      values={cityFilters}
                      onChange={(vals) => setCityFilters(vals.includes('All') ? [] : vals)}
                    />
                  </div>
                )}
                
                <div>
                  <label className="text-xs block mb-1">Select Institution</label>
                  <Select value={selectedCciId} onValueChange={setSelectedCciId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={noAllocated ? 'No assigned CCIs (toggle view all?)' : 'Choose a CCI'} />
                    </SelectTrigger>
                    <SelectContent
                      className="bg-white dark:bg-[hsl(var(--card))] border-2 rounded-xl shadow-md"
                      style={{ backgroundColor: 'white', backdropFilter: 'none' }}
                    >
                      {cciOptions.map(cci => (
                        <SelectItem
                          key={cci.id}
                          value={cci.id}
                          className="bg-white hover:bg-slate-100"
                          style={{ backgroundColor: 'white' }}
                        >
                          {cci.name}{cci.city ? ` — ${cci.city}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreate} disabled={submitting || !selectedCciId}>
                    {submitting ? 'Creating…' : 'Create visit'}
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
