/**
 * Custom error types and error codes for the VisaConnect application
 */

export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Meetup errors
  MEETUP_NOT_FOUND = 'MEETUP_NOT_FOUND',
  MEETUP_ALREADY_INTERESTED = 'MEETUP_ALREADY_INTERESTED',
  MEETUP_NOT_INTERESTED = 'MEETUP_NOT_INTERESTED',
  MEETUP_ACCESS_DENIED = 'MEETUP_ACCESS_DENIED',
  MEETUP_VALIDATION_ERROR = 'MEETUP_VALIDATION_ERROR',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',

  // File upload errors
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',

  // General errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INVALID_INPUT = 'INVALID_INPUT',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes for common scenarios
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.VALIDATION_ERROR, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, ErrorCode.NOT_FOUND, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, ErrorCode.UNAUTHORIZED, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, ErrorCode.MEETUP_ACCESS_DENIED, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.DUPLICATE_ENTRY) {
    super(message, code, 409);
  }
}

export class DatabaseError extends AppError {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message, ErrorCode.DATABASE_ERROR, 500);
    this.originalError = originalError;
  }
}

// Meetup-specific errors
export class MeetupNotFoundError extends NotFoundError {
  constructor() {
    super('Meetup');
  }
}

export class AlreadyInterestedError extends ConflictError {
  constructor() {
    super(
      'You have already expressed interest in this meetup',
      ErrorCode.MEETUP_ALREADY_INTERESTED
    );
  }
}

export class NotInterestedError extends ConflictError {
  constructor() {
    super(
      'You have not expressed interest in this meetup',
      ErrorCode.MEETUP_NOT_INTERESTED
    );
  }
}

export class MeetupAccessDeniedError extends ForbiddenError {
  constructor() {
    super('You do not have permission to perform this action on this meetup');
  }
}
