export declare class StartAuthDto {
    identifier: string;
    channel: 'sms' | 'email' | 'whatsapp';
    intent: 'login' | 'bind' | 'verifyContact';
    deviceFingerprint?: string;
    captchaToken?: string;
}
export declare class VerifyAuthDto {
    identifier: string;
    code?: string;
    token?: string;
}
export declare class ResendAuthDto {
    identifier: string;
}
