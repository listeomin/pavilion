import React, { useState, useEffect } from 'react';
import { DatePicker } from '@heroui/date-picker';
import { HeroUIProvider } from '@heroui/system';
import { parseDate, CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import { I18nProvider } from '@react-aria/i18n';

// Convert JS Date or ISO string to CalendarDate
function toCalendarDate(value) {
  if (!value) return null;

  try {
    if (typeof value === 'string') {
      // Parse ISO date string (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
      const dateOnly = value.split(' ')[0].split('T')[0];
      if (dateOnly.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return parseDate(dateOnly);
      }
    }
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = value.getMonth() + 1;
      const day = value.getDate();
      return new CalendarDate(year, month, day);
    }
  } catch (e) {
    console.error('[DatePicker] Failed to parse date:', value, e);
  }
  return null;
}

// Convert CalendarDate to ISO string (YYYY-MM-DD)
function toISOString(calendarDate) {
  if (!calendarDate) return null;
  const year = calendarDate.year;
  const month = String(calendarDate.month).padStart(2, '0');
  const day = String(calendarDate.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function DatePickerComponent({
  value,
  onChange,
  label = "Дата",
  placeholder = "ДД.ММ.ГГГГ",
  granularity = "day",
  minValue,
  maxValue,
  isDisabled = false,
  className = "",
}) {
  const [date, setDate] = useState(() => toCalendarDate(value));

  // Sync with external value changes
  useEffect(() => {
    const newDate = toCalendarDate(value);
    if (newDate && date) {
      if (newDate.compare(date) !== 0) {
        setDate(newDate);
      }
    } else if (newDate !== date) {
      setDate(newDate);
    }
  }, [value]);

  const handleChange = (newDate) => {
    setDate(newDate);
    if (onChange) {
      const isoString = toISOString(newDate);
      onChange(isoString, newDate);
    }
  };

  return (
    <I18nProvider locale="ru-RU">
      <HeroUIProvider>
        <DatePicker
          label={label}
          value={date}
          onChange={handleChange}
          granularity={granularity}
          placeholderValue={today(getLocalTimeZone())}
          minValue={minValue ? toCalendarDate(minValue) : undefined}
          maxValue={maxValue ? toCalendarDate(maxValue) : undefined}
          isDisabled={isDisabled}
          className={className}
          showMonthAndYearPickers
          calendarProps={{
            classNames: {
              base: "bg-background",
              headerWrapper: "pt-4 bg-background",
              prevButton: "border-1 border-default-200 rounded-small",
              nextButton: "border-1 border-default-200 rounded-small",
              gridHeader: "bg-background shadow-none border-b-1 border-default-100",
              cellButton: [
                "data-[today=true]:bg-default-100 data-[selected=true]:bg-primary",
              ],
            },
          }}
          popoverProps={{
            classNames: {
              content: "p-0 border-small border-divider bg-background",
            },
          }}
        />
      </HeroUIProvider>
    </I18nProvider>
  );
}

export default DatePickerComponent;
