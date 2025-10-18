import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { FEATURE_FLAG_KEY, FeatureFlagOptions } from '../decorators/feature-flag.decorator';
import { IFlagEvaluationContext } from '../interfaces/feature-flag.interface';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  private readonly logger = new Logger(FeatureFlagGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly flagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<FeatureFlagOptions>(
      FEATURE_FLAG_KEY,
      context.getHandler(),
    );

    if (!options) {
      // No feature flag decorator, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Build evaluation context
    const evaluationContext = this.buildContext(request, options);

    try {
      const result = await this.flagsService.evaluate(
        options.key,
        evaluationContext,
      );

      if (!result.enabled) {
        this.logger.warn(
          `Feature flag '${options.key}' blocked access: ${result.reason}`,
        );

        if (options.fallback !== undefined) {
          return options.fallback;
        }

        throw new ForbiddenException(
          `Feature '${options.key}' is not enabled for this request`,
        );
      }

      // Attach flag result to request for later use
      request.featureFlag = {
        key: options.key,
        result,
      };

      return true;
    } catch (error) {
      this.logger.error(
        `Error evaluating feature flag '${options.key}':`,
        error,
      );

      // Use fallback behavior on error
      if (options.fallback !== undefined) {
        return options.fallback;
      }

      throw new ForbiddenException(
        `Unable to evaluate feature flag '${options.key}'`,
      );
    }
  }

  private buildContext(
    request: any,
    options: FeatureFlagOptions,
  ): IFlagEvaluationContext {
    // Use custom extractor if provided
    if (options.context?.customExtractor) {
      return options.context.customExtractor(request);
    }

    // Extract user info from request
    const user = request.user || {};
    const userId =
      options.context?.userIdParam && request.params
        ? request.params[options.context.userIdParam]
        : user.id || user.sub;

    return {
      userId,
      userRoles: user.roles || [],
      userEmail: user.email,
      organizationId: user.organizationId,
      groups: user.groups || [],
      customAttributes: {
        ip: request.ip,
        userAgent: request.headers?.['user-agent'],
        ...user.customAttributes,
      },
    };
  }
}
