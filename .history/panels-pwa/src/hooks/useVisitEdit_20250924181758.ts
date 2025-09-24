import { useState, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUserCciLinks } from './useUserCciLinks'
import { useFirestoreCollection } from './useFirestoreCollection'
import { addDocument, updateDocument } from '@/firebase/firestoreService'
import { notify } from '@/utils/notify'
import type { VisitDoc, CCIDoc, CreateData, UpdateData } from '@/types/firestore'

export interface VisitEditOptions {
  autoSave?: boolean
  validateOnChange?: boolean
  showNotifications?: boolean
}

export interface VisitEditState {
  visit: VisitDoc | null
  isEditing: boolean
  isSaving: boolean
  hasChanges: boolean
  errors: Record<string, string>
}

export interface VisitEditActions {
  // Core actions
  startEdit: () => void
  cancelEdit: () => void
  save: () => Promise<boolean>
  
  // Field updates
  updateField: <K extends keyof VisitDoc>(field: K, value: VisitDoc[K]) => void
  updateFields: (fields: Partial<VisitDoc>) => void
  
  // Specialized updates
  updateCci: (cciId: string | null) => void
  updateDate: (date: Date) => void
  updateStatus: (status: VisitDoc['status']) => void
  addNote: (text: string) => Promise<void>
  updateNote: (noteId: string, text: string) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>
  
  // Validation
  validate: () => boolean
  getFieldError: (field: keyof VisitDoc) => string | undefined
}

export const useVisitEdit = (
  initialVisit?: VisitDoc | null,
  options: VisitEditOptions = {}
): VisitEditState & VisitEditActions => {
  const { user } = useAuthStore()
  const { data: userCciLinks } = useUserCciLinks(user?.uid || '')
  const { data: ccis } = useFirestoreCollection<CCIDoc>('ccis')
  
  const {
    autoSave = false,
    validateOnChange = true,
    showNotifications = true
  } = options

  // State
  const [visit, setVisit] = useState<VisitDoc | null>(initialVisit || null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [originalVisit, setOriginalVisit] = useState<VisitDoc | null>(initialVisit || null)

  // Business logic helpers
  const getFilledByStatus = useCallback((cciId: string | null): 'EM' | 'Visitor' => {
    if (!cciId || !userCciLinks?.cci_id) return 'Visitor'
    return userCciLinks.cci_id.includes(cciId) ? 'EM' : 'Visitor'
  }, [userCciLinks?.cci_id])

  const getCciName = useCallback((cciId: string | null): string => {
    if (!cciId || !ccis) return ''
    const cci = ccis.find(c => c.id === cciId)
    return cci?.name || cci?.cci_name || ''
  }, [ccis])

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!visit) {
      newErrors.general = 'No visit data available'
      setErrors(newErrors)
      return false
    }

    // Required fields
    if (!visit.date) {
      newErrors.date = 'Date is required'
    }
    
    if (!visit.cci_id) {
      newErrors.cci_id = 'CCI selection is required'
    }

    // Business rules
    if (visit.cci_id && visit.filledBy !== getFilledByStatus(visit.cci_id)) {
      // Auto-correct the filledBy status
      setVisit(prev => prev ? { ...prev, filledBy: getFilledByStatus(visit.cci_id) } : null)
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [visit, getFilledByStatus])

  // Field update with automatic business logic
  const updateField = useCallback(<K extends keyof VisitDoc>(field: K, value: VisitDoc[K]) => {
    setVisit(prev => {
      if (!prev) return prev
      
      const updated = { ...prev, [field]: value }
      
      // Apply business rules
      if (field === 'cci_id') {
        updated.filledBy = getFilledByStatus(value as string | null)
        updated.cci_name = getCciName(value as string | null)
      }
      
      return updated
    })
    
    setHasChanges(true)
    
    if (validateOnChange) {
      validate()
    }
  }, [getFilledByStatus, getCciName, validateOnChange, validate])

  const updateFields = useCallback((fields: Partial<VisitDoc>) => {
    setVisit(prev => {
      if (!prev) return prev
      
      let updated = { ...prev, ...fields }
      
      // Apply business rules for CCI changes
      if (fields.cci_id !== undefined) {
        updated.filledBy = getFilledByStatus(fields.cci_id)
        updated.cci_name = getCciName(fields.cci_id)
      }
      
      return updated
    })
    
    setHasChanges(true)
    
    if (validateOnChange) {
      validate()
    }
  }, [getFilledByStatus, getCciName, validateOnChange, validate])

  // Specialized update methods
  const updateCci = useCallback((cciId: string | null) => {
    updateField('cci_id', cciId)
  }, [updateField])

  const updateDate = useCallback((date: Date) => {
    updateField('date', date)
  }, [updateField])

  const updateStatus = useCallback((status: VisitDoc['status']) => {
    updateField('status', status)
  }, [updateField])

  // Note management
  const addNote = useCallback(async (text: string) => {
    if (!visit || !text.trim()) return
    
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      createdAt: new Date()
    }
    
    const updatedNotes = [...(visit.notes || []), newNote]
    updateField('notes', updatedNotes)
    
    if (autoSave) {
      await save()
    }
  }, [visit, updateField, autoSave])

  const updateNote = useCallback(async (noteId: string, text: string) => {
    if (!visit) return
    
    const updatedNotes = (visit.notes || []).map(note =>
      note.id === noteId ? { ...note, text: text.trim() } : note
    )
    
    updateField('notes', updatedNotes)
    
    if (autoSave) {
      await save()
    }
  }, [visit, updateField, autoSave])

  const deleteNote = useCallback(async (noteId: string) => {
    if (!visit) return
    
    const updatedNotes = (visit.notes || []).filter(note => note.id !== noteId)
    updateField('notes', updatedNotes)
    
    if (autoSave) {
      await save()
    }
  }, [visit, updateField, autoSave])

  // Core actions
  const startEdit = useCallback(() => {
    setOriginalVisit(visit)
    setIsEditing(true)
    setHasChanges(false)
    setErrors({})
  }, [visit])

  const cancelEdit = useCallback(() => {
    setVisit(originalVisit)
    setIsEditing(false)
    setHasChanges(false)
    setErrors({})
  }, [originalVisit])

  const save = useCallback(async (): Promise<boolean> => {
    if (!visit) {
      if (showNotifications) notify.error('No visit data to save')
      return false
    }

    if (!validate()) {
      if (showNotifications) notify.error('Please fix validation errors before saving')
      return false
    }

    setIsSaving(true)
    
    try {
      if (visit.id === 'new' || !visit.id) {
        // Create new visit
        const createData: CreateData<VisitDoc> = {
          ...visit,
          filledByUid: user?.uid || '',
          createdAt: new Date()
        }
        delete (createData as any).id // Remove the 'new' id
        
        const newId = await addDocument<VisitDoc>('visits', createData)
        
        // Update local state with new ID
        setVisit(prev => prev ? { ...prev, id: newId } : null)
        setOriginalVisit(prev => prev ? { ...prev, id: newId } : null)
        
        if (showNotifications) notify.success('Visit created successfully')
      } else {
        // Update existing visit
        const updateData: UpdateData<VisitDoc> = {
          ...visit,
          filledByUid: user?.uid || ''
        }
        delete (updateData as any).id // Remove id from update data
        
        await updateDocument<VisitDoc>('visits', visit.id, updateData)
        
        if (showNotifications) notify.success('Visit updated successfully')
      }
      
      setIsEditing(false)
      setHasChanges(false)
      setOriginalVisit(visit)
      
      return true
    } catch (error) {
      console.error('Save failed:', error)
      if (showNotifications) notify.error('Failed to save visit')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [visit, user?.uid, validate, showNotifications])

  // Error getter
  const getFieldError = useCallback((field: keyof VisitDoc): string | undefined => {
    return errors[field]
  }, [errors])

  return {
    // State
    visit,
    isEditing,
    isSaving,
    hasChanges,
    errors,
    
    // Actions
    startEdit,
    cancelEdit,
    save,
    updateField,
    updateFields,
    updateCci,
    updateDate,
    updateStatus,
    addNote,
    updateNote,
    deleteNote,
    validate,
    getFieldError
  }
}

// Factory function for creating new visits
export const useNewVisitEdit = (initialData?: Partial<VisitDoc>, options?: VisitEditOptions) => {
  const newVisit: VisitDoc = {
    id: 'new',
    date: new Date(),
    cci_id: '',
    cci_name: '',
    filledByUid: '',
    filledBy: 'Visitor',
    status: 'Scheduled',
    agenda: '',
    debrief: '',
    notes: [],
    ...initialData
  }
  
  return useVisitEdit(newVisit, options)
}
