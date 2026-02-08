# Wardrobe Project Documentation

> **Purpose**: This folder contains the complete technical documentation for the Wardrobe backend API and system architecture. All AI agents and developers MUST consult these documents before implementing features.

---

## 📚 Documentation Files

### 1. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
**Size**: 1,407 lines | **Type**: API Reference

**What it contains**:
- Complete API endpoint specifications
- Authentication flow (JWT + Refresh Token)
- Request/response formats with examples
- Error handling patterns
- File upload requirements and validation
- Rate limiting rules
- Environment configuration
- Complete workflow examples (try-on, wardrobe management, etc.)

**When to use**:
- ✅ Before implementing ANY API call
- ✅ When debugging API integration issues
- ✅ When setting up authentication
- ✅ When handling file uploads
- ✅ When implementing error handling

**Key sections**:
- Authentication (Register, Login, Token Refresh, Logout)
- Garment Processing (Segment, Extract, Thumbnail)
- Wardrobe Management (Items, Filtering, Attributes)
- Virtual Try-On (Low-res, High-res, History)
- Body Reference Management
- Feedback System

---

### 2. [MODELS_DOCUMENTATION.md](./MODELS_DOCUMENTATION.md)
**Size**: 1,496 lines | **Type**: Data Model Specification

**What it contains**:
- Database models (SQLAlchemy ORM)
  - User, RefreshToken, WardrobeItem, Body, TryOnImage
- ML/Processing models
  - GarmentSegmenter, PoseDetector, GarmentWarper, GarmentCompositor
- Field specifications with types and constraints
- Relationships and foreign keys
- Methods and properties
- Usage examples
- Performance considerations
- Troubleshooting guides

**When to use**:
- ✅ Before implementing data structures
- ✅ When setting up state management
- ✅ When working with API responses
- ✅ When implementing offline caching
- ✅ When debugging data-related issues

**Key sections**:
- Database Models (fields, relationships, methods)
- ML Models (architecture, methods, dependencies)
- Model Dependencies (installation, requirements)
- Usage Examples (complete pipelines)
- Best Practices (optimization, caching)
- Troubleshooting (common issues, solutions)

---

### 3. [USER_FLOW.md](./USER_FLOW.md)
**Size**: 65 lines | **Type**: Flowchart Diagram

**What it contains**:
- Visual flowchart of user interactions
- Authentication flow
- Image source selection paths
- AI interaction patterns
- Image processing workflow
- Validation and error handling flows
- Save/favorites logic

**When to use**:
- ✅ Before designing screens
- ✅ When planning navigation structure
- ✅ When implementing user interactions
- ✅ When designing error recovery flows
- ✅ When mapping out feature dependencies

**Key concepts**:
- Entry point: Authentication check
- Three image sources: Wardrobe, Saved, Upload
- AI interaction loop: Ask → Process → Display → Validate
- Fallback mechanisms for processing failures
- Edit/Retry workflow
- Save to favorites decision point

---

### 4. [USER_JOURNEY.md](./USER_JOURNEY.md)
**Size**: 85 lines | **Type**: Decision Tree Diagram

**What it contains**:
- Detailed user decision-making process
- Occasion/event type classification logic
- Weather and temperature constraints
- Outfit selection order and rules
- Try-on and feedback loops
- Accessory selection logic
- Final validation and confidence checks

**When to use**:
- ✅ When implementing outfit recommendation logic
- ✅ When building context-aware features
- ✅ When designing AI prompts for outfit suggestions
- ✅ When implementing feedback mechanisms
- ✅ When planning UX decision trees

**Key concepts**:
- Occasion-based constraints (Work, Casual, Special Event)
- Weather-driven fabric/color selection
- Selection order: Top → Bottom → Shoes → Accessories
- Iterative refinement (not full reset)
- Domain switches (e.g., sportswear mode)
- Confidence validation before completion

---

## 🎯 How to Use This Documentation

### For Developers

**Before starting any task**:
1. Read the relevant documentation section
2. Understand the API contracts and data models
3. Follow the documented patterns and conventions
4. Implement error handling as specified
5. Test against documented behavior

**During development**:
- Keep documentation open for reference
- Match exact field names and types
- Use documented error formats
- Follow authentication patterns
- Implement rate limiting awareness

**When debugging**:
- Check API docs for correct endpoint usage
- Verify data models match backend specs
- Review user flow for expected behavior
- Consult troubleshooting sections

### For AI Agents (Cursor, GitHub Copilot, etc.)

The `.cursorrules` file at the project root contains comprehensive rules that enforce:
- Mandatory consultation of this documentation
- Exact API format matching
- Proper data model usage
- User flow adherence
- Error handling patterns
- Security best practices

**AI agents MUST**:
- Read relevant docs before generating code
- Use exact field names from MODELS_DOCUMENTATION.md
- Match request/response formats from API_DOCUMENTATION.md
- Follow user flows from USER_FLOW.md
- Apply context logic from USER_JOURNEY.md

### For Product/Design Teams

**API_DOCUMENTATION.md** helps you understand:
- What features are available
- What data can be stored/retrieved
- Performance expectations
- Implementation phases

**USER_FLOW.md** helps you understand:
- Current user journey structure
- Decision points and branches
- Error recovery mechanisms
- Save/favorites workflow

**USER_JOURNEY.md** helps you understand:
- User decision-making logic
- Context-aware recommendations
- Outfit selection constraints
- Feedback and refinement loops

---

## 🔄 Documentation Update Guidelines

### When to Update

Update documentation when:
- ✅ New API endpoints are added
- ✅ Existing endpoints are modified
- ✅ Data models change (new fields, relationships)
- ✅ User flows are redesigned
- ✅ Business logic changes
- ✅ Error handling patterns change

### How to Update

1. **API Changes**: Update API_DOCUMENTATION.md
   - Add/modify endpoint specifications
   - Update request/response examples
   - Document new error codes
   - Update workflow examples if affected

2. **Model Changes**: Update MODELS_DOCUMENTATION.md
   - Add/modify field specifications
   - Update relationships
   - Add new methods/properties
   - Update usage examples

3. **Flow Changes**: Update USER_FLOW.md
   - Modify flowchart structure
   - Add/remove decision points
   - Update validation logic
   - Document new error paths

4. **Journey Changes**: Update USER_JOURNEY.md
   - Modify decision tree
   - Update constraint logic
   - Change selection order
   - Add new context factors

### Version Control

- Include documentation updates in the same PR as code changes
- Reference doc changes in commit messages
- Keep docs in sync with code at all times
- Review docs as part of code review process

---

## 📊 Documentation Statistics

| File | Lines | Last Updated | Focus Area |
|------|-------|--------------|------------|
| API_DOCUMENTATION.md | 1,407 | Dec 7, 2024 | API Contracts |
| MODELS_DOCUMENTATION.md | 1,496 | Dec 17, 2025 | Data Structures |
| USER_FLOW.md | 65 | [Date] | User Interaction |
| USER_JOURNEY.md | 85 | [Date] | Decision Logic |
| **Total** | **3,053** | - | **Complete System** |

---

## 🔗 Related Resources

### Project Files
- `/.cursorrules` - AI agent rules (enforces this documentation)
- `/template/src/` - React Native source code
- `/template/package.json` - Dependencies

### External Documentation
- [React Native Docs](https://reactnative.dev/)
- [Flask API Docs](https://flask.palletsprojects.com/)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose)

---

## ❓ FAQ

**Q: Which document should I read first?**
A: Start with API_DOCUMENTATION.md for endpoints, then MODELS_DOCUMENTATION.md for data structures.

**Q: Do I need to read all 3,000+ lines?**
A: No, read the sections relevant to your current task. Use table of contents and search.

**Q: What if documentation conflicts with code?**
A: Documentation is the source of truth. Update code to match docs, or update docs if specs changed.

**Q: How do I know if documentation is up to date?**
A: Check "Last Updated" dates. If code changes aren't reflected, update the docs.

**Q: Can I implement features not in the documentation?**
A: Yes, but document them immediately. Add to API_DOCUMENTATION.md and MODELS_DOCUMENTATION.md.

---

## 📝 Contributing

When contributing to this project:

1. **Read first**: Always consult documentation before coding
2. **Match exactly**: Use exact field names, types, and formats
3. **Document changes**: Update docs when adding/changing features
4. **Follow patterns**: Use established patterns for consistency
5. **Test thoroughly**: Verify implementation matches documentation

---

## 🎓 Learning Path

**For new developers**:
1. Read API_DOCUMENTATION.md (focus on Authentication and Core Endpoints)
2. Read MODELS_DOCUMENTATION.md (focus on Database Models)
3. Review USER_FLOW.md (understand user journey)
4. Scan USER_JOURNEY.md (understand decision logic)
5. Set up development environment
6. Start with simple API integration tasks
7. Gradually implement more complex features

**Estimated reading time**: 2-3 hours for complete documentation
**Estimated understanding time**: 1-2 days with hands-on coding

---

**Maintained by**: Wardrobe Project Team
**Questions**: Open an issue or contact the team
**Last README Update**: January 13, 2026
