import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExerciseBlueprint } from './ExerciseBlueprint';
import { InsightEngine } from './InsightEngine';
import { RoutineSidebar } from './RoutineSidebar';
import {
  ExerciseSession,
  HevyRoutine,
  HevyRoutineFolder,
  HevyWorkout,
  buildExerciseSessions,
  buildFolderOptions,
  calculateVolumeChange,
  deriveMuscleSignals,
  fetchAllPages,
  getRoutinesForFolder,
  getVolumeSignal,
  matchesExerciseTitleToMuscle,
  resolveWorkoutsForFolder
} from '../lib/hevy';

export function DashboardLayout() {
  const apiKey = process.env.REACT_APP_HEVY_API_KEY || '';
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [selectedExerciseTitle, setSelectedExerciseTitle] = useState<string | null>(null);

  const routinesQuery = useQuery({
    queryKey: ['routines', apiKey],
    queryFn: () => fetchAllPages<HevyRoutine>('routines', 'routines', apiKey),
    enabled: Boolean(apiKey)
  });

  const workoutsQuery = useQuery({
    queryKey: ['workouts', apiKey],
    queryFn: () => fetchAllPages<HevyWorkout>('workouts', 'workouts', apiKey),
    enabled: Boolean(apiKey)
  });

  const foldersQuery = useQuery({
    queryKey: ['routine-folders', apiKey],
    queryFn: () =>
      fetchAllPages<HevyRoutineFolder>('routine_folders', 'routine_folders', apiKey),
    enabled: Boolean(apiKey)
  });

  const routines = useMemo(() => routinesQuery.data || [], [routinesQuery.data]);
  const workouts = useMemo(() => workoutsQuery.data || [], [workoutsQuery.data]);
  const folders = useMemo(() => foldersQuery.data || [], [foldersQuery.data]);
  const folderOptions = useMemo(() => buildFolderOptions(folders, routines), [folders, routines]);
  const isMuscleMode = muscleFilter !== null;

  useEffect(() => {
    if (folderOptions.length === 0) {
      setSelectedFolderId(null);
      setSelectedWorkoutId(null);
      setSelectedExerciseTitle(null);
      return;
    }

    const stillVisible = folderOptions.some((folder) => folder.id === selectedFolderId);

    if (!stillVisible) {
      setSelectedFolderId(null);
      setSelectedWorkoutId(null);
      setSelectedExerciseTitle(null);
    }
  }, [folderOptions, selectedFolderId]);

  const selectedFolder = useMemo(
    () => folderOptions.find((folder) => folder.id === selectedFolderId) || null,
    [folderOptions, selectedFolderId]
  );

  const selectedFolderRoutines = useMemo(
    () => getRoutinesForFolder(selectedFolderId, routines),
    [routines, selectedFolderId]
  );

  const selectedFolderWorkouts = useMemo(
    () => resolveWorkoutsForFolder(selectedFolderRoutines, workouts),
    [selectedFolderRoutines, workouts]
  );

  const visibleWorkouts = useMemo(
    () => selectedFolderWorkouts,
    [selectedFolderWorkouts]
  );

  const muscleModeExerciseTitles = useMemo(() => {
    const titles = new Set<string>();

    workouts.forEach((workout) => {
      (workout.exercises || []).forEach((exercise) => {
        const title = exercise.title?.trim();

        if (!title || !matchesExerciseTitleToMuscle(title, muscleFilter)) {
          return;
        }

        titles.add(title);
      });
    });

    return Array.from(titles).sort((left, right) => left.localeCompare(right));
  }, [muscleFilter, workouts]);

  useEffect(() => {
    if (!isMuscleMode) {
      return;
    }

    setSelectedWorkoutId(null);
    setSelectedExerciseTitle(null);
  }, [isMuscleMode, muscleFilter]);

  useEffect(() => {
    if (visibleWorkouts.length === 0) {
      setSelectedWorkoutId(null);
      setSelectedExerciseTitle(null);
      return;
    }

    const stillVisible = visibleWorkouts.some((workout) => workout.id === selectedWorkoutId);

    if (!stillVisible) {
      setSelectedWorkoutId(null);
      setSelectedExerciseTitle(null);
    }
  }, [selectedWorkoutId, visibleWorkouts]);

  const selectedWorkout = useMemo(
    () => visibleWorkouts.find((workout) => workout.id === selectedWorkoutId) || null,
    [selectedWorkoutId, visibleWorkouts]
  );

  const selectedWorkoutExercises = useMemo(
    () => {
      if (isMuscleMode) {
        return muscleModeExerciseTitles;
      }

      return (selectedWorkout?.exercises || [])
        .map((exercise) => exercise.title?.trim())
        .filter((title): title is string => Boolean(title));
    },
    [isMuscleMode, muscleModeExerciseTitles, selectedWorkout]
  );

  const exerciseSessionsByTitle = useMemo(() => {
    const map = new Map<string, ExerciseSession[]>();

    selectedWorkoutExercises.forEach((exerciseTitle) => {
      map.set(exerciseTitle, buildExerciseSessions(exerciseTitle, workouts));
    });

    return map;
  }, [selectedWorkoutExercises, workouts]);

  const blueprintCards = useMemo(
    () =>
      selectedWorkoutExercises.map((exerciseTitle) => {
        const sessions = exerciseSessionsByTitle.get(exerciseTitle) || [];
        const latestSession = sessions[sessions.length - 1];
        const previousSession = sessions[sessions.length - 2];
        const change = latestSession
          ? calculateVolumeChange(
              latestSession.totalVolume,
              previousSession?.totalVolume || 0
            )
          : null;
        const previousPeak = sessions.slice(0, -1).reduce((peak, session) => {
          return session.totalVolume > peak ? session.totalVolume : peak;
        }, 0);
        const isRecentPr = Boolean(latestSession && latestSession.totalVolume >= previousPeak);

        return {
          exerciseTitle,
          isRecentPr,
          sessions,
          signal: getVolumeSignal(change)
        };
      }),
    [exerciseSessionsByTitle, selectedWorkoutExercises]
  );

  useEffect(() => {
    if (blueprintCards.length === 0) {
      setSelectedExerciseTitle(null);
      return;
    }

    const exists = blueprintCards.some((card) => card.exerciseTitle === selectedExerciseTitle);

    if (!exists) {
      setSelectedExerciseTitle(blueprintCards[0].exerciseTitle);
    }
  }, [blueprintCards, selectedExerciseTitle]);

  const selectedExerciseSessions = useMemo(
    () => exerciseSessionsByTitle.get(selectedExerciseTitle || '') || [],
    [exerciseSessionsByTitle, selectedExerciseTitle]
  );

  const muscleSignals = useMemo(() => deriveMuscleSignals(routines), [routines]);
  const isLoading = routinesQuery.isLoading || workoutsQuery.isLoading || foldersQuery.isLoading;
  const hasError = routinesQuery.isError || workoutsQuery.isError || foldersQuery.isError;

  if (!apiKey) {
    return (
      <main className="dashboard-shell theme-dark">
        <div className="empty-panel empty-panel--centered">
          Add `REACT_APP_HEVY_API_KEY` to load routines and training history.
        </div>
      </main>
    );
  }

  if (hasError) {
    return (
      <main className="dashboard-shell theme-dark">
        <div className="empty-panel empty-panel--centered">
          Unable to load Hevy data. Check the API key and retry the routine or workout sync.
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-shell theme-dark">
      {isLoading ? (
        <div className="empty-panel empty-panel--centered">Loading your Hevy command center...</div>
      ) : (
        <div className="dashboard-grid">
          <RoutineSidebar
            folderOptions={folderOptions}
            muscleFilter={muscleFilter}
            muscleSignals={muscleSignals}
            onBackToFolders={() => {
              setMuscleFilter(null);
              setSelectedFolderId(null);
              setSelectedWorkoutId(null);
              setSelectedExerciseTitle(null);
            }}
            onFolderSelect={(folderId) => {
              setMuscleFilter(null);
              setSelectedFolderId(folderId);
              setSelectedWorkoutId(null);
              setSelectedExerciseTitle(null);
            }}
            onMuscleFilterChange={(value) => {
              setMuscleFilter(value);
              setSelectedFolderId(null);
              setSelectedWorkoutId(null);
              setSelectedExerciseTitle(null);
            }}
            onRefreshRoutines={() => {
              void routinesQuery.refetch();
              void foldersQuery.refetch();
            }}
            onRefreshWorkouts={() => {
              void workoutsQuery.refetch();
            }}
            onWorkoutSelect={(workoutId) => {
              setMuscleFilter(null);
              setSelectedWorkoutId(workoutId);
              setSelectedExerciseTitle(null);
            }}
            refreshingRoutines={routinesQuery.isFetching || foldersQuery.isFetching}
            refreshingWorkouts={workoutsQuery.isFetching}
            selectedFolderId={selectedFolderId}
            selectedFolderTitle={selectedFolder?.title || null}
            selectedWorkoutId={selectedWorkoutId}
            workouts={visibleWorkouts}
          />

          <ExerciseBlueprint
            cards={blueprintCards}
            contextDescription={
              isMuscleMode
                ? `Showing every performed exercise that matches ${muscleFilter}.`
                : selectedWorkout?.title
                  ? 'This column now focuses only on exercises from the workout you selected in the left rail.'
                  : 'Select a workout from the left rail to populate the exercise blueprint.'
            }
            contextTitle={
              isMuscleMode
                ? `${muscleFilter} exercises`
                : selectedFolder?.title || 'Folder explorer'
            }
            onSelectExercise={setSelectedExerciseTitle}
            selectedExerciseTitle={selectedExerciseTitle}
            selectedWorkoutTitle={isMuscleMode ? null : selectedWorkout?.title || null}
          />

          <InsightEngine
            contextLabel={
              isMuscleMode
                ? `${muscleFilter} muscle group`
                : selectedWorkout?.title
                  ? `${selectedWorkout.title}${selectedFolder?.title ? ` · ${selectedFolder.title}` : ''}`
                  : selectedFolder?.title || null
            }
            exerciseTitle={selectedExerciseTitle}
            sessions={selectedExerciseSessions}
          />
        </div>
      )}
    </main>
  );
}
