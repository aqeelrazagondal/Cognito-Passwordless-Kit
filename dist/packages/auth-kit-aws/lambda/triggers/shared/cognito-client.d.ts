export interface CognitoUser {
    username: string;
    email?: string;
    phoneNumber?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
}
export declare function getUser(userPoolId: string, username: string): Promise<CognitoUser | null>;
export declare function userExists(userPoolId: string, username: string): Promise<boolean>;
