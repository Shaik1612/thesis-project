import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const SettingsContext = createContext(null)

const DEFAULTS = {
  kioskEnabled: true,
  webOrderingEnabled: true,
  loyaltyEnabled: true,
  cashEnabled: true,
  deskEnabled: true,
  gstRate: 5,
  gstInclusive: false,
  gstin: '',
  themeConfig: {},
  loaded: false,
}

function mapRow(row) {
  if (!row) return DEFAULTS
  return {
    kioskEnabled: row.kiosk_enabled ?? true,
    webOrderingEnabled: row.web_ordering_enabled ?? true,
    loyaltyEnabled: row.loyalty_enabled ?? true,
    cashEnabled: row.cash_enabled ?? true,
    deskEnabled: row.desk_enabled ?? true,
    gstRate: row.gst_rate ?? 5,
    gstInclusive: row.gst_inclusive ?? false,
    gstin: row.gstin ?? '',
    themeConfig: row.theme_config ?? {},
    loaded: true,
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)

  useEffect(() => {
    const timeout = new Promise(resolve => setTimeout(() => resolve({ data: null, error: 'timeout' }), 2500))
    Promise.race([supabase.from('restaurant_settings').select('*').single(), timeout])
      .then(({ data, error }) => {
        if (data) setSettings(mapRow(data))
        else setSettings(s => ({ ...s, loaded: true })) // demo/offline fallback
      })

    const channel = supabase
      .channel('restaurant_settings_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurant_settings' }, ({ new: row }) => {
        setSettings(mapRow(row))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
