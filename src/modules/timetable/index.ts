// Timetable module — owns the TimetableEntry schedule and the one-off-override mechanism that
// every leave/shift-change feature relies on to apply an approved request to a single day
// without disturbing the recurring weekly schedule. This is the module's public API; other
// modules should only import from here, not reach into the files below directly.

export { getEffectiveTimetableForWeek, getEffectiveDayValue } from './timetableResolve'
export type { ResolvedTimetableEntry } from './timetableResolve'
export { snapshotTimetableRange, markTimetableRange, restoreTimetableSnapshot } from './timetableRange'
export { getLeaveOverridesForWeek } from './leaveOverrides'
