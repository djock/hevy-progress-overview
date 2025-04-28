import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [routines, setRoutines] = useState([]);
  const [routineFolders, setRoutineFolders] = useState([]);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoutineFolders();
    fetchRoutines();
  }, []);

  const fetchRoutineFolders = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/routine_folders');
      console.log('Routine Folders API response:', response);
      
      if (response.data) {
        setRoutineFolders(response.data);
      }
    } catch (error) {
      console.error('Error fetching routine folders:', error);
      if (error.response) {
        console.log('Error response data:', error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/routines');
      // Log the entire response to see what we're getting
      console.log('Routines API response:', response);
      
      // Still set the routines if data exists, but don't validate structure yet
      if (response.data) {
        setRoutines(response.data);
      }
    } catch (error) {
      console.error('Error fetching routines:', error);
      // Log more details about the error
      if (error.response) {
        console.log('Error response data:', error.response.data);
        console.log('Error response status:', error.response.status);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async (routineId) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/routines/${routineId}/exercises`);
      // Log the entire response
      console.log('Exercises API response:', response);
      
      // Set data without validation for now
      setExercises(response.data);
      setSelectedRoutine(routineId);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      if (error.response) {
        console.log('Error response data:', error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const filterRoutinesByFolder = (folderId) => {
    setSelectedFolder(folderId);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Workout Progress Tracker</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Routine Folders</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className={`px-4 py-2 rounded ${selectedFolder === null ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => filterRoutinesByFolder(null)}
          >
            All Routines
          </button>
          {routineFolders.map(folder => (
            <button
              key={folder.id}
              className={`px-4 py-2 rounded ${selectedFolder === folder.id ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
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
          {routines
            .filter(routine => selectedFolder === null || routine.folder_id === selectedFolder)
            .map(routine => (
              <button
                key={routine.id}
                className={`px-4 py-2 rounded ${selectedRoutine === routine.id ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => fetchExercises(routine.id)}
              >
                {routine.title || "Unnamed Routine"}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

export default App;







