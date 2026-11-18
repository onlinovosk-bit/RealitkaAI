/** @typedef {{ deadlineMs: number, year: number, month: number, day: number, displayDate: string, displayLabel: string }} FridayDeadline */

export const BRATISLAVA_TZ = 'Europe/Bratislava'

function zonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const map = {}
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

function addCalendarDays(year, month, day, days) {
  const utc = Date.UTC(year, month - 1, day + days)
  const next = new Date(utc)
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }
}

export function zonedLocalToUtcMs(year, month, day, hour, minute, second, millisecond, timeZone) {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  for (let i = 0; i < 8; i++) {
    const local = zonedParts(new Date(utc), timeZone)
    const got = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)
    const want = Date.UTC(year, month - 1, day, hour, minute, second)
    const delta = want - got
    if (delta === 0) return utc
    utc += delta
  }
  return utc
}

function daysUntilFriday(utcWeekday) {
  if (utcWeekday === 6) return 6
  if (utcWeekday === 0) return 5
  return 5 - utcWeekday
}

function formatSkDayMonth(day, month) {
  return `${day}. ${month}.`
}

/**
 * Friday of the current week at 23:59:59.999 in `timeZone`.
 * Monday–Friday → this week's Friday; Saturday–Sunday → next week's Friday.
 *
 * @param {Date} [now]
 * @param {string} [timeZone]
 * @returns {FridayDeadline}
 */
export function fridayDeadline(now = new Date(), timeZone = BRATISLAVA_TZ) {
  const local = zonedParts(now, timeZone)
  const weekday = new Date(Date.UTC(local.year, local.month - 1, local.day)).getUTCDay()
  const friday = addCalendarDays(local.year, local.month, local.day, daysUntilFriday(weekday))
  const deadlineMs = zonedLocalToUtcMs(
    friday.year,
    friday.month,
    friday.day,
    23,
    59,
    59,
    999,
    timeZone,
  )
  const displayDate = formatSkDayMonth(friday.day, friday.month)
  return {
    deadlineMs,
    year: friday.year,
    month: friday.month,
    day: friday.day,
    displayDate,
    displayLabel: `do piatka ${displayDate}`,
  }
}
