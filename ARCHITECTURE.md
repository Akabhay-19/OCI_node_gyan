# System Architecture

## Frontend-Backend Connection

This diagram illustrates how the React Frontend communicates with the Node.js/Express Backend and the SQLite Database.

```mermaid
graph TD
    subgraph Frontend [React Client (Port 5173)]
        UI[User Interface (Components)]
        Dashboard[Teacher/Student Dashboard]
        API_Service[src/services/api.ts]
        
        UI --> Dashboard
        Dashboard --> API_Service
    end

    subgraph Backend [Express Server (Port 5000)]
        Server[server.js (Express App)]
        Routes[API Routes (/api/*)]
        SyncLogic[syncClassroomData (Auto-Fix)]
        
        Server --> Routes
        Server --> SyncLogic
    end

    subgraph Database [SQLite]
        DB_File[database.sqlite]
        Schema[db.js (Schema Definition)]
    end

    %% Connections
    API_Service -- "HTTP Fetch Requests (GET/POST/PUT)" --> Routes
    Routes -- "SQL Queries (sqlite3)" --> DB_File
    SyncLogic -- "Read/Write" --> DB_File
    Schema -- "Initializes" --> DB_File

    %% Data Flow Example
    note_req[Request: GET /api/students]
    note_res[Response: JSON Data]
    
    API_Service -.-> note_req
    note_req -.-> Routes
    Routes -.-> note_res
    note_res -.-> API_Service
```

## Key Components

1.  **Frontend (`src/`)**:
    *   **Components**: React components like `TeacherDashboard`, `LeaderboardView`, etc.
    *   **`api.ts`**: The bridge. It contains functions like `getStudents()`, `updateTeacher()`, etc., which make `fetch()` calls to the backend.

2.  **Backend (`server.js`)**:
    *   **Express App**: Listens on port 5000.
    *   **API Routes**: Endpoints like `/api/students`, `/api/classrooms` that handle requests.
    *   **`syncClassroomData`**: A special function that runs on startup to ensure data consistency between Students and Classes.

3.  **Database (`db.js`)**:
    *   **SQLite**: A file-based database (`database.sqlite`).
    *   **`db.js`**: Handles the connection and creates tables if they don't exist.
