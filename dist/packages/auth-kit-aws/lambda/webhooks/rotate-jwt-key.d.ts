interface RotationEvent {
    Step: 'createSecret' | 'setSecret' | 'testSecret' | 'finishSecret';
    SecretId: string;
    ClientRequestToken: string;
}
export declare function handler(event: RotationEvent): Promise<{
    statusCode: number;
}>;
export {};
