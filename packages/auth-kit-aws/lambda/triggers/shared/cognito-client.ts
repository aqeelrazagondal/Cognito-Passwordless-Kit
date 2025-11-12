/**
 * Cognito client wrapper for Lambda triggers
 */

import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export interface CognitoUser {
  username: string;
  email?: string;
  phoneNumber?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

/**
 * Get user details from Cognito
 */
export async function getUser(userPoolId: string, username: string): Promise<CognitoUser | null> {
  try {
    const result = await client.send(new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username,
    }));

    const attributes = result.UserAttributes || [];
    const getAttribute = (name: string) => attributes.find(a => a.Name === name)?.Value;

    return {
      username: result.Username!,
      email: getAttribute('email'),
      phoneNumber: getAttribute('phone_number'),
      emailVerified: getAttribute('email_verified') === 'true',
      phoneVerified: getAttribute('phone_number_verified') === 'true',
    };
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

/**
 * Check if user exists in Cognito
 */
export async function userExists(userPoolId: string, username: string): Promise<boolean> {
  const user = await getUser(userPoolId, username);
  return user !== null;
}
