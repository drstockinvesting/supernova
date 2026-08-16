"""School calendar: instructional days, marking periods, and holidays.

Attendance can only be generated against days school was actually in session, and
the narratives in the UI/UX design ("missed the Unit 2 introduction on September
14th") need real dates to anchor to. Everything dated in the dataset is validated
against this calendar.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field

from .config import (
    INSTRUCTIONAL_DAYS_TARGET,
    MARKING_PERIODS_PER_YEAR,
    SCHOOL_YEAR_START,
)


@dataclass(frozen=True)
class MarkingPeriod:
    id: str
    school_year: str
    name: str
    sequence: int
    start_date: dt.date
    end_date: dt.date
    instructional_days: list[dt.date]

    @property
    def instructional_day_count(self) -> int:
        return len(self.instructional_days)

    def to_record(self, calendar_id: str) -> dict:
        return {
            "id": self.id,
            "schoolCalendarId": calendar_id,
            "schoolYear": self.school_year,
            "name": self.name,
            "sequence": self.sequence,
            "startDate": self.start_date.isoformat(),
            "endDate": self.end_date.isoformat(),
            "instructionalDayCount": self.instructional_day_count,
        }


@dataclass
class SchoolCalendar:
    id: str
    school_id: str
    school_year: str
    instructional_days: list[dt.date]
    non_instructional_days: list[dict]
    marking_periods: list[MarkingPeriod]

    @property
    def first_day(self) -> dt.date:
        return self.instructional_days[0]

    @property
    def last_day(self) -> dt.date:
        return self.instructional_days[-1]

    def marking_period_for(self, date: dt.date) -> MarkingPeriod | None:
        for period in self.marking_periods:
            if period.start_date <= date <= period.end_date:
                return period
        return None

    def is_instructional(self, date: dt.date) -> bool:
        return date in self._instructional_set

    def __post_init__(self) -> None:
        self._instructional_set = set(self.instructional_days)

    def to_record(self) -> dict:
        return {
            "id": self.id,
            "schoolId": self.school_id,
            "schoolYear": self.school_year,
            "firstInstructionalDay": self.first_day.isoformat(),
            "lastInstructionalDay": self.last_day.isoformat(),
            "totalInstructionalDays": len(self.instructional_days),
            "instructionalDays": [d.isoformat() for d in self.instructional_days],
            "nonInstructionalDays": self.non_instructional_days,
            "markingPeriods": [
                mp.to_record(self.id) for mp in self.marking_periods
            ],
            "metadata": {
                "dataSource": "supernova-generator",
                "isApproximate": False,
            },
        }


def _nth_weekday(year: int, month: int, weekday: int, n: int) -> dt.date:
    """The nth occurrence of a weekday in a month. Monday is 0."""
    date = dt.date(year, month, 1)
    offset = (weekday - date.weekday()) % 7
    return date + dt.timedelta(days=offset + 7 * (n - 1))


def _last_weekday(year: int, month: int, weekday: int) -> dt.date:
    if month == 12:
        last = dt.date(year, 12, 31)
    else:
        last = dt.date(year, month + 1, 1) - dt.timedelta(days=1)
    offset = (last.weekday() - weekday) % 7
    return last - dt.timedelta(days=offset)


def _holiday_closures(fall_year: int, spring_year: int) -> dict[dt.date, tuple[str, str]]:
    """Non-instructional days a US public school calendar typically observes."""
    closures: dict[dt.date, tuple[str, str]] = {}

    def mark(date: dt.date, reason: str, description: str) -> None:
        closures[date] = (reason, description)

    # Labor Day - first Monday in September
    mark(_nth_weekday(fall_year, 9, 0, 1), "holiday", "Labor Day")

    # Thanksgiving - fourth Thursday in November, plus the Wednesday and Friday
    thanksgiving = _nth_weekday(fall_year, 11, 3, 4)
    mark(thanksgiving - dt.timedelta(days=1), "break", "Thanksgiving recess")
    mark(thanksgiving, "holiday", "Thanksgiving Day")
    mark(thanksgiving + dt.timedelta(days=1), "break", "Thanksgiving recess")

    # Winter break - Dec 24 through Jan 1
    day = dt.date(fall_year, 12, 24)
    while day <= dt.date(spring_year, 1, 1):
        mark(day, "break", "Winter recess")
        day += dt.timedelta(days=1)

    # Martin Luther King Jr. Day - third Monday in January
    mark(_nth_weekday(spring_year, 1, 0, 3), "holiday", "Martin Luther King Jr. Day")

    # Presidents Day - third Monday in February
    mark(_nth_weekday(spring_year, 2, 0, 3), "holiday", "Presidents Day")

    # Spring break - the week containing the second Monday in April
    spring_monday = _nth_weekday(spring_year, 4, 0, 2)
    for offset in range(5):
        mark(spring_monday + dt.timedelta(days=offset), "break", "Spring recess")

    # Memorial Day - last Monday in May
    mark(_last_weekday(spring_year, 5, 0), "holiday", "Memorial Day")

    # In-service days: one in October, one in March
    mark(_nth_weekday(fall_year, 10, 0, 2), "in_service", "Staff professional development")
    mark(_nth_weekday(spring_year, 3, 4, 1), "in_service", "Staff professional development")

    return closures


def build_calendar(school_id: str, school_year: str) -> SchoolCalendar:
    """Build one school's calendar for one year.

    All three schools share the same district calendar shape, which is how real
    districts operate and what makes cross-school date comparison meaningful.
    """
    fall_year = int(school_year.split("-")[0])
    spring_year = fall_year + 1

    start_month, start_day = SCHOOL_YEAR_START
    start = dt.date(fall_year, start_month, start_day)
    # Nudge to the Monday of that week so the year always opens on a Monday.
    start -= dt.timedelta(days=start.weekday())

    closures = _holiday_closures(fall_year, spring_year)

    instructional_days: list[dt.date] = []
    non_instructional: list[dict] = []

    day = start
    while len(instructional_days) < INSTRUCTIONAL_DAYS_TARGET:
        if day.weekday() >= 5:
            pass  # weekends are implicit; recording every one bloats the record
        elif day in closures:
            reason, description = closures[day]
            non_instructional.append(
                {"date": day.isoformat(), "reason": reason, "description": description}
            )
        else:
            instructional_days.append(day)
        day += dt.timedelta(days=1)

        if day > dt.date(spring_year, 7, 1):  # safety valve
            break

    marking_periods = _split_marking_periods(school_id, school_year, instructional_days)

    return SchoolCalendar(
        id=f"cal-{school_id}-{school_year}",
        school_id=school_id,
        school_year=school_year,
        instructional_days=instructional_days,
        non_instructional_days=non_instructional,
        marking_periods=marking_periods,
    )


def _split_marking_periods(
    school_id: str, school_year: str, instructional_days: list[dt.date]
) -> list[MarkingPeriod]:
    """Divide the instructional days into equal marking periods."""
    periods: list[MarkingPeriod] = []
    total = len(instructional_days)
    per_period = total // MARKING_PERIODS_PER_YEAR

    for index in range(MARKING_PERIODS_PER_YEAR):
        start_index = index * per_period
        # The final period absorbs any remainder.
        end_index = total if index == MARKING_PERIODS_PER_YEAR - 1 else (index + 1) * per_period
        days = instructional_days[start_index:end_index]

        periods.append(
            MarkingPeriod(
                id=f"mp-{school_id}-{school_year}-q{index + 1}",
                school_year=school_year,
                name=f"Quarter {index + 1}",
                sequence=index + 1,
                start_date=days[0],
                end_date=days[-1],
                instructional_days=days,
            )
        )

    return periods


if __name__ == "__main__":
    for year in ["2022-2023", "2023-2024", "2024-2025"]:
        cal = build_calendar("nova-elementary", year)
        print(f"{year}: {len(cal.instructional_days)} instructional days, "
              f"{cal.first_day} to {cal.last_day}, "
              f"{len(cal.non_instructional_days)} closures")
        for mp in cal.marking_periods:
            print(f"   {mp.name}: {mp.start_date} to {mp.end_date} "
                  f"({mp.instructional_day_count} days)")
