export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    name: string;
    errors?: Record<
      string,
      {
        message: string;
        name: string;
        properties: {
          message: string;
          type: string;
          [key: string]: any;
        };
        kind: string;
        path: string;
        value: any;
      }
    >;
  };
}
