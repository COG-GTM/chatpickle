const { assert } = require('chai');

jest.mock('cucumber', () => ({
    Before: jest.fn((fn) => fn),
    Given: jest.fn(),
    When: jest.fn(),
    Then: jest.fn(),
    setDefaultTimeout: jest.fn(),
}));

const originalEnv = process.env;

describe('Cucumber Step Definitions', () => {
    let mockWorld;
    let mockConfig;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockWorld = {
            userContext: null,
            botClient: null,
            botReply: null,
        };

        mockConfig = {
            users: {
                homer: {
                    context: {
                        userId: 'homer',
                        userAttributes: {
                            firstName: 'Homer',
                            lastName: 'Simpson',
                            address: 'Springfield',
                        },
                    },
                },
            },
            bots: {
                TestBot: {
                    type: 'Lex',
                    context: {
                        botName: 'TestBot',
                        botAlias: 'prod',
                        region: 'us-east-1',
                    },
                },
                CustomBot: {
                    type: 'custom',
                    location: 'chatpickle/support/CustomBotClient.js',
                    context: {
                        botName: 'CustomBot',
                    },
                },
            },
        };

        process.env = { ...originalEnv };
        process.env.CHATPICKLE_CONSUMER_PATH_ABSOLUTE = '/mock/path';

        jest.doMock('/mock/path/chatpickle.config', () => mockConfig, { virtual: true });
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.resetModules();
    });

    describe('Before hook', () => {
        test('initializes world context', () => {
            const { Before } = require('cucumber');
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const beforeFn = Before.mock.calls[0][0];
            const world = {};
            beforeFn.call(world);

            expect(world.userContext).toEqual({ userId: 'Anonymous' });
            expect(world.botClient).toBeNull();
            expect(world.botReply).toBeNull();
        });
    });

    describe('Given the user is', () => {
        test('sets user context from config', () => {
            const { Given } = require('cucumber');
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const givenUserFn = Given.mock.calls.find(
                call => call[0] === 'the user is {string}'
            )[1];

            givenUserFn.call(mockWorld, 'homer');

            expect(mockWorld.userContext).toEqual(mockConfig.users.homer.context);
        });

        test('throws error for missing users config', () => {
            const { Given } = require('cucumber');
            mockConfig.users = undefined;
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const givenUserFn = Given.mock.calls.find(
                call => call[0] === 'the user is {string}'
            )[1];

            expect(() => {
                givenUserFn.call(mockWorld, 'homer');
            }).toThrow();
        });

        test('throws error for missing user', () => {
            const { Given } = require('cucumber');
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const givenUserFn = Given.mock.calls.find(
                call => call[0] === 'the user is {string}'
            )[1];

            expect(() => {
                givenUserFn.call(mockWorld, 'nonexistent');
            }).toThrow();
        });

        test('throws error for missing user context', () => {
            const { Given } = require('cucumber');
            mockConfig.users.homer.context = undefined;
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const givenUserFn = Given.mock.calls.find(
                call => call[0] === 'the user is {string}'
            )[1];

            expect(() => {
                givenUserFn.call(mockWorld, 'homer');
            }).toThrow();
        });
    });

    describe('Given the user begins a new chat with', () => {
        test('initializes built-in bot client', async () => {
            const { Given } = require('cucumber');
            
            const mockBotClient = {
                initialize: jest.fn().mockResolvedValue(undefined),
            };

            jest.doMock('../lib/botClients/LexClient', () => ({
                default: jest.fn(() => mockBotClient),
            }), { virtual: true });
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const givenChatFn = Given.mock.calls.find(
                call => call[0] === 'the user begins a new chat with {string}'
            )[1];

            mockWorld.userContext = mockConfig.users.homer.context;
            await givenChatFn.call(mockWorld, 'TestBot');

            expect(mockWorld.botClient).toBe(mockBotClient);
            expect(mockBotClient.initialize).toHaveBeenCalled();
        });

        test('throws error for missing bots config', async () => {
            const { Given } = require('cucumber');
            mockConfig.bots = undefined;
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const givenChatFn = Given.mock.calls.find(
                call => call[0] === 'the user begins a new chat with {string}'
            )[1];

            await expect(async () => {
                await givenChatFn.call(mockWorld, 'TestBot');
            }).rejects.toThrow();
        });

        test('throws error for missing bot', async () => {
            const { Given } = require('cucumber');
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const givenChatFn = Given.mock.calls.find(
                call => call[0] === 'the user begins a new chat with {string}'
            )[1];

            await expect(async () => {
                await givenChatFn.call(mockWorld, 'NonexistentBot');
            }).rejects.toThrow();
        });

        test('throws error for custom bot without location', async () => {
            const { Given } = require('cucumber');
            mockConfig.bots.CustomBot.location = undefined;
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const givenChatFn = Given.mock.calls.find(
                call => call[0] === 'the user begins a new chat with {string}'
            )[1];

            await expect(async () => {
                await givenChatFn.call(mockWorld, 'CustomBot');
            }).rejects.toThrow();
        });
    });

    describe('When User:', () => {
        test('calls speak method on bot client', async () => {
            const { When } = require('cucumber');
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const whenUserFn = When.mock.calls.find(
                call => call[0].toString().includes('User:')
            )[1];

            const mockBotClient = {
                speak: jest.fn().mockResolvedValue('Bot response'),
            };
            mockWorld.botClient = mockBotClient;

            await whenUserFn.call(mockWorld, 'Hello bot');

            expect(mockBotClient.speak).toHaveBeenCalledWith('Hello bot');
            expect(mockWorld.botReply).toBe('Bot response');
        });
    });

    describe('Then Bot:', () => {
        test('matches exact string', () => {
            const { Then } = require('cucumber');
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const thenBotFn = Then.mock.calls.find(
                call => call[0].toString().includes('Bot:')
            )[1];

            mockWorld.botReply = 'Expected message';

            expect(() => {
                thenBotFn.call(mockWorld, 'Expected message');
            }).not.toThrow();
        });

        test('throws error for non-matching string', () => {
            const { Then } = require('cucumber');
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const thenBotFn = Then.mock.calls.find(
                call => call[0].toString().includes('Bot:')
            )[1];

            mockWorld.botReply = 'Actual message';

            expect(() => {
                thenBotFn.call(mockWorld, 'Expected message');
            }).toThrow();
        });

        test('matches regex pattern', () => {
            const { Then } = require('cucumber');
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const thenBotFn = Then.mock.calls.find(
                call => call[0].toString().includes('Bot:')
            )[1];

            mockWorld.botReply = 'Hello World 123';

            expect(() => {
                thenBotFn.call(mockWorld, '/Hello World \\d+/');
            }).not.toThrow();
        });

        test('throws error for non-matching regex', () => {
            const { Then } = require('cucumber');
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const thenBotFn = Then.mock.calls.find(
                call => call[0].toString().includes('Bot:')
            )[1];

            mockWorld.botReply = 'Hello World';

            expect(() => {
                thenBotFn.call(mockWorld, '/Hello World \\d+/');
            }).toThrow();
        });
    });

    describe('Then attribute equals', () => {
        test('fetches and compares value', async () => {
            const { Then } = require('cucumber');
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const thenAttributeFn = Then.mock.calls.find(
                call => call[0].toString().includes('equals')
            )[1];

            const mockBotClient = {
                fetch: jest.fn().mockResolvedValue('expectedValue'),
            };
            mockWorld.botClient = mockBotClient;

            await thenAttributeFn.call(mockWorld, 'sessionAttributes.foo', 'expectedValue');

            expect(mockBotClient.fetch).toHaveBeenCalledWith('sessionAttributes.foo');
        });

        test('handles undefined values', async () => {
            const { Then } = require('cucumber');
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const thenAttributeFn = Then.mock.calls.find(
                call => call[0].toString().includes('equals')
            )[1];

            const mockBotClient = {
                fetch: jest.fn().mockResolvedValue(undefined),
            };
            mockWorld.botClient = mockBotClient;

            await thenAttributeFn.call(mockWorld, 'nonexistent.path', 'undefined');

            expect(mockBotClient.fetch).toHaveBeenCalledWith('nonexistent.path');
        });

        test('converts values to string for comparison', async () => {
            const { Then } = require('cucumber');
            
            delete require.cache[require.resolve('./chatpickle.steps.js')];
            require('./chatpickle.steps.js');

            const thenAttributeFn = Then.mock.calls.find(
                call => call[0].toString().includes('equals')
            )[1];

            const mockBotClient = {
                fetch: jest.fn().mockResolvedValue(123),
            };
            mockWorld.botClient = mockBotClient;

            await thenAttributeFn.call(mockWorld, 'numericValue', '123');

            expect(mockBotClient.fetch).toHaveBeenCalledWith('numericValue');
        });
    });
});
