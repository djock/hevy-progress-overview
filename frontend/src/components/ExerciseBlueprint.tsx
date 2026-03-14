import React, { useId } from 'react';
import { ExerciseSession, formatLongDate, formatMetric, formatPercent } from '../lib/hevy';

type ExerciseCard = {
  exerciseTitle: string;
  isRecentPr: boolean;
  sessions: ExerciseSession[];
  signal: {
    change: number | null;
    className: 'is-positive' | 'is-neutral' | 'is-negative';
    icon: string;
    label: string;
  };
};

type ExerciseBlueprintProps = {
  cards: ExerciseCard[];
  contextDescription: string;
  contextTitle: string;
  selectedExerciseTitle: string | null;
  selectedWorkoutTitle: string | null;
  onSelectExercise: (exerciseTitle: string) => void;
};

function Sparkline({ sessions }: { sessions: ExerciseSession[] }) {
  const gradientId = useId();
  const values = sessions.slice(-5).map((session) => session.totalVolume);
  const width = 144;
  const height = 42;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(45, 212, 191, 0.25)" />
          <stop offset="100%" stopColor="rgba(59, 130, 246, 0.95)" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={`url(#${gradientId})`} strokeWidth="3" points={points} />
    </svg>
  );
}

export function ExerciseBlueprint({
  cards,
  contextDescription,
  contextTitle,
  selectedExerciseTitle,
  selectedWorkoutTitle,
  onSelectExercise
}: ExerciseBlueprintProps) {
  return (
    <section className="command-pane command-pane--blueprint">
      <div className="panel-shell panel-shell--sticky blueprint-header">
        <div className="panel-shell__header">
          <div>
            <p className="eyebrow">Exercise Blueprint</p>
            <h2>{selectedWorkoutTitle || contextTitle}</h2>
          </div>
          <span className="metric-chip">{cards.length} exercises</span>
        </div>
        <p className="panel-copy">{contextDescription}</p>
      </div>

      <div className="blueprint-list">
        {cards.length === 0 ? (
          <div className="empty-panel">
            Choose a folder, then choose one workout in the left column to populate these exercises.
          </div>
        ) : (
          cards.map((card, index) => {
            const latestSession = card.sessions[card.sessions.length - 1];
            const isSelected = selectedExerciseTitle === card.exerciseTitle;

            return (
              <button
                key={card.exerciseTitle}
                type="button"
                className={`exercise-card ${card.signal.className} ${isSelected ? 'is-selected' : ''}`}
                style={{ ['--stagger' as string]: `${index * 55}ms` }}
                onClick={() => onSelectExercise(card.exerciseTitle)}
              >
                <div className="exercise-card__topline">
                  <div>
                    <span className="exercise-card__eyebrow">Exercise</span>
                    <h3>{card.exerciseTitle}</h3>
                  </div>
                  <div className="exercise-card__badges">
                    <span className={`signal-badge ${card.signal.className}`}>
                      {card.signal.icon} {card.signal.label}
                    </span>
                    {card.isRecentPr ? <span className="pr-badge">PR</span> : null}
                  </div>
                </div>

                <div className="exercise-card__chart">
                  <Sparkline sessions={card.sessions} />
                </div>

                <div className="exercise-card__metrics">
                  <div>
                    <span>Last volume</span>
                    <strong>{formatMetric(latestSession?.totalVolume || 0, ' kg')}</strong>
                  </div>
                  <div>
                    <span>Trend</span>
                    <strong>{formatPercent(card.signal.change)}</strong>
                  </div>
                  <div>
                    <span>Last session</span>
                    <strong>{formatLongDate(latestSession?.date)}</strong>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
