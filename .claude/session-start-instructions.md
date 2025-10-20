# Session Start Instructions

When the user says "start", follow these steps:

## 1. Review All Markdown Files
- Find all `.md` files in the project using Glob
- Read each markdown file to understand:
  - Project progress
  - Architecture decisions
  - Security audits
  - Feature implementations
  - Action items or TODOs

## 2. Key Files to Check
- `PROJECT_SUMMARY.md` - Overall project status
- `BACKEND_ARCHITECTURE_REVIEW.md` - Backend architecture decisions
- `BACKEND_SECURITY_PERFORMANCE_AUDIT.md` - Security and performance findings
- `PASSWORD_POLICY.md` - Password requirements
- Any other `.md` files in the project root or subdirectories

## 3. Provide Summary
After reviewing, provide a concise summary of:
- Current project state
- Recent work completed
- Outstanding tasks or issues
- Any security/performance concerns noted

## 4. Ask What to Work On
Conclude by asking the user what they'd like to focus on in this session.

---

## Git Commit Policy

**IMPORTANT:** Always inform the user before committing or pushing changes.

### Before `git commit`:
1. Show a summary of what will be committed
2. Ask for explicit confirmation: "Ready to commit these changes?"
3. Wait for user approval before running `git commit`

### Before `git push`:
1. Inform the user about the commits to be pushed
2. Ask for explicit confirmation: "Ready to push to remote?"
3. Wait for user approval before running `git push`

### Exception:
Only commit/push automatically if the user explicitly says:
- "commit and push this"
- "go ahead and commit"
- "auto-commit"
- Or similar clear permission
