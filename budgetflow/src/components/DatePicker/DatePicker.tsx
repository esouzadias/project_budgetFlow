import { useMemo, useState, type MouseEvent } from "react";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import KeyboardArrowLeftRoundedIcon from "@mui/icons-material/KeyboardArrowLeftRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";

import { useLanguage } from "../../localization/useLanguage";
import type { MonthKey } from "../../pages/DashboardPage/DashboardPage.types";

import "./DatePicker.styles.less";

type PickerView = "year" | "month";

type DatePickerProps = {
  value: MonthKey;
  onChange: (nextValue: MonthKey) => void;
  locale?: string;
  label?: string;
};

const YEAR_PAGE_SIZE = 12;

const getMonthKeyParts = (monthKey: MonthKey) => {
  const [year, month] = monthKey.split("-").map(Number);

  return { year, month };
};

const createMonthKey = (year: number, month: number) => {
  return `${year}-${String(month).padStart(2, "0")}` as MonthKey;
};

const getYearPageStart = (year: number) => {
  return Math.floor(year / YEAR_PAGE_SIZE) * YEAR_PAGE_SIZE;
};

const DatePicker = ({
  value,
  onChange,
  locale,
  label,
}: DatePickerProps) => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const resolvedLocale = locale ?? activeLanguage.locale;
  const resolvedLabel = label ?? dictionary.period.choosePeriod;
  const selectedPeriod = useMemo(() => getMonthKeyParts(value), [value]);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [view, setView] = useState<PickerView>("year");
  const [draftYear, setDraftYear] = useState(selectedPeriod.year);
  const [yearPageStart, setYearPageStart] = useState(getYearPageStart(selectedPeriod.year));

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        number: index + 1,
        label: new Intl.DateTimeFormat(resolvedLocale, { month: "short" }).format(new Date(2020, index, 1)),
      })),
    [resolvedLocale],
  );

  const years = useMemo(
    () => Array.from({ length: YEAR_PAGE_SIZE }, (_, index) => yearPageStart + index),
    [yearPageStart],
  );

  const openPicker = (event: MouseEvent<HTMLButtonElement>) => {
    setDraftYear(selectedPeriod.year);
    setYearPageStart(getYearPageStart(selectedPeriod.year));
    setView("year");
    setAnchorElement(event.currentTarget);
  };

  const closePicker = () => {
    setAnchorElement(null);
  };

  const selectYear = (year: number) => {
    setDraftYear(year);
    setView("month");
  };

  const selectMonth = (month: number) => {
    onChange(createMonthKey(draftYear, month));
    closePicker();
  };

  return (
    <div className="bf-date-picker">
      <Tooltip title={resolvedLabel} arrow>
        <button
          type="button"
          className="bf-date-picker__button"
          onClick={openPicker}
          aria-label={resolvedLabel}
          aria-haspopup="dialog"
          aria-expanded={Boolean(anchorElement)}
        >
          <CalendarMonthRoundedIcon fontSize="small" />
        </button>
      </Tooltip>

      <Popover
        open={Boolean(anchorElement)}
        anchorEl={anchorElement}
        onClose={closePicker}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{
          paper: {
            className: "bf-date-picker__popup",
            role: "dialog",
            "aria-label": resolvedLabel,
          },
        }}
      >
        <div className="bf-date-picker__header">
          {view === "month" ? (
            <button
              type="button"
              className="bf-date-picker__header-button"
              onClick={() => setView("year")}
              aria-label={dictionary.period.chooseAnotherYear}
            >
              <ArrowBackRoundedIcon fontSize="small" />
            </button>
          ) : (
            <button
              type="button"
              className="bf-date-picker__header-button"
              onClick={() => setYearPageStart((currentStart) => currentStart - YEAR_PAGE_SIZE)}
              aria-label={dictionary.period.previousYears}
            >
              <KeyboardArrowLeftRoundedIcon fontSize="small" />
            </button>
          )}

          <strong className="bf-date-picker__title">
            {view === "year" ? `${yearPageStart}–${yearPageStart + YEAR_PAGE_SIZE - 1}` : draftYear}
          </strong>

          {view === "year" ? (
            <button
              type="button"
              className="bf-date-picker__header-button"
              onClick={() => setYearPageStart((currentStart) => currentStart + YEAR_PAGE_SIZE)}
              aria-label={dictionary.period.nextYears}
            >
              <KeyboardArrowRightRoundedIcon fontSize="small" />
            </button>
          ) : (
            <span className="bf-date-picker__header-spacer" aria-hidden="true" />
          )}
        </div>

        <p className="bf-date-picker__instruction">
          {view === "year" ? dictionary.period.chooseYear : dictionary.period.chooseMonth}
        </p>

        {view === "year" ? (
          <div className="bf-date-picker__grid bf-date-picker__grid--years">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                className={`bf-date-picker__option ${year === selectedPeriod.year ? "bf-date-picker__option--selected" : ""}`}
                onClick={() => selectYear(year)}
                aria-pressed={year === selectedPeriod.year}
              >
                {year}
              </button>
            ))}
          </div>
        ) : (
          <div className="bf-date-picker__grid bf-date-picker__grid--months">
            {months.map((month) => {
              const isSelected = draftYear === selectedPeriod.year && month.number === selectedPeriod.month;

              return (
                <button
                  key={month.number}
                  type="button"
                  className={`bf-date-picker__option ${isSelected ? "bf-date-picker__option--selected" : ""}`}
                  onClick={() => selectMonth(month.number)}
                  aria-pressed={isSelected}
                >
                  {month.label}
                </button>
              );
            })}
          </div>
        )}
      </Popover>
    </div>
  );
};

export default DatePicker;
