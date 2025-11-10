# SpecKit Execution Logs

This directory contains execution logs for SpecKit commands (`/speckit.specify`, `/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`).

## Log File: `speckit.log`

The `speckit.log` file contains structured JSON log entries for each SpecKit command execution, including:

- Timestamp
- Command type (specify, clarify, plan, tasks)
- Branch name
- Feature number
- User/actor information
- Execution metadata (duration, success/failure)
- Error details (if any)

## Log Rotation

Logs are rotated weekly to prevent excessive disk usage. The rotation process:

1. **Automatic Rotation**: Run `yarn speckit:logs:rotate` weekly (or set up a cron job)
2. **Rotation Behavior**:
   - Archives current `speckit.log` to `speckit-YYYY-MM-DD.log`
   - Creates a new empty `speckit.log` file
   - Keeps the last 12 weeks of logs (3 months)
   - Older logs are automatically deleted

## Manual Rotation

To manually rotate logs:

```bash
yarn speckit:logs:rotate
```

Or use the script directly:

```bash
node .specify/scripts/lib/rotateLogs.js
```

## Log Retention Policy

- **Active Log**: `speckit.log` (current week)
- **Archived Logs**: `speckit-YYYY-MM-DD.log` (last 12 weeks)
- **Auto-cleanup**: Logs older than 12 weeks are automatically deleted during rotation

## Log Format

Each log entry is a JSON object with the following structure:

```json
{
  "timestamp": "2025-01-27T10:30:00.000Z",
  "command": "specify",
  "branch": "001-spec-prompt",
  "featureNum": "001",
  "user": "arron",
  "duration": 1234,
  "success": true,
  "metadata": {
    "featureDescription": "Create specification prompt generator",
    "specFile": "/path/to/spec.md"
  }
}
```

## CI Integration

CI workflows automatically upload log files as artifacts for audit and debugging purposes. Logs are attached to workflow runs and can be downloaded from the GitHub Actions UI.

## Security & Privacy

- Logs may contain feature descriptions and branch names
- Sensitive information (passwords, tokens) is automatically redacted
- Logs are stored in the repository and should not contain production secrets
- Review logs before committing to ensure no sensitive data is included

## Troubleshooting

- **Log file too large**: Run rotation manually or check if automatic rotation is configured
- **Missing logs**: Verify that logging is enabled in SpecKit scripts
- **Permission errors**: Ensure write permissions for the `specs/logs/` directory
