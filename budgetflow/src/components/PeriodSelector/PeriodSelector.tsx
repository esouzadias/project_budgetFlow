import "./PeriodSelector.styles.less";

import KeyboardArrowLeftRoundedIcon from "@mui/icons-material/KeyboardArrowLeftRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";

import type { MonthKey } from "../../pages/DashboardPage/DashboardPage.types";

export type PeriodSelectorLabels = {
  previous: string;
  next: string;
  current: string;
  currentPeriod: string;
};

export type PeriodSelectorProps = {
  activePeriodKey: MonthKey;
  locale?: string;
  labels?: Partial<PeriodSelectorLabels>;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onCurrentPeriod?: () => void;
};

const defaultLabels: PeriodSelectorLabels = {
  previous: "Previous month",
  next: "Next month",
  current: "Current month",
  currentPeriod: "Current period",
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
  locale = "en-US",
  labels,
  onPreviousPeriod,
  onNextPeriod,
  onCurrentPeriod,
}: PeriodSelectorProps) => {
  const mergedLabels = {
    ...defaultLabels,
    ...labels,
  };

  return (
    <section className="bf-period-selector" aria-label={mergedLabels.currentPeriod}>
      <button
        type="button"
        className="bf-period-selector__nav-button"
        onClick={onPreviousPeriod}
        aria-label={mergedLabels.previous}
      >
        <KeyboardArrowLeftRoundedIcon fontSize="small" />
      </button>

      <div className="bf-period-selector__period">
        <span className="bf-period-selector__eyebrow">{mergedLabels.currentPeriod}</span>
        <strong className="bf-period-selector__label">{formatPeriodLabel(activePeriodKey, locale)}</strong>
      </div>

      <button
        type="button"
        className="bf-period-selector__nav-button"
        onClick={onNextPeriod}
        aria-label={mergedLabels.next}
      >
        <KeyboardArrowRightRoundedIcon fontSize="small" />
      </button>

      {onCurrentPeriod ? (
        <button type="button" className="bf-period-selector__current-button" onClick={onCurrentPeriod}>
          <TodayRoundedIcon fontSize="small" />
          <span>{mergedLabels.current}</span>
        </button>
      ) : null}
    </section>
  );
};

export default PeriodSelector;