import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [workouts, setWorkouts] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [routineFolders, setRoutineFolders] = useState([]);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [exerciseTypes, setExerciseTypes] = useState([]);
  const [selectedExerciseType, setSelectedExerciseType] = useState(null);
  const [exerciseHistory, setExerciseHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorkout] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingRoutines, setRefreshingRoutines] = useState(false);
  const [refreshingFolders, setRefreshingFolders] = useState(false);

  useEffect(() => {
    fetchRoutineFolders();
    fetchRoutines();
    extractExerciseTypes();
  }, []);

  const fetchRoutineFolders = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/routine_folders');
      if (response.data) {
        setRoutineFolders(response.data);
      }
    } catch (error) {
      console.error('Error fetching routine folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/routines');
      if (response.data) {
        setRoutines(response.data);
      }
    } catch (error) {
      console.error('Error fetching routines:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutineWorkouts = async (routineId) => {
    setSelectedRoutine(routineId);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/routines/${routineId}/workouts`);
      if (!response.ok) {
        throw new Error('Failed to fetch workouts');
      }
      
      const data = await response.json();
      setWorkouts(data); // This is where the error occurs
      
      // Extract unique exercise types from workouts
      const exerciseTypes = [...new Set(data.flatMap(workout => 
        workout.exercises.map(exercise => exercise.exercise_type)
      ))];
      
      setExerciseTypes(exerciseTypes);
      setSelectedExerciseType(null);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectRoutine = (routineId) => {
    setSelectedRoutine(routineId);
    
    // Find the selected routine in our existing data
    const selectedRoutineData = routines.find(routine => routine.id === routineId);
    
    if (selectedRoutineData && selectedRoutineData.exercises && Array.isArray(selectedRoutineData.exercises)) {
      // Extract just the exercise titles from the routine
      const exerciseTitles = selectedRoutineData.exercises.map(exercise => exercise.title);
      setExerciseTypes(exerciseTitles);
    } else {
      setExerciseTypes([]);
    }
    
    // Reset other states
    setSelectedExerciseType(null);
    setExerciseHistory([]);
  };

  const filterRoutinesByFolder = (folderId) => {
    setSelectedFolder(folderId);
    // Reset selected routine when changing folders
    setSelectedRoutine(null);
    setSelectedExerciseType(null);
    setExerciseHistory([]);
  };

  const extractExerciseTypes = (workouts) => {
    if (!workouts || !Array.isArray(workouts)) {
      return [];
    }
    
    const types = new Set();
    workouts.forEach(workout => {
      if (workout.exercises && Array.isArray(workout.exercises)) {
        workout.exercises.forEach(exercise => {
          if (exercise.title) {
            types.add(exercise.title);
          }
        });
      }
    });
    return Array.from(types).sort();
  };

  const fetchExerciseHistory = async (exerciseType) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/exercises/by-type/${encodeURIComponent(exerciseType)}`);
      if (response.data) {
        // Sort by date in ascending order (oldest first)
        const sortedHistory = [...response.data].sort((a, b) => 
          new Date(a.workout_date) - new Date(b.workout_date)
        );
        setExerciseHistory(sortedHistory);
        setSelectedExerciseType(exerciseType);
      }
    } catch (error) {
      console.error('Error fetching exercise history:', error);
      setExerciseHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshWorkouts = async () => {
    setRefreshing(true);
    try {
      await axios.get('/api/workouts/refresh');
      // After refresh, update our data
      extractExerciseTypes();
      if (selectedRoutine) {
        fetchRoutineWorkouts(selectedRoutine);
      }
      if (selectedExerciseType) {
        fetchExerciseHistory(selectedExerciseType);
      }
    } catch (error) {
      console.error('Error refreshing workouts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const refreshRoutines = async () => {
    setRefreshingRoutines(true);
    try {
      await axios.get('/api/routines/refresh');
      // After refresh, update our data
      await fetchRoutines();
    } catch (error) {
      console.error('Error refreshing routines:', error);
    } finally {
      setRefreshingRoutines(false);
    }
  };

  const refreshRoutineFolders = async () => {
    setRefreshingFolders(true);
    try {
      await axios.get('/api/routine_folders/refresh');
      // After refresh, update our data
      await fetchRoutineFolders();
    } catch (error) {
      console.error('Error refreshing routine folders:', error);
    } finally {
      setRefreshingFolders(false);
    }
  };

  return (
    <div className="container">
      <h1 className="text-2xl font-bold mb-4">Hevy Progress Tracker</h1>
      
      <div className="mb-4">
        <button 
          className="bg-green-500 rounded mr-2"
          onClick={refreshRoutines}
          disabled={refreshingRoutines}
        >
          {refreshingRoutines ? 'Refreshing Routines...' : 'Refresh Routines'}
        </button>
        
        <button 
          className="bg-blue-500 rounded mr-2"
          onClick={refreshRoutineFolders}
          disabled={refreshingFolders}
        >
          {refreshingFolders ? 'Refreshing Folders...' : 'Refresh Folders'}
        </button>
        
        <button 
          className="bg-purple-500 rounded"
          onClick={refreshWorkouts}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing Workouts...' : 'Refresh Workouts'}
        </button>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Folders</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className={`rounded folder ${selectedFolder === null ? 'selected' : ''}`}
            onClick={() => filterRoutinesByFolder(null)}
          >
            All Routines
          </button>
          {routineFolders && routineFolders.map(folder => (
            <button
              key={folder.id}
              className={`rounded folder ${selectedFolder === folder.id ? 'selected' : ''}`}
              onClick={() => filterRoutinesByFolder(folder.id)}
            >
              {folder.title}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Routines</h2>
        <div className="flex flex-wrap gap-2">
          {routines && [...routines]
            .sort((a, b) => {
              // Sort by created_at date if available (newest first)
              if (a.created_at && b.created_at) {
                return new Date(b.created_at) - new Date(a.created_at);
              }
              // Fallback to reverse order if no dates
              return 0;
            })
            .filter(routine => selectedFolder === null || routine.folder_id === selectedFolder)
            .map(routine => (
              <button
                key={routine.id}
                className={`rounded routine ${selectedRoutine === routine.id ? 'selected' : ''}`}
                onClick={() => selectRoutine(routine.id)}
              >
                {routine.title || "Unnamed Routine"}
              </button>
            ))}
        </div>
      </div>
      
      {selectedRoutine && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Exercises</h2>
          {loading ? (
            <p>Loading exercises...</p>
          ) : exerciseTypes && exerciseTypes.length > 0 ? (
            <div className="flex flex-col items-start gap-2">
              {exerciseTypes.map((exercise, index) => (
                <button
                  key={index}
                  className={`rounded exercise ${selectedExerciseType === exercise ? 'selected' : ''}`}
                  onClick={() => fetchExerciseHistory(exercise)}
                >
                  {exercise}
                </button>
              ))}
            </div>
          ) : (
            <p>No exercises found for this routine.</p>
          )}
        </div>
      )}
      
      {selectedExerciseType && exerciseHistory.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">
            {selectedExerciseType} History
          </h2>
          <div className="overflow-x-auto">
            <table className="bg-white border border-gray-300">
              <thead>
                <tr>
                  <th>Date</th>
                  {/* Find max number of sets across all exercises */}
                  {Array.from({ length: Math.max(...exerciseHistory.map(ex => ex.sets ? ex.sets.length : 0)) }, (_, i) => (
                    <th key={i} data-set-number={i + 1}>Set {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exerciseHistory.map((exercise, exerciseIndex) => (
                  <tr key={exerciseIndex}>
                    <td>
                      {new Date(exercise.workout_date).toLocaleDateString()}
                    </td>
                    {/* Create cells for each possible set position */}
                    {Array.from({ length: Math.max(...exerciseHistory.map(ex => ex.sets ? ex.sets.length : 0)) }, (_, i) => {
                      // Find the set at this position if it exists
                      const set = exercise.sets && exercise.sets.length > i ? exercise.sets[i] : null;
                      
                      // Get previous workout's set for comparison (if not the first workout)
                      const prevExercise = exerciseIndex > 0 ? exerciseHistory[exerciseIndex - 1] : null;
                      const prevSet = prevExercise && prevExercise.sets && prevExercise.sets.length > i ? prevExercise.sets[i] : null;
                      
                      // Calculate performance metrics
                      const currentVolume = set ? (set.reps || 0) * (set.weight_kg || 0) : 0;
                      const prevVolume = prevSet ? (prevSet.reps || 0) * (prevSet.weight_kg || 0) : 0;
                      
                      // Determine cell color based on performance comparison
                      let cellColor = "";
                      
                      // Check if we need to add an asterisk (12+ reps AND last row AND not the first set)
                      const isLastRow = exerciseIndex === exerciseHistory.length - 1;
                      const isNotFirstSet = i > 0; // Skip Set 1 (index 0)
                      const shouldAddAsterisk = isLastRow && isNotFirstSet && set && set.reps >= 12;
                      
                      // Check if we need to add muscle emoji (8-11 reps AND last row AND not the first set)
                      const shouldAddMuscleEmoji = isLastRow && isNotFirstSet && set && (set.reps > 8 && set.reps < 12);
                      
                      // Apply comparison coloring
                      if (prevVolume > 0) {
                        const percentChange = ((currentVolume - prevVolume) / prevVolume) * 100;
                        
                        if (percentChange === 0) {
                          cellColor = "bg-orange-100"; // Same performance
                        } else if (percentChange > 15) {
                          cellColor = "bg-green-300"; // Significant improvement
                        } else if (percentChange > 5) {
                          cellColor = "bg-green-100"; // Slight improvement
                        } else if (percentChange < -15) {
                          cellColor = "bg-red-300"; // Significant decrease
                        } else if (percentChange < 0) {
                          cellColor = "bg-red-100"; // Slight decrease
                        }
                      }
                      
                      return (
                        <td key={i} className={cellColor}>
                          {set ? `${set.reps || '-'} @ ${set.weight_kg || '-'}kg${shouldAddAsterisk ? ' 🚀' : ''}${shouldAddMuscleEmoji ? ' 💪' : ''}` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-gray-600 mt-2">🚀 Weight can be increased in this situation</p>
            <p className="text-sm text-gray-600 mt-2">💪 Still have to work on increasing reps</p>
          </div>
        </div>
      )}
      {selectedWorkout && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">
            {selectedWorkout.title} - {new Date(selectedWorkout.created_at).toLocaleDateString()}
          </h3>
          
          {selectedWorkout.exercises && selectedWorkout.exercises.map(exercise => (
            <div key={exercise.index} className="mb-6 bg-gray-50 p-4 rounded">
              <h4 className="font-medium mb-2">{exercise.title}</h4>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-1 px-2 border-b">Set</th>
                      <th className="py-1 px-2 border-b">Type</th>
                      {exercise.sets && exercise.sets[0] && exercise.sets[0].weight_kg !== undefined && (
                        <th className="py-1 px-2 border-b">Weight (kg)</th>
                      )}
                      {exercise.sets && exercise.sets[0] && exercise.sets[0].reps !== undefined && (
                        <th className="py-1 px-2 border-b">Reps</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {exercise.sets && exercise.sets.map(set => (
                      <tr key={set.index}>
                        <td className="py-1 px-2 border-b text-center">{set.index + 1}</td>
                        <td className="py-1 px-2 border-b capitalize">{set.type}</td>
                        {set.weight_kg !== undefined && (
                          <td className="py-1 px-2 border-b text-center">{set.weight_kg}</td>
                        )}
                        {set.reps !== undefined && (
                          <td className="py-1 px-2 border-b text-center">{set.reps}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
