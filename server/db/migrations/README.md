# Database Migrations

This directory contains database migration files that are applied in order to update the database schema.

## Migration Strategy

We use a **simple, lightweight migration system** that:

- Tracks applied migrations in a `migrations` table
- Runs migrations in alphabetical order
- Is idempotent (safe to run multiple times)
- Works perfectly with Heroku deployment

## File Naming Convention

Migration files should be named with a **date-time prefix** to ensure proper ordering:

**Format**: `YYYYMMDDHHMMSS_description.sql`

- `20250101000000_initial_schema.sql`
- `20250101000001_add_business_submission_fields.sql`
- `20250101000002_another_change.sql`

The date-time format ensures:

- **Automatic ordering** - migrations run in chronological order
- **No conflicts** - each migration has a unique timestamp
- **Clear history** - easy to see when migrations were created

## Running Migrations

### Local Development

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Dry run (see what would be applied)
npm run migrate:dry-run
```

### Heroku Deployment

Migrations run automatically during deployment via the `release` phase in `Procfile`.

You can also run migrations manually on Heroku:

```bash
heroku run "cd server && npm run migrate"
```

## Creating New Migrations

### Option 1: Use the Helper Script (Recommended)

```bash
# From the server directory
node scripts/create-migration.js "description_of_migration"
```

This will create a new migration file with the current timestamp:

- `20250103143025_description_of_migration.sql`

### Option 2: Manual Creation

1. Create a new `.sql` file in this directory
2. Use the naming convention: `YYYYMMDDHHMMSS_description.sql`
   - Use current date/time: `date +%Y%m%d%H%M%S` (e.g., `20241203143025`)
   - Add a descriptive name: `20241203143025_add_new_feature.sql`
3. Write your SQL changes
4. Test locally with `npm run migrate:dry-run`
5. Commit and deploy

**Example:**

```bash
# Get current timestamp
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Create migration file
touch server/db/migrations/${TIMESTAMP}_add_new_column.sql
```

## Migration Best Practices

- **Always use `IF NOT EXISTS`** for new tables/columns
- **Use `ALTER TABLE`** for schema changes
- **Include rollback information** in comments
- **Test migrations** before deploying
- **Keep migrations small** and focused

## Example Migration

```sql
-- 20250101000001_add_business_submission_fields.sql
-- Add fields needed for business submission functionality

-- Add new columns to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS year_formed INTEGER,
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS logo_public_id VARCHAR(255);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_submitted_at ON businesses(submitted_at);
```

## Troubleshooting

### Migration Fails

- Check the error message in the console
- Verify your SQL syntax
- Ensure the migration is idempotent
- Test locally first

### Heroku Issues

- Check Heroku logs: `heroku logs --tail`
- Run migrations manually: `heroku run "cd server && npm run migrate"`
- Verify environment variables are set

### Rollback

Currently, this system doesn't support automatic rollbacks. If you need to rollback:

1. Create a new migration that reverses the changes
2. Or manually fix the database and update the migrations table
