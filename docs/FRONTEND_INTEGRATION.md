# Frontend Integration with New Authentication API

This document describes the changes made to integrate the React frontend with the new hybrid authentication system.

## Overview

The frontend has been updated to use the new `/api/auth/register` and `/api/auth/login` endpoints instead of direct Firebase Auth calls. This provides a unified authentication experience with the hybrid Firebase + PostgreSQL system.

## Key Changes

### 1. **API Configuration (`src/api/index.ts`)**

- Added `API_BASE_URL` configuration
- Added `apiPostPublic()` function for unauthenticated requests
- Updated all API functions to use the backend base URL
- Added proper error handling for API responses

### 2. **Registration Flow (`src/screens/CreateAccountPage.tsx`)**

- **Before**: Used Firebase Auth directly + separate backend call
- **After**: Single API call to `/api/auth/register`
- **Form Structure**:
  ```typescript
  {
    email: string;           // Required
    password: string;        // Required
    full_name?: string;      // Optional
    visa_type?: string;      // Optional
    current_location?: {     // Optional
      city: string;
      state: string;
      country: string;
    };
    occupation?: string;     // Optional
    employer?: string;       // Optional
  }
  ```

### 3. **Login Flow (`src/screens/LoginScreen.tsx`)**

- **Before**: Used Firebase Auth directly
- **After**: API call to `/api/auth/login`
- **Request**: `{ email, password }`
- **Response**: `{ user, token }`

### 4. **Token Management**

- Tokens are stored in `localStorage` as `userToken`
- User data is stored as `userData` in JSON format
- All authenticated API calls include the token in Authorization header

## Environment Configuration

Create a `.env` file in the root directory:

```env
# Backend API URL
REACT_APP_API_URL=http://localhost:8080

# Firebase Configuration (if still needed)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

## API Endpoints Used

### Registration

```typescript
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "visa_type": "H1B",
  "current_location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "USA"
  },
  "occupation": "Software Engineer",
  "employer": "Tech Corp"
}
```

### Login

```typescript
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

## Response Format

Both endpoints return the same response structure:

```typescript
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "firebase-uid",
      "email": "user@example.com",
      "full_name": "John Doe"
    },
    "token": "firebase-jwt-token"
  }
}
```

## Error Handling

The frontend now handles API errors properly:

- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid credentials)
- **409**: Conflict (user already exists)
- **500**: Internal Server Error

Error messages are displayed to users in a user-friendly format.

## Benefits

✅ **Unified Authentication**: Single API for registration/login  
✅ **Better Error Handling**: Consistent error messages  
✅ **Simplified Frontend**: No direct Firebase Auth calls  
✅ **Progressive Profile Building**: Basic registration + detailed updates  
✅ **Token Management**: Automatic token storage and usage

## Testing

1. **Start the backend server**: `yarn dev` (from server directory)
2. **Start the frontend**: `yarn start` (from root directory)
3. **Test registration**: Navigate to `/create-account`
4. **Test login**: Navigate to `/login`

## Next Steps

1. **Profile Updates**: Implement detailed profile update forms
2. **Token Refresh**: Add automatic token refresh logic
3. **Protected Routes**: Update route protection to use new tokens
4. **Error Boundaries**: Add React error boundaries for better UX
