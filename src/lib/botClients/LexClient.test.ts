const LexRuntime = require('aws-sdk/clients/lexruntime');
import LexClient from './LexClient';
import * as crypto from 'crypto';

jest.mock('aws-sdk/clients/lexruntime');
jest.mock('crypto', () => ({
    randomBytes: jest.fn()
}));

const lexRuntimePostTextPromise = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
        sessionAttributes: { foo: 'bar' },
        message: 'This is a mocked message.',
    }),
});

LexRuntime.mockImplementation(() => ({
    postText: lexRuntimePostTextPromise,
}));

const mockRandomBytes = crypto.randomBytes as jest.Mock;
mockRandomBytes.mockReturnValue(Buffer.from('abcdef1234567890abcdef1234567890', 'hex'));

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
        mockRandomBytes.mockReturnValue(Buffer.from('abcdef1234567890abcdef1234567890', 'hex'));
        delete process.env.chatpickle_access_id;
        delete process.env.chatpickle_access_secret;
    });

    describe('constructor', () => {
        test('should initialize with botContext and userContext', () => {
            const botClient = new LexClient(botContext, userContext);
            expect(botClient['botName']).toBe('OrderFlowers');
            expect(botClient['botAlias']).toBe('prod');
            expect(botClient['sessionAttributes']).toEqual(userContext.userAttributes);
        });

        test('should generate userId with crypto.randomBytes suffix', () => {
            const botClient = new LexClient(botContext, userContext);
            expect(mockRandomBytes).toHaveBeenCalledWith(16);
            expect(botClient['userId']).toBe('homer-abcdef1234567890abcdef1234567890');
        });

        test('should handle AWS credentials from environment variables', () => {
            process.env.chatpickle_access_id = 'test-access-id';
            process.env.chatpickle_access_secret = 'test-secret';
            
            const botClient = new LexClient(botContext, userContext);
            expect(botClient['props'].accessKeyId).toBe('test-access-id');
            expect(botClient['props'].secretAccessKey).toBe('test-secret');
        });

        test('should set undefined for AWS credentials when env vars not present', () => {
            const botClient = new LexClient(botContext, userContext);
            expect(botClient['props'].accessKeyId).toBeUndefined();
            expect(botClient['props'].secretAccessKey).toBeUndefined();
        });

        test('should initialize lastResponse as null', () => {
            const botClient = new LexClient(botContext, userContext);
            expect(botClient['lastResponse']).toBeNull();
        });

        test('should create LexRuntime instance with correct props', () => {
            const botClient = new LexClient(botContext, userContext);
            expect(LexRuntime).toHaveBeenCalledWith({
                region: 'us-east-1',
                accessKeyId: undefined,
                secretAccessKey: undefined,
            });
        });
    });

    describe('speak()', () => {
        test('should send message and return bot reply', async (): Promise<void> => {
            const botClient = new LexClient(botContext, userContext);
            const reply = await botClient.speak('Hello World');
            expect(reply).toBe('This is a mocked message.');
        });

        test('should call postText with correct parameters', async () => {
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Test message');
            
            expect(lexRuntimePostTextPromise).toHaveBeenCalledWith({
                botName: 'OrderFlowers',
                botAlias: 'prod',
                userId: 'homer-abcdef1234567890abcdef1234567890',
                inputText: 'Test message',
                sessionAttributes: userContext.userAttributes,
            });
        });

        test('should update sessionAttributes after speak()', async () => {
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');
            expect(botClient['sessionAttributes']).toEqual({ foo: 'bar' });
        });

        test('should trim whitespace from bot reply', async () => {
            lexRuntimePostTextPromise.mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue({
                    sessionAttributes: {},
                    message: '  Message with spaces  ',
                }),
            });
            
            const botClient = new LexClient(botContext, userContext);
            const reply = await botClient.speak('Test');
            expect(reply).toBe('Message with spaces');
        });
    });

    describe('session attributes management', () => {
        test('should persist sessionAttributes across multiple speak() calls', async () => {
            lexRuntimePostTextPromise
                .mockReturnValueOnce({
                    promise: jest.fn().mockResolvedValue({
                        sessionAttributes: { step: '1', data: 'first' },
                        message: 'First response',
                    }),
                })
                .mockReturnValueOnce({
                    promise: jest.fn().mockResolvedValue({
                        sessionAttributes: { step: '2', data: 'second' },
                        message: 'Second response',
                    }),
                });

            const botClient = new LexClient(botContext, userContext);
            
            await botClient.speak('First message');
            expect(botClient['sessionAttributes']).toEqual({ step: '1', data: 'first' });
            
            await botClient.speak('Second message');
            expect(botClient['sessionAttributes']).toEqual({ step: '2', data: 'second' });
        });

        test('should use updated sessionAttributes in subsequent speak() calls', async () => {
            lexRuntimePostTextPromise.mockReturnValue({
                promise: jest.fn().mockResolvedValue({
                    sessionAttributes: { counter: '1' },
                    message: 'Response',
                }),
            });

            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('First');
            await botClient.speak('Second');
            
            expect(lexRuntimePostTextPromise).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    sessionAttributes: { counter: '1' },
                })
            );
        });
    });

    describe('fetch()', () => {
        test('should retrieve simple attribute from lastResponse', async () => {
            lexRuntimePostTextPromise.mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue({
                    sessionAttributes: { foo: 'bar' },
                    message: 'This is a mocked message.',
                }),
            });
            
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');
            
            const message = await botClient.fetch('message');
            expect(message).toBe('This is a mocked message.');
        });

        test('should retrieve nested attribute using dot notation', async () => {
            lexRuntimePostTextPromise.mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue({
                    sessionAttributes: { foo: 'bar' },
                    message: 'Response',
                }),
            });
            
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');
            
            const fooValue = await botClient.fetch('sessionAttributes.foo');
            expect(fooValue).toBe('bar');
        });

        test('should return undefined for non-existent attribute', async () => {
            lexRuntimePostTextPromise.mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue({
                    sessionAttributes: { foo: 'bar' },
                    message: 'Response',
                }),
            });
            
            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');
            
            const nonExistent = await botClient.fetch('nonExistent.path');
            expect(nonExistent).toBeUndefined();
        });

        test('should return undefined when lastResponse is null', async () => {
            const botClient = new LexClient(botContext, userContext);
            
            const result = await botClient.fetch('message');
            expect(result).toBeUndefined();
        });

        test('should retrieve deeply nested attributes', async () => {
            lexRuntimePostTextPromise.mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue({
                    sessionAttributes: { 
                        user: { 
                            profile: { 
                                name: 'Test User',
                                age: 30
                            } 
                        } 
                    },
                    message: 'Response',
                }),
            });

            const botClient = new LexClient(botContext, userContext);
            await botClient.speak('Hello');
            
            const userName = await botClient.fetch('sessionAttributes.user.profile.name');
            expect(userName).toBe('Test User');
            
            const userAge = await botClient.fetch('sessionAttributes.user.profile.age');
            expect(userAge).toBe(30);
        });
    });
});
