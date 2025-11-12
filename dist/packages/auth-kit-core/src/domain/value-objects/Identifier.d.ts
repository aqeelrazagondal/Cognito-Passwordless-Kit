export type IdentifierType = 'phone' | 'email';
export interface IdentifierProps {
    value: string;
    type: IdentifierType;
}
export declare class Identifier {
    private readonly _value;
    private readonly _type;
    private readonly _hash;
    private constructor();
    static create(input: string): Identifier;
    static createPhone(phone: string): Identifier;
    static createEmail(email: string): Identifier;
    private static looksLikePhone;
    private static isValidEmail;
    private computeHash;
    get value(): string;
    get type(): IdentifierType;
    get hash(): string;
    isPhone(): boolean;
    isEmail(): boolean;
    equals(other: Identifier): boolean;
    toString(): string;
    toJSON(): {
        value: string;
        type: IdentifierType;
        hash: string;
    };
}
