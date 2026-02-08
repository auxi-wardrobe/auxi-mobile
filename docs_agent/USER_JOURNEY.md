flowchart TD
A([Start: Getting Ready])
%% Entry point: user initiates outfit decision process.
%% Agent mindset: user wants decision relief, not inspiration.

    A --> B{Check occasion / event type}
    %% Core context classifier.
    %% Determines primary constraints (formality, expectation, social risk).

    B -->|Work / Professional| C[Consider work dress code]
    %% Apply professional ruleset: formality threshold, cultural norms.

    B -->|Casual / Daily| D[Think about daily activities]
    %% Low-risk context: comfort & practicality prioritized.

    B -->|Special Event| E[Review event details & theme]
    %% High-sensitivity context: style coherence & standout potential.

    C --> F{Check weather & temperature}
    D --> F
    E --> F
    %% Weather is a global constraint that overrides style preferences.

    F -->|Hot / Warm| G[Consider light fabrics & colors]
    %% Constraint: breathability, heat management, light palette.

    F -->|Cold| H[Consider layers & warm materials]
    %% Constraint: thermal layering, silhouette balance.

    F -->|Rainy| I[Plan for waterproof items]
    %% Constraint: functional protection > aesthetics.

    G --> J[Browse closet options]
    H --> J
    I --> J
    %% Transition from constraints → item space.
    %% Agent switches from reasoning to assembly mode.

    J --> K[Select top: blouse / shirt]
    %% Select top based on dominant visual impact.

    K --> L[Select bottom: pants / skirt / dress]
    %% Bottom selection must harmonize with top (fit, proportion).

    L --> M{Try on outfit}
    %% Evaluation checkpoint.
    %% Agent simulates user feedback: comfort + appearance.

    M -->|Comfortable & looks good| N[Choose shoes]
    %% Shoes finalize formality & activity readiness.

    M -->|Not satisfied| O{Reconsider what to change?}
    %% Feedback loop.
    %% Agent must identify failure source, not restart blindly.

    O -->|Change top| K
    %% Adjust visual focus or silhouette.

    O -->|Change bottom| L
    %% Adjust balance, fit, or comfort.

    O -->|Exercise / Sports| P[Select athletic wear]
    %% Domain switch.
    %% Abandon fashion ruleset, activate sportswear rules.

    P --> Q[Choose workout outfit]
    %% Functional optimization: movement, sweat, safety.

    Q --> R[Add accessories: jewelry, bag, belt]
    %% Accessories are polish, never core decision.

    N --> R

    R --> S{Final mirror check}
    %% Confidence validation.
    %% Agent should output confidence score + explanation.

    S -->|Happy with outfit| T([Ready to go!])
    %% Success state.
    %% Deliver final outfit recommendation.

    S -->|Need adjustments| U[Make small changes]
    %% Micro-iterations only (no full reset).
    U --> S
