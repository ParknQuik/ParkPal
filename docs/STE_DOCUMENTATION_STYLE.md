# Practical STE Documentation Style

Use this guide for ParkPal project documentation. It uses ASD-STE100 ideas as a
style guide only. It does not make ParkPal documentation formally ASD-STE100
compliant.

## Rules

1. Use short sentences.
2. Use active voice when you can.
3. Use one term for one meaning.
4. Do not use idioms.
5. Do not use vague words such as "simply", "obviously", or "seamless".
6. Do not use long noun strings. Split them into short phrases.
7. Use numbered steps for actions.
8. Keep warnings, notes, and prerequisites separate.
9. Keep product names unchanged.
10. Keep API paths, commands, code terms, schema names, file paths, and
    environment variable names unchanged.

## Structure

Use these section labels when they fit the document:

- `Prerequisites` for required access, tools, data, or services.
- `Steps` for actions that a reader must do.
- `Expected result` for the result after a step or procedure.
- `Note` for useful context.
- `Warning` for a risk that can break the task, lose data, or expose secrets.

## Sentence Checks

Before you finish a document, check these points:

1. Each sentence gives one idea.
2. Each paragraph has a clear purpose.
3. Each action starts with a verb.
4. Each status line states the current state first.
5. Each limitation names the blocked item and the reason.

## Terms

Use the same term each time:

- Use `backend` for the Express API service.
- Use `mobile app` for the Expo React Native app.
- Use `web dashboard` for the Vite admin interface.
- Use `development client` for a native Expo development build.
- Use `Expo Go` only for the Expo Go app.
- Use `production readiness` for the readiness score.
- Use `deployment health` for Cloud Run and service health checks.
