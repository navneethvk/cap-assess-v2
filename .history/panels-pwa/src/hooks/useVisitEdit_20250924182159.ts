import { useState, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUserCciLinks } from '@/hooks/useUserCciLinks'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { addDocument, updateDocument } from '@/firebase/firestoreService'
import { visitsCollection } from '@/firebase/paths'
import { notify } from '@/utils/notify'
import type { VisitDoc, CCIDoc, CreateData, UpdateData } from '@/types/firestore'

export interface VisitEditOptions {
  autoComplete?: boolean
  position?: 'top' | 'bottom' | 'inline'
  externalOrder?: number
  onSuccess?: (visitId: string) => void
  onError?: (error: Error) => void
}

export interface VisitEditState {
  isEditing: boolean
  isSaving: boolean
  editedVisit: Partial<VisitDoc> | null
  errors: Record<string, string>
}

export const useVisitEdit = (initialVisit?: VisitDoc | null) => {
  const { user } = useAuthStore()
  const { data: userCciLinks } = useUserCciLinks(user?.uid || '')
  const { data: ccis } = useFirestoreCollection<CCIDoc>('ccis')
  
  const [state, setState] = useState<VisitEditState>({
    isEditing: false,
    isSaving: false,
    editedVisit: initialVisit || null,
    errors: {}
  })

  // Business Logic: Determine if user is EM for a specific CCI
  const getFilledByStatus = useCallback((cciId: string | null): 'EM' | 'Visitor' => {
    if (!cciId || !userCciLinks?.cci_id) return 'Visitor'
    return userCciLinks.cci_id.includes(cciId) ? 'EM' : 'Visitor'
  }, [userCciLinks?.cci_id])

  // Business Logic: Get CCI name from ID
  const getCciName = useCallback((cciId: string | null): string => {
    if (!cciId || !ccis) return ''
    const cci = ccis.find(c => c.id === cciId)
    return cci?.name || cci?.cci_name || ''
  }, [ccis])

  // Business Logic: Determine visit status based on date and auto-complete setting
  const getVisitStatus = useCallback((date: Date, autoComplete?: boolean): 'Scheduled' | 'Complete' => {
    if (autoComplete) return 'Complete'
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const visitDate = new Date(date)
    visitDate.setHours(0, 0, 0, 0)
    
    return visitDate >= today ? 'Scheduled' : 'Scheduled' // Always Scheduled for now
  }, [])

  // Business Logic: Calculate order for new visits
  const calculateOrder = useCallback((
    position: 'top' | 'bottom' | 'inline' = 'inline',
    externalOrder?: number,
    existingVisits?: VisitDoc[],
    selectedDate?: Date
  ): number => {
    if (externalOrder !== undefined) return externalOrder
    
    if (position === 'top') return -999999
    if (position === 'bottom') {
      if (existingVisits && selectedDate) {
        const sameDayVisits = existingVisits.filter(v => {
          const ts: any = v.date
          const d = ts?.toDate ? ts.toDate() : new Date(ts)
          const visitDate = new Date(selectedDate)
          return d.getDate() === visitDate.getDate() && 
                 d.getMonth() === visitDate.getMonth() && 
                 d.getFullYear() === visitDate.getFullYear()
        })
        
        if (sameDayVisits.length > 0) {
          const highestOrder = Math.max(...sameDayVisits.map(v => (v as any).order ?? 0))
          return highestOrder + 1000
        }
      }
      return 1000
    }
    
    return Date.now() // inline position
  }, [])

  // Validation Logic
  const validateVisit = useCallback((visit: Partial<VisitDoc>): Record<string, string> => {
    const errors: Record<string, string> = {}
    
    if (!visit.date) {
      errors.date = 'Date is required'
    }
    
    if (!visit.cci_id) {
      errors.cci_id = 'CCI selection is required'
    }
    
    if (!user?.uid) {
      errors.user = 'User authentication required'
    }
    
    return errors
  }, [user?.uid])

  // Create a new visit
  const createVisit = useCallback(async (
    visitData: Partial<VisitDoc>,
    options: VisitEditOptions = {}
  ): Promise<string> => {
    const { autoComplete = false, position = 'inline', externalOrder, onSuccess, onError } = options
    
    setState(prev => ({ ...prev, isSaving: true, errors: {} }))
    
    try {
      // Validate the visit data
      const errors = validateVisit(visitData)
      if (Object.keys(errors).length > 0) {
        setState(prev => ({ ...prev, errors, isSaving: false }))
        throw new Error('Validation failed')
      }

      // Apply business rules
      const cciId = visitData.cci_id || ''
      const visitDate = visitData.date || new Date()
      const order = calculateOrder(position, externalOrder)
      
      const newVisitData: CreateData<VisitDoc> = {
        date: visitDate,
        cci_id: cciId,
        cci_name: getCciName(cciId),
        filledBy: getFilledByStatus(cciId),
        filledByUid: user!.uid,
        status: getVisitStatus(visitDate, autoComplete),
        agenda: visitData.agenda || '',
        debrief: visitData.debrief || '',
        notes: visitData.notes || [],
        createdAt: new Date(),
        order,
        personMet: 'none',
        quality: 'none',
        visitHours: 'none',
        ...visitData // Allow override of any fields
      }

      console.log('Creating visit with centralized logic:', newVisitData)
      const newId = await addDocument<VisitDoc>('visits', newVisitData)
      
      notify.success('Visit created successfully')
      onSuccess?.(newId)
      
      setState(prev => ({ ...prev, isSaving: false }))
      return newId
    } catch (error) {
      console.error('Failed to create visit:', error)
      notify.error('Failed to create visit')
      onError?.(error as Error)
      setState(prev => ({ ...prev, isSaving: false }))
      throw error
    }
  }, [user, validateVisit, getFilledByStatus, getCciName, getVisitStatus, calculateOrder])

  // Update an existing visit
  const updateVisit = useCallback(async (
    visitId: string,
    updates: Partial<VisitDoc>,
    options: VisitEditOptions = {}
  ): Promise<void> => {
    const { autoComplete = false, onSuccess, onError } = options
    
    setState(prev => ({ ...prev, isSaving: true, errors: {} }))
    
    try {
      // Apply business rules to updates
      const updateData: UpdateData<VisitDoc> = { ...updates }
      
      // If CCI is being updated, recalculate filledBy status
      if (updates.cci_id !== undefined) {
        updateData.filledBy = getFilledByStatus(updates.cci_id)
        updateData.cci_name = getCciName(updates.cci_id)
      }
      
      // If date is being updated, recalculate status
      if (updates.date !== undefined) {
        updateData.status = getVisitStatus(updates.date, autoComplete)
      }
      
      // If auto-complete is requested, set status to Complete
      if (autoComplete) {
        updateData.status = 'Complete'
      }

      console.log('Updating visit with centralized logic:', updateData)
      await updateDocument<VisitDoc>('visits', visitId, updateData)
      
      notify.success('Visit updated successfully')
      onSuccess?.(visitId)
      
      setState(prev => ({ ...prev, isSaving: false }))
    } catch (error) {
      console.error('Failed to update visit:', error)
      notify.error('Failed to update visit')
      onError?.(error as Error)
      setState(prev => ({ ...prev, isSaving: false }))
      throw error
    }
  }, [getFilledByStatus, getCciName, getVisitStatus])

  // Start editing mode
  const startEditing = useCallback((visit?: VisitDoc | null) => {
    setState(prev => ({
      ...prev,
      isEditing: true,
      editedVisit: visit || prev.editedVisit,
      errors: {}
    }))
  }, [])

  // Cancel editing mode
  const cancelEditing = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEditing: false,
      editedVisit: initialVisit || null,
      errors: {}
    }))
  }, [initialVisit])

  // Update edited visit data
  const updateEditedVisit = useCallback((updates: Partial<VisitDoc>) => {
    setState(prev => ({
      ...prev,
      editedVisit: prev.editedVisit ? { ...prev.editedVisit, ...updates } : updates,
      errors: {}
    }))
  }, [])

  // Get CCI options organized by user assignments and city
  const getCciOptions = useCallback(() => {
    if (!ccis || !userCciLinks) return []
    
    const userCciIds = userCciLinks.cci_id || []
    const isEM = userCciIds.length > 0
    
    // Sort CCIs by city, then by name
    const sortedCcis = [...ccis].sort((a, b) => {
      const cityCompare = (a.city || '').localeCompare(b.city || '')
      if (cityCompare !== 0) return cityCompare
      return (a.name || '').localeCompare(b.name || '')
    })
    
    // Separate user's CCIs from others
    const userCcis = sortedCcis.filter(cci => userCciIds.includes(cci.id))
    const otherCcis = sortedCcis.filter(cci => !userCciIds.includes(cci.id))
    
    // For EM users, show assigned CCIs first, then others
    // For non-EM users, show all CCIs together
    if (isEM) {
      return { userCcis, otherCcis }
    } else {
      const allCcis = [...userCcis, ...otherCcis].sort((a, b) => {
        const cityCompare = (a.city || '').localeCompare(b.city || '')
        if (cityCompare !== 0) return cityCompare
        return (a.name || '').localeCompare(b.name || '')
      })
      return { userCcis: allCcis, otherCcis: [] }
    }
  }, [ccis, userCciLinks])

  return {
    // State
    ...state,
    
    // Actions
    createVisit,
    updateVisit,
    startEditing,
    cancelEditing,
    updateEditedVisit,
    
    // Business Logic Helpers
    getFilledByStatus,
    getCciName,
    getVisitStatus,
    calculateOrder,
    validateVisit,
    getCciOptions,
    
    // Computed values
    isEM: (userCciLinks?.cci_id || []).length > 0,
    userCciIds: userCciLinks?.cci_id || []
  }
}
