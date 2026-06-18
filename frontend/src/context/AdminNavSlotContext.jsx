import { createContext, useContext, useMemo, useState } from 'react'

const AdminNavSlotContext = createContext(null)

export function AdminNavSlotProvider({ children }) {
  const [slot, setSlot] = useState(null)
  const value = useMemo(() => ({ slot, setSlot }), [slot])
  return <AdminNavSlotContext.Provider value={value}>{children}</AdminNavSlotContext.Provider>
}

export function useAdminNavSlot() {
  return useContext(AdminNavSlotContext) ?? { slot: null, setSlot: () => {} }
}
