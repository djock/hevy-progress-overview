import React from 'react';
import { FolderOption, HevyWorkout, MuscleGroupSignal, formatLongDate } from '../lib/hevy';

type RoutineSidebarProps = {
  folderOptions: FolderOption[];
  muscleFilter: string | null;
  muscleSignals: MuscleGroupSignal[];
  onBackToFolders: () => void;
  onFolderSelect: (folderId: string) => void;
  onMuscleFilterChange: (value: string | null) => void;
  onRefreshRoutines: () => void;
  onRefreshWorkouts: () => void;
  onWorkoutSelect: (workoutId: string) => void;
  refreshingRoutines: boolean;
  refreshingWorkouts: boolean;
  selectedFolderId: string | null;
  selectedFolderTitle: string | null;
  selectedWorkoutId: string | null;
  workouts: HevyWorkout[];
};

function FoldersPane({
  folderOptions,
  onFolderSelect
}: {
  folderOptions: FolderOption[];
  onFolderSelect: (folderId: string) => void;
}) {
  return (
    <>
      <div className="panel-shell__header">
        <div>
          <p className="eyebrow">Folders</p>
          <h2>Your library</h2>
        </div>
        <span className="metric-chip">{folderOptions.length}</span>
      </div>

      {folderOptions.length === 0 ? (
        <div className="empty-panel compact-empty">No folders with routines were found.</div>
      ) : (
        <div className="sidebar-section__body">
          <div className="routine-list">
            {folderOptions.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className="routine-list__item"
                onClick={() => onFolderSelect(folder.id)}
              >
                <div className="routine-list__content">
                  <strong>{folder.title}</strong>
                  <span>{folder.routineCount} routines</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function WorkoutsPane({
  onBackToFolders,
  onWorkoutSelect,
  selectedFolderTitle,
  selectedWorkoutId,
  workouts
}: {
  onBackToFolders: () => void;
  onWorkoutSelect: (workoutId: string) => void;
  selectedFolderTitle: string | null;
  selectedWorkoutId: string | null;
  workouts: HevyWorkout[];
}) {
  return (
    <>
      <div className="panel-shell__header panel-shell__header--stacked">
        <button type="button" className="back-button" onClick={onBackToFolders}>
          Back
        </button>
        <div className="folder-heading">
          <p className="eyebrow">Workouts</p>
          <h2>{selectedFolderTitle || 'Selected folder'}</h2>
        </div>
        <span className="metric-chip">{workouts.length}</span>
      </div>

      {workouts.length === 0 ? (
        <div className="empty-panel compact-empty">
          No workouts matched this folder yet. Try another folder or refresh your history.
        </div>
      ) : (
        <div className="sidebar-section__body">
          <div className="routine-list">
            {workouts.map((workout) => (
              <button
                key={workout.id}
                type="button"
                className={`routine-list__item ${selectedWorkoutId === workout.id ? 'is-selected' : ''}`}
                onClick={() => onWorkoutSelect(workout.id)}
              >
                <div className="routine-list__content">
                  <strong>{workout.title || 'Untitled workout'}</strong>
                  <span>{formatLongDate(workout.created_at)}</span>
                </div>
                <span className="routine-list__aside">
                  {(workout.exercises || []).length} exercises
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function RoutineSidebar({
  folderOptions,
  muscleFilter,
  muscleSignals,
  onBackToFolders,
  onFolderSelect,
  onMuscleFilterChange,
  onRefreshRoutines,
  onRefreshWorkouts,
  onWorkoutSelect,
  refreshingRoutines,
  refreshingWorkouts,
  selectedFolderId,
  selectedFolderTitle,
  selectedWorkoutId,
  workouts
}: RoutineSidebarProps) {
  const isBrowsingWorkouts = Boolean(selectedFolderId);

  return (
    <aside className="command-pane command-pane--sidebar">
      <div className="panel-shell panel-shell--hero">
        <div className="panel-shell__header">
          <div className="hero-title">
            <p className="eyebrow">Hevy Progress Indicator</p>
          </div>
        </div>
        <div className="control-row">
          <button type="button" className="signal-button" onClick={onRefreshWorkouts}>
            {refreshingWorkouts ? 'Syncing...' : 'Refresh workouts'}
          </button>
          <button
            type="button"
            className="signal-button signal-button--ghost"
            onClick={onRefreshRoutines}
          >
            {refreshingRoutines ? 'Refreshing...' : 'Refresh routines'}
          </button>
        </div>
      </div>

      <section className="panel-shell sidebar-section">
        {isBrowsingWorkouts ? (
          <WorkoutsPane
            onBackToFolders={onBackToFolders}
            onWorkoutSelect={onWorkoutSelect}
            selectedFolderTitle={selectedFolderTitle}
            selectedWorkoutId={selectedWorkoutId}
            workouts={workouts}
          />
        ) : (
          <FoldersPane folderOptions={folderOptions} onFolderSelect={onFolderSelect} />
        )}
      </section>

      <section className="panel-shell sidebar-section">
        <div className="panel-shell__header">
          <div>
            <p className="eyebrow">Heatmap</p>
            <h2>Muscle focus</h2>
          </div>
        </div>
        <div className="heatmap-grid">
          {muscleSignals.map((muscle) => (
            <button
              key={muscle.label}
              type="button"
              className={`heatmap-tile ${muscleFilter === muscle.label ? 'is-active' : ''}`}
              onClick={() => onMuscleFilterChange(muscle.label)}
              style={{ ['--heat' as string]: muscle.score }}
            >
              <div className="heatmap-tile__content">
                <strong>{muscle.label}</strong>
                <span>{muscle.score} hits</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
