
graph TD
    %% Nodes
    User[User]
    App[Frontend App (React)]
    
    subgraph Services [Service Layer]
        GeminiService[GeminiService (geminiService.ts)]
        APIService[APIService (api.ts)]
    end
    
    subgraph External [External / Backend]
        GeminiAPI[Google Gemini API]
        BackendAPI[Backend Server (Node/Express)]
        Database[(Database / Supabase)]
    end

    %% Flows
    
    %% 1. Initial Load / Data Fetching
    User -->|Open App| App
    App -->|useEffect Fetch Data| APIService
    APIService -->|GET /schools, /students, etc.| BackendAPI
    BackendAPI -->|Query| Database
    Database -->|Return Data| BackendAPI
    BackendAPI -->|JSON Response| APIService
    APIService -->|Update State| App

    %% 2. AI Content Generation Flow
    User -->|Request Content (Quiz/Flashcards)| App
    App -->|Call Generate Method| GeminiService
    GeminiService -->|GenerateContent (Prompt)| GeminiAPI
    GeminiAPI -->|Return JSON| GeminiService
    
    %% 3. Persistence Flow (The "Connect" Logic)
    GeminiService -->|Save Generated Content| APIService
    APIService -->|POST /save-module-history| BackendAPI
    BackendAPI -->|Insert History| Database

    %% 4. Authentication
    User -->|Login| App
    App -->|api.login(credentials)| APIService
    APIService -->|POST /login| BackendAPI
    BackendAPI -->|Verify & Return User| APIService

    %% Styling
    style User fill:#f9f,stroke:#333,stroke-width:2px
    style App fill:#ccf,stroke:#333,stroke-width:2px
    style GeminiService fill:#ff9,stroke:#333,stroke-width:2px
    style APIService fill:#9f9,stroke:#333,stroke-width:2px
    style BackendAPI fill:#faa,stroke:#333,stroke-width:2px
    style GeminiAPI fill:#aff,stroke:#333,stroke-width:2px
    style Database fill:#ddd,stroke:#333,stroke-width:2px
