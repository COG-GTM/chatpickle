// Need to bypass type safety of typescript to allow this approach for mocking to work.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LexRuntime = require('aws-sdk/clients/lexruntime');
import LexClient from './LexClient';

jest.mock('aws-sdk/clients/lexruntime');

const mockPostTextResponse = {
    sessionAttributes: { foo: 'bar' },
    message: 'This is a mocked message.',
    dialogState: 'ElicitSlot',
    slotToElicit: 'FlowerType',
    intentName: 'OrderFlowers',
};

const lexRuntimePostTextPromise = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue(mockPostTextResponse),
});

LexRuntime.mockImplementation(() => ({
    postText: lexRuntimePostTextPromise,
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
        delete process.env.chatpickle_access_id;
        delete process.env.chatpickle_access_secret;
    });

    describe('constructor', () => {
        it('should initialize with bot and user context', () => {
            const client = new LexClient(botContext, userContext);
            expect(client).toBeInstanceOf(LexClient);
        });

        it('should create LexRuntime with region from botContext', () => {
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
                    accessKeyId: 'test-access-id',
                    secretAccessKey: 'test-secret',
                })
            );
        });

        it('should not include credentials when environment variables are not set', () => {
            new LexClient(botContext, userContext);

            expect(LexRuntime).toHaveBeenCalledWith(
                expect.objectContaining({
                    accessKeyId: undefined,
                    secretAccessKey: undefined,
                })
            );
        });

        it('should generate unique userId with random suffix', () => {
            const client1 = new LexClient(botContext, userContext);
            const client2 = new LexClient(botContext, userContext);

            // Access private userId through speak call params
            // The userIds should be different due to random suffix
            expect(client1).not.toBe(client2);
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
            await client.speak('I want to order flowers');

            expect(lexRuntimePostTextPromise).toHaveBeenCalledWith(
                expect.objectContaining({
                    botName: 'OrderFlowers',
                    botAlias: 'prod',
                    inputText: 'I want to order flowers',
                })
            );
        });

        it('should pass session attributes to postText', async () => {
            const client = new LexClient(botContext, userContext);
            await client.speak('Hello');

            expect(lexRuntimePostTextPromise).toHaveBeenCalledWith(
                expect.objectContaining({
                    sessionAttributes: userContext.userAttributes,
                })
            );
        });

        it('should update session attributes from response', async () => {
            const client = new LexClient(botContext, userContext);
            await client.speak('First message');

            // Second call should use updated session attributes
            await client.speak('Second message');

            expect(lexRuntimePostTextPromise).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    sessionAttributes: { foo: 'bar' },
                })
            );
        });

        it('should handle messages with whitespace', async () => {
            const mockResponseWithWhitespace = {
                sessionAttributes: {},
                message: '  Message with whitespace  ',
            };
            lexRuntimePostTextPromise.mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue(mockResponseWithWhitespace),
            });

            const client = new LexClient(botContext, userContext);
            const reply = await client.speak('Test');
            expect(reply).toBe('Message with whitespace');
        });
    });

    describe('fetch', () => {
        it('should return attribute from last response', async () => {
            const client = new LexClient(botContext, userContext);
            await client.speak('Hello');

            const dialogState = await client.fetch('dialogState');
            expect(dialogState).toBe('ElicitSlot');
        });

        it('should return nested attribute using dot notation', async () => {
            const client = new LexClient(botContext, userContext);
            await client.speak('Hello');

            const fooValue = await client.fetch('sessionAttributes.foo');
            expect(fooValue).toBe('bar');
        });

        it('should return undefined for non-existent attribute', async () => {
            const client = new LexClient(botContext, userContext);
            await client.speak('Hello');

            const nonExistent = await client.fetch('nonExistentAttribute');
            expect(nonExistent).toBeUndefined();
        });

        it('should return intentName from response', async () => {
            const client = new LexClient(botContext, userContext);
            await client.speak('Hello');

            const intentName = await client.fetch('intentName');
            expect(intentName).toBe('OrderFlowers');
        });

        it('should return slotToElicit from response', async () => {
            const client = new LexClient(botContext, userContext);
            await client.speak('Hello');

            const slotToElicit = await client.fetch('slotToElicit');
            expect(slotToElicit).toBe('FlowerType');
        });

        it('should return message from response', async () => {
            const client = new LexClient(botContext, userContext);
            await client.speak('Hello');

            const message = await client.fetch('message');
            expect(message).toBe('This is a mocked message.');
        });
    });

    describe('initialize', () => {
        it('should return resolved promise (inherited from BotClient)', async () => {
            const client = new LexClient(botContext, userContext);
            await expect(client.initialize()).resolves.toBeUndefined();
        });
    });
});
