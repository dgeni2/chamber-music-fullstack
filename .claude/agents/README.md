# HarmonyForge Agent System

## Overview

This directory contains specialized agents for working with different aspects of the HarmonyForge application. Each agent is an expert in a specific domain and provides detailed guidance, troubleshooting steps, and best practices.

## Available Agents

### 1. Backend Agent
**File**: `backend-agent.md`

**When to Use**:
- Modifying harmonization engine logic
- Adding new instruments to backend
- Updating music theory algorithms
- Optimizing backend performance
- Debugging harmonization issues
- Adjusting voice leading rules
- Cache management

**Key Responsibilities**:
- Express.js server maintenance
- 1,781-line harmonization engine
- Music theory implementation
- API endpoint development
- Performance optimization

**Example Invocations**:
```
"Add support for Alto Saxophone with Eb transposition"
"Why is the harmonization generating parallel fifths?"
"Optimize the voice leading algorithm for better performance"
"Add logging to track harmonic progression quality scores"
```

### 2. Frontend Agent
**File**: `frontend-agent.md`

**When to Use**:
- Updating UI components
- Adding new instruments to frontend
- Modifying API integration
- Form validation updates
- State management issues
- File upload functionality
- Results display modifications

**Key Responsibilities**:
- React component development
- shadcn/ui component usage
- API service integration
- State management
- Error handling
- UI/UX implementation

**Example Invocations**:
```
"Add a tempo selector to the instrument selection screen"
"Fix the file upload drag-and-drop not working"
"Update the results screen to show processing time"
"Add validation for file size before upload"
```

### 3. Integration Agent
**File**: `integration-agent.md`

**When to Use**:
- Instrument name synchronization issues
- CORS configuration problems
- Request/response format mismatches
- API contract changes
- End-to-end workflow issues
- Environment variable setup
- Deployment configuration

**Key Responsibilities**:
- Frontend-backend communication
- API contract consistency
- Instrument name verification
- CORS configuration
- Error propagation
- Integration testing

**Example Invocations**:
```
"Frontend is sending 'B♭ Clarinet' but backend expects 'B-flat Clarinet'"
"CORS error when frontend tries to call backend API"
"Verify all instrument names match between frontend and backend"
"Add a new parameter to the harmonize API"
```

### 4. Testing Agent
**File**: `testing-agent.md`

**When to Use**:
- Writing unit tests
- Creating integration tests
- Setting up end-to-end tests
- Performance benchmarking
- Test data generation
- Regression testing
- Validation testing

**Key Responsibilities**:
- Music theory unit tests
- API endpoint testing
- Component testing
- E2E workflow testing
- Performance benchmarks
- Test utilities

**Example Invocations**:
```
"Write unit tests for the chord quality selection function"
"Create an integration test for the harmonize API endpoint"
"Benchmark harmonization performance with different file sizes"
"Generate test MusicXML files with various melodies"
```

### 5. Debugging Agent
**File**: `debugging-agent.md`

**When to Use**:
- Diagnosing errors
- Performance issues
- Production bugs
- Memory leaks
- Infinite loops
- Integration failures
- Any unexplained behavior

**Key Responsibilities**:
- Error diagnosis
- Root cause analysis
- Performance profiling
- Log analysis
- Debug instrumentation
- Production debugging

**Example Invocations**:
```
"Backend is using too much memory and eventually crashes"
"Request hangs when processing certain MusicXML files"
"Port 3001 is already in use, how do I fix it?"
"Frontend receives undefined for harmonyOnly.content"
```

## How to Use Agents

### Method 1: Direct Reference
When asking Claude Code for help, reference the specific agent:

```
"Using the Backend Agent guide, help me add support for Eb Alto Saxophone"

"Following the Integration Agent checklist, verify instrument name sync"

"Use the Debugging Agent to diagnose why harmonization is slow"
```

### Method 2: Ask for Agent Recommendation
Let Claude Code choose the appropriate agent:

```
"Which agent should I use to add a new instrument?"
→ Claude will recommend Backend Agent + Integration Agent

"I'm getting CORS errors"
→ Claude will recommend Integration Agent + Debugging Agent
```

### Method 3: Multi-Agent Approach
For complex tasks, multiple agents may be needed:

```
"Add Alto Saxophone support:
1. Backend Agent: Add to INSTRUMENT_CONFIG
2. Frontend Agent: Add to instrument selection
3. Integration Agent: Verify names match
4. Testing Agent: Add tests for new instrument"
```

## Agent Selection Guide

| Problem Area | Primary Agent | Secondary Agent |
|-------------|---------------|-----------------|
| Add new instrument | Backend | Integration, Frontend |
| UI component issues | Frontend | - |
| API errors | Integration | Debugging |
| Performance slow | Backend | Debugging |
| CORS errors | Integration | Debugging |
| Voice leading bugs | Backend | Testing |
| State not updating | Frontend | Debugging |
| Test failures | Testing | Backend/Frontend |
| Memory leaks | Debugging | Backend |
| XML parsing errors | Backend | Debugging |
| File upload broken | Frontend | Integration |
| Instrument mismatch | Integration | Backend, Frontend |

## Quick Reference

### Common Tasks by Agent

**Backend Agent**:
- ✅ Modify INSTRUMENT_CONFIG
- ✅ Update voice leading rules
- ✅ Adjust harmonic progression
- ✅ Cache optimization
- ✅ Music theory algorithms

**Frontend Agent**:
- ✅ Update instrument list UI
- ✅ Modify ApiService
- ✅ Add form validation
- ✅ Handle errors
- ✅ File upload logic

**Integration Agent**:
- ✅ Sync instrument names
- ✅ Fix CORS issues
- ✅ Update API contracts
- ✅ Environment variables
- ✅ End-to-end flow

**Testing Agent**:
- ✅ Write unit tests
- ✅ API integration tests
- ✅ E2E workflows
- ✅ Performance benchmarks
- ✅ Test data generation

**Debugging Agent**:
- ✅ Diagnose errors
- ✅ Fix port conflicts
- ✅ Memory profiling
- ✅ Log analysis
- ✅ Production issues

## Example Workflows

### Workflow 1: Adding a New Instrument

1. **Backend Agent**: Add to `INSTRUMENT_CONFIG`
   ```javascript
   "Alto Saxophone": {
     clefSign: "G",
     clefLine: 2,
     minMidi: 49,
     maxMidi: 81,
     transposition: 9
   }
   ```

2. **Frontend Agent**: Add to instrument selection
   ```typescript
   { name: 'Alto Saxophone', category: 'Woodwinds' }
   ```

3. **Integration Agent**: Verify names match exactly
   ```bash
   ./verify-instruments.sh
   ```

4. **Testing Agent**: Add tests
   ```javascript
   testTransposingInstrument("Alto Saxophone", 9);
   ```

### Workflow 2: Debugging CORS Error

1. **Debugging Agent**: Identify the error
   ```
   Access to fetch blocked by CORS policy
   ```

2. **Integration Agent**: Check CORS config
   ```javascript
   // backend/src/server.js
   origin: ['http://localhost:5174']
   ```

3. **Integration Agent**: Verify .env.local
   ```bash
   VITE_API_URL=http://localhost:3001
   ```

4. **Testing Agent**: Test end-to-end
   ```bash
   curl http://localhost:3001/health
   ```

### Workflow 3: Performance Optimization

1. **Debugging Agent**: Profile slow function
   ```javascript
   perf.start('harmonization');
   await harmonizeMelody(...);
   perf.end('harmonization');
   ```

2. **Backend Agent**: Optimize algorithm
   - Reduce allocations
   - Cache intermediate results
   - Simplify voice leading

3. **Testing Agent**: Benchmark improvements
   ```javascript
   benchmarkHarmonization();
   ```

4. **Integration Agent**: Verify no regression
   - Test with various file sizes
   - Check all instruments still work

## Best Practices

### 1. Start with the Right Agent
- Don't use Backend Agent for UI issues
- Don't use Frontend Agent for harmonization logic
- Integration Agent for cross-cutting concerns

### 2. Follow Agent Checklists
Each agent provides checklists for common tasks. Follow them to avoid mistakes.

### 3. Cross-Reference Agents
When one agent references another, follow that guidance:
- Backend Agent → Integration Agent for instrument sync
- Frontend Agent → Integration Agent for API changes

### 4. Use Verification Scripts
Integration and Debugging agents provide scripts. Use them!

### 5. Document Solutions
When you solve an issue using an agent, consider adding it to the agent's documentation for future reference.

## Contributing to Agents

### Adding New Solutions
If you encounter and solve a new issue:

1. Identify the appropriate agent file
2. Add the issue under "Common Issues"
3. Include symptoms, diagnosis, and solution
4. Provide code examples
5. Update this README if it's a common workflow

### Adding New Agents
If a new domain emerges (e.g., "deployment-agent", "monitoring-agent"):

1. Create new agent file following existing format
2. Define purpose and responsibilities
3. Document common tasks
4. Add to this README
5. Update agent selection guide

## Support

If you're unsure which agent to use or how to use them:

1. Check the Agent Selection Guide above
2. Ask Claude Code: "Which agent should I use for [problem]?"
3. Review CLAUDE.md for general architecture guidance
4. Check INTEGRATION.md for specific integration details

## Agent Files Location

```
.claude/agents/
├── README.md               # This file
├── backend-agent.md        # Backend development
├── frontend-agent.md       # Frontend development
├── integration-agent.md    # Frontend-backend integration
├── testing-agent.md        # Testing and QA
└── debugging-agent.md      # Troubleshooting and debugging
```

## Version History

- **v1.0** (2025-11-17): Initial agent system creation
  - Backend Agent
  - Frontend Agent
  - Integration Agent
  - Testing Agent
  - Debugging Agent
