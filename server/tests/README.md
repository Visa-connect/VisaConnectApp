# Server Testing Suite

This directory contains comprehensive tests for the VisaConnect server, focusing on the chat functionality and related services.

## 🏗️ Test Structure

```
tests/
├── setup.ts                 # Global test configuration and mocks
├── services/                # Unit tests for service layer
│   └── chatService.test.ts # Chat service unit tests
├── api/                     # Unit tests for API endpoints
│   └── chat.test.ts        # Chat API endpoint tests
├── integration/             # Integration tests
│   └── chat.integration.test.ts # End-to-end chat flow tests
├── utils/                   # Test utilities and helpers
│   └── testHelpers.ts      # Common test functions and mock data
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- Yarn package manager
- All dependencies installed (`yarn install`)

### Running Tests

#### Run All Tests

```bash
yarn test
```

#### Run Tests in Watch Mode

```bash
yarn test:watch
```

#### Run Tests with Coverage Report

```bash
yarn test:coverage
```

#### Run Specific Test Categories

```bash
# Unit tests only
yarn test:unit

# Integration tests only
yarn test:integration

# Verbose output
yarn test:verbose
```

## 🧪 Test Categories

### 1. Unit Tests (`tests/services/`, `tests/api/`)

- **Purpose**: Test individual functions and methods in isolation
- **Scope**: Single service/component functionality
- **Mocking**: Heavy use of mocks for external dependencies
- **Speed**: Fast execution
- **Coverage**: High coverage of business logic

**Example**: Testing `chatService.createConversation()` method with mocked Firestore

### 2. Integration Tests (`tests/integration/`)

- **Purpose**: Test complete workflows and API interactions
- **Scope**: End-to-end functionality across multiple components
- **Mocking**: Minimal mocking, focus on component interaction
- **Speed**: Medium execution time
- **Coverage**: API contract validation and workflow testing

**Example**: Complete chat flow from conversation creation to message exchange

### 3. Test Utilities (`tests/utils/`)

- **Purpose**: Common test functions and mock data generation
- **Reusability**: Shared across different test files
- **Maintainability**: Centralized test data management

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)

- **Preset**: `ts-jest` for TypeScript support
- **Environment**: Node.js
- **Coverage**: HTML, LCOV, and text reports
- **Timeout**: 10 seconds per test
- **Setup**: Global test configuration in `tests/setup.ts`

### Environment Variables (`.env.test`)

- **NODE_ENV**: Set to 'test'
- **PORT**: Test server port (8081)
- **SUPPRESS_LOGS**: Option to suppress console output during tests

## 🎭 Mocking Strategy

### Firebase Admin SDK

- **Why Mock**: Firebase Admin requires service account credentials
- **What's Mocked**: All Firestore operations (collection, doc, add, get, etc.)
- **Benefits**: Fast tests, no external dependencies, predictable behavior

### Authentication Middleware

- **Why Mock**: Avoid complex token validation in tests
- **What's Mocked**: `authenticateUser` middleware
- **Benefits**: Focus on business logic, not auth complexity

### Database Operations

- **Why Mock**: Avoid test database setup and cleanup
- **What's Mocked**: PostgreSQL operations via `pg` package
- **Benefits**: Isolated tests, no data persistence issues

## 📊 Test Coverage

### Current Coverage Areas

- ✅ Chat service methods (100%)
- ✅ Chat API endpoints (100%)
- ✅ Input validation (100%)
- ✅ Error handling (100%)
- ✅ Authentication requirements (100%)

### Coverage Reports

After running `yarn test:coverage`, view the HTML report:

```bash
open coverage/lcov-report/index.html
```

## 🧪 Writing New Tests

### 1. Service Tests

```typescript
import { chatService } from '../../services/chatService';

describe('NewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should perform expected behavior', async () => {
    // Arrange
    const input = 'test input';

    // Act
    const result = await chatService.newMethod(input);

    // Assert
    expect(result).toBe('expected output');
  });
});
```

### 2. API Tests

```typescript
import request from 'supertest';
import { app } from '../../index';

describe('New API Endpoint', () => {
  it('should return expected response', async () => {
    const response = await request(app)
      .post('/api/new-endpoint')
      .send({ data: 'test' })
      .expect(201);

    expect(response.body.success).toBe(true);
  });
});
```

### 3. Integration Tests

```typescript
describe('New Feature Integration', () => {
  it('should handle complete workflow', async () => {
    // Test complete user journey
    // Multiple API calls
    // Data consistency verification
  });
});
```

## 🚨 Common Issues and Solutions

### 1. Mock Not Working

**Problem**: Mock function not being called as expected
**Solution**: Ensure `jest.clearAllMocks()` in `beforeEach`

### 2. TypeScript Errors

**Problem**: Type errors in test files
**Solution**: Check `tsconfig.json` includes test directory, ensure proper imports

### 3. Test Timeouts

**Problem**: Tests taking too long or timing out
**Solution**: Check for unhandled promises, increase timeout in `jest.config.js`

### 4. Mock Data Issues

**Problem**: Inconsistent mock data across tests
**Solution**: Use `TestDataFactory` from `tests/utils/testHelpers.ts`

## 📈 Performance Testing

### Load Testing

- **Message Volume**: Tests with 10+ messages per conversation
- **Concurrent Users**: Tests with multiple simultaneous users
- **Response Times**: Verify API response times remain acceptable

### Scalability Testing

- **Large Conversations**: Tests with 50+ messages
- **Multiple Conversations**: Tests with 10+ active conversations per user
- **Memory Usage**: Monitor for memory leaks during high-volume operations

## 🔍 Debugging Tests

### Verbose Output

```bash
yarn test:verbose
```

### Debug Specific Test

```bash
yarn test --testNamePattern="should create conversation"
```

### Debug with Console Logs

```bash
# Temporarily remove SUPPRESS_LOGS=true from .env.test
yarn test
```

## 📚 Best Practices

### 1. Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow AAA pattern: Arrange, Act, Assert

### 2. Mock Management

- Clear mocks before each test
- Use realistic mock data
- Verify mock calls when testing service interactions

### 3. Error Testing

- Test both success and failure scenarios
- Verify error messages and status codes
- Test edge cases and boundary conditions

### 4. Data Consistency

- Verify data integrity across operations
- Test concurrent access scenarios
- Validate business rules and constraints

## 🚀 Continuous Integration

### GitHub Actions Integration

Tests are automatically run in CI/CD pipeline:

- Unit tests run on every commit
- Integration tests run on pull requests
- Coverage reports are generated and tracked

### Pre-commit Hooks

Consider adding pre-commit hooks to run tests before commits:

```bash
# In package.json scripts
"precommit": "yarn test:unit"
```

## 📞 Support

For questions about the testing suite:

1. Check this README first
2. Review existing test examples
3. Check Jest documentation: https://jestjs.io/
4. Review TypeScript testing: https://jestjs.io/docs/getting-started#using-typescript

---

**Happy Testing! 🎉**
