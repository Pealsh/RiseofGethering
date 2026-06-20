import { useCallback, useEffect, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import {
  createDefaultPresets,
  createEmptyWeekTimetable,
  ensureWeekTimetable,
  type Preset,
  type Timetable,
  type WeekTimetable,
} from '../lib/scheduleUtils'

const parsePresetFromFirestore = (id: string, data: Record<string, unknown>): Preset => {
  const weekTimetable = data.weekTimetable
    ? ensureWeekTimetable(data.weekTimetable as WeekTimetable)
    : ensureWeekTimetable(data.timetable as Timetable)

  return {
    id,
    name: (data.name as string) ?? id,
    weekTimetable,
    order: (data.order as number) ?? 0,
  }
}

export function usePresets(userId: string): {
  presets: Preset[]
  updatePreset: (presetId: string, patch: Partial<Pick<Preset, 'name' | 'weekTimetable'>>) => void
  togglePresetHour: (presetId: string, dayIndex: number, hour: number) => void
  addPreset: () => void
  deletePreset: (presetId: string) => boolean
} {
  const [presets, setPresets] = useState<Preset[]>(createDefaultPresets)

  useEffect(() => {
    if (!db || !userId) {
      setPresets(createDefaultPresets())
      return
    }

    const firestore = db
    const presetsRef = collection(firestore, 'schedules', userId, 'presets')
    const unsubscribe = onSnapshot(
      presetsRef,
      (snapshot) => {
        if (snapshot.empty) {
          const defaults = createDefaultPresets()
          setPresets(defaults)
          defaults.forEach((preset) => {
            void setDoc(
              doc(firestore, 'schedules', userId, 'presets', preset.id),
              { name: preset.name, weekTimetable: preset.weekTimetable, order: preset.order },
              { merge: true },
            )
          })
          return
        }
        const next: Preset[] = []
        snapshot.forEach((item) => {
          next.push(parsePresetFromFirestore(item.id, item.data()))
        })
        next.sort((left, right) => left.order - right.order)
        setPresets(next)
      },
      () => {
        setPresets(createDefaultPresets())
      },
    )

    return () => unsubscribe()
  }, [userId])

  const persistPreset = useCallback(
    async (preset: Preset): Promise<void> => {
      if (!db || !userId) {
        setPresets((prev) => prev.map((item) => (item.id === preset.id ? preset : item)))
        return
      }
      await setDoc(
        doc(db, 'schedules', userId, 'presets', preset.id),
        {
          name: preset.name,
          weekTimetable: preset.weekTimetable,
          order: preset.order,
        },
        { merge: true },
      )
    },
    [userId],
  )

  const updatePreset = useCallback(
    (presetId: string, patch: Partial<Pick<Preset, 'name' | 'weekTimetable'>>): void => {
      setPresets((prev) => {
        const next = prev.map((preset) =>
          preset.id === presetId
            ? {
                ...preset,
                ...patch,
                weekTimetable: patch.weekTimetable
                  ? ensureWeekTimetable(patch.weekTimetable)
                  : preset.weekTimetable,
              }
            : preset,
        )
        const updated = next.find((preset) => preset.id === presetId)
        if (updated) {
          void persistPreset(updated)
        }
        return next
      })
    },
    [persistPreset],
  )

  const togglePresetHour = useCallback(
    (presetId: string, dayIndex: number, hour: number): void => {
      setPresets((prev) => {
        const next = prev.map((preset) => {
          if (preset.id !== presetId) {
            return preset
          }
          const weekTimetable = preset.weekTimetable.map((day, index) => {
            if (index !== dayIndex) {
              return day
            }
            const timetable = [...day]
            timetable[hour] = timetable[hour] === 1 ? 0 : 1
            return timetable
          })
          return { ...preset, weekTimetable }
        })
        const updated = next.find((preset) => preset.id === presetId)
        if (updated) {
          void persistPreset(updated)
        }
        return next
      })
    },
    [persistPreset],
  )

  const addPreset = useCallback((): void => {
    setPresets((prev) => {
      const nextOrder = prev.length > 0 ? Math.max(...prev.map((preset) => preset.order)) + 1 : 0
      const newPreset: Preset = {
        id: `preset-${Date.now()}`,
        name: `プリセット${prev.length + 1}`,
        weekTimetable: createEmptyWeekTimetable(),
        order: nextOrder,
      }
      void persistPreset(newPreset)
      return [...prev, newPreset]
    })
  }, [persistPreset])

  const deletePreset = useCallback(
    (presetId: string): boolean => {
      let deleted = false
      setPresets((prev) => {
        if (prev.length <= 1) {
          return prev
        }
        deleted = true
        if (db && userId) {
          void deleteDoc(doc(db, 'schedules', userId, 'presets', presetId))
        }
        return prev.filter((preset) => preset.id !== presetId)
      })
      return deleted
    },
    [userId],
  )

  return { presets, updatePreset, togglePresetHour, addPreset, deletePreset }
}
