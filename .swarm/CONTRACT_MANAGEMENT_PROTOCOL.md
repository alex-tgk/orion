# Contract Management Protocol

## Overview

This document defines the strict protocol for managing API contracts and shared types in the Orion microservices platform. The Contract Owner (Workstream 6) has exclusive authority over these files to prevent conflicts and ensure consistency.

---

## Contract Ownership

### Exclusive Write Access
**Only the Contract Owner can modify these files:**
- `/packages/shared/src/contracts/**/*.ts`
- `/packages/shared/src/events/**/*.ts`
- `/packages/shared/src/index.ts` (exports section)

**All other workstreams have READ-ONLY access.**

---

## Change Request Process

### 1. Submitting a Contract Change Request

Create a GitHub issue with the following:

**Title Format**: `[Contract Change] [Service] - [Brief Description]`

**Labels**: `contract-change`, `[service-name]`

**Template**:
```markdown
## Contract Change Request

### Service
[Auth / User / Notification / etc.]

### Type of Change
- [ ] New interface/type
- [ ] Modify existing interface
- [ ] Add new endpoint definition
- [ ] Add new event type
- [ ] Breaking change

### Current Contract
\`\`\`typescript
// Show current interface/type if modifying
\`\`\`

### Proposed Contract
\`\`\`typescript
// Show proposed interface/type
\`\`\`

### Rationale
[Explain why this change is needed]

### Services Affected
- [ ] Auth Service
- [ ] User Service
- [ ] Notification Service
- [ ] Gateway
- [ ] Admin UI
- [ ] Other: ___________

### Breaking Change Analysis
**Is this a breaking change?** [Yes/No]

**If yes:**
- Existing endpoints affected: [List]
- Migration strategy: [Describe]
- Deprecation timeline: [If applicable]

### Backward Compatibility
**Is this backward compatible?** [Yes/No]

**If no:**
- Version bump required: [major/minor/patch]
- Transition plan: [Describe]

### Urgency
- [ ] Blocking - Prevents progress
- [ ] High - Needed within 24 hours
- [ ] Medium - Needed within 3 days
- [ ] Low - Nice to have
```

---

### 2. Review Process

**SLA**: Contract Owner reviews within **24 hours** on business days.

**Contract Owner Responsibilities**:
1. Review technical correctness
2. Check for naming consistency
3. Verify TypeScript best practices
4. Assess impact on existing contracts
5. Consider versioning strategy
6. Evaluate backward compatibility

**Approval Criteria**:
- ✅ Follows TypeScript best practices
- ✅ Consistent naming conventions
- ✅ Properly documented with JSDoc
- ✅ Doesn't conflict with existing contracts
- ✅ Versioning strategy clear (if breaking)
- ✅ All affected services identified

---

### 3. Implementation by Contract Owner

Once approved, the Contract Owner:

1. **Creates feature branch**: `contract/[service]-[description]`
   ```bash
   git checkout -b contract/user-add-preferences
   ```

2. **Implements changes** in `/packages/shared/src/`

3. **Updates exports** in `/packages/shared/src/index.ts`

4. **Adds JSDoc documentation**:
   ```typescript
   /**
    * User Profile Response
    *
    * Returned by GET /api/v1/users/:id
    *
    * @since 1.0.0
    */
   export interface UserProfile {
     id: string;
     email: string;
     name: string;
     /** @since 1.1.0 */
     avatar?: string;
   }
   ```

5. **Updates CHANGELOG** in `/packages/shared/CHANGELOG.md`

6. **Runs validation**:
   ```bash
   pnpm type-check
   pnpm lint
   pnpm build
   ```

7. **Creates PR** with format: `[Shared] Contract: [Description]`

8. **Tags affected service owners** as reviewers

---

### 4. Notification Process

After merge, Contract Owner notifies affected teams via:

**Slack/Discord Message**:
```
🔔 Contract Update: [Brief Description]

**Changes**:
- [Change 1]
- [Change 2]

**Services Affected**: @auth-team @user-team @gateway-team

**Action Required**:
- Update imports from @orion/shared
- Implement new interfaces
- Update DTOs to match contract

**PR**: [Link]
**Documentation**: [Link]

**Questions?** Reply in thread or DM @contract-owner
```

**GitHub Comment** on related issues:
Link to the merged PR and notify issue creator

---

## Contract Versioning Strategy

### Semantic Versioning for Contracts

**Major Version** (Breaking Changes):
- Removing fields from interfaces
- Changing field types (e.g., string → number)
- Renaming interfaces or fields
- Changing endpoint URLs

**Minor Version** (Backward Compatible Additions):
- Adding new optional fields
- Adding new interfaces
- Adding new event types
- Adding new endpoints

**Patch Version** (Documentation/Fixes):
- JSDoc updates
- Type refinements that don't change runtime behavior
- Fixing typos in comments

---

### Version Tracking

Track versions in `/packages/shared/package.json`:

```json
{
  "name": "@orion/shared",
  "version": "1.2.0",
  "description": "Shared contracts and types for Orion microservices"
}
```

Update CHANGELOG:
```markdown
# Changelog - @orion/shared

## [1.2.0] - 2025-10-18

### Added
- UserPreferences interface
- USER_PREFERENCES_UPDATED event type

### Changed
- UserProfile: Added optional avatar field

### Deprecated
- None

### Removed
- None

### Breaking Changes
- None
```

---

## Contract Standards

### Interface Naming Conventions

```typescript
// ✅ Good: Clear, descriptive names
export interface UserProfile { }
export interface UserPreferences { }
export interface NotificationSettings { }

// ❌ Bad: Ambiguous or too short
export interface User { }  // Too generic
export interface UP { }    // Abbreviation unclear
export interface Data { }  // Not descriptive
```

---

### Field Naming Conventions

```typescript
// ✅ Good: camelCase, descriptive
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  createdAt: Date;
}

// ❌ Bad: Inconsistent or unclear
export interface UserProfile {
  ID: string;          // Should be camelCase
  first_name: string;  // Should be camelCase, not snake_case
  email: string;       // Ambiguous - email address or email boolean?
  created: Date;       // Incomplete - createdAt is clearer
}
```

---

### Type Safety

```typescript
// ✅ Good: Explicit types, no any
export interface SendNotificationRequest {
  userId: string;
  type: NotificationType;  // Enum or union type
  data: Record<string, unknown>;  // Use unknown instead of any
}

export type NotificationType = 'email' | 'sms' | 'push';

// ❌ Bad: Using any
export interface SendNotificationRequest {
  userId: string;
  type: any;
  data: any;
}
```

---

### Optional vs Required Fields

```typescript
// ✅ Good: Clear optionality
export interface UserProfile {
  // Required fields (core identity)
  id: string;
  email: string;
  name: string;

  // Optional fields (user may not provide)
  avatar?: string;
  bio?: string;
  location?: string;
}

// Document when fields became optional
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  /** @since 1.1.0 - Optional field added */
  avatar?: string;
}
```

---

### Endpoint Definitions

```typescript
// ✅ Good: Const assertion, descriptive keys
export const USER_SERVICE_ENDPOINTS = {
  GET_USER: '/api/v1/users/:id',
  GET_CURRENT_USER: '/api/v1/users/me',
  UPDATE_USER: '/api/v1/users/:id',
  SEARCH_USERS: '/api/v1/users/search',
} as const;

// ❌ Bad: No const assertion, unclear keys
export const ENDPOINTS = {
  USER: '/users/:id',
  CURRENT: '/users/me',
};
```

---

### Event Definitions

```typescript
// ✅ Good: Consistent structure, metadata
export interface UserCreatedEvent {
  eventId: string;        // Every event has unique ID
  userId: string;         // Entity ID
  email: string;          // Relevant data
  name: string;
  createdAt: Date;        // Timestamp
}

export const USER_EVENT_PATTERNS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
} as const;

// ❌ Bad: Inconsistent structure
export interface UserEvent {
  user: any;
  action: string;
}
```

---

## Emergency Changes

### When Immediate Changes Are Needed

**Criteria for Emergency**:
- Production bug affecting users
- Security vulnerability
- Data corruption risk
- Service outage

**Emergency Process**:
1. Contract Owner creates branch immediately
2. Implements fix
3. Notifies affected teams in Slack with `@channel`
4. Creates PR with label `emergency`
5. Requires only 1 approval (instead of usual 2)
6. Merges and deploys
7. Post-mortem documentation within 24 hours

---

## Contract Validation Tools

### Automated Validation

```bash
# Run TypeScript compiler
pnpm type-check

# Lint contracts
pnpm lint

# Validate contract schemas (custom script)
pnpm spec:validate
```

### Pre-commit Validation

Contracts are validated on every commit via Husky:
```bash
# .husky/pre-commit
pnpm lint-staged
```

### CI/CD Validation

GitHub Actions runs on every PR:
- TypeScript compilation
- ESLint
- Contract schema validation
- Import path verification

---

## Contract Documentation

### JSDoc Requirements

All exported interfaces must have JSDoc:

```typescript
/**
 * User Profile Response
 *
 * Complete user profile information returned by the User Service.
 *
 * @example
 * ```typescript
 * const profile: UserProfile = {
 *   id: 'usr_123',
 *   email: 'john@example.com',
 *   name: 'John Doe',
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 * ```
 *
 * @see GET /api/v1/users/:id
 * @see GET /api/v1/users/me
 * @since 1.0.0
 */
export interface UserProfile {
  /** Unique user identifier */
  id: string;

  /** User's email address (unique) */
  email: string;

  /** User's display name */
  name: string;

  /**
   * User's avatar URL
   * @since 1.1.0
   */
  avatar?: string;

  /** Profile creation timestamp */
  createdAt: Date;

  /** Last profile update timestamp */
  updatedAt: Date;
}
```

---

## Migration Strategies

### Adding Optional Fields (Non-Breaking)

**Before**:
```typescript
export interface UserProfile {
  id: string;
  email: string;
  name: string;
}
```

**After**:
```typescript
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  /** @since 1.1.0 */
  avatar?: string;
}
```

**Migration**: None needed - backward compatible

---

### Changing Required Fields (Breaking)

**Before**:
```typescript
export interface CreateUserRequest {
  email: string;
  name: string;
}
```

**After** (Breaking - need versioning):
```typescript
// v2 contract
export interface CreateUserRequestV2 {
  email: string;
  firstName: string;  // Breaking: was 'name'
  lastName: string;   // Breaking: new required field
}

// Keep v1 for backward compatibility
/** @deprecated Use CreateUserRequestV2 */
export interface CreateUserRequest {
  email: string;
  name: string;
}
```

**Migration**:
1. Backend implements both v1 and v2 endpoints
2. Gateway routes v1 to legacy handler, v2 to new handler
3. Clients migrate at their own pace
4. Deprecate v1 after migration period (e.g., 3 months)

---

## Conflict Prevention Checklist

Before modifying shared contracts, ensure:

- [ ] Change request approved by Contract Owner
- [ ] All affected services identified
- [ ] Backward compatibility assessed
- [ ] Migration plan documented (if breaking)
- [ ] JSDoc comments added/updated
- [ ] CHANGELOG updated
- [ ] Version bumped appropriately
- [ ] TypeScript compilation passes
- [ ] ESLint passes
- [ ] Affected teams notified

---

## FAQs

**Q: Can I create a temporary contract in my service?**
A: Yes, but it should be migrated to shared contracts before production. Use your service's `/dto` directory for temporary DTOs.

**Q: What if I need a contract change urgently?**
A: Post in `#orion-dev-coordination` with `@contract-owner` and explain urgency. Contract Owner will prioritize.

**Q: Can I propose multiple changes in one request?**
A: Prefer one logical change per request, but related changes can be grouped (e.g., adding an interface + its event definition).

**Q: What if two services need different versions of the same contract?**
A: Use versioned interfaces (e.g., `UserProfileV1`, `UserProfileV2`) and document migration timeline.

**Q: How do I test contract changes locally?**
A: Link the shared package: `cd packages/shared && pnpm link` then `cd packages/[service] && pnpm link @orion/shared`

---

## Contact

**Contract Owner**: [Workstream 6 Lead]
**Slack**: `@contract-owner`
**GitHub**: Tag in issues with `@contract-owner` label
**Email**: contracts@orion.dev (for urgent matters)

---

**Last Updated**: 2025-10-18
**Version**: 1.0
