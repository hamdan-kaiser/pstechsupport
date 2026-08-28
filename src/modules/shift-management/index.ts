// Shift Management module — owns Additional Shift, Shift Swap, Change Shift, and Move Shift.
// These features move employees between shifts/days rather than reporting an absence (that's
// the Leave & Attendance module's concern), but they lean on the same Timetable one-off-override
// mechanism and the same cross-request conflict check.

export { AdditionalShiftClient } from './components/AdditionalShiftClient'
export { ShiftSwapClient } from './components/ShiftSwapClient'
export { ShiftChangeClient } from './components/ShiftChangeClient'
export { MoveShiftClient } from './components/MoveShiftClient'
