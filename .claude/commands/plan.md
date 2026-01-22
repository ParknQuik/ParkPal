# /plan - Implementation Planning

**Purpose:** Plan feature implementation with task breakdown

## Usage

```
/plan <feature-name> [--detail=<level>]
```

## Parameters

- `feature-name` (required): Feature to plan
- `--detail` (optional): Level of detail (high, medium, low). Default: medium

## Examples

```bash
# Plan photo upload feature
/plan photo-upload

# Detailed planning
/plan forgot-password --detail=high

# Quick overview
/plan analytics-dashboard --detail=low
```

## What It Does

1. **Analyzes Requirements**
   - Reviews feature description
   - Identifies dependencies
   - Checks existing code

2. **Creates Task Breakdown**
   - Backend tasks
   - Frontend tasks
   - Testing tasks
   - Documentation tasks

3. **Estimates Effort**
   - Time estimates per task
   - Total timeline
   - Resource requirements

4. **Identifies Risks**
   - Technical challenges
   - Dependencies
   - Potential blockers

## Output Format

```markdown
## Feature Plan: [Feature Name]

### Overview
[Brief description]

### Prerequisites
- [Dependency 1]
- [Dependency 2]

### Tasks
#### Backend (X hours)
1. [Task 1] - Xh
2. [Task 2] - Xh

#### Frontend (X hours)
1. [Task 1] - Xh
2. [Task 2] - Xh

#### Testing (X hours)
1. [Task 1] - Xh

### Risks & Mitigations
- **Risk 1**: Mitigation strategy
- **Risk 2**: Mitigation strategy

### Timeline
Total: X hours (~Y days)
- Day 1: Tasks 1-3
- Day 2: Tasks 4-6

### Next Steps
1. [Action item 1]
2. [Action item 2]
```

## Related Commands
- `/tdd` - Start test-driven development
- `/code-review` - Review implementation
