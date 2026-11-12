import { describe, expect, it } from 'vitest'
import {
  BRATISLAVA_TZ,
  fridayDeadline,
  zonedLocalToUtcMs,
} from '../lib/friday-deadline'
import {
  fridayDeadline as fridayDeadlineJs,
  zonedLocalToUtcMs as zonedLocalToUtcMsJs,
} from '../public/friday-deadline.js'

function atBratislava(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  millisecond = 0,
): Date {
  return new Date(
    zonedLocalToUtcMs(year, month, day, hour, minute, second, millisecond, BRATISLAVA_TZ),
  )
}

function expectFriday(
  now: Date,
  year: number,
  month: number,
  day: number,
) {
  const got = fridayDeadline(now, BRATISLAVA_TZ)
  const deadlineMs = zonedLocalToUtcMs(year, month, day, 23, 59, 59, 999, BRATISLAVA_TZ)
  expect(got.year).toBe(year)
  expect(got.month).toBe(month)
  expect(got.day).toBe(day)
  expect(got.deadlineMs).toBe(deadlineMs)
  expect(got.displayDate).toBe(`${day}. ${month}.`)
  expect(got.displayLabel).toBe(`do piatka ${day}. ${month}.`)
  expect(new Date(got.deadlineMs).getTime()).toBe(deadlineMs)
}

describe('fridayDeadline (Europe/Bratislava)', () => {
  it('Monday shows this week’s Friday', () => {
    expectFriday(atBratislava(2026, 11, 9, 8, 0, 0), 2026, 11, 13)
    expect(fridayDeadline(atBratislava(2026, 11, 9, 8, 0, 0)).displayLabel).toBe(
      'do piatka 13. 11.',
    )
  })

  it('Friday 23:59 is still this Friday', () => {
    expectFriday(atBratislava(2026, 11, 13, 23, 59, 0), 2026, 11, 13)
    expectFriday(atBratislava(2026, 11, 13, 23, 59, 59, 0), 2026, 11, 13)
    expectFriday(atBratislava(2026, 11, 13, 23, 59, 59, 999), 2026, 11, 13)
  })

  it('Saturday 00:00 rolls to next Friday', () => {
    expectFriday(atBratislava(2026, 11, 14, 0, 0, 0), 2026, 11, 20)
    expect(fridayDeadline(atBratislava(2026, 11, 14, 0, 0, 0)).displayLabel).toBe(
      'do piatka 20. 11.',
    )
  })

  it('Sunday shows next week’s Friday', () => {
    expectFriday(atBratislava(2026, 11, 15, 12, 0, 0), 2026, 11, 20)
  })

  it('DST-change week: Saturday after the last CEST Friday rolls to the first CET Friday', () => {
    // 2026-10-25 03:00 CEST → 02:00 CET. Mon–Fri of that week stay CEST; next Friday is CET.
    expectFriday(atBratislava(2026, 10, 19, 10, 0, 0), 2026, 10, 23)
    expectFriday(atBratislava(2026, 10, 23, 23, 59, 0), 2026, 10, 23)
    expectFriday(atBratislava(2026, 10, 24, 0, 0, 0), 2026, 10, 30)
    expectFriday(atBratislava(2026, 10, 25, 12, 0, 0), 2026, 10, 30)

    const cestaFriday = fridayDeadline(atBratislava(2026, 10, 23, 12, 0, 0))
    const cetFriday = fridayDeadline(atBratislava(2026, 10, 24, 0, 0, 0))
    expect(cestaFriday.deadlineMs).toBe(
      zonedLocalToUtcMs(2026, 10, 23, 23, 59, 59, 999, BRATISLAVA_TZ),
    )
    expect(cetFriday.deadlineMs).toBe(
      zonedLocalToUtcMs(2026, 10, 30, 23, 59, 59, 999, BRATISLAVA_TZ),
    )
    // Fall-back adds one hour, so the civil week is 7d + 1h.
    expect(cetFriday.deadlineMs - cestaFriday.deadlineMs).toBe(7 * 86400000 + 3600000)
  })

  it('spring-forward week: Saturday before the CEST jump rolls to next Friday in CEST', () => {
    expectFriday(atBratislava(2026, 3, 23, 10, 0, 0), 2026, 3, 27)
    expectFriday(atBratislava(2026, 3, 28, 0, 0, 0), 2026, 4, 3)
    expectFriday(atBratislava(2026, 3, 29, 12, 0, 0), 2026, 4, 3)
  })

  it('public/friday-deadline.js matches the TypeScript module', () => {
    const samples = [
      atBratislava(2026, 11, 9, 8, 0, 0),
      atBratislava(2026, 11, 13, 23, 59, 0),
      atBratislava(2026, 11, 14, 0, 0, 0),
      atBratislava(2026, 11, 15, 12, 0, 0),
      atBratislava(2026, 10, 24, 0, 0, 0),
      atBratislava(2026, 3, 29, 12, 0, 0),
    ]
    for (const now of samples) {
      expect(fridayDeadlineJs(now, BRATISLAVA_TZ)).toEqual(fridayDeadline(now, BRATISLAVA_TZ))
      expect(
        zonedLocalToUtcMsJs(2026, 11, 13, 23, 59, 59, 999, BRATISLAVA_TZ),
      ).toBe(zonedLocalToUtcMs(2026, 11, 13, 23, 59, 59, 999, BRATISLAVA_TZ))
    }
  })
})
