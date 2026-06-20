export const HOURS = Array.from({ length: 24 }, (_, index) => index)
export const DAYS_TO_SHOW = 90
export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export type Timetable = number[]
export type TimetableByDate = Record<string, Timetable>
export type WeekTimetable = Timetable[]

export type Preset = {
  id: string
  name: string
  weekTimetable: WeekTimetable
  order: number
}

export type WeekPlanState = {
  assignments: Record<string, string>
  continueEnabled: boolean
  continuePresetId: string | null
  continueAnchorWeekKey: string | null
}

export type MonthWeek = {
  weekKey: string
  weekIndex: number
  label: string
  dateKeys: string[]
}

export type MonthBlock = {
  monthKey: string
  label: string
  weeks: MonthWeek[]
}

export const createEmptyTimetable = (): Timetable => Array.from({ length: 24 }, () => 0)

export const toDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const addDays = (dateKey: string, days: number): string => {
  const next = new Date(`${dateKey}T00:00:00`)
  next.setDate(next.getDate() + days)
  return toDateKey(next)
}

export const formatDisplayDate = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00`)
  return `${date.getMonth() + 1}/${date.getDate()} (${WEEKDAYS[date.getDay()]})`
}

export const ensureTimetable = (source?: Timetable): Timetable => {
  if (!source || source.length !== 24) {
    return createEmptyTimetable()
  }
  return [...source]
}

export const createEmptyWeekTimetable = (): WeekTimetable =>
  Array.from({ length: 7 }, () => createEmptyTimetable())

export const ensureWeekTimetable = (source?: WeekTimetable | Timetable): WeekTimetable => {
  if (Array.isArray(source) && source.length === 7 && Array.isArray(source[0])) {
    return (source as WeekTimetable).map((day) => ensureTimetable(day))
  }
  if (Array.isArray(source) && source.length === 24) {
    const day = ensureTimetable(source as Timetable)
    return Array.from({ length: 7 }, () => [...day])
  }
  return createEmptyWeekTimetable()
}

export const weekdayIndexFromDateKey = (dateKey: string): number =>
  new Date(`${dateKey}T00:00:00`).getDay()

export const createDefaultPresets = (): Preset[] => [
  {
    id: 'preset-1',
    name: 'プリセット1',
    weekTimetable: createEmptyWeekTimetable(),
    order: 0,
  },
]

export const buildMonthWeeks = (year: number, month: number, firstDate: string, lastDate: string): MonthWeek[] => {
  const daysInMonth = new Date(year, month, 0).getDate()
  const weeks: MonthWeek[] = []

  for (let weekIndex = 1; weekIndex <= 5; weekIndex += 1) {
    const startDay = (weekIndex - 1) * 7 + 1
    if (startDay > daysInMonth) {
      break
    }
    const endDay = Math.min(startDay + 6, daysInMonth)
    const dateKeys: string[] = []
    for (let day = startDay; day <= endDay; day += 1) {
      const dateKey = `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`
      if (dateKey >= firstDate && dateKey <= lastDate) {
        dateKeys.push(dateKey)
      }
    }
    if (dateKeys.length === 0) {
      continue
    }
    weeks.push({
      weekKey: `${year}-${`${month}`.padStart(2, '0')}-W${weekIndex}`,
      weekIndex,
      label: `${weekIndex}週目 (${startDay}〜${endDay}日)`,
      dateKeys,
    })
  }

  return weeks
}

export const buildMonthBlocks = (dateKeys: string[]): MonthBlock[] => {
  if (dateKeys.length === 0) {
    return []
  }

  const first = new Date(`${dateKeys[0]}T00:00:00`)
  const last = new Date(`${dateKeys[dateKeys.length - 1]}T00:00:00`)
  const blocks: MonthBlock[] = []
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1)

  while (cursor <= last) {
    const year = cursor.getFullYear()
    const month = cursor.getMonth() + 1
    const weeks = buildMonthWeeks(year, month, dateKeys[0], dateKeys[dateKeys.length - 1])
    if (weeks.length > 0) {
      blocks.push({
        monthKey: `${year}-${`${month}`.padStart(2, '0')}`,
        label: `${year}年${month}月`,
        weeks,
      })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return blocks
}

export const compareWeekKeys = (left: string, right: string): number => {
  const parse = (weekKey: string): number => {
    const match = weekKey.match(/^(\d{4})-(\d{2})-W(\d+)$/)
    if (!match) {
      return 0
    }
    return Number(match[1]) * 10000 + Number(match[2]) * 100 + Number(match[3])
  }
  return parse(left) - parse(right)
}

export const collectWeeksFrom = (monthBlocks: MonthBlock[], fromWeekKey: string): MonthWeek[] => {
  const weeks: MonthWeek[] = []
  monthBlocks.forEach((block) => {
    block.weeks.forEach((week) => {
      if (compareWeekKeys(week.weekKey, fromWeekKey) >= 0) {
        weeks.push(week)
      }
    })
  })
  return weeks
}
