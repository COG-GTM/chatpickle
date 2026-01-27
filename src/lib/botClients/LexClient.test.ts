// Need to bypass type safety of typescript to allow this approach for mocking to work.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LexRuntime = require('aws-sdk/clients/lexruntime');
import LexClient from './LexClient';

jest.mock('aws-sdk/clients/lexruntime');

const mockPostTextResponse = {
    sessionAttributes: { foo: 'bar' },
    message: 'This is a mocked message.',
    dialogState: 'Fulfilled',
    intentName: 'OrderFlowers',
    slots: {
        FlowerType: 'roses',
        PickupDate: '2024-01-15',
    },
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
        test('should initialize with bot and user context', () => {
            const botClient = new LexClient(botContext, userContext);
            expect(botClient).toBeDefined();
            expect(botClient.botContext).toEqual(botContext);
            expect(botClient.userContext).toEqual(userContext);
        });

        test('should create LexRuntime with region from botContext', () => {
            new LexClient(botContext, userContext);
            expect(LexRuntime).toHaveBeenCalledWith(
                expect.objectContaining({
                    region: 'us-east-1',
                })
            );
        });

        test('should use environment variables for AWS credentials when set', () => {
            process.env.chatpickle_access_id = 'test-access-id';
            process.env.chatpickle_access_secret = 'test-secret-key';

            new LexClient(botContext, userContext);

            expect(LexRuntime).toHaveBeenCalledWith(
                expect.objectContaining({
                    region: 'us-east-1',
                    accessKeyId: 'test-access-id',
                    secretAccessKey: 'test-secret-key',
                })
            );
        });

        test('should not include credentials when environment variables are not set', () => {
            new LexClient(botContext, userContext);

            expect(LexRuntime).toHaveBeenCalledWith(
                expect.objectContaining({
                    region: 'us-east-1',
                    accessKeyId: undefined,
                    secretAccessKey: undefined,
                })
            );
        });
    });

    describe('speak', () => {
        test('should send input text to Lex and return response message', async () => {
            const botClient = new LexClient(botContext, userContext);
            const reply = await botClient.speak('Hello World');
            expect(reply).toBe('This is a mocked message.');
        });

        test('should call postText with correct parameters', async () => {
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('I want to order flowers');

            expect(lexRuntimePostTextPromise).toHaveBeenCalledWith(
                expect.objectContaining({
                    botName: 'OrderFlowers',
                    botAlias: 'prod',
                    inputText: 'I want to order flowers',
                    sessionAttributes: userContext.userAttributes,
                })
            );
        });

        test('should include userId in postText params', async () => {
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');

            expect(lexRuntimePostTextPromise).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: expect.stringContaining('homer-'),
                })
            );
        });

        test('should trim whitespace from response message', async () => {
            lexRuntimePostTextPromise.mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue({
                    sessionAttributes: {},
                    message: '  Message with whitespace  ',
                }),
            });

            const botClient = new LexClient(botContext, userContext);
            const reply = await botClient.speak('Hello');
            expect(reply).toBe('Message with whitespace');
        });

        test('should update sessionAttributes after each speak call', async () => {
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('First message');

            lexRuntimePostTextPromise.mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue({
                    sessionAttributes: { updated: 'true' },
                    message: 'Second response',
                }),
            });

            await botClient.speak('Second message');

            expect(lexRuntimePostTextPromise).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    sessionAttributes: { foo: 'bar' },
                })
            );
        });
    });

    describe('fetch', () => {
        test('should fetch top-level attribute from last response', async () => {
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');

            const dialogState = await botClient.fetch('dialogState');
            expect(dialogState).toBe('Fulfilled');
        });

        test('should fetch nested attribute using dot notation', async () => {
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');

            const flowerType = await botClient.fetch('slots.FlowerType');
            expect(flowerType).toBe('roses');
        });

        test('should fetch sessionAttributes', async () => {
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');

            const foo = await botClient.fetch('sessionAttributes.foo');
            expect(foo).toBe('bar');
        });

        test('should return undefined for non-existent attribute', async () => {
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');

            const nonExistent = await botClient.fetch('nonExistent.path');
            expect(nonExistent).toBeUndefined();
        });

        test('should return undefined when no response has been received', async () => {
            const botClient = new LexClient(botContext, userContext);
            const result = await botClient.fetch('message');
            expect(result).toBeUndefined();
        });

        test('should fetch intentName from response', async () => {
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');

            const intentName = await botClient.fetch('intentName');
            expect(intentName).toBe('OrderFlowers');
        });
    });

    describe('initialize', () => {
        test('should return a resolved promise', async () => {
            const botClient = new LexClient(botContext, userContext);
            await expect(botClient.initialize()).resolves.toBeUndefined();
        });
    });
});
