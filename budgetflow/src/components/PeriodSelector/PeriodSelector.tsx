import "./PeriodSelector.styles.less";

import KeyboardArrowLeftRoundedIcon from "@mui/icons-material/KeyboardArrowLeftRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";
import Tooltip from "@mui/material/Tooltip";

import { useLanguage } from "../../localization/useLanguage";
import type { MonthKey } from "../../pages/DashboardPage/DashboardPage.types";
import DatePicker from "../DatePicker/DatePicker";

export type PeriodSelectorLabels = {
  previous: string;
  next: string;
  current: string;
  currentPeriod: string;
  choosePeriod: string;
};

export type PeriodSelectorProps = {
  activePeriodKey: MonthKey;
  locale?: string;
  labels?: Partial<PeriodSelectorLabels>;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onSelectPeriod: (periodKey: MonthKey) => void;
  onCurrentPeriod?: () => void;
};

const formatPeriodLabel = (monthKey: MonthKey, locale: string) => {
  const [yearValue, monthValue] = monthKey.split("-").map(Number);
  const date = new Date(yearValue, monthValue - 1, 1);

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);
};

const PeriodSelector = ({
  activePeriodKey,
  locale,
  labels,
  onPreviousPeriod,
  onNextPeriod,
  onSelectPeriod,
  onCurrentPeriod,
}: PeriodSelectorProps) => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const resolvedLocale = locale ?? activeLanguage.locale;
  const defaultLabels: PeriodSelectorLabels = {
    previous: dictionary.period.previousMonth,
    next: dictionary.period.nextMonth,
    current: dictionary.period.currentMonth,
    currentPeriod: dictionary.period.currentPeriod,
    choosePeriod: dictionary.period.choosePeriod,
  };
  const mergedLabels = {
    ...defaultLabels,
    ...labels,
  };

  return (
    <section className="bf-period-selector" aria-label={mergedLabels.currentPeriod}>
      <Tooltip title={mergedLabels.previous} arrow>
        <button
          type="button"
          className="bf-period-selector__nav-button"
          onClick={onPreviousPeriod}
          aria-label={mergedLabels.previous}
        >
          <KeyboardArrowLeftRoundedIcon fontSize="small" />
        </button>
      </Tooltip>

      <div className="bf-period-selector__period" aria-live="polite">
        <span className="bf-period-selector__eyebrow">{mergedLabels.currentPeriod}</span>
        <strong className="bf-period-selector__label">{formatPeriodLabel(activePeriodKey, resolvedLocale)}</strong>
      </div>

      <Tooltip title={mergedLabels.next} arrow>
        <button
          type="button"
          className="bf-period-selector__nav-button"
          onClick={onNextPeriod}
          aria-label={mergedLabels.next}
        >
          <KeyboardArrowRightRoundedIcon fontSize="small" />
        </button>
      </Tooltip>

      <span className="bf-period-selector__divider" aria-hidden="true" />

      <DatePicker
        value={activePeriodKey}
        onChange={onSelectPeriod}
        locale={resolvedLocale}
        label={mergedLabels.choosePeriod}
      />

      {onCurrentPeriod ? (
        <Tooltip title={mergedLabels.current} arrow>
          <button
            type="button"
            className="bf-period-selector__current-button"
            onClick={onCurrentPeriod}
            aria-label={mergedLabels.current}
          >
            <TodayRoundedIcon fontSize="small" />
          </button>
        </Tooltip>
      ) : null}
    </section>
  );
};

export default PeriodSelector;
