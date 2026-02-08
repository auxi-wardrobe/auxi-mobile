flowchart TD
%% ENTRY
Launch[App Launch]
Launch --> AuthCheck{Authenticated?}

    %% AUTH FLOW
    AuthCheck -->|No| AuthChoice{Login or Register}
    AuthChoice -->|Login| Login[Login]
    AuthChoice -->|Register| Register[Register]

    Login --> Session[Authenticated Session]
    Register --> Session

    AuthCheck -->|Yes| Session

    %% HOME
    Session --> Home[Home Screen]
    Home --> ChooseSource{Choose Image Source}

    %% IMAGE SOURCES
    Wardrobe[(Wardrobe Database)]
    Saved[(Previously Saved Images)]
    Upload[Upload New Image]

    ChooseSource -->|From wardrobe| Wardrobe
    ChooseSource -->|Saved image| Saved
    ChooseSource -->|New upload| Upload

    Wardrobe --> AskAI
    Saved --> AskAI
    Upload --> AskAI

    %% AI INTERACTION
    AskAI[Chat / Ask AI]

    %% IMAGE PROCESSING
    AskAI --> Process{Process Image}

    Process -->|Success| DisplayImage[Display Image]
    Process -->|Failure| Fallback[(Fallback Data Source)]

    %% FALLBACK
    Fallback --> AskAI

    %% AI UNDERSTANDING
    DisplayImage --> ParseAI[AI Parses Image Data]
    ParseAI --> Validate{Validation Check}

    %% VALIDATION LOOP
    Validate -->|Valid| OutfitResult[AI Outfit Result]
    Validate -->|Invalid| EditAI[Manual / AI-assisted Correction]
    EditAI --> ParseAI

    %% USER DECISION
    OutfitResult --> Decision{User Action}
    Decision -->|View only| ViewResult[View Result]
    Decision -->|Edit & Retry| AskAI

    %% SAVE LOGIC
    ViewResult --> SaveCheck{Save Result?}
    SaveCheck -->|Yes| Favorites[(Favorite Wardrobe)]
    SaveCheck -->|No| End[End Flow]

    Favorites --> End
