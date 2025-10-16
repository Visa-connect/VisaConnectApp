## TODO

### Design System Improvements

- **Input Component Refactoring**: Create a reusable `Input` component to ensure consistent styling across all forms
  - Current issue: `LocationInput` uses different styling (`rounded-lg`, `focus:ring-blue-500`) than app standard (`rounded-xl`, `focus:ring-sky-300`)
  - Requires updating ALL input fields across the app (CreateAccountPage, LoginScreen, PostJobScreen, etc.)
  - Should be handled in a dedicated branch for design system consistency

### Chat Functionality Improvements

- **Chat Scroll Behavior & Header Fixes**: Improve chat interface user experience
  - Fix smooth scroll behavior in Chat component to properly scroll to bottom
  - Ensure chat header remains fixed/sticky while scrolling through messages
  - Prevent scrollIntoView from affecting parent containers
  - Optimize scroll performance and ensure consistent behavior across devices
  - Should be handled in a dedicated branch for chat UX improvements

### Reports System Enhancements

- **Report Audit Trail**: Implement comprehensive audit logging for report moderation actions
  - Create `report_audit_trail` table with fields: `id`, `report_id`, `action`, `admin_id`, `notes`, `timestamp`
  - Track all state transitions (created, resolved, removed) with admin accountability
  - Add admin notes/comments for transparency in moderation decisions
  - Enable complete audit history for compliance and debugging
  - Update `reportService.ts` to log audit entries on all report actions
  - Enhance admin UI to display audit trail and allow adding notes during moderation

### Logging Improvements

- **Structured Logging**: Replace `console.log` usage with a centralized logger (e.g., Winston)
  - Add logger config with JSON output and env-based log levels (dev/prod)
  - Migrate `server/api/applications.ts` and other server files to use logger
  - Optionally add HTTP request logging middleware

### Chat Thumbs-Up System Improvements

- **Consistent Naming Convention**: Standardize naming for chat-related IDs across the system

  - Current issue: `chat_message_id` field is being used for conversation-level thumbs-ups, not message-level
  - Consider renaming to `conversation_id` or creating separate fields for message vs conversation thumbs-ups
  - Update database schema, API interfaces, and frontend components to use consistent terminology
  - This affects `ChatThumbsUpData` interface, database table, and `ThumbsUpButton` component

- **Thumbs-Up Removal Policy**: Clarify business requirements for thumbs-up removal functionality
  - Current implementation allows users to remove thumbs-ups they've given, which affects the "has helped X people" count
  - Need to discuss with business stakeholders whether this should be allowed or if thumbs-ups should be permanent
  - Consider implications: permanent recognition vs. ability to correct mistakes
  - If removal is disabled, update `ThumbsUpButton` component to remove the removal functionality
  - This affects user experience and the integrity of the "has helped" badge system
