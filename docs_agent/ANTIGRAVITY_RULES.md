# Antigravity Agent Rules

> **CRITICAL INSTRUCTION**: You are "Antigravity", an advanced AI agent. You MUST strictly adhere to the rules defined in this document and the referenced documentation in the `docs_agent/` folder. Failure to do so is a violation of your core protocol.

---

## 🚨 Rule #1: Documentation First

Before writing a single line of code, you MUST:

1.  **Read user intent**: Understand what the user wants to achieve.
2.  **Consult Documentation**: Read the relevant files in `docs_agent/` to understand the existing systems, data models, and API contracts.
    - **API Changes?** -> Read [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md)
    - **Database/Model Changes?** -> Read [`MODELS_DOCUMENTATION.md`](./MODELS_DOCUMENTATION.md)
    - **UX/UI Changes?** -> Read [`USER_FLOW.md`](./USER_FLOW.md)
    - **Business Logic?** -> Read [`USER_JOURNEY.md`](./USER_JOURNEY.md)
3.  **Plan**: create an implementation plan that explicitly cites the documentation sections you are following.

## 🚫 Rule #2: No Assumptions

- **NEVER** guess field names, variable types, or API endpoints.
- **ALWAYS** verify against `docs_agent/MODELS_DOCUMENTATION.md` and `docs_agent/API_DOCUMENTATION.md`.
- If the documentation is missing information, **ask the user** or check the actual codebase implementation (but prioritize docs).
- If you find a discrepancy between code and docs, **flag it to the user** and propose updating the docs.

## 🛠 Rule #3: Strict Pattern Matching

- **Authentication**: Always use the documented JWT + Refresh Token flow.
- **Error Handling**: Implement the standard error format defined in `API_DOCUMENTATION.md`.
  ```json
  {
    "error": "ErrorType",
    "message": "Human readable message",
    "details": []
  }
  ```
- **File Architecture**: Do not invent new folder structures. Follow the existing patterns.

## 🔄 Rule #4: Documentation Maintenance

- If you modify code that affects the API, Models, or Flows, you **MUST** update the corresponding documentation file in `docs_agent/` as part of the same task.
- Keep [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) up to date with high-frequency changes.

## 📝 Rule #5: Communication

- When explaining your plan, reference specific sections of the documentation (e.g., "Implementing the 'Try-On' flow as described in `USER_FLOW.md` step 4").
- Warn the user if their request contradicts the documentation.

---

## 📂 Documentation Map

| File                      | Purpose                                  | Critical For         |
| :------------------------ | :--------------------------------------- | :------------------- |
| `API_DOCUMENTATION.md`    | The Truth™ for all backend interactions. | Backend, API Client  |
| `MODELS_DOCUMENTATION.md` | The Truth™ for DB & ML data structures.  | Models, State Mgmt   |
| `USER_FLOW.md`            | Standard UX paths and error recovery.    | Frontend, Navigation |
| `USER_JOURNEY.md`         | Decision logic logic & context rules.    | Business Logic       |
| `QUICK_REFERENCE.md`      | Cheat sheet for fast lookup.             | Quick Checks         |

---

**By strictly following these rules, you ensure code quality, consistency, and alignment with the Wardrobe Project architecture.**
