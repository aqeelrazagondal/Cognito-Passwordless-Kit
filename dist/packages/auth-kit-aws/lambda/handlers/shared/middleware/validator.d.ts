export declare function validateRequired<T extends Record<string, any>>(data: T, requiredFields: (keyof T)[]): void;
export declare function validateEmail(email: string): boolean;
export declare function validatePhone(phone: string): boolean;
export declare function validateIdentifier(identifier: string): void;
export declare function validateChannel(channel: string): void;
export declare function validateIntent(intent: string): void;
export declare function validateOtpCode(code: string): void;
export declare function validateLength(value: string, fieldName: string, min?: number, max?: number): void;
export declare function validateEnum<T extends string>(value: string, fieldName: string, allowedValues: readonly T[]): void;
