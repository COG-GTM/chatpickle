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
    test('constructor sets botContext and userContext', () => {
        const botContext = { botName: 'TestBot' };
        const userContext = { userId: 'testUser' };

        const botClient = new TestBotClient(botContext, userContext);

        expect(botClient.botContext).toBe(botContext);
        expect(botClient.userContext).toBe(userContext);
    });

    test('initialize method returns Promise<void>', async () => {
        const botContext = { botName: 'TestBot' };
        const userContext = { userId: 'testUser' };

        const botClient = new TestBotClient(botContext, userContext);

        await expect(botClient.initialize()).resolves.toBeUndefined();
    });

    test('speak method is abstract and must be implemented', async () => {
        const botContext = { botName: 'TestBot' };
        const userContext = { userId: 'testUser' };

        const botClient = new TestBotClient(botContext, userContext);

        const result = await botClient.speak('test input');
        expect(result).toBe('Echo: test input');
    });

    test('fetch method is abstract and must be implemented', async () => {
        const botContext = { botName: 'TestBot' };
        const userContext = { userId: 'testUser' };

        const botClient = new TestBotClient(botContext, userContext);

        const result = await botClient.fetch('test.attribute');
        expect(result).toBe('Fetched: test.attribute');
    });
});
