"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const rate_limit_service_1 = require("../rate-limit.service");
const tokens_1 = require("../../../persistence/tokens");
describe('RateLimitService', () => {
    let service;
    let mockCounterRepo;
    beforeEach(async () => {
        mockCounterRepo = {
            increment: jest.fn(),
            get: jest.fn(),
            reset: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                rate_limit_service_1.RateLimitService,
                {
                    provide: tokens_1.COUNTER_REPOSITORY,
                    useValue: mockCounterRepo,
                },
            ],
        }).compile();
        service = module.get(rate_limit_service_1.RateLimitService);
    });
    describe('checkLimits', () => {
        it('should allow request when under both limits', async () => {
            const expiresAt = Date.now() + 3600000;
            mockCounterRepo.increment.mockResolvedValueOnce({
                count: 3,
                expiresAt,
            });
            mockCounterRepo.increment.mockResolvedValueOnce({
                count: 7,
                expiresAt,
            });
            const result = await service.checkLimits({
                identifier: 'hashed-identifier',
                ip: '1.2.3.4',
            });
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(2);
            expect(result.scope).toBe('all');
            expect(mockCounterRepo.increment).toHaveBeenCalledTimes(2);
        });
        it('should block when identifier limit exceeded', async () => {
            const expiresAt = Date.now() + 3600000;
            mockCounterRepo.increment.mockResolvedValueOnce({
                count: 6,
                expiresAt,
            });
            const result = await service.checkLimits({
                identifier: 'hashed-identifier',
                ip: '1.2.3.4',
            });
            expect(result.allowed).toBe(false);
            expect(result.scope).toBe('identifier');
            expect(result.resetAt).toBeInstanceOf(Date);
        });
        it('should block when IP limit exceeded', async () => {
            const expiresAt = Date.now() + 3600000;
            mockCounterRepo.increment.mockResolvedValueOnce({
                count: 3,
                expiresAt,
            });
            mockCounterRepo.increment.mockResolvedValueOnce({
                count: 11,
                expiresAt,
            });
            const result = await service.checkLimits({
                identifier: 'hashed-identifier',
                ip: '1.2.3.4',
            });
            expect(result.allowed).toBe(false);
            expect(result.scope).toBe('ip');
        });
        it('should return 0 remaining when at limit', async () => {
            const expiresAt = Date.now() + 3600000;
            mockCounterRepo.increment.mockResolvedValueOnce({
                count: 5,
                expiresAt,
            });
            mockCounterRepo.increment.mockResolvedValueOnce({
                count: 10,
                expiresAt,
            });
            const result = await service.checkLimits({
                identifier: 'hashed-identifier',
                ip: '1.2.3.4',
            });
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(0);
        });
        it('should use latest resetAt time', async () => {
            const identifierExpiresAt = Date.now() + 1800000;
            const ipExpiresAt = Date.now() + 3600000;
            mockCounterRepo.increment.mockResolvedValueOnce({
                count: 1,
                expiresAt: identifierExpiresAt,
            });
            mockCounterRepo.increment.mockResolvedValueOnce({
                count: 1,
                expiresAt: ipExpiresAt,
            });
            const result = await service.checkLimits({
                identifier: 'hashed-identifier',
                ip: '1.2.3.4',
            });
            expect(result.resetAt.getTime()).toBe(ipExpiresAt);
        });
        it('should use correct counter keys', async () => {
            const expiresAt = Date.now() + 3600000;
            mockCounterRepo.increment.mockResolvedValue({
                count: 1,
                expiresAt,
            });
            await service.checkLimits({
                identifier: 'hash-123',
                ip: '1.2.3.4',
            });
            expect(mockCounterRepo.increment).toHaveBeenCalledWith(expect.stringContaining('identifier'), 3600);
            expect(mockCounterRepo.increment).toHaveBeenCalledWith(expect.stringContaining('ip'), 3600);
        });
    });
    describe('resetCounters', () => {
        it('should reset identifier counter', async () => {
            mockCounterRepo.reset.mockResolvedValue(undefined);
            await service.resetCounters('identifier', 'hash-123');
            expect(mockCounterRepo.reset).toHaveBeenCalledWith(expect.stringContaining('identifier'));
        });
        it('should reset IP counter', async () => {
            mockCounterRepo.reset.mockResolvedValue(undefined);
            await service.resetCounters('ip', '1.2.3.4');
            expect(mockCounterRepo.reset).toHaveBeenCalledWith(expect.stringContaining('ip'));
        });
    });
    describe('rate limit logic', () => {
        it('should have correct identifier limit (5 requests)', async () => {
            const expiresAt = Date.now() + 3600000;
            mockCounterRepo.increment.mockResolvedValueOnce({ count: 5, expiresAt });
            mockCounterRepo.increment.mockResolvedValueOnce({ count: 1, expiresAt });
            const atLimit = await service.checkLimits({ identifier: 'hash', ip: 'ip' });
            expect(atLimit.allowed).toBe(true);
            mockCounterRepo.increment.mockResolvedValueOnce({ count: 6, expiresAt });
            const overLimit = await service.checkLimits({ identifier: 'hash', ip: 'ip' });
            expect(overLimit.allowed).toBe(false);
        });
        it('should have correct IP limit (10 requests)', async () => {
            const expiresAt = Date.now() + 3600000;
            mockCounterRepo.increment.mockResolvedValueOnce({ count: 1, expiresAt });
            mockCounterRepo.increment.mockResolvedValueOnce({ count: 10, expiresAt });
            const atLimit = await service.checkLimits({ identifier: 'hash', ip: 'ip' });
            expect(atLimit.allowed).toBe(true);
            mockCounterRepo.increment.mockResolvedValueOnce({ count: 1, expiresAt });
            mockCounterRepo.increment.mockResolvedValueOnce({ count: 11, expiresAt });
            const overLimit = await service.checkLimits({ identifier: 'hash', ip: 'ip' });
            expect(overLimit.allowed).toBe(false);
        });
        it('should use 1 hour window (3600 seconds)', async () => {
            mockCounterRepo.increment.mockResolvedValue({
                count: 1,
                expiresAt: Date.now() + 3600000,
            });
            await service.checkLimits({ identifier: 'hash', ip: 'ip' });
            expect(mockCounterRepo.increment).toHaveBeenCalledWith(expect.any(String), 3600);
        });
    });
});
//# sourceMappingURL=rate-limit.service.spec.js.map