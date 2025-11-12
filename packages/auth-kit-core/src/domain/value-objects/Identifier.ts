import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { createHash } from 'crypto';

export type IdentifierType = 'phone' | 'email';

export interface IdentifierProps {
  value: string;
  type: IdentifierType;
}

/**
 * Value object representing a normalized user identifier (phone or email)
 */
export class Identifier {
  private readonly _value: string;
  private readonly _type: IdentifierType;
  private readonly _hash: string;

  private constructor(props: IdentifierProps) {
    this._value = props.value;
    this._type = props.type;
    this._hash = this.computeHash(props.value);
  }

  /**
   * Create an Identifier from a raw string
   * Automatically detects and normalizes phone numbers or emails
   */
  static create(input: string): Identifier {
    const trimmed = input.trim();

    // Try to parse as phone number first
    if (this.looksLikePhone(trimmed)) {
      return this.createPhone(trimmed);
    }

    // Otherwise treat as email
    return this.createEmail(trimmed);
  }

  /**
   * Create a phone identifier with E.164 normalization
   */
  static createPhone(phone: string): Identifier {
    try {
      if (!isValidPhoneNumber(phone)) {
        throw new Error('Invalid phone number format');
      }

      const parsed = parsePhoneNumber(phone);
      if (!parsed) {
        throw new Error('Could not parse phone number');
      }

      const normalized = parsed.format('E.164');
      return new Identifier({ value: normalized, type: 'phone' });
    } catch (error) {
      throw new Error(`Invalid phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create an email identifier with normalization
   */
  static createEmail(email: string): Identifier {
    const normalized = email.toLowerCase().trim();

    if (!this.isValidEmail(normalized)) {
      throw new Error('Invalid email format');
    }

    return new Identifier({ value: normalized, type: 'email' });
  }

  private static looksLikePhone(input: string): boolean {
    // Check if it starts with + or contains only digits and common phone chars
    return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}/.test(input);
  }

  private static isValidEmail(email: string): boolean {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private computeHash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  get value(): string {
    return this._value;
  }

  get type(): IdentifierType {
    return this._type;
  }

  get hash(): string {
    return this._hash;
  }

  isPhone(): boolean {
    return this._type === 'phone';
  }

  isEmail(): boolean {
    return this._type === 'email';
  }

  equals(other: Identifier): boolean {
    return this._value === other._value && this._type === other._type;
  }

  toString(): string {
    return this._value;
  }

  toJSON() {
    return {
      value: this._value,
      type: this._type,
      hash: this._hash,
    };
  }
}
