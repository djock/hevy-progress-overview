### A web application for tracking and visualizing your workout progress from the Hevy app.

![Hevy Progress Overview](https://i.imgur.com/YPS5rib.gif)

## Overview

This project provides a dashboard to view your Hevy workout data, including:
- Routine folders and routines
- Exercise history and progression
- Set and rep tracking over time

The application consists of a FastAPI backend that fetches data from the Hevy API and a React frontend for visualization.

## Project Structure

```
hevy-progress-overview/
├── app/                    # Backend (FastAPI)
│   ├── data/               # Cached workout data
│   ├── main.py             # API endpoints
│   ├── Dockerfile          # Backend container setup
│   └── requirements.txt    # Python dependencies
├── frontend/               # Frontend (React)
│   ├── public/             # Static assets
│   ├── src/                # React components
│   ├── Dockerfile          # Frontend container setup
│   └── package.json        # Node dependencies
├── .env                    # Environment variables (create this)
├── .gitignore              # Git ignore rules
├── docker-compose.yml      # Docker setup
└── README.md               # This file
```

## Setup Instructions

### 1. Get Your Hevy API Key

1. Log in to the Hevy app on your mobile device
2. Open the app and go to your profile
3. Look for the API key in the app settings

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following content:

```
HEVY_API_KEY=your_api_key_here
HEVY_API_BASE_URL=https://api.hevyapp.com
```

Replace `your_api_key_here` with your actual Hevy API key.

### 3. Run with Docker

The easiest way to run the application is with Docker:

```bash
# Build and start the containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

## Usage Guide

1. **View Routines**: The main page displays all your routines organized by folders
2. **Select a Routine**: Click on a routine to view its exercises
3. **View Exercise History**: Click on an exercise to see your progression over time
4. **Refresh Data**: Click the "Refresh Workouts" button to fetch the latest data from Hevy

## Data Storage

The application caches your workout data in the `app/data/workouts.json` file to minimize API calls. This file is automatically created and updated when you run the application.

## Troubleshooting

- **API Key Issues**: If you see "API Key not found" errors, check that your `.env` file is correctly set up
- **No Data Showing**: Click the "Refresh Workouts" button to fetch data from Hevy
- **Docker Issues**: Make sure Docker and Docker Compose are installed and running

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
