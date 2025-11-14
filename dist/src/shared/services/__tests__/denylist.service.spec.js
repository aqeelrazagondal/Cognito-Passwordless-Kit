"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const denylist_service_1 = require("../denylist.service");
const tokens_1 = require("../../../persistence/tokens");
describe('DenylistService', () => {
    let service;
    let mockDenylistRepo;
    beforeEach(async () => {
        mockDenylistRepo = {
            isBlocked: jest.fn(),
            add: jest.fn(),
            remove: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                denylist_service_1.DenylistService,
                {
                    provide: tokens_1.DENYLIST_REPOSITORY,
                    useValue: mockDenylistRepo,
                },
            ],
        }).compile();
        service = module.get(denylist_service_1.DenylistService);
    });
    describe('checkIdentifier', () => {
        it('should allow non-blocked identifier', async () => {
            mockDenylistRepo.isBlocked.mockResolvedValue({ blocked: false });
            const result = await service.checkIdentifier('user@example.com');
            expect(result.blocked).toBe(false);
        });
        it('should block identifier in internal denylist', async () => {
            mockDenylistRepo.isBlocked.mockResolvedValue({
                blocked: true,
                reason: 'Spam detected',
            });
            const result = await service.checkIdentifier('spammer@example.com');
            expect(result.blocked).toBe(true);
            expect(result.reason).toBe('Spam detected');
            expect(result.source).toBe('internal');
        });
        it('should block disposable email domains', async () => {
            mockDenylistRepo.isBlocked.mockResolvedValue({ blocked: false });
            const result = await service.checkIdentifier('user@mailinator.com');
            expect(result.blocked).toBe(true);
            expect(result.reason).toContain('Disposable email');
            expect(result.source).toBe('disposable_email');
        });
        it('should detect multiple disposable domains', async () => {
            mockDenylistRepo.isBlocked.mockResolvedValue({ blocked: false });
            const disposableDomains = [
                '10minutemail.com',
                'guerrillamail.com',
                'tempmail.com',
                'throwaway.email',
                'yopmail.com',
            ];
            for (const domain of disposableDomains) {
                const result = await service.checkIdentifier(`user@${domain}`);
                expect(result.blocked).toBe(true);
                expect(result.source).toBe('disposable_email');
            }
        });
        it('should be case-insensitive for disposable domains', async () => {
            mockDenylistRepo.isBlocked.mockResolvedValue({ blocked: false });
            const result1 = await service.checkIdentifier('user@MAILINATOR.COM');
            const result2 = await service.checkIdentifier('user@Mailinator.Com');
            const result3 = await service.checkIdentifier('user@mailinator.com');
            expect(result1.blocked).toBe(true);
            expect(result2.blocked).toBe(true);
            expect(result3.blocked).toBe(true);
        });
        it('should allow legitimate email domains', async () => {
            mockDenylistRepo.isBlocked.mockResolvedValue({ blocked: false });
            const legitimateDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com'];
            for (const domain of legitimateDomains) {
                const result = await service.checkIdentifier(`user@${domain}`);
                expect(result.blocked).toBe(false);
            }
        });
        it('should check phone numbers', async () => {
            mockDenylistRepo.isBlocked.mockResolvedValue({ blocked: false });
            const result = await service.checkIdentifier('+12025551234');
            expect(result.blocked).toBe(false);
            expect(mockDenylistRepo.isBlocked).toHaveBeenCalled();
        });
        it('should prioritize internal denylist over disposable check', async () => {
            mockDenylistRepo.isBlocked.mockResolvedValue({
                blocked: true,
                reason: 'Previously reported',
            });
            const result = await service.checkIdentifier('user@mailinator.com');
            expect(result.blocked).toBe(true);
            expect(result.source).toBe('internal');
            expect(result.reason).toBe('Previously reported');
        });
    });
    describe('blockIdentifier', () => {
        it('should add identifier to denylist', async () => {
            mockDenylistRepo.add.mockResolvedValue(undefined);
            await service.blockIdentifier('abuse@example.com', 'Spam detected');
            expect(mockDenylistRepo.add).toHaveBeenCalledWith(expect.any(String), 'Spam detected', undefined);
        });
        it('should support expiration date', async () => {
            mockDenylistRepo.add.mockResolvedValue(undefined);
            const expiresAt = new Date(Date.now() + 86400000);
            await service.blockIdentifier('temp-ban@example.com', 'Temporary ban', expiresAt);
            expect(mockDenylistRepo.add).toHaveBeenCalledWith(expect.any(String), 'Temporary ban', expiresAt);
        });
        it('should work with phone numbers', async () => {
            mockDenylistRepo.add.mockResolvedValue(undefined);
            await service.blockIdentifier('+12025551234', 'Spam number');
            expect(mockDenylistRepo.add).toHaveBeenCalledWith(expect.any(String), 'Spam number', undefined);
        });
    });
    describe('unblockIdentifier', () => {
        it('should remove identifier from denylist', async () => {
            mockDenylistRepo.remove.mockResolvedValue(undefined);
            await service.unblockIdentifier('user@example.com');
            expect(mockDenylistRepo.remove).toHaveBeenCalledWith(expect.any(String));
        });
        it('should work with phone numbers', async () => {
            mockDenylistRepo.remove.mockResolvedValue(undefined);
            await service.unblockIdentifier('+12025551234');
            expect(mockDenylistRepo.remove).toHaveBeenCalledWith(expect.any(String));
        });
    });
    describe('disposable domain management', () => {
        it('should add disposable domain', () => {
            service.addDisposableDomain('newdisposable.com');
            expect(service.isDisposableDomain('newdisposable.com')).toBe(true);
        });
        it('should be case-insensitive when adding domain', () => {
            service.addDisposableDomain('NEWDOMAIN.COM');
            expect(service.isDisposableDomain('newdomain.com')).toBe(true);
            expect(service.isDisposableDomain('NEWDOMAIN.COM')).toBe(true);
            expect(service.isDisposableDomain('NewDomain.Com')).toBe(true);
        });
        it('should check if domain is disposable', () => {
            expect(service.isDisposableDomain('mailinator.com')).toBe(true);
            expect(service.isDisposableDomain('gmail.com')).toBe(false);
        });
        it('should persist added domains', () => {
            service.addDisposableDomain('custom1.com');
            service.addDisposableDomain('custom2.com');
            expect(service.isDisposableDomain('custom1.com')).toBe(true);
            expect(service.isDisposableDomain('custom2.com')).toBe(true);
        });
    });
    describe('default disposable domains', () => {
        it('should include common disposable domains', () => {
            const commonDisposable = [
                '10minutemail.com',
                'guerrillamail.com',
                'mailinator.com',
                'tempmail.com',
                'throwaway.email',
                'yopmail.com',
                'temp-mail.org',
                'getnada.com',
                'mohmal.com',
                'fakeinbox.com',
            ];
            for (const domain of commonDisposable) {
                expect(service.isDisposableDomain(domain)).toBe(true);
            }
        });
    });
});
//# sourceMappingURL=denylist.service.spec.js.map