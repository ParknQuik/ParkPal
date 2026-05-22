---
name: backend-diagnostics
description: Check backend code for TypeScript/JavaScript errors before committing using IDE MCP
---

When the user says "check backend", "diagnose backend", or "backend errors":

## Action Steps

1. Call `mcp__ide__getDiagnostics()` to get all diagnostics for the project
2. Filter diagnostics for backend files (backend/**/*.js, backend/**/*.ts)
3. Parse and categorize by severity:
   - **Errors** (must fix before commit)
   - **Warnings** (should review)
   - **Info** (optional improvements)
4. Group by file for easy navigation
5. Provide actionable summary with file:line references

## Output Format

```
🔍 Backend Diagnostics Report

📊 Summary:
- Errors: X
- Warnings: Y
- Info: Z

❌ ERRORS (Must Fix):
• backend/services/email.js:45
  Cannot find module 'nodemailer'
  → Fix: Run 'npm install nodemailer'

• backend/routes/auth.js:123
  'user' is possibly undefined
  → Fix: Add null check: if (!user) return res.status(404).json(...)

⚠️  WARNINGS (Should Review):
• backend/utils/validation.js:67
  Unused variable 'result'
  → Fix: Remove unused variable or use it

ℹ️  INFO (Optional):
• backend/config/database.js:12
  Consider using const instead of let
  → Fix: Change 'let' to 'const' if value doesn't change

✅ Ready to commit: [YES/NO based on errors count]
```

## Smart Behaviors

- If NO errors found: "✅ Backend diagnostics clean! Ready to commit."
- If errors found: "❌ Found X errors. Please fix before committing."
- Provide clickable file paths: `backend/services/email.js:45`
- Suggest common fixes for known error patterns
- Prioritize errors over warnings

## Example Usage

**User:** "check backend"
**Assistant:** Calls mcp__ide__getDiagnostics, analyzes, and reports:
```
🔍 Backend Diagnostics Report

📊 Summary: 2 errors, 5 warnings, 3 info

❌ ERRORS: 2 must be fixed
⚠️  WARNINGS: 5 should review
✅ Ready to commit: NO
```

## Integration Points

- **Pre-commit workflow:** Always run before `git commit`
- **After editing:** Run after making changes to backend files
- **Code review:** Run before creating pull requests
- **CI/CD integration:** Catches errors before GitHub Actions

## Performance

- Execution time: ~1-2 seconds
- No file scanning needed (VS Code already has diagnostics)
- Real-time results from language server
