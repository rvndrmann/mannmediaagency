
// This file contains type definitions to prevent infinite recursion errors

declare type GenericRecord = Record<string, any>;

// Limit the depth of recursive types
declare interface LimitedDepthObject {
  [key: string]: string | number | boolean | null | undefined | LimitedDepthObject[];
}

// Type to use when dealing with deeply nested objects that might cause infinite recursion
declare type SafeAny = any;

// Use this for message types that might be incompatible between components
declare interface AnyMessage {
  role: string;
  content: string;
  [key: string]: any;
}

// Use for API responses that have complex structures
declare type ApiResponse = GenericRecord;
