import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

/**
 * TestModule - Shared testing module with common dependencies
 */
@Module({})
export class TestModule {
  static forRoot(): DynamicModule {
    return {
      module: TestModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-secret-key',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      exports: [ConfigModule, PassportModule, JwtModule],
    };
  }
}
