import React, { useState, useEffect, useCallback } from 'react';
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
  // Add state for caching data
  const [workoutsCache, setWorkoutsCache] = useState([]);
  const [routinesCache, setRoutinesCache] = useState([]);
  const [routineFoldersCache, setRoutineFoldersCache] = useState([]);
  
  // Add Hevy API constants
  const HEVY_API_KEY = process.env.REACT_APP_HEVY_API_KEY;
  const BASE_URL = "https://api.hevyapp.com/v1";
  
  // Add headers for Hevy API
  const HEADERS = {
    "api-key": HEVY_API_KEY,
    "Content-Type": "application/json"
  };

  // Existing state variables
  const [workouts, setWorkouts] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [routineFolders, setRoutineFolders] = useState([]);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [exerciseTypes, setExerciseTypes] = useState([]);
  const [selectedExerciseType, setSelectedExerciseType] = useState(null);
  const [exerciseHistory, setExerciseHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingRoutines, setRefreshingRoutines] = useState(false);
  const [refreshingFolders, setRefreshingFolders] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);
  const [personalRecords, setPersonalRecords] = useState([]);
  const [prSearchTerm, setPrSearchTerm] = useState('');

  // Add function to fetch from Hevy API
  const fetchFromHevyAPI = async (endpoint, page = 1) => {
    const url = `${BASE_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}`;
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  };

  // Add function to fetch all pages of data
  const fetchAllPages = async (endpoint, dataKey) => {
    let allData = [];
    let page = 1;
    let totalPages = 1;
    
    while (page <= totalPages) {
      const data = await fetchFromHevyAPI(endpoint, page);
      
      if (page === 1) {
        totalPages = data.page_count || 1;
      }
      
      if (data[dataKey] && Array.isArray(data[dataKey])) {
        allData = [...allData, ...data[dataKey]];
      }
      
      page++;
    }
    
    return allData;
  };

  // Add function to fetch new workouts since a date
  const fetchNewWorkouts = async (sinceDate) => {
    let allWorkouts = [];
    let page = 1;
    let totalPages = 1;
    
    while (page <= totalPages) {
      const data = await fetchFromHevyAPI('workouts', page);
      
      if (page === 1) {
        totalPages = data.page_count || 1;
      }
      
      if (data.workouts) {
        const newWorkouts = data.workouts.filter(w => w.created_at > sinceDate);
        allWorkouts = [...allWorkouts, ...newWorkouts];
        
        if (newWorkouts.length < data.workouts.length) {
          break;
        }
      }
      
      page++;
    }
    
    return allWorkouts;
  };

  // Add function to get latest workout date
  const getLatestWorkoutDate = () => {
    if (!workoutsCache || workoutsCache.length === 0) {
      return null;
    }
    
    return workoutsCache.reduce((latest, workout) => {
      return workout.created_at > latest ? workout.created_at : latest;
    }, workoutsCache[0].created_at);
  };

  useEffect(() => {
    fetchRoutineFolders();
    fetchRoutines();
    extractExerciseTypes();
    selectRoutine();
  }, []);

  // Add a new useEffect to select the first routine when routines are loaded
  useEffect(() => {
    if (routines && routines.length > 0) {
      // Filter routines by selected folder if needed
      const filteredRoutines = selectedFolder 
        ? routines.filter(routine => routine.folder_id === selectedFolder)
        : routines;
      
      // Select the first routine if there are any available
      if (filteredRoutines.length > 0) {
        selectRoutine(filteredRoutines[0].id);
      }
    }
  }, [routines, selectedFolder]);

  // Add a new useEffect to select the first folder when folders are loaded
  useEffect(() => {
    if (routineFolders && routineFolders.length > 0) {
      // Select the first folder
      filterRoutinesByFolder(routineFolders[0].id);
    }
  }, [routineFolders]);

  // Load PRs from localStorage on startup
  useEffect(() => {
    const savedPRs = localStorage.getItem('personalRecords');
    if (savedPRs) {
      try {
        setPersonalRecords(JSON.parse(savedPRs));
      } catch (e) {
        console.error('Error parsing saved PRs:', e);
      }
    }
  }, []);

  const calculateAndSavePRs = useCallback(() => {
    try {
      const prs = extractPersonalRecords(workoutsCache);
      setPersonalRecords(prs);
      localStorage.setItem('personalRecords', JSON.stringify(prs));
    } catch (error) {
      console.error('Error calculating PRs:', error);
    }
  }, [workoutsCache]);

  const fetchRoutineFolders = async () => {
    setLoading(true);
    try {
      const folders = await fetchAllPages('routine_folders', 'routine_folders');
      setRoutineFoldersCache(folders);
      setRoutineFolders(folders);
    } catch (error) {
      console.error('Error fetching routine folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const routinesData = await fetchAllPages('routines', 'routines');
      setRoutinesCache(routinesData);
      setRoutines(routinesData);
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
      // Filter exercises from cache instead of API call
      const matchingExercises = [];
      workoutsCache.forEach(workout => {
        (workout.exercises || []).forEach(exercise => {
          if (exercise.title && exercise.title.toLowerCase() === exerciseType.toLowerCase()) {
            matchingExercises.push({
              ...exercise,
              workout_date: workout.created_at,
              workout_id: workout.id
            });
          }
        });
      });
      
      const sortedHistory = [...matchingExercises].sort((a, b) =>
        new Date(a.workout_date) - new Date(b.workout_date)
      );
      
      setExerciseHistory(sortedHistory);
      setSelectedExerciseType(exerciseType);
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
      const latestDate = getLatestWorkoutDate();
      let updatedWorkouts;
      
      if (latestDate) {
        const newWorkouts = await fetchNewWorkouts(latestDate);
        // Combine and remove duplicates
        const allWorkouts = [...newWorkouts, ...workoutsCache];
        updatedWorkouts = Array.from(new Map(allWorkouts.map(w => [w.id, w])).values());
      } else {
        updatedWorkouts = await fetchAllPages('workouts', 'workouts');
      }
      
      setWorkoutsCache(updatedWorkouts);
      extractExerciseTypes(updatedWorkouts);
      
      if (selectedRoutine) {
        const routineWorkouts = updatedWorkouts.filter(w => w.routine_id === selectedRoutine);
        setWorkouts(routineWorkouts);
      }
      
      if (selectedExerciseType) {
        fetchExerciseHistory(selectedExerciseType);
      }
      
      const prs = extractPersonalRecords(updatedWorkouts);
      setPersonalRecords(prs);
      // Store PRs in localStorage instead of backend
      localStorage.setItem('personalRecords', JSON.stringify(prs));
    } catch (error) {
      console.error('Error refreshing workouts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const refreshRoutines = async () => {
    setRefreshingRoutines(true);
    try {
      const routinesData = await fetchAllPages('routines', 'routines');
      setRoutinesCache(routinesData);
      setRoutines(routinesData);
    } catch (error) {
      console.error('Error refreshing routines:', error);
    } finally {
      setRefreshingRoutines(false);
    }
  };

  const refreshRoutineFolders = async () => {
    setRefreshingFolders(true);
    try {
      const folders = await fetchAllPages('routine_folders', 'routine_folders');
      setRoutineFoldersCache(folders);
      setRoutineFolders(folders);
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

  // Add a function to filter PRs based on search term
  const filteredPRs = personalRecords.filter(pr => 
    pr.exerciseTitle.toLowerCase().includes(prSearchTerm.toLowerCase())
  );

  return (
    <Container className="py-4">
      <h1 className="mb-4">Hevy Progress Tracker</h1>
      <Row className="mb-3">
        <Col>
         
          
          <Button
            variant="info"
            className="me-2 mb-2"
            onClick={refreshWorkouts}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing Workouts...' : 'Refresh Workouts ↻'}
          </Button> 
          <Button
            variant="info"
            className="me-2 mb-2"
            onClick={() => setShowPRModal(true)}
          >
            Show PRs 🥇
          </Button>
        </Col>
      </Row>

      {/* PR Modal */}
      <Modal show={showPRModal} onHide={() => setShowPRModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Personal Records</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search exercises..."
              value={prSearchTerm}
              onChange={(e) => setPrSearchTerm(e.target.value)}
            />
          </div>
          
          {filteredPRs.length === 0 ? (
            <p>No PRs found matching your search.</p>
          ) : (
            filteredPRs.map((pr, index) => (
              <div key={index} className="mb-2">
                <strong>{pr.exerciseTitle}:</strong> {pr.reps} reps @ {pr.weight_kg}kg <Badge bg="light" text="dark">{formatDate(pr.workoutDate)}</Badge>
              </div>
            ))
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => {
            setShowPRModal(false);
            setPrSearchTerm(''); // Clear search when closing
          }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Row className="mb-4">
        <Col>
          <h2>Folders
          <span className="ms-2">

              <Button
                variant="outline-secondary"
                className="me-2 mb-2"
                onClick={refreshRoutineFolders}
                disabled={refreshingFolders}
              >
              {refreshingFolders ? <Spinner size="sm" animation="border" /> : '↻'}
              </Button>
            </span>
          </h2>
          
          <div className="mb-2">
            {routineFolders && routineFolders.map(folder => (
              <Button
                key={folder.id}
                variant={selectedFolder === folder.id ? "outline-primary" : "outline-secondary"}
                className="me-2 mb-2"
                onClick={() => filterRoutinesByFolder(folder.id)}
              >
                {folder.title} {selectedFolder === folder.id ? "•" : ""}
              </Button>
            ))}
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <h2>Routines
            <span className="ms-2">
              <Button
                variant="outline-secondary"
                className="me-2 mb-2"
                onClick={refreshRoutines}
                disabled={refreshingRoutines}
              >
              {refreshingRoutines ? <Spinner size="sm" animation="border" /> : '↻'}
              </Button>
            </span>
          </h2>
          <div>
            {routines && [...routines]
              .sort((a, b) => {
                if (a.created_at && b.created_at) {
                  return new Date(b.created_at) - new Date(a.created_at);
                }
                return 0;
              })
              .filter(routine => routine.folder_id === selectedFolder)
              .map(routine => (
                <Button
                  key={routine.id}
                  variant={selectedRoutine === routine.id ? "outline-primary" : "outline-secondary"}
                  className="me-2 mb-2"
                  onClick={() => selectRoutine(routine.id)}
                >
                  {routine.title || "Unnamed Routine"}  {selectedRoutine === routine.id ? "•" : ""}
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
                    variant={selectedExerciseType === exercise ? "outline-primary" : "outline-secondary"}
                    className="me-2 mb-2"
                    onClick={() => fetchExerciseHistory(exercise)}
                  >
                    {exercise}  {selectedExerciseType === exercise ? "•" : ""}
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
        <Col className="mb-4">
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
      )}
    </Container>
  );
}

export default App;
