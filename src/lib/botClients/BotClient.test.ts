import { BotClient } from './BotClient';

// Concrete implementation for testing the abstract BotClient class
class TestBotClient extends BotClient {
    private lastInput: string | null = null;
    private attributes: Record<string, string> = {};

    public async speak(inputText: string): Promise<string> {
        this.lastInput = inputText;
        return `Echo: ${inputText}`;
    }

    public async fetch(attribute: string): Promise<string> {
        return this.attributes[attribute] || '';
    }

    public setAttributes(attrs: Record<string, string>): void {
        this.attributes = attrs;
    }

    public getLastInput(): string | null {
        return this.lastInput;
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

        it('should handle null values in context', () => {
            const nullBotContext = { botName: null, botAlias: undefined };
            const nullUserContext = { userId: null };
            const client = new TestBotClient(nullBotContext, nullUserContext);
            expect(client.botContext.botName).toBeNull();
            expect(client.botContext.botAlias).toBeUndefined();
            expect(client.userContext.userId).toBeNull();
        });
    });

    describe('initialize', () => {
        it('should return a resolved promise by default', async () => {
            const client = new TestBotClient(botContext, userContext);
            await expect(client.initialize()).resolves.toBeUndefined();
        });

        it('should be callable multiple times', async () => {
            const client = new TestBotClient(botContext, userContext);
            await client.initialize();
            await expect(client.initialize()).resolves.toBeUndefined();
        });
    });

    describe('speak (abstract method implementation)', () => {
        it('should process input text', async () => {
            const client = new TestBotClient(botContext, userContext);
            const result = await client.speak('Hello');
            expect(result).toBe('Echo: Hello');
        });

        it('should handle empty input', async () => {
            const client = new TestBotClient(botContext, userContext);
            const result = await client.speak('');
            expect(result).toBe('Echo: ');
        });

        it('should handle special characters', async () => {
            const client = new TestBotClient(botContext, userContext);
            const result = await client.speak('Hello! @#$%^&*()');
            expect(result).toBe('Echo: Hello! @#$%^&*()');
        });
    });

    describe('fetch (abstract method implementation)', () => {
        it('should return attribute value', async () => {
            const client = new TestBotClient(botContext, userContext);
            client.setAttributes({ testAttr: 'testValue' });
            const result = await client.fetch('testAttr');
            expect(result).toBe('testValue');
        });

        it('should return empty string for missing attribute', async () => {
            const client = new TestBotClient(botContext, userContext);
            const result = await client.fetch('nonExistent');
            expect(result).toBe('');
        });
    });
});
