import { BotClient } from './BotClient';

class TestBotClient extends BotClient {
    public async speak(inputText: string): Promise<string> {
        return `Echo: ${inputText}`;
    }
    
    public async fetch(attribute: string): Promise<string> {
        return `Fetched: ${attribute}`;
    }
}

test('BotClient constructor sets botContext and userContext', (): void => {
    const botContext = { botName: 'TestBot' };
    const userContext = { userId: 'testUser' };
    
    const botClient = new TestBotClient(botContext, userContext);
    
    expect(botClient.botContext).toEqual(botContext);
    expect(botClient.userContext).toEqual(userContext);
});

test('BotClient.initialize() returns void by default', async (): Promise<void> => {
    const botContext = { botName: 'TestBot' };
    const userContext = { userId: 'testUser' };
    
    const botClient = new TestBotClient(botContext, userContext);
    
    await expect(botClient.initialize()).resolves.toBeUndefined();
});

test('BotClient subclass must implement speak()', async (): Promise<void> => {
    const botContext = { botName: 'TestBot' };
    const userContext = { userId: 'testUser' };
    
    const botClient = new TestBotClient(botContext, userContext);
    
    const response = await botClient.speak('Hello');
    expect(response).toBe('Echo: Hello');
});

test('BotClient subclass must implement fetch()', async (): Promise<void> => {
    const botContext = { botName: 'TestBot' };
    const userContext = { userId: 'testUser' };
    
    const botClient = new TestBotClient(botContext, userContext);
    
    const result = await botClient.fetch('attribute.path');
    expect(result).toBe('Fetched: attribute.path');
});
