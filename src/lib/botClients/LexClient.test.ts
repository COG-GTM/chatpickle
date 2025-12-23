// Need to bypass type safety of typescript to allow this approach for mocking to work.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LexRuntime = require('aws-sdk/clients/lexruntime');
import LexClient from './LexClient';

jest.mock('aws-sdk/clients/lexruntime');

const mockPostTextPromise = jest.fn();
const lexRuntimePostTextPromise = jest.fn().mockReturnValue({
    promise: mockPostTextPromise,
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
        mockPostTextPromise.mockResolvedValue({
            sessionAttributes: { foo: 'bar' },
            message: 'This is a mocked message.',
        });
        delete process.env.chatpickle_access_id;
        delete process.env.chatpickle_access_secret;
    });

    describe('constructor', () => {
        test('should set botName from botContext', () => {
            const botClient = new LexClient(botContext, userContext);
            expect(botClient['botName']).toBe('OrderFlowers');
        });

        test('should set botAlias from botContext', () => {
            const botClient = new LexClient(botContext, userContext);
            expect(botClient['botAlias']).toBe('prod');
        });

        test('should generate unique userId with random suffix', () => {
            const botClient1 = new LexClient(botContext, userContext);
            const botClient2 = new LexClient(botContext, userContext);
            expect(botClient1['userId']).toMatch(/^homer-[a-f0-9]{32}$/);
            expect(botClient2['userId']).toMatch(/^homer-[a-f0-9]{32}$/);
            expect(botClient1['userId']).not.toBe(botClient2['userId']);
        });

        test('should set sessionAttributes from userAttributes', () => {
            const botClient = new LexClient(botContext, userContext);
            expect(botClient['sessionAttributes']).toEqual(userContext.userAttributes);
        });

        test('should set region in props', () => {
            const botClient = new LexClient(botContext, userContext);
            expect(botClient['props'].region).toBe('us-east-1');
        });

        test('should set accessKeyId from environment variable when present', () => {
            process.env.chatpickle_access_id = 'test-access-id';
            const botClient = new LexClient(botContext, userContext);
            expect(botClient['props'].accessKeyId).toBe('test-access-id');
        });

        test('should set secretAccessKey from environment variable when present', () => {
            process.env.chatpickle_access_secret = 'test-secret-key';
            const botClient = new LexClient(botContext, userContext);
            expect(botClient['props'].secretAccessKey).toBe('test-secret-key');
        });

        test('should leave accessKeyId undefined when env var not set', () => {
            const botClient = new LexClient(botContext, userContext);
            expect(botClient['props'].accessKeyId).toBeUndefined();
        });

        test('should leave secretAccessKey undefined when env var not set', () => {
            const botClient = new LexClient(botContext, userContext);
            expect(botClient['props'].secretAccessKey).toBeUndefined();
        });

        test('should initialize LexRuntime with props', () => {
            new LexClient(botContext, userContext);
            expect(LexRuntime).toHaveBeenCalledWith({
                region: 'us-east-1',
                accessKeyId: undefined,
                secretAccessKey: undefined,
            });
        });
    });

    describe('speak', () => {
        test('should return trimmed message from Lex response', async () => {
            const botClient = new LexClient(botContext, userContext);
            const reply = await botClient.speak('Hello World');
            expect(reply).toBe('This is a mocked message.');
        });

        test('should call postText with correct parameters', async () => {
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello World');
            expect(lexRuntimePostTextPromise).toHaveBeenCalledWith(
                expect.objectContaining({
                    botName: 'OrderFlowers',
                    botAlias: 'prod',
                    inputText: 'Hello World',
                    sessionAttributes: userContext.userAttributes,
                })
            );
        });

        test('should update sessionAttributes from response', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: { newAttr: 'newValue' },
                message: 'Response',
            });
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');
            expect(botClient['sessionAttributes']).toEqual({ newAttr: 'newValue' });
        });

        test('should trim whitespace from response message', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: {},
                message: '  Trimmed message  ',
            });
            const botClient = new LexClient(botContext, userContext);
            const reply = await botClient.speak('Hello');
            expect(reply).toBe('Trimmed message');
        });

        test('should pass sessionAttributes from previous response', async () => {
            mockPostTextPromise.mockResolvedValueOnce({
                sessionAttributes: { conversationState: 'active' },
                message: 'First response',
            });
            mockPostTextPromise.mockResolvedValueOnce({
                sessionAttributes: { conversationState: 'completed' },
                message: 'Second response',
            });

            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('First message');
            await botClient.speak('Second message');

            expect(lexRuntimePostTextPromise).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    sessionAttributes: { conversationState: 'active' },
                })
            );
        });
    });

    describe('fetch', () => {
        test('should return attribute from lastResponse using lodash.get', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: { key: 'value' },
                message: 'Response',
                dialogState: 'Fulfilled',
            });
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');
            const dialogState = await botClient.fetch('dialogState');
            expect(dialogState).toBe('Fulfilled');
        });

        test('should return nested attribute using dot notation', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: { nested: { deep: 'value' } },
                message: 'Response',
            });
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');
            const nestedValue = await botClient.fetch('sessionAttributes.nested.deep');
            expect(nestedValue).toBe('value');
        });

        test('should return undefined for non-existent attribute', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: {},
                message: 'Response',
            });
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');
            const value = await botClient.fetch('nonExistent');
            expect(value).toBeUndefined();
        });

        test('should return undefined when no speak has been called', async () => {
            const botClient = new LexClient(botContext, userContext);
            const value = await botClient.fetch('anyAttribute');
            expect(value).toBeUndefined();
        });

        test('should return message from lastResponse', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: {},
                message: 'The message content',
            });
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');
            const message = await botClient.fetch('message');
            expect(message).toBe('The message content');
        });

        test('should return sessionAttributes object', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: { attr1: 'val1', attr2: 'val2' },
                message: 'Response',
            });
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');
            const attrs = await botClient.fetch('sessionAttributes');
            expect(attrs).toEqual({ attr1: 'val1', attr2: 'val2' });
        });

        test('should handle array index access', async () => {
            mockPostTextPromise.mockResolvedValue({
                sessionAttributes: {},
                message: 'Response',
                slots: { items: ['item1', 'item2', 'item3'] },
            });
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');
            const secondItem = await botClient.fetch('slots.items[1]');
            expect(secondItem).toBe('item2');
        });
    });
});
