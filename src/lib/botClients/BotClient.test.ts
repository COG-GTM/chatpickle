import { BotClient } from './BotClient';

class TestBotClient extends BotClient {
    public speakResponse = 'Test response';
    public fetchResponse = 'Test attribute';

    public async speak(inputText: string): Promise<string> {
        return `${this.speakResponse}: ${inputText}`;
    }

    public async fetch(attribute: string): Promise<string> {
        return `${this.fetchResponse}: ${attribute}`;
    }
}

describe('BotClient', () => {
    const botContext = {
        botName: 'TestBot',
        botAlias: 'test',
    };
    const userContext = {
        userId: 'testUser',
        userAttributes: {
            name: 'Test User',
        },
    };

    describe('constructor', () => {
        test('should store botContext', () => {
            const client = new TestBotClient(botContext, userContext);
            expect(client.botContext).toEqual(botContext);
        });

        test('should store userContext', () => {
            const client = new TestBotClient(botContext, userContext);
            expect(client.userContext).toEqual(userContext);
        });

        test('should handle empty contexts', () => {
            const client = new TestBotClient({}, {});
            expect(client.botContext).toEqual({});
            expect(client.userContext).toEqual({});
        });

        test('should handle null values in context', () => {
            const contextWithNull = {
                botName: null,
                botAlias: 'test',
            };
            const client = new TestBotClient(contextWithNull, userContext);
            expect(client.botContext.botName).toBeNull();
        });
    });

    describe('initialize', () => {
        test('should return a resolved promise by default', async () => {
            const client = new TestBotClient(botContext, userContext);
            await expect(client.initialize()).resolves.toBeUndefined();
        });

        test('should be callable multiple times', async () => {
            const client = new TestBotClient(botContext, userContext);
            await client.initialize();
            await client.initialize();
            await expect(client.initialize()).resolves.toBeUndefined();
        });
    });

    describe('abstract methods', () => {
        test('speak should be implemented by subclass', async () => {
            const client = new TestBotClient(botContext, userContext);
            const result = await client.speak('Hello');
            expect(result).toBe('Test response: Hello');
        });

        test('fetch should be implemented by subclass', async () => {
            const client = new TestBotClient(botContext, userContext);
            const result = await client.fetch('someAttribute');
            expect(result).toBe('Test attribute: someAttribute');
        });
    });
});
