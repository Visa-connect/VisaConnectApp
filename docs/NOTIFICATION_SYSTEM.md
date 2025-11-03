# In-App Notification System

## Overview

A comprehensive notification system that provides real-time updates to users for various interactions within the VisaConnect platform.

## Database Schema

### Notifications Table

```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    action_url VARCHAR(500),
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Key Features

- **Flexible Type System**: Supports multiple notification types
- **Rich Data Storage**: JSONB column for additional context
- **Action URLs**: Direct links to relevant pages
- **Read Tracking**: Timestamp-based read status
- **Performance Optimized**: Proper indexes for fast queries

## Notification Types

| Type                         | Description                  | Trigger                       |
| ---------------------------- | ---------------------------- | ----------------------------- |
| `job_applicant`              | New job application received | User applies to job           |
| `meetup_interest`            | Someone interested in meetup | User expresses interest       |
| `chat_message`               | New chat message received    | User sends message            |
| `meetup_updated`             | Meetup details changed       | Meetup creator updates meetup |
| `job_updated`                | Job posting updated          | Employer updates job          |
| `application_status_changed` | Application status updated   | Employer changes status       |
| `meetup_reminder`            | Upcoming meetup reminder     | Scheduled reminder            |
| `system_announcement`        | Platform-wide announcements  | Admin creates announcement    |

## API Endpoints

### Get Notifications

```
GET /api/notifications
Query Parameters:
- type: Filter by notification type
- read: Filter by read status (true/false)
- limit: Number of notifications (default: 20)
- offset: Pagination offset (default: 0)
- order_by: Sort field (created_at/read_at)
- order_direction: Sort direction (ASC/DESC)
```

### Get Notification Statistics

```
GET /api/notifications/stats
Returns: total, unread, by_type counts
```

### Get Unread Count

```
GET /api/notifications/unread-count
Returns: { unreadCount: number }
```

### Mark as Read

```
PUT /api/notifications/:id/read
Marks specific notification as read
```

### Mark All as Read

```
PUT /api/notifications/mark-all-read
Marks all user notifications as read
```

### Delete Notification

```
DELETE /api/notifications/:id
Removes notification from user's list
```

## Implementation Status

### ✅ Completed

- [x] Database migration with proper indexes
- [x] Notification service with CRUD operations
- [x] API endpoints for all operations
- [x] Job application notifications
- [x] Meetup interest notifications
- [x] Chat message notifications
- [x] Meetup update notifications
- [x] Type definitions and interfaces

### 🔄 In Progress

- [ ] Real-time WebSocket delivery

### 📋 Pending

- [ ] Frontend notification components
- [ ] Notification preferences
- [ ] Batch operations
- [ ] Notification cleanup job
- [ ] Email/SMS integration (optional)

## Usage Examples

### Creating a Job Application Notification

```typescript
await notificationService.createJobApplicationNotification(
  employerId,
  applicantName,
  jobTitle,
  jobId,
  applicationId
);
```

### Getting User Notifications

```typescript
const notifications = await notificationService.getNotifications({
  user_id: userId,
  read: false,
  limit: 10,
});
```

### Marking as Read

```typescript
await notificationService.markAsRead(notificationId, userId);
```

## Recommendations

### 1. **Real-time Delivery**

- Integrate with existing WebSocket service
- Send notifications immediately when created
- Update unread counts in real-time

### 2. **User Preferences**

- Allow users to disable certain notification types
- Set frequency preferences (immediate, daily digest, weekly)
- Channel preferences (in-app, email, SMS)

### 3. **Performance Optimizations**

- Implement notification batching for high-volume scenarios
- Add database cleanup job for old notifications
- Consider Redis caching for unread counts

### 4. **Enhanced Features**

- Rich notification templates with images
- Notification actions (quick reply, accept/decline)
- Notification history and search
- Push notifications for mobile apps

### 5. **Monitoring & Analytics**

- Track notification open rates
- Monitor notification delivery success
- A/B test notification content and timing

## Security Considerations

- ✅ User isolation (users can only access their own notifications)
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention with parameterized queries
- ✅ Rate limiting on notification creation
- ✅ Audit logging for sensitive operations

## Migration Instructions

1. **Run the database migration**:

   ```bash
   cd server
   npm run migrate
   ```

2. **Update existing services** to trigger notifications:

   - Job applications (✅ completed)
   - Meetup interactions (✅ completed)
   - Chat messages (✅ completed)

3. **Test the API endpoints**:

   ```bash
   # Get notifications
   curl -H "Authorization: Bearer <token>" \
        http://localhost:8080/api/notifications

   # Get unread count
   curl -H "Authorization: Bearer <token>" \
        http://localhost:8080/api/notifications/unread-count
   ```

## Next Steps

1. **Frontend Integration**: Create notification components and UI
2. **WebSocket Integration**: Add real-time delivery
3. **Testing**: Add comprehensive test coverage
4. **Documentation**: Update API documentation
5. **Performance Optimization**: Add caching and batch operations
6. **User Preferences**: Implement notification settings

---

**Note**: This system is designed to be extensible and can easily accommodate new notification types and features as the platform grows.
