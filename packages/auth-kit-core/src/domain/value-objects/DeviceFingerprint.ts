import { createHash } from 'crypto';
import { nanoid } from 'nanoid';

export interface DeviceFingerprintProps {
  userAgent: string;
  platform: string;
  timezone: string;
  language?: string;
  screenResolution?: string;
  entropy?: string;
}

/**
 * Value object representing a device fingerprint
 * Used for device binding and recognition
 */
export class DeviceFingerprint {
  private readonly _id: string;
  private readonly _hash: string;
  private readonly _props: DeviceFingerprintProps;

  private constructor(id: string, hash: string, props: DeviceFingerprintProps) {
    this._id = id;
    this._hash = hash;
    this._props = props;
  }

  /**
   * Create a new device fingerprint
   */
  static create(props: DeviceFingerprintProps): DeviceFingerprint {
    const id = nanoid();
    const hash = this.computeHash(props);
    return new DeviceFingerprint(id, hash, props);
  }

  /**
   * Recreate a device fingerprint from existing ID and props
   */
  static fromExisting(id: string, props: DeviceFingerprintProps): DeviceFingerprint {
    const hash = this.computeHash(props);
    return new DeviceFingerprint(id, hash, props);
  }

  private static computeHash(props: DeviceFingerprintProps): string {
    const entropy = props.entropy || '';
    const components = [
      props.userAgent,
      props.platform,
      props.timezone,
      props.language || '',
      props.screenResolution || '',
      entropy,
    ];

    const fingerprint = components.join('|');
    return createHash('sha256').update(fingerprint).digest('hex');
  }

  get id(): string {
    return this._id;
  }

  get hash(): string {
    return this._hash;
  }

  get userAgent(): string {
    return this._props.userAgent;
  }

  get platform(): string {
    return this._props.platform;
  }

  get timezone(): string {
    return this._props.timezone;
  }

  /**
   * Check if this fingerprint matches another (fuzzy match)
   * Allows for minor variations in components
   */
  matches(other: DeviceFingerprint, strict: boolean = false): boolean {
    if (strict) {
      return this._hash === other._hash;
    }

    // Fuzzy match: core components must match
    return (
      this._props.userAgent === other._props.userAgent &&
      this._props.platform === other._props.platform &&
      this._props.timezone === other._props.timezone
    );
  }

  equals(other: DeviceFingerprint): boolean {
    return this._id === other._id && this._hash === other._hash;
  }

  toJSON() {
    return {
      id: this._id,
      hash: this._hash,
      ...this._props,
    };
  }
}
