import { ApiResponse } from '@/types';

export const successResponse = <T = any>(
  message: string,
  data?: T,
  statusCode: number = 200
): { response: ApiResponse<T>; statusCode: number } => {
  return {
    response: {
      success: true,
      message,
      data,
    },
    statusCode,
  };
};

export const errorResponse = (
  message: string,
  error?: string,
  statusCode: number = 500
): { response: ApiResponse; statusCode: number } => {
  return {
    response: {
      success: false,
      message,
      error,
    },
    statusCode,
  };
};

export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.details?.[0]?.message) return error.details[0].message;
  return 'An unexpected error occurred';
};
