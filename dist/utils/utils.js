"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = ApiResponse;
exports.createValidationError = createValidationError;
exports.createFieldError = createFieldError;
exports.convertZodError = convertZodError;
exports.createGenericError = createGenericError;
// Success response utility
function ApiResponse(message, data) {
    return {
        success: true,
        message,
        data,
    };
}
// Error response utilities
function createValidationError(message = 'Validation failed', errors = {}) {
    return {
        success: false,
        message,
        error: {
            name: 'ValidationError',
            errors,
        },
    };
}
function createFieldError(field, message, kind, value, properties = {}) {
    return {
        [field]: {
            message,
            name: 'ValidatorError',
            properties: Object.assign({ message, type: kind }, properties),
            kind,
            path: field,
            value,
        },
    };
}
// Convert Zod errors to the generic format
function convertZodError(zodError) {
    const errors = {};
    zodError.issues.forEach(issue => {
        const field = issue.path.join('.');
        const kind = issue.code;
        let properties = {
            message: issue.message,
            type: kind,
        };
        // Add specific properties based on validation type
        switch (issue.code) {
            case 'too_small':
                if (issue.type === 'number') {
                    properties.min = issue.minimum;
                }
                else if (issue.type === 'string') {
                    properties.minLength = issue.minimum;
                }
                break;
            case 'too_big':
                if (issue.type === 'number') {
                    properties.max = issue.maximum;
                }
                else if (issue.type === 'string') {
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
            value: issue.received || null,
        };
    });
    return createValidationError('Validation failed', errors);
}
// Generic error response utility
function createGenericError(message, name = 'Error') {
    return {
        success: false,
        message,
        error: {
            name,
        },
    };
}
