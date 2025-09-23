import React, { createContext, useContext } from 'react'

export interface SelectedDateCtx {
  selectedDate: Date
  setSelectedDate: (d: Date) => void
}

const SelectedDateContext = createContext<SelectedDateCtx | undefined>(undefined)

export const SelectedDateProvider: React.FC<{ value: SelectedDateCtx; children: React.ReactNode }> = ({ value, children }) => (
  <SelectedDateContext.Provider value={value}>{children}</SelectedDateContext.Provider>
)

export const useSelectedDate = () => {
  const ctx = useContext(SelectedDateContext)
  if (!ctx) throw new Error('useSelectedDate must be used within SelectedDateProvider')
  return ctx
}

