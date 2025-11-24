// Need to bypass type safety of typescript to allow this approach for mocking to work.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LexRuntime = require('aws-sdk/clients/lexruntime');
import LexClient from './LexClient';

jest.mock('aws-sdk/clients/lexruntime');

const mockPostTextPromise = jest.fn();
const lexRuntimePostTextMock = jest.fn().mockReturnValue({
    promise: mockPostTextPromise,
});

LexRuntime.mockImplementation(() => ({
    postText: lexRuntimePostTextMock,
}));

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

    beforeEach(() => {
        jest.clearAllMocks();
        mockPostTextPromise.mockResolvedValue({
            sessionAttributes: { foo: 'bar' },
            message: 'This is a mocked message.',
        });
        delete process.env.chatpickle_access_id;
        delete process.env.chatpickle_access_secret;
    });

    describe('constructor', () => {
        it('should initialize with bot and user context', () => {
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
            process.env.chatpickle_access_id = 'test-access-id';
            process.env.chatpickle_access_secret = 'test-secret';

            new LexClient(botContext, userContext);

            expect(LexRuntime).toHaveBeenCalledWith(
                expect.objectContaining({
                    region: 'us-east-1',
                    accessKeyId: 'test-access-id',
                    secretAccessKey: 'test-secret',
                })
            );
        });

        it('should not include credentials when environment variables are not set', () => {
            new LexClient(botContext, userContext);

            expect(LexRuntime).toHaveBeenCalledWith(
                expect.objectContaining({
                    region: 'us-east-1',
                    accessKeyId: undefined,
                    secretAccessKey: undefined,
                })
            );
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
        it('should return trimmed message from Lex response', async () => {
            const client = new LexClient(botContext, userContext);

            const reply = await client.speak('Hello World');

            expect(reply).toBe('This is a mocked message.');
        });

        it('should call postText with correct parameters', async () => {
            const client = new LexClient(botContext, userContext);

            await client.speak('Hello World');

            expect(lexRuntimePostTextMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    botName: 'OrderFlowers',
                    botAlias: 'prod',
                    inputText: 'Hello World',
                    sessionAttributes: userContext.userAttributes,
                })
            );
        });

        it('should update sessionAttributes from response', async () => {
            const client = new LexClient(botContext, userContext);

            await client.speak('First message');

            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: { updated: 'attributes' },
                message: 'Second response',
            });

            await client.speak('Second message');

            expect(lexRuntimePostTextMock).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    sessionAttributes: { foo: 'bar' },
                })
            );
        });

        it('should trim whitespace from response message', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: {},
                message: '  Message with whitespace  ',
            });

            const client = new LexClient(botContext, userContext);
            const reply = await client.speak('Test');

            expect(reply).toBe('Message with whitespace');
        });
    });

    describe('fetch', () => {
        it('should return attribute from last response using lodash.get path', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: { foo: 'bar' },
                message: 'Test message',
                intentName: 'TestIntent',
            });

            const client = new LexClient(botContext, userContext);
            await client.speak('Test');

            const result = await client.fetch('intentName');

            expect(result).toBe('TestIntent');
        });

        it('should return nested attribute using dot notation', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: { nested: { value: 'deep' } },
                message: 'Test message',
            });

            const client = new LexClient(botContext, userContext);
            await client.speak('Test');

            const result = await client.fetch('sessionAttributes.nested.value');

            expect(result).toBe('deep');
        });

        it('should return undefined for non-existent attribute', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: {},
                message: 'Test message',
            });

            const client = new LexClient(botContext, userContext);
            await client.speak('Test');

            const result = await client.fetch('nonExistent');

            expect(result).toBeUndefined();
        });

        it('should return undefined when no response exists', async () => {
            const client = new LexClient(botContext, userContext);

            const result = await client.fetch('anyAttribute');

            expect(result).toBeUndefined();
        });
    });
});
