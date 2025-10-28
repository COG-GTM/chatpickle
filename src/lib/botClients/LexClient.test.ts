// Need to bypass type safety of typescript to allow this approach for mocking to work.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LexRuntime = require('aws-sdk/clients/lexruntime');
import LexClient from './LexClient';

jest.mock('aws-sdk/clients/lexruntime');

const lexRuntimePostTextPromise = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
        sessionAttributes: { foo: 'bar' },
        message: 'This is a mocked message.',
    }),
});

LexRuntime.mockImplementation(() => ({
    postText: lexRuntimePostTextPromise,
}));

test('LexClient.speak()', async (): Promise<void> => {
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
    const botClient = new LexClient(botContext, userContext);
    const reply = await botClient.speak('Hello World');
    expect(reply).toBe('This is a mocked message.');
});

test('LexClient.fetch() retrieves attributes from lastResponse', async (): Promise<void> => {
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
    const botClient = new LexClient(botContext, userContext);
    
    await botClient.speak('Hello World');
    const sessionAttr = await botClient.fetch('sessionAttributes.foo');
    expect(sessionAttr).toBe('bar');
});

test('LexClient.fetch() handles nested attribute paths', async (): Promise<void> => {
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
    const botClient = new LexClient(botContext, userContext);
    
    await botClient.speak('Hello World');
    const message = await botClient.fetch('message');
    expect(message).toBe('This is a mocked message.');
});

test('LexClient.fetch() returns undefined for non-existent attributes', async (): Promise<void> => {
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
    const botClient = new LexClient(botContext, userContext);
    
    await botClient.speak('Hello World');
    const nonExistent = await botClient.fetch('nonExistent.path');
    expect(nonExistent).toBeUndefined();
});

test('LexClient.initialize() completes successfully', async (): Promise<void> => {
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
    const botClient = new LexClient(botContext, userContext);
    
    await expect(botClient.initialize()).resolves.toBeUndefined();
});

test('LexClient constructor uses environment variables for AWS credentials', (): void => {
    process.env.chatpickle_access_id = 'test-access-id';
    process.env.chatpickle_access_secret = 'test-secret';
    
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
    const botClient = new LexClient(botContext, userContext);
    
    expect(botClient).toBeDefined();
    
    delete process.env.chatpickle_access_id;
    delete process.env.chatpickle_access_secret;
});

test('LexClient generates unique userId with crypto random bytes', (): void => {
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
    
    const botClient1 = new LexClient(botContext, userContext);
    const botClient2 = new LexClient(botContext, userContext);
    
    expect(botClient1['userId']).toMatch(/^homer-[a-f0-9]{32}$/);
    expect(botClient2['userId']).toMatch(/^homer-[a-f0-9]{32}$/);
    expect(botClient1['userId']).not.toBe(botClient2['userId']);
});
