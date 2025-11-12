export declare class HealthController {
    check(): {
        status: string;
        timestamp: string;
        service: string;
        version: string;
    };
    ready(): {
        status: string;
        timestamp: string;
    };
    live(): {
        status: string;
        timestamp: string;
    };
}
