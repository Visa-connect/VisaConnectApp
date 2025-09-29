## TODO

### Design System Improvements

- **Input Component Refactoring**: Create a reusable `Input` component to ensure consistent styling across all forms
  - Current issue: `LocationInput` uses different styling (`rounded-lg`, `focus:ring-blue-500`) than app standard (`rounded-xl`, `focus:ring-sky-300`)
  - Requires updating ALL input fields across the app (CreateAccountPage, LoginScreen, PostJobScreen, etc.)
  - Should be handled in a dedicated branch for design system consistency

### Logging Improvements

- **Structured Logging**: Replace `console.log` usage with a centralized logger (e.g., Winston)
  - Add logger config with JSON output and env-based log levels (dev/prod)
  - Migrate `server/api/applications.ts` and other server files to use logger
  - Optionally add HTTP request logging middleware
