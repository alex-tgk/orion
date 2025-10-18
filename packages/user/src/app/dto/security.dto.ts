import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

// Password Change DTOs
export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password', example: 'oldPassword123!' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ description: 'New password', example: 'newPassword456!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain uppercase, lowercase, number and special character' }
  )
  newPassword: string;

  @ApiProperty({ description: 'Confirm new password', example: 'newPassword456!' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class ResetPasswordRequestDto {
  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'New password', example: 'newPassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain uppercase, lowercase, number and special character' }
  )
  newPassword: string;

  @ApiProperty({ description: 'Confirm new password', example: 'newPassword123!' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

// Email Verification DTOs
export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class RequestEmailVerificationDto {
  @ApiProperty({ description: 'New email address to verify', example: 'newemail@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class EmailVerificationResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiPropertyOptional({ description: 'Verification token expiry' })
  expiresAt?: Date;
}

// Two-Factor Authentication DTOs
export class TwoFactorAuthDto {
  @ApiProperty({ description: 'Whether 2FA is enabled', example: true })
  @IsBoolean()
  isEnabled: boolean;

  @ApiPropertyOptional({ description: 'QR code data URL for setup' })
  qrCodeUrl?: string;

  @ApiPropertyOptional({ description: 'Secret key for manual entry' })
  secret?: string;

  @ApiPropertyOptional({ description: 'Backup codes', type: [String] })
  backupCodes?: string[];
}

export class Enable2FADto {
  @ApiProperty({ description: 'TOTP code from authenticator app', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

export class Disable2FADto {
  @ApiProperty({ description: 'Current password for verification', example: 'myPassword123!' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: 'TOTP code from authenticator app (if 2FA is enabled)', example: '123456' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code?: string;
}

export class Verify2FADto {
  @ApiProperty({ description: 'TOTP code from authenticator app', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

export class RegenerateBackupCodesDto {
  @ApiProperty({ description: 'Current password for verification', example: 'myPassword123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class BackupCodesResponseDto {
  @ApiProperty({ description: 'Generated backup codes', type: [String] })
  backupCodes: string[];

  @ApiProperty({ description: 'Warning message about storing codes securely' })
  message: string;
}

// Account Security Status
export class AccountSecurityDto {
  @ApiProperty({ description: 'Whether 2FA is enabled', example: true })
  @IsBoolean()
  twoFactorEnabled: boolean;

  @ApiProperty({ description: 'Whether email is verified', example: true })
  @IsBoolean()
  emailVerified: boolean;

  @ApiProperty({ description: 'Number of active sessions', example: 3 })
  activeSessions: number;

  @ApiProperty({ description: 'Last password change date' })
  @IsOptional()
  lastPasswordChange?: Date;

  @ApiProperty({ description: 'Account creation date' })
  accountCreatedAt: Date;
}
