import { DeviceFingerprint } from '../value-objects/DeviceFingerprint';

export interface DeviceProps {
  id: string;
  userId: string;
  fingerprint: DeviceFingerprint;
  trusted: boolean;
  pushToken?: string;
  lastSeenAt: Date;
  createdAt: Date;
  revokedAt?: Date;
}

/**
 * Device entity
 * Represents a trusted device bound to a user
 */
export class Device {
  private constructor(private props: DeviceProps) {}

  /**
   * Create a new device binding
   */
  static create(params: {
    userId: string;
    fingerprint: DeviceFingerprint;
    pushToken?: string;
    trusted?: boolean;
  }): Device {
    const now = new Date();

    return new Device({
      id: params.fingerprint.id,
      userId: params.userId,
      fingerprint: params.fingerprint,
      trusted: params.trusted ?? true,
      pushToken: params.pushToken,
      lastSeenAt: now,
      createdAt: now,
    });
  }

  /**
   * Reconstruct from persistence
   */
  static fromPersistence(props: DeviceProps): Device {
    return new Device(props);
  }

  /**
   * Mark device as seen (update last seen timestamp)
   */
  markAsSeen(): void {
    this.props.lastSeenAt = new Date();
  }

  /**
   * Revoke device trust
   */
  revoke(): void {
    this.props.trusted = false;
    this.props.revokedAt = new Date();
  }

  /**
   * Update push token
   */
  updatePushToken(token: string): void {
    this.props.pushToken = token;
  }

  /**
   * Trust this device
   */
  trust(): void {
    this.props.trusted = true;
    this.props.revokedAt = undefined;
  }

  isRevoked(): boolean {
    return !!this.props.revokedAt;
  }

  isTrusted(): boolean {
    return this.props.trusted && !this.isRevoked();
  }

  /**
   * Check if device is stale (not seen in X days)
   */
  isStale(maxDaysInactive: number = 90): boolean {
    const daysSinceLastSeen = (Date.now() - this.props.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLastSeen > maxDaysInactive;
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get fingerprint(): DeviceFingerprint {
    return this.props.fingerprint;
  }

  get trusted(): boolean {
    return this.props.trusted;
  }

  get pushToken(): string | undefined {
    return this.props.pushToken;
  }

  get lastSeenAt(): Date {
    return this.props.lastSeenAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get revokedAt(): Date | undefined {
    return this.props.revokedAt;
  }

  /**
   * Convert to persistence format
   */
  toPersistence() {
    return {
      pk: `USER#${this.props.userId}`,
      sk: `DEVICE#${this.props.id}`,
      deviceId: this.props.id,
      userId: this.props.userId,
      fingerprintHash: this.props.fingerprint.hash,
      fingerprintData: this.props.fingerprint.toJSON(),
      trusted: this.props.trusted,
      pushToken: this.props.pushToken,
      lastSeenAt: this.props.lastSeenAt.toISOString(),
      createdAt: this.props.createdAt.toISOString(),
      revokedAt: this.props.revokedAt?.toISOString(),
    };
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      fingerprint: this.props.fingerprint.toJSON(),
      trusted: this.props.trusted,
      pushToken: this.props.pushToken,
      lastSeenAt: this.props.lastSeenAt.toISOString(),
      createdAt: this.props.createdAt.toISOString(),
      revokedAt: this.props.revokedAt?.toISOString(),
      isRevoked: this.isRevoked(),
      isTrusted: this.isTrusted(),
    };
  }
}
