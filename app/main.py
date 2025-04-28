import os
import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get API key from environment
HEVY_API_KEY = os.environ.get("HEVY_API_KEY")
BASE_URL = "https://api.hevyapp.com/v1"

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

@app.get("/api/routines")
def get_routines():
    url = f"{BASE_URL}/routines"
    resp = requests.get(url, headers=HEADERS)
    print(f"Response status: {resp.status_code}")
    print(f"Response body: {resp.text[:200]}...")  # Print first 200 chars to avoid huge logs
    
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    
    # Get the JSON response
    data = resp.json()
    
    # Check the structure and transform if needed
    if isinstance(data, dict) and "routines" in data:
        # If the API returns {routines: [...]} format
        return JSONResponse(content=data["routines"])
    elif isinstance(data, dict):
        # If it's some other object structure, extract an array somehow
        # This depends on the actual API response structure
        print("Warning: Unexpected API response structure")
        return JSONResponse(content=data)
    else:
        # If it's already an array or something else
        return JSONResponse(content=data)

@app.get("/api/workouts")
def get_workouts():
    url = f"{BASE_URL}/workouts"
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return JSONResponse(content=resp.json())

@app.get("/api/routine_folders")
def get_routine_folders():
    all_folders = []
    page = 1
    total_pages = 1  # Initial value, will be updated from first response
    
    # Fetch all pages
    while page <= total_pages:
        url = f"{BASE_URL}/routine_folders?page={page}"
        resp = requests.get(url, headers=HEADERS)
        
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        
        data = resp.json()
        
        # Update total pages from response
        if page == 1:
            total_pages = data.get("page_count", 1)
            print(f"Total pages of routine folders: {total_pages}")
        
        # Add folders from this page to our collection
        if "routine_folders" in data:
            all_folders.extend(data["routine_folders"])
        
        page += 1
    
    return JSONResponse(content=all_folders)







