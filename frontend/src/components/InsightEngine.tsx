import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
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

  const chartData = useMemo(
    () =>
      sessions.map((session) => ({
        estimated1RM: Number(session.estimated1RM.toFixed(1)),
        label: session.sessionLabel,
        totalVolume: Number(session.totalVolume.toFixed(0))
      })),
    [sessions]
  );

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

        <div className="insight-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 18, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="label"
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
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16
                }}
                labelStyle={{ color: '#f4f4f5' }}
              />
              <Line
                type="monotone"
                dataKey={metricMode}
                stroke={metricMode === 'estimated1RM' ? '#3b82f6' : '#2dd4bf'}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                animationDuration={420}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="comparison-grid">
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

          <article className="comparison-card">
            <span>Target for Next</span>
            <strong>{change !== null && change > 0 ? 'Advance load' : 'Stabilize output'}</strong>
            <p>{formatMetric(targetSession?.totalVolume || 0, ' kg')}</p>
            <small>
              Target set {formatMetric(targetSession?.bestSetWeight || 0, ' kg')} · Est 1RM{' '}
              {formatMetric(targetSession?.estimated1RM || 0, ' kg', 1)}
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
