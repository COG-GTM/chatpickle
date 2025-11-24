// Need to bypass type safety of typescript to allow this approach for mocking to work.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LexRuntime = require('aws-sdk/clients/lexruntime');
import LexClient from './LexClient';

jest.mock('aws-sdk/clients/lexruntime');

describe('LexClient', () => {
    const botContext = {
        botName: 'OrderFlowers',
        botAlias: 'prod',
        region: 'us-east-1',
    };

    const userContext = {
        userId: 'homer',
        userAttributes: {
            firstName: 'Homer',
            lastName: 'Simpson',
            address: 'Springfield',
        },
    };

    let mockPostText: jest.Mock;
    let mockPostTextPromise: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPostTextPromise = jest.fn().mockResolvedValue({
            sessionAttributes: { foo: 'bar' },
            message: 'This is a mocked message.',
        });

        mockPostText = jest.fn().mockReturnValue({
            promise: mockPostTextPromise,
        });

        LexRuntime.mockImplementation(() => ({
            postText: mockPostText,
        }));
    });

    describe('constructor', () => {
        it('should initialize with botContext and userContext', () => {
            const client = new LexClient(botContext, userContext);

            expect(client.botContext).toBe(botContext);
            expect(client.userContext).toBe(userContext);
        });

        it('should create LexRuntime with correct region', () => {
            new LexClient(botContext, userContext);

            expect(LexRuntime).toHaveBeenCalledWith(
                expect.objectContaining({
                    region: 'us-east-1',
                })
            );
        });

        it('should use environment variables for credentials when set', () => {
            const originalAccessId = process.env.chatpickle_access_id;
            const originalAccessSecret = process.env.chatpickle_access_secret;

            process.env.chatpickle_access_id = 'test-access-id';
            process.env.chatpickle_access_secret = 'test-secret';

            new LexClient(botContext, userContext);

            expect(LexRuntime).toHaveBeenCalledWith(
                expect.objectContaining({
                    accessKeyId: 'test-access-id',
                    secretAccessKey: 'test-secret',
                })
            );

            process.env.chatpickle_access_id = originalAccessId;
            process.env.chatpickle_access_secret = originalAccessSecret;
        });

        it('should generate unique userId with random suffix', () => {
            const client1 = new LexClient(botContext, userContext);
            const client2 = new LexClient(botContext, userContext);

            const userId1 = (client1 as any).userId;
            const userId2 = (client2 as any).userId;

            expect(userId1).toMatch(/^homer-[a-f0-9]{32}$/);
            expect(userId2).toMatch(/^homer-[a-f0-9]{32}$/);
            expect(userId1).not.toBe(userId2);
        });
    });

    describe('speak', () => {
        it('should call postText with correct parameters', async () => {
            const client = new LexClient(botContext, userContext);
            await client.speak('Hello World');

            expect(mockPostText).toHaveBeenCalledWith(
                expect.objectContaining({
                    botName: 'OrderFlowers',
                    botAlias: 'prod',
                    inputText: 'Hello World',
                    sessionAttributes: userContext.userAttributes,
                })
            );
        });

        it('should return trimmed message from response', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: {},
                message: '  Trimmed message  ',
            });

            const client = new LexClient(botContext, userContext);
            const reply = await client.speak('Test');

            expect(reply).toBe('Trimmed message');
        });

        it('should update sessionAttributes after each call', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: { newAttr: 'newValue' },
                message: 'Response 1',
            });

            const client = new LexClient(botContext, userContext);
            await client.speak('First message');

            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: { anotherAttr: 'anotherValue' },
                message: 'Response 2',
            });

            await client.speak('Second message');

            expect(mockPostText).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    sessionAttributes: { newAttr: 'newValue' },
                })
            );
        });

        it('should return the mocked message', async () => {
            const client = new LexClient(botContext, userContext);
            const reply = await client.speak('Hello World');

            expect(reply).toBe('This is a mocked message.');
        });
    });

    describe('fetch', () => {
        it('should return value from lastResponse using lodash.get', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: { foo: 'bar' },
                message: 'Test message',
                intentName: 'TestIntent',
                slots: {
                    slotOne: 'value1',
                    slotTwo: 'value2',
                },
            });

            const client = new LexClient(botContext, userContext);
            await client.speak('Test');

            const intentName = await client.fetch('intentName');
            expect(intentName).toBe('TestIntent');

            const slotOne = await client.fetch('slots.slotOne');
            expect(slotOne).toBe('value1');
        });

        it('should return undefined for non-existent paths', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: {},
                message: 'Test',
            });

            const client = new LexClient(botContext, userContext);
            await client.speak('Test');

            const result = await client.fetch('nonExistent.path');
            expect(result).toBeUndefined();
        });

        it('should return undefined when no response exists', async () => {
            const client = new LexClient(botContext, userContext);

            const result = await client.fetch('anyPath');
            expect(result).toBeUndefined();
        });

        it('should handle nested sessionAttributes', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: {
                    nested: {
                        deep: {
                            value: 'found',
                        },
                    },
                },
                message: 'Test',
            });

            const client = new LexClient(botContext, userContext);
            await client.speak('Test');

            const result = await client.fetch('sessionAttributes.nested.deep.value');
            expect(result).toBe('found');
        });
    });

    describe('initialize', () => {
        it('should return resolved promise (inherited from BotClient)', async () => {
            const client = new LexClient(botContext, userContext);

            const result = await client.initialize();

            expect(result).toBeUndefined();
        });
    });
});
