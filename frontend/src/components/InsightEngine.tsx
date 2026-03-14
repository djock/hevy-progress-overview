import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  ExerciseSession,
  buildTargetSession,
  formatLongDate,
  formatMetric,
  formatPercent,
  getVolumeSignal
} from '../lib/hevy';

type InsightEngineProps = {
  contextLabel: string | null;
  exerciseTitle: string | null;
  sessions: ExerciseSession[];
};

type MetricMode = 'estimated1RM' | 'totalVolume';

type ChartDatum = {
  estimated1RM: number;
  isEstimated1RMPr: boolean;
  isTotalVolumePr: boolean;
  label: string;
  totalVolume: number;
};

export function InsightEngine({
  contextLabel,
  exerciseTitle,
  sessions
}: InsightEngineProps) {
  const [metricMode, setMetricMode] = useState<MetricMode>('estimated1RM');

  const latestSession = sessions[sessions.length - 1] || null;
  const previousSession = sessions[sessions.length - 2] || null;
  const change =
    latestSession && previousSession
      ? latestSession.totalVolume / previousSession.totalVolume - 1
      : null;
  const signal = getVolumeSignal(change);

  const prSession = useMemo(() => {
    if (sessions.length === 0) {
      return null;
    }

    return sessions.reduce((best, session) =>
      session.totalVolume > best.totalVolume ? session : best
    );
  }, [sessions]);

  const targetSession = useMemo(
    () => buildTargetSession(latestSession, change),
    [change, latestSession]
  );

  const chartData = useMemo<ChartDatum[]>(
    () => {
      let bestEstimated1RM = 0;
      let bestTotalVolume = 0;

      return sessions.map((session) => {
        const estimated1RM = Number(session.estimated1RM.toFixed(1));
        const totalVolume = Number(session.totalVolume.toFixed(0));
        const isEstimated1RMPr = estimated1RM >= bestEstimated1RM;
        const isTotalVolumePr = totalVolume >= bestTotalVolume;

        bestEstimated1RM = Math.max(bestEstimated1RM, estimated1RM);
        bestTotalVolume = Math.max(bestTotalVolume, totalVolume);

        return {
          estimated1RM,
          isEstimated1RMPr,
          isTotalVolumePr,
          label: session.sessionLabel,
          totalVolume
        };
      });
    },
    [sessions]
  );

  const xAxisTicks = useMemo(() => {
    if (chartData.length === 0) {
      return [];
    }

    const latestIndex = chartData.length - 1;
    const peakIndex = chartData.reduce((bestIndex, entry, index, items) => {
      return entry[metricMode] > items[bestIndex][metricMode] ? index : bestIndex;
    }, 0);

    return Array.from(new Set([0, peakIndex, latestIndex])).map((index) => chartData[index].label);
  }, [chartData, metricMode]);

  const prDots = useMemo(
    () =>
      chartData
        .filter((entry) =>
          metricMode === 'estimated1RM' ? entry.isEstimated1RMPr : entry.isTotalVolumePr
        )
        .map((entry) => (
          <ReferenceDot
            key={`${metricMode}-${entry.label}`}
            x={entry.label}
            y={entry[metricMode]}
            r={4}
            fill="#f4f4f5"
            stroke={metricMode === 'estimated1RM' ? '#3b82f6' : '#2dd4bf'}
            strokeWidth={2}
            ifOverflow="extendDomain"
          />
        )),
    [chartData, metricMode]
  );

  const estimated1RMSignal =
    latestSession && previousSession
      ? latestSession.estimated1RM / Math.max(previousSession.estimated1RM, 1) - 1
      : null;

  if (!exerciseTitle || sessions.length === 0) {
    return (
      <aside className="command-pane command-pane--insight">
        <div className="panel-shell panel-shell--insight-body insight-placeholder">
          <p className="eyebrow">Insight Engine</p>
          <h2>Select an exercise</h2>
          <p className="panel-copy">
            The trend chart and next-session target appear here after you choose an exercise from
            the current workout or muscle view.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="command-pane command-pane--insight">
      <div className="panel-shell panel-shell--insight-body">
        <div className="panel-shell__header">
          <div>
            <p className="eyebrow">Insight Engine</p>
            <h2>{exerciseTitle}</h2>
            {contextLabel ? <p className="panel-copy panel-copy--tight">{contextLabel}</p> : null}
          </div>
          <span className={`signal-badge ${signal.className}`}>
            {signal.icon} {formatPercent(change)}
          </span>
        </div>

        <div className="toggle-row">
          <button
            type="button"
            className={`toggle-chip ${metricMode === 'estimated1RM' ? 'is-active' : ''}`}
            onClick={() => setMetricMode('estimated1RM')}
          >
            Estimated 1RM
          </button>
          <button
            type="button"
            className={`toggle-chip ${metricMode === 'totalVolume' ? 'is-active' : ''}`}
            onClick={() => setMetricMode('totalVolume')}
          >
            Total Volume
          </button>
        </div>

        <div className="insight-metric-strip">
          <article className={`comparison-card comparison-card--metric ${signal.className}`}>
            <span>{signal.label}</span>
            <p>{formatPercent(change)}</p>
            <small>Volume vs previous session</small>
          </article>

          <article className="comparison-card comparison-card--metric comparison-card--metric-blue">
            <span>Estimated 1RM</span>
            <p>{formatMetric(latestSession?.estimated1RM || 0, ' kg', 1)}</p>
            <small>{formatPercent(estimated1RMSignal)} vs previous session</small>
          </article>
        </div>

        <div className="insight-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 18, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                ticks={xAxisTicks}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgba(244, 244, 245, 0.65)', fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgba(244, 244, 245, 0.65)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(24, 24, 27, 0.94)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16
                }}
                labelStyle={{ color: '#f4f4f5' }}
              />
              <Line
                type="monotone"
                dataKey={metricMode}
                stroke={metricMode === 'estimated1RM' ? '#3b82f6' : '#2dd4bf'}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
                animationDuration={420}
              />
              {prDots}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="comparison-grid">
          <article className="comparison-card comparison-card--target">
            <span>Target for Next Session</span>
            <strong>{change !== null && change > 0 ? 'Advance load' : 'Stabilize output'}</strong>
            <p>{formatMetric(targetSession?.totalVolume || 0, ' kg')}</p>
            <small>
              Target set {formatMetric(targetSession?.bestSetWeight || 0, ' kg')} · Est 1RM{' '}
              {formatMetric(targetSession?.estimated1RM || 0, ' kg', 1)}
            </small>
          </article>

          <article className="comparison-card">
            <span>Last Session</span>
            <strong>{formatLongDate(latestSession?.date)}</strong>
            <p>{formatMetric(latestSession?.totalVolume || 0, ' kg')}</p>
            <small>
              Best set {formatMetric(latestSession?.bestSetWeight || 0, ' kg')} · Est 1RM{' '}
              {formatMetric(latestSession?.estimated1RM || 0, ' kg', 1)}
            </small>
          </article>

          <article className="comparison-card comparison-card--highlight">
            <span>PR Session</span>
            <strong>{formatLongDate(prSession?.date)}</strong>
            <p>{formatMetric(prSession?.totalVolume || 0, ' kg')}</p>
            <small>
              Peak set {formatMetric(prSession?.bestSetWeight || 0, ' kg')} · Est 1RM{' '}
              {formatMetric(prSession?.estimated1RM || 0, ' kg', 1)}
            </small>
          </article>
        </div>

        <div className="comparison-table">
          <div className="comparison-table__row comparison-table__row--header">
            <span>Snapshot</span>
            <span>Volume</span>
            <span>Best Set</span>
            <span>Est 1RM</span>
          </div>
          <div className="comparison-table__row">
            <span>Last</span>
            <span>{formatMetric(latestSession?.totalVolume || 0, ' kg')}</span>
            <span>{formatMetric(latestSession?.bestSetWeight || 0, ' kg')}</span>
            <span>{formatMetric(latestSession?.estimated1RM || 0, ' kg', 1)}</span>
          </div>
          <div className="comparison-table__row">
            <span>PR</span>
            <span>{formatMetric(prSession?.totalVolume || 0, ' kg')}</span>
            <span>{formatMetric(prSession?.bestSetWeight || 0, ' kg')}</span>
            <span>{formatMetric(prSession?.estimated1RM || 0, ' kg', 1)}</span>
          </div>
          <div className="comparison-table__row">
            <span>Next</span>
            <span>{formatMetric(targetSession?.totalVolume || 0, ' kg')}</span>
            <span>{formatMetric(targetSession?.bestSetWeight || 0, ' kg')}</span>
            <span>{formatMetric(targetSession?.estimated1RM || 0, ' kg', 1)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
