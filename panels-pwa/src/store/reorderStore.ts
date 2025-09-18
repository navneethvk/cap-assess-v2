import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type OrderUpdate = { id: string; order: number }

interface ReorderState {
  isInMoveModeByDate: Record<string, boolean>
  localOrderIdsByDate: Record<string, string[]>
  pendingUpdates: Array<{ dateKey: string; updates: OrderUpdate[] }>

  startMove: (dateKey: string, orderIds: string[]) => void
  updateLocalOrder: (dateKey: string, orderIds: string[]) => void
  exitMove: (dateKey: string) => void
  queueUpdates: (dateKey: string, updates: OrderUpdate[]) => void
  clearQueue: () => void
  removeQueueForDate: (dateKey: string) => void
}

export const useReorderStore = create<ReorderState>()(
  persist(
    (set) => ({
      isInMoveModeByDate: {},
      localOrderIdsByDate: {},
      pendingUpdates: [],

      startMove: (dateKey, orderIds) =>
        set(state => ({
          isInMoveModeByDate: { ...state.isInMoveModeByDate, [dateKey]: true },
          localOrderIdsByDate: { ...state.localOrderIdsByDate, [dateKey]: orderIds },
        })),

      updateLocalOrder: (dateKey, orderIds) =>
        set(state => ({
          localOrderIdsByDate: { ...state.localOrderIdsByDate, [dateKey]: orderIds },
        })),

      exitMove: (dateKey) =>
        set(state => ({
          isInMoveModeByDate: { ...state.isInMoveModeByDate, [dateKey]: false },
        })),

      queueUpdates: (dateKey, updates) =>
        set(state => ({ pendingUpdates: [...state.pendingUpdates, { dateKey, updates }] })),

      clearQueue: () => set({ pendingUpdates: [] }),

      removeQueueForDate: (dateKey) =>
        set(state => ({ pendingUpdates: state.pendingUpdates.filter(u => u.dateKey !== dateKey) })),
    }),
    {
      name: 'reorder-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        isInMoveModeByDate: state.isInMoveModeByDate,
        localOrderIdsByDate: state.localOrderIdsByDate,
        pendingUpdates: state.pendingUpdates,
      }),
    }
  )
)


