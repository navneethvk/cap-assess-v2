import { useCallback, useMemo } from 'react'
import { useFirestoreCollection } from './useFirestoreCollection'
import { useVisitEdit, useNewVisitEdit } from './useVisitEdit'
import type { VisitDoc, CCIDoc, DocumentWithId } from '@/types/firestore'

export interface VisitQueriesOptions {
  autoSave?: boolean
  validateOnChange?: boolean
  showNotifications?: boolean
}

export interface VisitQueriesState {
  visits: DocumentWithId<VisitDoc>[]
  ccis: DocumentWithId<CCIDoc>[]
  isLoading: boolean
  error: any
}

export interface VisitQueriesActions {
  // Visit management
  getVisit: (visitId: string) => DocumentWithId<VisitDoc> | undefined
  createVisit: (initialData?: Partial<VisitDoc>) => ReturnType<typeof useNewVisitEdit>
  editVisit: (visitId: string) => ReturnType<typeof useVisitEdit> | null
  
  // Bulk operations
  updateVisitStatus: (visitId: string, status: VisitDoc['status']) => Promise<boolean>
  updateVisitCci: (visitId: string, cciId: string | null) => Promise<boolean>
  updateVisitDate: (visitId: string, date: Date) => Promise<boolean>
  
  // Utility functions
  getVisitsByCci: (cciId: string) => DocumentWithId<VisitDoc>[]
  getVisitsByDate: (date: Date) => DocumentWithId<VisitDoc>[]
  getVisitsByUser: (userId: string) => DocumentWithId<VisitDoc>[]
}

export const useVisitQueries = (options: VisitQueriesOptions = {}): VisitQueriesState & VisitQueriesActions => {
  const { data: visits, isLoading: visitsLoading, error: visitsError } = useFirestoreCollection<VisitDoc>('visits')
  const { data: ccis, isLoading: ccisLoading, error: ccisError } = useFirestoreCollection<CCIDoc>('ccis')
  
  const isLoading = visitsLoading || ccisLoading
  const error = visitsError || ccisError

  // Visit getter
  const getVisit = useCallback((visitId: string): DocumentWithId<VisitDoc> | undefined => {
    return visits?.find(v => v.id === visitId)
  }, [visits])

  // Visit creation
  const createVisit = useCallback((initialData?: Partial<VisitDoc>) => {
    return useNewVisitEdit(initialData, options)
  }, [options])

  // Visit editing
  const editVisit = useCallback((visitId: string) => {
    const visit = getVisit(visitId)
    if (!visit) return null
    
    return useVisitEdit(visit, options)
  }, [getVisit, options])

  // Bulk update operations
  const updateVisitStatus = useCallback(async (visitId: string, status: VisitDoc['status']): Promise<boolean> => {
    const visit = getVisit(visitId)
    if (!visit) return false
    
    const editHook = useVisitEdit(visit, { ...options, autoSave: true })
    editHook.updateStatus(status)
    
    return await editHook.save()
  }, [getVisit, options])

  const updateVisitCci = useCallback(async (visitId: string, cciId: string | null): Promise<boolean> => {
    const visit = getVisit(visitId)
    if (!visit) return false
    
    const editHook = useVisitEdit(visit, { ...options, autoSave: true })
    editHook.updateCci(cciId)
    
    return await editHook.save()
  }, [getVisit, options])

  const updateVisitDate = useCallback(async (visitId: string, date: Date): Promise<boolean> => {
    const visit = getVisit(visitId)
    if (!visit) return false
    
    const editHook = useVisitEdit(visit, { ...options, autoSave: true })
    editHook.updateDate(date)
    
    return await editHook.save()
  }, [getVisit, options])

  // Utility functions
  const getVisitsByCci = useCallback((cciId: string): DocumentWithId<VisitDoc>[] => {
    return visits?.filter(v => v.cci_id === cciId) || []
  }, [visits])

  const getVisitsByDate = useCallback((date: Date): DocumentWithId<VisitDoc>[] => {
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)
    
    return visits?.filter(v => {
      const visitDate = v.date?.toDate ? v.date.toDate() : new Date(v.date)
      return visitDate >= targetDate && visitDate < nextDay
    }) || []
  }, [visits])

  const getVisitsByUser = useCallback((userId: string): DocumentWithId<VisitDoc>[] => {
    return visits?.filter(v => v.filledByUid === userId) || []
  }, [visits])

  return {
    // State
    visits: visits || [],
    ccis: ccis || [],
    isLoading,
    error,
    
    // Actions
    getVisit,
    createVisit,
    editVisit,
    updateVisitStatus,
    updateVisitCci,
    updateVisitDate,
    getVisitsByCci,
    getVisitsByDate,
    getVisitsByUser
  }
}

// Specialized hooks for common patterns
export const useVisitById = (visitId: string, options?: VisitQueriesOptions) => {
  const { getVisit, editVisit } = useVisitQueries(options)
  const visit = getVisit(visitId)
  const editHook = editVisit(visitId)
  
  return {
    visit,
    editHook,
    isLoading: !visit && !editHook,
    error: null
  }
}

export const useVisitsByDate = (date: Date, options?: VisitQueriesOptions) => {
  const { getVisitsByDate, visits, isLoading, error } = useVisitQueries(options)
  const visitsForDate = getVisitsByDate(date)
  
  return {
    visits: visitsForDate,
    allVisits: visits,
    isLoading,
    error
  }
}