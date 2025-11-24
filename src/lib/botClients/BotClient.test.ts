import { BotClient } from './BotClient';

class TestBotClient extends BotClient {
    public async speak(inputText: string): Promise<string> {
        return `Echo: ${inputText}`;
    }

    public async fetch(attribute: string): Promise<string> {
        return `Fetched: ${attribute}`;
    }
}

describe('BotClient', () => {
    const botContext = {
        botName: 'TestBot',
        botAlias: 'test',
        region: 'us-east-1',
    };

    const userContext = {
        userId: 'testUser',
        userAttributes: {
            firstName: 'Test',
            lastName: 'User',
        },
    };

    describe('constructor', () => {
        it('should store botContext and userContext', () => {
            const client = new TestBotClient(botContext, userContext);

            expect(client.botContext).toBe(botContext);
            expect(client.userContext).toBe(userContext);
        });

        it('should handle empty contexts', () => {
            const client = new TestBotClient({}, {});

            expect(client.botContext).toEqual({});
            expect(client.userContext).toEqual({});
        });

        it('should handle null values in contexts', () => {
            const nullBotContext = { botName: null, botAlias: undefined };
            const nullUserContext = { userId: null, userAttributes: undefined };
            const client = new TestBotClient(nullBotContext, nullUserContext);

            expect(client.botContext).toBe(nullBotContext);
            expect(client.userContext).toBe(nullUserContext);
        });
    });

    describe('initialize', () => {
        it('should return a resolved promise by default', async () => {
            const client = new TestBotClient(botContext, userContext);

            const result = await client.initialize();

            expect(result).toBeUndefined();
        });

        it('should be callable multiple times', async () => {
            const client = new TestBotClient(botContext, userContext);

            await client.initialize();
            await client.initialize();

            expect(true).toBe(true);
        });
    });

    describe('abstract methods implementation', () => {
        it('should call speak method correctly', async () => {
            const client = new TestBotClient(botContext, userContext);

            const result = await client.speak('Hello');

            expect(result).toBe('Echo: Hello');
        });

        it('should call fetch method correctly', async () => {
            const client = new TestBotClient(botContext, userContext);

            const result = await client.fetch('someAttribute');

            expect(result).toBe('Fetched: someAttribute');
        });
    });
});
