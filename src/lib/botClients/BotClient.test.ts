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
    test('should store botContext and userContext', () => {
        const botContext = { botName: 'TestBot' };
        const userContext = { userId: 'test123' };
        
        const client = new TestBotClient(botContext, userContext);
        
        expect(client.botContext).toBe(botContext);
        expect(client.userContext).toBe(userContext);
    });

    test('initialize should resolve without error', async () => {
        const client = new TestBotClient({}, {});
        
        await expect(client.initialize()).resolves.toBeUndefined();
    });

    test('speak should be implemented by subclass', async () => {
        const client = new TestBotClient({}, {});
        const reply = await client.speak('Hello');
        
        expect(reply).toBe('Echo: Hello');
    });

    test('fetch should be implemented by subclass', async () => {
        const client = new TestBotClient({}, {});
        const value = await client.fetch('testAttribute');
        
        expect(value).toBe('Fetched: testAttribute');
    });
});
