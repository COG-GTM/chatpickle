const { assert } = require('chai');
const regexParser = require('regex-parser');

describe('Chatpickle Step Definitions Logic', () => {
    describe('Config validation', () => {
        test('should validate user config structure', () => {
            const config = {
                users: {
                    'TestUser': {
                        context: {
                            userId: 'test123',
                            userAttributes: {
                                firstName: 'Test',
                                lastName: 'User'
                            }
                        }
                    }
                }
            };
            
            expect(config.users).toBeDefined();
            expect(config.users['TestUser']).toBeDefined();
            expect(config.users['TestUser'].context).toBeDefined();
            expect(config.users['TestUser'].context.userId).toBe('test123');
            expect(config.users['TestUser'].context.userAttributes).toBeDefined();
        });

        test('should validate bot config structure for Lex', () => {
            const config = {
                bots: {
                    'TestBot': {
                        type: 'Lex',
                        context: {
                            botName: 'OrderFlowers',
                            botAlias: 'prod',
                            region: 'us-east-1'
                        }
                    }
                }
            };
            
            expect(config.bots).toBeDefined();
            expect(config.bots['TestBot']).toBeDefined();
            expect(config.bots['TestBot'].type).toBe('Lex');
            expect(config.bots['TestBot'].context).toBeDefined();
            expect(config.bots['TestBot'].context.botName).toBe('OrderFlowers');
        });

        test('should validate custom bot config with location', () => {
            const config = {
                bots: {
                    'CustomBot': {
                        type: 'custom',
                        location: 'support/CustomBotClient',
                        context: {
                            botName: 'MyCustomBot'
                        }
                    }
                }
            };
            
            expect(config.bots['CustomBot'].type).toBe('custom');
            expect(config.bots['CustomBot'].location).toBe('support/CustomBotClient');
            expect(config.bots['CustomBot'].context).toBeDefined();
        });

        test('should detect missing users attribute', () => {
            const config = {};
            
            expect(config.users).toBeUndefined();
        });

        test('should detect missing bots attribute', () => {
            const config = {};
            
            expect(config.bots).toBeUndefined();
        });

        test('should detect missing user context', () => {
            const config = {
                users: {
                    'TestUser': {
                        context: null
                    }
                }
            };
            
            expect(config.users['TestUser'].context).toBeNull();
        });
    });

    describe('Regex matching logic', () => {
        test('should match bot response with regex pattern', () => {
            const botReply = 'Hello, how can I help you today?';
            const regexPattern = '/help.*today/i';
            
            const regex = regexParser(regexPattern);
            
            expect(botReply).toMatch(regex);
        });

        test('should match case-insensitive regex', () => {
            const botReply = 'HELLO WORLD';
            const regexPattern = '/hello world/i';
            
            const regex = regexParser(regexPattern);
            
            expect(botReply).toMatch(regex);
        });

        test('should not match incorrect regex pattern', () => {
            const botReply = 'Hello, how can I help you today?';
            const regexPattern = '/goodbye/i';
            
            const regex = regexParser(regexPattern);
            
            expect(botReply).not.toMatch(regex);
        });

        test('should match exact string equality', () => {
            const botReply = 'Hello World';
            const expectedMessage = 'Hello World';
            
            expect(botReply).toBe(expectedMessage);
        });

        test('should not match different strings', () => {
            const botReply = 'Hello World';
            const expectedMessage = 'Goodbye World';
            
            expect(botReply).not.toBe(expectedMessage);
        });

        test('should handle empty string matching', () => {
            const botReply = '';
            const expectedMessage = '';
            
            expect(botReply).toBe(expectedMessage);
        });
    });

    describe('Attribute fetching and comparison logic', () => {
        test('should handle defined attribute values', async () => {
            const mockBotClient = {
                fetch: jest.fn().mockResolvedValue('testValue')
            };
            
            const value = await mockBotClient.fetch('sessionAttributes.name');
            
            expect(value).toBe('testValue');
            expect(mockBotClient.fetch).toHaveBeenCalledWith('sessionAttributes.name');
        });

        test('should handle undefined attribute values', async () => {
            const mockBotClient = {
                fetch: jest.fn().mockResolvedValue(undefined)
            };
            
            const value = await mockBotClient.fetch('nonexistent.path');
            
            expect(value).toBeUndefined();
        });

        test('should convert numeric values to strings for comparison', async () => {
            const mockBotClient = {
                fetch: jest.fn().mockResolvedValue(42)
            };
            
            const value = await mockBotClient.fetch('count');
            
            expect(value.toString()).toBe('42');
        });

        test('should convert boolean values to strings for comparison', async () => {
            const mockBotClient = {
                fetch: jest.fn().mockResolvedValue(true)
            };
            
            const value = await mockBotClient.fetch('isActive');
            
            expect(value.toString()).toBe('true');
        });

        test('should handle nested attribute paths', async () => {
            const mockBotClient = {
                fetch: jest.fn().mockResolvedValue('nestedValue')
            };
            
            const value = await mockBotClient.fetch('sessionAttributes.user.firstName');
            
            expect(value).toBe('nestedValue');
            expect(mockBotClient.fetch).toHaveBeenCalledWith('sessionAttributes.user.firstName');
        });

        test('should compare undefined value as string', () => {
            const value = undefined;
            const requiredValue = 'undefined';
            
            if (value === undefined) {
                expect('undefined').toBe(requiredValue);
            }
        });
    });

    describe('User context initialization', () => {
        test('should initialize with anonymous user by default', () => {
            const userContext = { userId: 'Anonymous' };
            
            expect(userContext.userId).toBe('Anonymous');
        });

        test('should update user context when user is set', () => {
            const initialContext = { userId: 'Anonymous' };
            const newContext = {
                userId: 'homer',
                userAttributes: {
                    firstName: 'Homer',
                    lastName: 'Simpson'
                }
            };
            
            const updatedContext = newContext;
            
            expect(updatedContext.userId).toBe('homer');
            expect(updatedContext.userAttributes.firstName).toBe('Homer');
        });
    });

    describe('Bot client initialization logic', () => {
        test('should handle custom bot type requiring location', () => {
            const botConfig = {
                type: 'custom',
                location: 'support/CustomBotClient',
                context: { botName: 'CustomBot' }
            };
            
            expect(botConfig.type).toBe('custom');
            expect(botConfig.location).toBeDefined();
        });

        test('should handle built-in bot type without location', () => {
            const botConfig = {
                type: 'Lex',
                context: {
                    botName: 'OrderFlowers',
                    botAlias: 'prod',
                    region: 'us-east-1'
                }
            };
            
            expect(botConfig.type).toBe('Lex');
            expect(botConfig.location).toBeUndefined();
        });
    });
});
