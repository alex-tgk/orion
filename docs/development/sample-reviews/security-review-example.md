# Sample Security Review Report

## PR #123: Add User Authentication Endpoint

### Summary

Found 3 security issues in authentication implementation. One critical issue must be fixed before merge.

### Issues Found

#### 🚨 Critical: Hardcoded JWT Secret

**File:** `src/auth/auth.service.ts` (Line 15)

**Category:** Security

**Description:** JWT secret key is hardcoded in the source code. This is a critical security vulnerability as it exposes the secret to anyone with access to the repository.

```typescript
// Current code
const JWT_SECRET = 'my-super-secret-key-123456';
```

**Recommendation:** Use environment variables for secrets and store them in secure secret management.

**Suggested Fix:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

**CWE:** CWE-798 (Use of Hard-coded Credentials)

---

#### ⚠️ High: Missing Input Validation

**File:** `src/auth/dto/login.dto.ts` (Line 8)

**Category:** Security

**Description:** Email input lacks proper validation. Missing email format validation and sanitization.

```typescript
export class LoginDto {
  email: string;  // Missing validation
  password: string;
}
```

**Recommendation:** Add validation decorators to ensure email format and prevent injection attacks.

**Suggested Fix:**
```typescript
import { IsEmail, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @MinLength(8)
  @MaxLength(100)
  password: string;
}
```

---

#### 💡 Medium: Weak Password Hash

**File:** `src/auth/auth.service.ts` (Line 45)

**Category:** Security

**Description:** Using MD5 for password hashing. MD5 is cryptographically broken and should not be used for passwords.

```typescript
const hash = crypto.createHash('md5').update(password).digest('hex');
```

**Recommendation:** Use bcrypt with appropriate salt rounds (10-12).

**Suggested Fix:**
```typescript
import * as bcrypt from 'bcrypt';

const saltRounds = 12;
const hash = await bcrypt.hash(password, saltRounds);
```

---

### Metrics

| Metric | Value |
|--------|-------|
| Security Score | 45/100 |
| Critical Issues | 1 |
| High Issues | 1 |
| Medium Issues | 1 |

### Recommendation

**🔴 REQUEST CHANGES** - Critical security issues must be addressed before merge.
