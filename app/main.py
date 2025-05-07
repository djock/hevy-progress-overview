import os
import json
import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel
import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Models for structured data
class ExerciseSet(BaseModel):
    index: int
    type: str
    weight_kg: Optional[float] = None
    reps: Optional[int] = None
    duration_seconds: Optional[int] = None
    distance_meters: Optional[float] = None

class Exercise(BaseModel):
    id: str
    title: str
    index: int
    sets: List[ExerciseSet] = []

class Workout(BaseModel):
    id: str
    title: str
    created_at: str
    duration: int
    exercises: List[Exercise] = []
    routine_id: Optional[str] = None

# Constants
HEVY_API_KEY = os.environ.get("HEVY_API_KEY")
BASE_URL = "https://api.hevyapp.com/v1"
DATA_DIR = "data"
WORKOUTS_FILE = os.path.join(DATA_DIR, "workouts.json")
ROUTINES_FILE = os.path.join(DATA_DIR, "routines.json")
ROUTINE_FOLDERS_FILE = os.path.join(DATA_DIR, "routine_folders.json")
PRS_FILE = os.path.join(DATA_DIR, "prs.json")

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Debug: Print API key (masked for security)
if HEVY_API_KEY:
    masked_key = HEVY_API_KEY[:4] + "*" * (len(HEVY_API_KEY) - 8) + HEVY_API_KEY[-4:] if len(HEVY_API_KEY) > 8 else "***"
    print(f"API Key loaded: {masked_key}")
else:
    print("WARNING: HEVY_API_KEY not found in environment variables")

HEADERS = {
    "api-key": HEVY_API_KEY,
    "Content-Type": "application/json"
}

app = FastAPI()

# Workout storage functions
def load_cached_workouts() -> List[Dict]:
    """Load workouts from local cache file"""
    if not os.path.exists(WORKOUTS_FILE):
        return []
    
    try:
        with open(WORKOUTS_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading cached workouts: {e}")
        return []

def save_workouts_to_cache(workouts: List[Dict]):
    """Save workouts to local cache file"""
    try:
        with open(WORKOUTS_FILE, 'w') as f:
            json.dump(workouts, f, indent=2)
    except IOError as e:
        print(f"Error saving workouts to cache: {e}")

def get_latest_workout_date() -> Optional[str]:
    """Get the date of the most recent workout in the cache"""
    workouts = load_cached_workouts()
    if not workouts:
        return None
    
    # Sort by created_at and get the most recent
    sorted_workouts = sorted(workouts, key=lambda w: w.get('created_at', ''), reverse=True)
    return sorted_workouts[0].get('created_at')

async def fetch_all_workouts() -> List[Dict]:
    """Fetch all workouts from the API"""
    all_workouts = []
    page = 1
    total_pages = 1
    
    print("Fetching all workouts...")
    
    while page <= total_pages:
        url = f"{BASE_URL}/workouts?page={page}"
        resp = requests.get(url, headers=HEADERS)
        
        if resp.status_code != 200:
            print(f"Error fetching workouts page {page}: {resp.text}")
            break
        
        data = resp.json()
        
        if page == 1:
            total_pages = data.get("page_count", 1)
            print(f"Total pages of workouts: {total_pages}")
        
        if "workouts" in data:
            all_workouts.extend(data["workouts"])
        
        page += 1
    
    print(f"Fetched {len(all_workouts)} workouts")
    return all_workouts

async def fetch_new_workouts(since_date: str) -> List[Dict]:
    """Fetch only new workouts since the given date"""
    all_workouts = []
    page = 1
    total_pages = 1
    
    print(f"Fetching new workouts since {since_date}...")
    
    while page <= total_pages:
        url = f"{BASE_URL}/workouts?page={page}"
        resp = requests.get(url, headers=HEADERS)
        
        if resp.status_code != 200:
            print(f"Error fetching workouts page {page}: {resp.text}")
            break
        
        data = resp.json()
        
        if page == 1:
            total_pages = data.get("page_count", 1)
        
        if "workouts" in data:
            # Filter workouts that are newer than since_date
            new_workouts = [w for w in data["workouts"] if w.get("created_at", "") > since_date]
            all_workouts.extend(new_workouts)
            
            # If we've reached workouts older than since_date, we can stop
            if len(new_workouts) < len(data["workouts"]):
                break
        
        page += 1
    
    print(f"Fetched {len(all_workouts)} new workouts")
    return all_workouts

async def update_workout_cache():
    """Update the workout cache with new workouts"""
    latest_date = get_latest_workout_date()
    
    if latest_date:
        # We have cached workouts, just fetch new ones
        new_workouts = await fetch_new_workouts(latest_date)
        if new_workouts:
            cached_workouts = load_cached_workouts()
            # Add new workouts to the cache
            all_workouts = new_workouts + cached_workouts
            # Remove duplicates by ID
            unique_workouts = {w["id"]: w for w in all_workouts}.values()
            save_workouts_to_cache(list(unique_workouts))
    else:
        # No cached workouts, fetch all
        all_workouts = await fetch_all_workouts()
        save_workouts_to_cache(all_workouts)

@app.on_event("startup")
async def startup_event():
    """Run when the application starts"""
    await update_workout_cache()
    await update_routine_cache()
    await update_routine_folder_cache()

@app.get("/api/workouts")
async def get_workouts():
    """Get all workouts from the cache"""
    workouts = load_cached_workouts()
    return JSONResponse(content=workouts)

@app.get("/api/workouts/refresh")
async def refresh_workouts():
    """Force refresh of the workout cache"""
    await update_workout_cache()
    return {"status": "success", "message": "Workout cache refreshed"}

@app.get("/api/workouts/{workout_id}")
async def get_workout_details(workout_id: str):
    """Get detailed information about a specific workout"""
    # First check if it's in our cache
    cached_workouts = load_cached_workouts()
    for workout in cached_workouts:
        if workout.get("id") == workout_id:
            return JSONResponse(content=workout)
    
    # If not in cache, fetch from API
    url = f"{BASE_URL}/workouts/{workout_id}"
    resp = requests.get(url, headers=HEADERS)
    
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    
    return JSONResponse(content=resp.json())

@app.get("/api/routines/{routine_id}/workouts")
async def get_routine_workouts(routine_id: str, limit: int = 10):
    """Get workouts for a specific routine from the cache"""
    workouts = load_cached_workouts()
    
    # Filter workouts by routine_id
    routine_workouts = [w for w in workouts if w.get("routine_id") == routine_id]
    
    # Sort by created_at (newest first) and limit
    sorted_workouts = sorted(routine_workouts, key=lambda w: w.get("created_at", ""), reverse=True)
    limited_workouts = sorted_workouts[:limit]
    
    return JSONResponse(content={"workouts": limited_workouts})

@app.get("/api/exercises/by-type/{exercise_type}")
async def get_exercises_by_type(exercise_type: str):
    """Get all exercises of a specific type from all workouts"""
    workouts = load_cached_workouts()
    
    matching_exercises = []
    for workout in workouts:
        for exercise in workout.get("exercises", []):
            if exercise.get("title", "").lower() == exercise_type.lower():
                # Add workout date to the exercise for context
                exercise_with_date = {
                    **exercise,
                    "workout_date": workout.get("created_at"),
                    "workout_id": workout.get("id")
                }
                matching_exercises.append(exercise_with_date)
    
    # Sort by workout date (newest first)
    sorted_exercises = sorted(matching_exercises, key=lambda e: e.get("workout_date", ""), reverse=True)
    
    return JSONResponse(content=sorted_exercises)

@app.get("/api/routines")
async def get_routines():
    """Get all routines from the cache"""
    routines = load_cached_routines()
    return JSONResponse(content=routines)

@app.get("/api/routines/refresh")
async def refresh_routines():
    """Force refresh of the routine cache"""
    await update_routine_cache()
    return {"status": "success", "message": "Routine cache refreshed"}

@app.get("/api/routine_folders")
async def get_routine_folders():
    """Get all routine folders from the cache"""
    folders = load_cached_routine_folders()
    return JSONResponse(content=folders)

@app.get("/api/routine_folders/refresh")
async def refresh_routine_folders():
    """Force refresh of the routine folder cache"""
    await update_routine_folder_cache()
    return {"status": "success", "message": "Routine folder cache refreshed"}

@app.get("/api/routines/{routine_id}/exercises")
def get_routine_exercises(routine_id: str):
    """Get all exercises for a specific routine"""
    url = f"{BASE_URL}/routines/{routine_id}"
    resp = requests.get(url, headers=HEADERS)
    
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    
    data = resp.json()
    exercises = []
    
    # Extract exercise names from the routine
    if "exercises" in data and isinstance(data["exercises"], list):
        exercises = [exercise.get("title") for exercise in data["exercises"] if exercise.get("title")]
    
    return JSONResponse(content=exercises)

# Add these functions for routine caching
def load_cached_routines() -> List[Dict]:
    """Load routines from local cache file"""
    if not os.path.exists(ROUTINES_FILE):
        return []
    
    try:
        with open(ROUTINES_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading cached routines: {e}")
        return []

def save_routines_to_cache(routines: List[Dict]):
    """Save routines to local cache file"""
    try:
        with open(ROUTINES_FILE, 'w') as f:
            json.dump(routines, f, indent=2)
    except IOError as e:
        print(f"Error saving routines to cache: {e}")

# Add these functions for routine folder caching
def load_cached_routine_folders() -> List[Dict]:
    """Load routine folders from local cache file"""
    if not os.path.exists(ROUTINE_FOLDERS_FILE):
        return []
    
    try:
        with open(ROUTINE_FOLDERS_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading cached routine folders: {e}")
        return []

def save_routine_folders_to_cache(folders: List[Dict]):
    """Save routine folders to local cache file"""
    try:
        with open(ROUTINE_FOLDERS_FILE, 'w') as f:
            json.dump(folders, f, indent=2)
    except IOError as e:
        print(f"Error saving routine folders to cache: {e}")

async def fetch_all_routines() -> List[Dict]:
    """Fetch all routines from the API"""
    all_routines = []
    page = 1
    total_pages = 1
    
    print("Fetching all routines...")
    
    while page <= total_pages:
        url = f"{BASE_URL}/routines?page={page}"
        resp = requests.get(url, headers=HEADERS)
        
        if resp.status_code != 200:
            print(f"Error fetching routines page {page}: {resp.text}")
            break
        
        data = resp.json()
        
        if page == 1:
            total_pages = data.get("page_count", 1)
            print(f"Total pages of routines: {total_pages}")
        
        if "routines" in data:
            all_routines.extend(data["routines"])
        
        page += 1
    
    print(f"Fetched {len(all_routines)} routines")
    return all_routines

async def fetch_all_routine_folders() -> List[Dict]:
    """Fetch all routine folders from the API"""
    all_folders = []
    page = 1
    total_pages = 1
    
    print("Fetching all routine folders...")
    
    while page <= total_pages:
        url = f"{BASE_URL}/routine_folders?page={page}"
        resp = requests.get(url, headers=HEADERS)
        
        if resp.status_code != 200:
            print(f"Error fetching routine folders page {page}: {resp.text}")
            break
        
        data = resp.json()
        
        if page == 1:
            total_pages = data.get("page_count", 1)
            print(f"Total pages of routine folders: {total_pages}")
        
        if "routine_folders" in data:
            all_folders.extend(data["routine_folders"])
        
        page += 1
    
    print(f"Fetched {len(all_folders)} routine folders")
    return all_folders

async def update_routine_cache():
    """Update the routine cache with new routines"""
    all_routines = await fetch_all_routines()
    save_routines_to_cache(all_routines)

async def update_routine_folder_cache():
    """Update the routine folder cache with new folders"""
    all_folders = await fetch_all_routine_folders()
    save_routine_folders_to_cache(all_folders)

@app.post("/api/save-prs")
async def save_prs(prs: List[Dict]):
    try:
        with open(PRS_FILE, 'w') as f:
            json.dump(prs, f, indent=2)
        return {"status": "success", "message": "PRs saved successfully"}
    except IOError as e:
        raise HTTPException(status_code=500, detail=f"Error saving PRs: {str(e)}")

@app.get("/api/load-prs")
async def load_prs():
    if not os.path.exists(PRS_FILE):
        return []
    
    try:
        with open(PRS_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        raise HTTPException(status_code=500, detail=f"Error loading PRs: {str(e)}")
