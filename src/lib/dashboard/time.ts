import { APPOINTMENT_TIME_ZONE } from "@/lib/validations/appointment";

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APPOINTMENT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsFor(value: Date): CalendarDate & {
  hour: number;
  minute: number;
  second: number;
} {
  const parts = Object.fromEntries(
    dateTimeFormatter
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function startOfIstanbulDate(date: CalendarDate): Date {
  const utcGuess = Date.UTC(date.year, date.month - 1, date.day);
  const represented = partsFor(new Date(utcGuess));
  const representedAsUtc = Date.UTC(
    represented.year,
    represented.month - 1,
    represented.day,
    represented.hour,
    represented.minute,
    represented.second,
  );

  return new Date(utcGuess - (representedAsUtc - utcGuess));
}

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function getIstanbulDayBounds(now = new Date()): {
  start: Date;
  end: Date;
  nextWeekEnd: Date;
} {
  const today = partsFor(now);

  return {
    start: startOfIstanbulDate(today),
    end: startOfIstanbulDate(addCalendarDays(today, 1)),
    nextWeekEnd: startOfIstanbulDate(addCalendarDays(today, 7)),
  };
}
