import { BotClient } from './BotClient';

class ConcreteBotClient extends BotClient {
    public async speak(inputText: string): Promise<string> {
        return `Echo: ${inputText}`;
    }

    public async fetch(attribute: string): Promise<string> {
        return `Fetched: ${attribute}`;
    }
}

describe('BotClient', () => {
    describe('constructor', () => {
        it('should set botContext and userContext', () => {
            const botContext = { botName: 'TestBot', region: 'us-east-1' };
            const userContext = { userId: 'testUser', userAttributes: { name: 'Test' } };

            const client = new ConcreteBotClient(botContext, userContext);

            expect(client.botContext).toBe(botContext);
            expect(client.userContext).toBe(userContext);
        });

        it('should handle empty contexts', () => {
            const client = new ConcreteBotClient({}, {});

            expect(client.botContext).toEqual({});
            expect(client.userContext).toEqual({});
        });

        it('should handle null values in contexts', () => {
            const botContext = { botName: null, region: undefined };
            const userContext = { userId: null };

            const client = new ConcreteBotClient(botContext, userContext);

            expect(client.botContext.botName).toBeNull();
            expect(client.botContext.region).toBeUndefined();
            expect(client.userContext.userId).toBeNull();
        });
    });

    describe('initialize', () => {
        it('should return a resolved promise by default', async () => {
            const client = new ConcreteBotClient({}, {});

            const result = await client.initialize();

            expect(result).toBeUndefined();
        });

        it('should be callable multiple times', async () => {
            const client = new ConcreteBotClient({}, {});

            await client.initialize();
            await client.initialize();
            const result = await client.initialize();

            expect(result).toBeUndefined();
        });
    });

    describe('abstract methods implementation', () => {
        it('should call speak method on concrete implementation', async () => {
            const client = new ConcreteBotClient({}, {});

            const result = await client.speak('Hello');

            expect(result).toBe('Echo: Hello');
        });

        it('should call fetch method on concrete implementation', async () => {
            const client = new ConcreteBotClient({}, {});

            const result = await client.fetch('someAttribute');

            expect(result).toBe('Fetched: someAttribute');
        });
    });
});
