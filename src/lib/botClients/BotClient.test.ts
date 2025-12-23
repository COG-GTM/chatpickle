import { BotClient } from './BotClient';

class ConcreteBotClient extends BotClient {
    private lastInput: string = '';
    private mockResponse: string = 'Mock response';
    private mockAttributes: Record<string, string> = {};

    setMockResponse(response: string): void {
        this.mockResponse = response;
    }

    setMockAttributes(attributes: Record<string, string>): void {
        this.mockAttributes = attributes;
    }

    getLastInput(): string {
        return this.lastInput;
    }

    public async speak(inputText: string): Promise<string> {
        this.lastInput = inputText;
        return this.mockResponse;
    }

    public async fetch(attribute: string): Promise<string> {
        return this.mockAttributes[attribute] || '';
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
        test('should set botContext correctly', () => {
            const client = new ConcreteBotClient(botContext, userContext);
            expect(client.botContext).toBe(botContext);
        });

        test('should set userContext correctly', () => {
            const client = new ConcreteBotClient(botContext, userContext);
            expect(client.userContext).toBe(userContext);
        });

        test('should handle null botContext', () => {
            const client = new ConcreteBotClient(null, userContext);
            expect(client.botContext).toBeNull();
        });

        test('should handle null userContext', () => {
            const client = new ConcreteBotClient(botContext, null);
            expect(client.userContext).toBeNull();
        });

        test('should handle empty objects', () => {
            const client = new ConcreteBotClient({}, {});
            expect(client.botContext).toEqual({});
            expect(client.userContext).toEqual({});
        });
    });

    describe('initialize', () => {
        test('should return a resolved promise', async () => {
            const client = new ConcreteBotClient(botContext, userContext);
            await expect(client.initialize()).resolves.toBeUndefined();
        });

        test('should be callable multiple times', async () => {
            const client = new ConcreteBotClient(botContext, userContext);
            await client.initialize();
            await expect(client.initialize()).resolves.toBeUndefined();
        });
    });

    describe('speak (abstract method implementation)', () => {
        test('should return mock response', async () => {
            const client = new ConcreteBotClient(botContext, userContext);
            const response = await client.speak('Hello');
            expect(response).toBe('Mock response');
        });

        test('should store the input text', async () => {
            const client = new ConcreteBotClient(botContext, userContext);
            await client.speak('Test input');
            expect(client.getLastInput()).toBe('Test input');
        });

        test('should return custom mock response when set', async () => {
            const client = new ConcreteBotClient(botContext, userContext);
            client.setMockResponse('Custom response');
            const response = await client.speak('Hello');
            expect(response).toBe('Custom response');
        });

        test('should handle empty input', async () => {
            const client = new ConcreteBotClient(botContext, userContext);
            const response = await client.speak('');
            expect(response).toBe('Mock response');
            expect(client.getLastInput()).toBe('');
        });
    });

    describe('fetch (abstract method implementation)', () => {
        test('should return empty string for unknown attribute', async () => {
            const client = new ConcreteBotClient(botContext, userContext);
            const value = await client.fetch('unknownAttr');
            expect(value).toBe('');
        });

        test('should return attribute value when set', async () => {
            const client = new ConcreteBotClient(botContext, userContext);
            client.setMockAttributes({ testAttr: 'testValue' });
            const value = await client.fetch('testAttr');
            expect(value).toBe('testValue');
        });

        test('should handle multiple attributes', async () => {
            const client = new ConcreteBotClient(botContext, userContext);
            client.setMockAttributes({
                attr1: 'value1',
                attr2: 'value2',
                attr3: 'value3',
            });
            expect(await client.fetch('attr1')).toBe('value1');
            expect(await client.fetch('attr2')).toBe('value2');
            expect(await client.fetch('attr3')).toBe('value3');
        });
    });
});
