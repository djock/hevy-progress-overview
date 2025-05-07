import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Container,
  Row,
  Col,
  Button,
  Table,
  Modal,
  Spinner,
  Badge
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [setWorkouts] = useState([]);
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
  const [showPRModal, setShowPRModal] = useState(false);
  const [personalRecords, setPersonalRecords] = useState([]);

  useEffect(() => {
    fetchRoutineFolders();
    fetchRoutines();
    extractExerciseTypes();
    calculateAndSavePRs();
  }, []);

  const calculateAndSavePRs = useCallback(async () => {
    try {
      const response = await axios.get('/api/workouts');
      const workouts = response.data;
      const prs = extractPersonalRecords(workouts);
      setPersonalRecords(prs);
      await axios.post('/api/save-prs', prs);
    } catch (error) {
      console.error('Error calculating PRs:', error);
    }
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
      setWorkouts(data);
      const exerciseTypes = [...new Set(data.flatMap(workout =>
        workout.exercises.map(exercise => exercise.exercise_type)
      ))];
      setExerciseTypes(exerciseTypes);
      setSelectedExerciseType(null);
      await calculateAndSavePRs();
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectRoutine = (routineId) => {
    setSelectedRoutine(routineId);
    const selectedRoutineData = routines.find(routine => routine.id === routineId);
    if (selectedRoutineData && selectedRoutineData.exercises && Array.isArray(selectedRoutineData.exercises)) {
      const exerciseTitles = selectedRoutineData.exercises.map(exercise => exercise.title);
      setExerciseTypes(exerciseTitles);
    } else {
      setExerciseTypes([]);
    }
    setSelectedExerciseType(null);
    setExerciseHistory([]);
  };

  const filterRoutinesByFolder = (folderId) => {
    setSelectedFolder(folderId);
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
      extractExerciseTypes();
      if (selectedRoutine) {
        fetchRoutineWorkouts(selectedRoutine);
      }
      if (selectedExerciseType) {
        fetchExerciseHistory(selectedExerciseType);
      }
      await calculateAndSavePRs();
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
      await fetchRoutineFolders();
    } catch (error) {
      console.error('Error refreshing routine folders:', error);
    } finally {
      setRefreshingFolders(false);
    }
  };

  function formatDate(dateString) {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function getSetTypeEmoji(type) {
    if (!type) return '';
    switch (type[0].toUpperCase()) {
      case 'W': return '🌡️';      // Warmup
      case 'D': return '⬇️';      // Dropset
      case 'F': return '💀';      // Failure
      default: return '';
    }
  }

  function extractPersonalRecords(workouts) {
    const prMap = {};
    (workouts || []).forEach(workout => {
      (workout.exercises || []).forEach(exercise => {
        const maxSet = (exercise.sets || []).reduce((max, set) => {
          if (!set.weight_kg || isNaN(set.weight_kg)) return max;
          return (!max || set.weight_kg > max.weight_kg) ? set : max;
        }, null);
        if (maxSet) {
          if (
            !prMap[exercise.title] ||
            maxSet.weight_kg > prMap[exercise.title].weight_kg
          ) {
            prMap[exercise.title] = {
              ...maxSet,
              exerciseTitle: exercise.title,
              workoutDate: workout.created_at,
            };
          }
        }
      });
    });
    return Object.values(prMap).sort((a, b) =>
      a.exerciseTitle.localeCompare(b.exerciseTitle)
    );
  }

  // Find max sets for table columns
  const maxSets = Math.max(...(exerciseHistory.map(ex => ex.sets ? ex.sets.length : 0)), 0);

  return (
    <Container className="py-4">
      <h1 className="mb-4">Hevy Progress Tracker</h1>
      <Row className="mb-3">
        <Col>
          <Button
            variant="success"
            className="me-2"
            onClick={refreshRoutines}
            disabled={refreshingRoutines}
          >
            {refreshingRoutines ? <Spinner size="sm" animation="border" /> : 'Refresh Routines'}
          </Button>
          <Button
            variant="primary"
            className="me-2"
            onClick={refreshRoutineFolders}
            disabled={refreshingFolders}
          >
            {refreshingFolders ? <Spinner size="sm" animation="border" /> : 'Refresh Folders'}
          </Button>
          <Button
            variant="secondary"
            className="me-2"
            onClick={refreshWorkouts}
            disabled={refreshing}
          >
            {refreshing ? <Spinner size="sm" animation="border" /> : 'Refresh Workouts'}
          </Button>
          <Button
            variant="warning"
            className="me-2"
            onClick={() => setShowPRModal(true)}
          >
            Show PRs
          </Button>
        </Col>
      </Row>

      <Modal show={showPRModal} onHide={() => setShowPRModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Personal Records</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {personalRecords.length === 0 ? (
            <p>No PRs found.</p>
          ) : (
            personalRecords.map((pr, index) => (
              <div key={index} className="mb-2">
                <strong>{pr.exerciseTitle}:</strong> {pr.reps} reps @ {pr.weight_kg}kg <Badge bg="light" text="dark">{formatDate(pr.workoutDate)}</Badge>
              </div>
            ))
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowPRModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Row className="mb-4">
        <Col>
          <h2>Folders</h2>
          <div className="mb-2">
            <Button
              variant={selectedFolder === null ? "dark" : "outline-dark"}
              className="me-2 mb-2"
              onClick={() => filterRoutinesByFolder(null)}
            >
              All Routines
            </Button>
            {routineFolders && routineFolders.map(folder => (
              <Button
                key={folder.id}
                variant={selectedFolder === folder.id ? "dark" : "outline-dark"}
                className="me-2 mb-2"
                onClick={() => filterRoutinesByFolder(folder.id)}
              >
                {folder.title}
              </Button>
            ))}
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <h2>Routines</h2>
          <div>
            {routines && [...routines]
              .sort((a, b) => {
                if (a.created_at && b.created_at) {
                  return new Date(b.created_at) - new Date(a.created_at);
                }
                return 0;
              })
              .filter(routine => selectedFolder === null || routine.folder_id === selectedFolder)
              .map(routine => (
                <Button
                  key={routine.id}
                  variant={selectedRoutine === routine.id ? "primary" : "outline-primary"}
                  className="me-2 mb-2"
                  onClick={() => selectRoutine(routine.id)}
                >
                  {routine.title || "Unnamed Routine"}
                </Button>
              ))}
          </div>
        </Col>
      </Row>

      {selectedRoutine && (
        <Row className="mb-4">
          <Col>
            <h2>Exercises</h2>
            {loading ? (
              <Spinner animation="border" />
            ) : exerciseTypes && exerciseTypes.length > 0 ? (
              <div>
                {exerciseTypes.map((exercise, index) => (
                  <Button
                    key={index}
                    variant={selectedExerciseType === exercise ? "success" : "outline-success"}
                    className="me-2 mb-2"
                    onClick={() => fetchExerciseHistory(exercise)}
                  >
                    {exercise}
                  </Button>
                ))}
              </div>
            ) : (
              <p>No exercises found for this routine.</p>
            )}
          </Col>
        </Row>
      )}

      {selectedExerciseType && (
        <Row className="mb-4">
          <Col>
            <h2>{selectedExerciseType} History</h2>
            {loading ? (
              <Spinner animation="border" />
            ) : exerciseHistory.length > 0 ? (
              <div className="table-responsive">
                <Table bordered hover>
                  <thead>
                    <tr>
                      <th>Date</th>
                      {Array.from({ length: maxSets }, (_, i) => (
                        <th key={i}>Set {i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exerciseHistory.map((exercise, exerciseIndex) => (
                      <tr key={exerciseIndex}>
                        <td>{formatDate(exercise.workout_date)}</td>
                        {Array.from({ length: maxSets }, (_, i) => {
                          const set = exercise.sets && exercise.sets.length > i ? exercise.sets[i] : null;
                          const prevExercise = exerciseIndex > 0 ? exerciseHistory[exerciseIndex - 1] : null;
                          const prevSet = prevExercise && prevExercise.sets && prevExercise.sets.length > i ? prevExercise.sets[i] : null;
                          const currentVolume = set ? (set.reps || 0) * (set.weight_kg || 0) : 0;
                          const prevVolume = prevSet ? (prevSet.reps || 0) * (prevSet.weight_kg || 0) : 0;
                          let cellColor = "";
                          const isLastRow = exerciseIndex === exerciseHistory.length - 1;
                          const isNotFirstSet = i > 0;
                          const shouldAddAsterisk = isLastRow && isNotFirstSet && set && set.reps >= 12;
                          const shouldAddMuscleEmoji = isLastRow && isNotFirstSet && set && (set.reps > 8 && set.reps < 12);
                          if (prevVolume > 0) {
                            const percentChange = ((currentVolume - prevVolume) / prevVolume) * 100;
                            if (percentChange === 0) cellColor = "table-warning";
                            else if (percentChange > 15) cellColor = "table-success";
                            else if (percentChange > 5) cellColor = "table-success";
                            else if (percentChange < -15) cellColor = "table-danger";
                            else if (percentChange < 0) cellColor = "table-danger";
                          }
                          return (
                            <td key={i} className={cellColor}>
                              {set
                                ? `${getSetTypeEmoji(set.type)} ${set.reps || '-'} @ ${set.weight_kg || '-'}kg${shouldAddAsterisk ? ' 🚀' : ''}${shouldAddMuscleEmoji ? ' 💪' : ''}`
                                : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <div className="text-muted small">
                  <div>🚀 Weight can be increased in this situation</div>
                  <div>💪 Still have to work on increasing reps</div>
                  <div>(🌡️) Warmup / (⬇️) Dropset / (💀) Failure</div>
                </div>
              </div>
            ) : (
              <p>No history found for this exercise.</p>
            )}
          </Col>
        </Row>
      )}
    </Container>
  );
}

export default App;
