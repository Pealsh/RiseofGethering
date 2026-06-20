import { useCallback, useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { WeekPlanState } from '../lib/scheduleUtils'

const EMPTY_WEEK_PLAN: WeekPlanState = {
  assignments: {},
  continueEnabled: false,
  continuePresetId: null,
  continueAnchorWeekKey: null,
}

export function useWeekPlan(userId: string): {
  weekPlan: WeekPlanState
  setWeekAssignment: (weekKey: string, presetId: string) => void
  setContinueEnabled: (enabled: boolean) => void
  persistWeekPlan: (next: WeekPlanState) => void
} {
  const [weekPlan, setWeekPlan] = useState<WeekPlanState>(EMPTY_WEEK_PLAN)

  useEffect(() => {
    if (!db || !userId) {
      setWeekPlan(EMPTY_WEEK_PLAN)
      return
    }

    const weekPlanRef = doc(db, 'schedules', userId, 'meta', 'weekPlan')
    const unsubscribe = onSnapshot(
      weekPlanRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setWeekPlan(EMPTY_WEEK_PLAN)
          return
        }
        const data = snapshot.data()
        setWeekPlan({
          assignments: (data.assignments as Record<string, string>) ?? {},
          continueEnabled: Boolean(data.continueEnabled),
          continuePresetId: (data.continuePresetId as string | null) ?? null,
          continueAnchorWeekKey: (data.continueAnchorWeekKey as string | null) ?? null,
        })
      },
      () => {
        setWeekPlan(EMPTY_WEEK_PLAN)
      },
    )

    return () => unsubscribe()
  }, [userId])

  const persistWeekPlan = useCallback(
    (next: WeekPlanState): void => {
      setWeekPlan(next)
      if (!db || !userId) {
        return
      }
      void setDoc(
        doc(db, 'schedules', userId, 'meta', 'weekPlan'),
        {
          assignments: next.assignments,
          continueEnabled: next.continueEnabled,
          continuePresetId: next.continuePresetId,
          continueAnchorWeekKey: next.continueAnchorWeekKey,
        },
        { merge: true },
      )
    },
    [userId],
  )

  const setWeekAssignment = useCallback(
    (weekKey: string, presetId: string): void => {
      persistWeekPlan({
        ...weekPlan,
        assignments: {
          ...weekPlan.assignments,
          [weekKey]: presetId,
        },
        continuePresetId: weekPlan.continueEnabled ? presetId : weekPlan.continuePresetId,
      })
    },
    [persistWeekPlan, weekPlan],
  )

  const setContinueEnabled = useCallback(
    (enabled: boolean): void => {
      persistWeekPlan({
        ...weekPlan,
        continueEnabled: enabled,
        continuePresetId: enabled ? weekPlan.continuePresetId : null,
      })
    },
    [persistWeekPlan, weekPlan],
  )

  return { weekPlan, setWeekAssignment, setContinueEnabled, persistWeekPlan }
}
