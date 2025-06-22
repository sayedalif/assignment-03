import { ApiErrorResponse, ApiSuccessResponse } from '../types/types';
import { z } from 'zod';

// Success response utility
export function ApiResponse<T>(
  message: string,
  data: T
): ApiSuccessResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

// Error response utilities
export function createValidationError(
  message: string = 'Validation failed',
  errors: Record<string, any> = {}
): ApiErrorResponse {
  return {
    success: false,
    message,
    error: {
      name: 'ValidationError',
      errors,
    },
  };
}

export function createFieldError(
  field: string,
  message: string,
  kind: string,
  value: any,
  properties: Record<string, any> = {}
) {
  return {
    [field]: {
      message,
      name: 'ValidatorError',
      properties: {
        message,
        type: kind,
        ...properties,
      },
      kind,
      path: field,
      value,
    },
  };
}

// Convert Zod errors to the generic format
export function convertZodError(zodError: z.ZodError): ApiErrorResponse {
  const errors: Record<string, any> = {};

  zodError.issues.forEach(issue => {
    const field = issue.path.join('.');
    const kind = issue.code;
    let properties: Record<string, any> = {
      message: issue.message,
      type: kind,
    };

    // Add specific properties based on validation type
    switch (issue.code) {
      case 'too_small':
        if (issue.type === 'number') {
          properties.min = issue.minimum;
        } else if (issue.type === 'string') {
          properties.minLength = issue.minimum;
        }
        break;
      case 'too_big':
        if (issue.type === 'number') {
          properties.max = issue.maximum;
        } else if (issue.type === 'string') {
          properties.maxLength = issue.maximum;
        }
        break;
      case 'invalid_enum_value':
        properties.enum = issue.options;
        break;
    }

    errors[field] = {
      message: issue.message,
      name: 'ValidatorError',
      properties,
      kind,
      path: field,
      value: (issue as any).received || null,
    };
  });

  return createValidationError('Validation failed', errors);
}

// Generic error response utility
export function createGenericError(
  message: string,
  name: string = 'Error'
): ApiErrorResponse {
  return {
    success: false,
    message,
    error: {
      name,
    },
  };
}
