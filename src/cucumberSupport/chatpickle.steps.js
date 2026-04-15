/**
 * chatpickle.steps.js
 *
 * Core Cucumber step definitions for the Chatpickle conversational-bot testing
 * framework. This file registers the BDD steps that map Gherkin feature-file
 * syntax to bot interactions, enabling users to write human-readable test
 * scenarios that exercise chatbot conversations.
 *
 * Step overview:
 *   Before          – Resets per-scenario state (user context, bot client, last reply).
 *   Given "the user is {string}"
 *                   – Loads a named user profile from chatpickle.config.json.
 *   Given "the user begins a new chat with {string}"
 *                   – Instantiates the appropriate BotClient (built-in or custom)
 *                     and opens a new conversation session.
 *   When  "User: <text>"
 *                   – Sends user input to the bot and stores the reply.
 *   Then  "Bot: <text>"
 *                   – Asserts the bot's reply matches an exact string or regex.
 *   Then  "<attribute> equals <value>"
 *                   – Asserts an attribute from the bot's last raw response.
 *
 * Configuration:
 *   Reads the consumer project's chatpickle.config.json (resolved via the
 *   CHATPICKLE_CONSUMER_PATH_ABSOLUTE environment variable set by cli.ts).
 *   The config must define `bots` and (optionally) `users` sections.
 *
 * @see {@link ../lib/botClients/BotClient.ts} for the abstract client interface
 * @see {@link ../../examples} for sample feature files and configurations
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { Before, Given, When, Then, setDefaultTimeout } = require('cucumber');
const { assert } = require('chai');
const regexParser = require("regex-parser");

/**
 * Load the consumer project's chatpickle configuration file.
 * The absolute path is set by cli.ts based on the --cpPath argument or cwd.
 */
const CHATPICKLE_CONFIG = require(`${process.env.CHATPICKLE_CONSUMER_PATH_ABSOLUTE}/chatpickle.config`);

/** Default timeout (in ms) applied to every Cucumber step to prevent hangs on unresponsive bots. */
const CUCUMBER_STEPS_TIMEOUT_MILLISECONDS = 30000;
setDefaultTimeout(CUCUMBER_STEPS_TIMEOUT_MILLISECONDS);

/**
 * Before hook – runs before each Cucumber scenario to reset shared state.
 *
 * Initialises:
 *   - this.userContext  – defaults to an anonymous user; overridden by "the user is" step.
 *   - this.botClient    – the BotClient instance; set by "the user begins a new chat with" step.
 *   - this.botReply     – the most recent textual reply from the bot; set by the "User:" step.
 */
Before(function() {
    this.userContext = { userId: 'Anonymous' };
    this.botClient = null;
    this.botReply = null;
});

/**
 * Step: Given the user is "<userName>"
 *
 * Loads a named user profile from the `users` section of chatpickle.config.json
 * and stores it in this.userContext for the remainder of the scenario.
 *
 * Expected config structure:
 *   {
 *     "users": {
 *       "<userName>": {
 *         "context": {
 *           "userId": "some-id",
 *           "userAttributes": { ... }
 *         }
 *       }
 *     }
 *   }
 *
 * @param {string} userName – key in the config's `users` map
 * @throws {AssertionError} if any required config fields are missing
 */
Given('the user is {string}', function(userName) {
    assert.ok(CHATPICKLE_CONFIG.users, `Missing chatpickle.config.json attribute users`);
    const userConfig = CHATPICKLE_CONFIG.users[userName];

    assert.ok(userConfig, `Missing config for users.${userName}`);
    assert.ok(userConfig.context, `Missing config for users.${userName}.context`);
    assert.ok(userConfig.context.userId, `Missing config for users.${userName}.context.userId`);
    assert.ok(userConfig.context.userAttributes, `Missing config for users.${userName}.context.userAttributes`);

    this.userContext = userConfig.context;
});

/**
 * Step: Given the user begins a new chat with "<botName>"
 *
 * Looks up the bot in the `bots` section of chatpickle.config.json, dynamically
 * loads the corresponding BotClient subclass, and opens a new conversation.
 *
 * Bot resolution logic:
 *   - type === "custom" : loads the class from the file path specified by
 *     `botConfig.location`, resolved relative to the consumer project root.
 *   - any other type    : loads a built-in client from ../lib/botClients/<type>Client
 *     (e.g. type "Lex" resolves to LexClient).
 *
 * Expected config structure:
 *   {
 *     "bots": {
 *       "<botName>": {
 *         "type": "Lex" | "custom",
 *         "location": "path/to/CustomBotClient.js",  // required when type is "custom"
 *         "context": { ... }                          // platform-specific settings
 *       }
 *     }
 *   }
 *
 * @param {string} botName – key in the config's `bots` map
 * @throws {AssertionError} if any required config fields are missing
 */
Given('the user begins a new chat with {string}', async function(botName) {
    assert.ok(CHATPICKLE_CONFIG.bots, `Missing chatpickle.config.json attribute bots`);
    const botConfig = CHATPICKLE_CONFIG.bots[botName];

    assert.ok(botConfig, `Missing config for bots.${botName}`);
    assert.ok(botConfig.type, `Missing config for bots.${botName}.type`);
    assert.ok(botConfig.context, `Missing config for bots.${botName}.context`);

    let BotSubclass;
    if (botConfig.type === 'custom') {
        // Custom bots are loaded from the consumer project's own source tree.
        assert.ok(botConfig.location, `Missing config for bots.${botName}.location`);
        BotSubclass = require(`${process.env.CHATPICKLE_CONSUMER_PATH_ABSOLUTE}/${botConfig.location}`).default;
    } else {
        // Built-in clients follow the naming convention <type>Client (e.g. LexClient).
        BotSubclass = require(`../lib/botClients/${botConfig.type}Client`).default;
    }

    this.botClient = new BotSubclass(botConfig.context, this.userContext);

    await this.botClient.initialize();
});

/**
 * Step: When User: <inputText>
 *
 * Sends the captured text to the bot via BotClient.speak() and stores the
 * textual reply in this.botReply for subsequent "Then" assertions.
 *
 * The regex /User:\s*([^\n\r]*)/i captures everything after "User:" on the
 * same line, trimming leading whitespace.
 *
 * @param {string} inputText – the user utterance to send to the bot
 */
When(/User:\s*([^\n\r]*)/i, async function(inputText) {
    this.botReply = await this.botClient.speak(inputText);
});

/**
 * Step: Then Bot: <botMessage>
 *
 * Asserts the bot's most recent reply matches the expected value.
 *
 * Matching behaviour:
 *   - If botMessage starts with '/' it is treated as a regular expression
 *     (parsed by regex-parser) and checked with assert.match().
 *   - Otherwise it is compared as a literal string with assert.equal().
 *
 * Examples in Gherkin:
 *   Then Bot: Hello! How can I help?
 *   Then Bot: /Hello.*help/
 *
 * @param {string} botMessage – expected reply (literal string or /regex/)
 */
Then(/Bot:\s*([^\n\r]*)/i, function(botMessage) {
    if (botMessage[0] === '/') {
        // It's a regular expression, use match.
        assert.match(this.botReply, regexParser(botMessage));
    } else {
        // It's a string, use strict equality.
        assert.equal(this.botReply, botMessage);
    }
});

/**
 * Step: Then <attributePath> equals <requiredValue>
 *
 * Fetches a value from the bot's last raw response using BotClient.fetch()
 * (which uses lodash.get-style dot-notation paths) and asserts it equals
 * the expected value.
 *
 * The regex accepts several comparison operators so Gherkin reads naturally:
 *   =, ==, ===, equals, is equal to, contains
 *
 * Attribute paths and values may optionally be wrapped in single or double
 * quotes for readability.
 *
 * If the fetched value is undefined, it is compared against the string
 * "undefined" to allow explicit assertions on missing attributes.
 *
 * Examples in Gherkin:
 *   Then intentName === ReadyForFulfillment
 *   Then "dialogState" equals "Fulfilled"
 *   Then 'sessionAttributes.bookingDate' is equal to '2024-01-15'
 *
 * @param {string} attributePath  – lodash.get-style path into the raw response
 * @param {string} requiredValue  – expected string value
 */
Then(/["']?([^"']+)["']?\s+(?:=|==|===|equals|is equal to|contains)\s+["']?([^"']*)["']?/i,
    async function(attributePath, requiredValue) {
    const value = await this.botClient.fetch(attributePath);
    if (value === undefined) {
        assert.equal('undefined', requiredValue);
    } else {
        assert.equal(value.toString(), requiredValue);
    }
});
