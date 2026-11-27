export const leavePeriod = (l) => (l.startDate === l.endDate ? l.startDate : `${l.startDate} to ${l.endDate}`)
