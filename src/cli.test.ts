describe('CLI argument parsing', () => {
    const originalArgv = process.argv;
    const originalCwd = process.cwd;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.argv = ['node', 'cli.js'];
        process.env = { ...originalEnv };
        delete process.env.CHATPICKLE_CONSUMER_PATH_ABSOLUTE;
    });

    afterEach(() => {
        process.argv = originalArgv;
        process.cwd = originalCwd;
        process.env = originalEnv;
    });

    describe('parseCliArgs helper', () => {
        function parseCliArgs(args: string[]): {
            consumerPathArg: string | undefined;
            featureFilePathDetected: boolean;
            passthruArgs: string[];
        } {
            const passthruArgs = args;
            let consumerPathArg: string | undefined;
            let featureFilePathDetected = false;

            for (let i = 0; i < passthruArgs.length; i++) {
                const arg = passthruArgs[i];
                if (arg === '--cpPath') {
                    consumerPathArg = passthruArgs[i + 1];
                }
                if (arg[0] === '-') {
                    i++;
                    continue;
                } else {
                    featureFilePathDetected = true;
                }
            }

            return { consumerPathArg, featureFilePathDetected, passthruArgs };
        }

        describe('--cpPath argument', () => {
            test('should extract cpPath value when provided', () => {
                const result = parseCliArgs(['--cpPath', 'examples/lex/']);
                expect(result.consumerPathArg).toBe('examples/lex/');
            });

            test('should return undefined when --cpPath not provided', () => {
                const result = parseCliArgs(['--format', 'json']);
                expect(result.consumerPathArg).toBeUndefined();
            });

            test('should handle --cpPath at different positions', () => {
                const result = parseCliArgs(['--format', 'json', '--cpPath', 'custom/path/']);
                expect(result.consumerPathArg).toBe('custom/path/');
            });

            test('should handle --cpPath as last argument pair', () => {
                const result = parseCliArgs(['--other', 'value', '--cpPath', 'path/']);
                expect(result.consumerPathArg).toBe('path/');
            });
        });

        describe('feature file path detection', () => {
            test('should detect feature file path when non-parameterized argument exists', () => {
                const result = parseCliArgs(['features/test.feature']);
                expect(result.featureFilePathDetected).toBe(true);
            });

            test('should not detect feature file path when only parameterized arguments', () => {
                const result = parseCliArgs(['--cpPath', 'examples/lex/', '--format', 'json']);
                expect(result.featureFilePathDetected).toBe(false);
            });

            test('should detect feature file path mixed with parameters', () => {
                const result = parseCliArgs(['--format', 'json', 'my-features/']);
                expect(result.featureFilePathDetected).toBe(true);
            });

            test('should handle empty arguments', () => {
                const result = parseCliArgs([]);
                expect(result.featureFilePathDetected).toBe(false);
                expect(result.consumerPathArg).toBeUndefined();
            });
        });

        describe('passthruArgs', () => {
            test('should preserve all arguments', () => {
                const args = ['--cpPath', 'path/', '--format', 'json', 'features/'];
                const result = parseCliArgs(args);
                expect(result.passthruArgs).toEqual(args);
            });

            test('should handle single argument', () => {
                const result = parseCliArgs(['features/']);
                expect(result.passthruArgs).toEqual(['features/']);
            });
        });
    });

    describe('runArgs construction', () => {
        function buildRunArgs(
            passthruArgs: string[],
            dirname: string,
            featureFilePath: string | null
        ): (string | null)[] {
            const runArgs: (string | null)[] = [null, '', ...passthruArgs, '--require', `${dirname}/cucumberSupport`];

            if (featureFilePath) {
                runArgs.push(featureFilePath);
            }

            return runArgs;
        }

        test('should include null and empty string as first two elements', () => {
            const result = buildRunArgs([], '/dist', null);
            expect(result[0]).toBeNull();
            expect(result[1]).toBe('');
        });

        test('should include passthru args after first two elements', () => {
            const result = buildRunArgs(['--format', 'json'], '/dist', null);
            expect(result[2]).toBe('--format');
            expect(result[3]).toBe('json');
        });

        test('should include --require with cucumberSupport path', () => {
            const result = buildRunArgs([], '/home/user/dist', null);
            expect(result).toContain('--require');
            expect(result).toContain('/home/user/dist/cucumberSupport');
        });

        test('should append feature file path when provided', () => {
            const result = buildRunArgs([], '/dist', 'chatpickle');
            expect(result[result.length - 1]).toBe('chatpickle');
        });

        test('should not append feature file path when null', () => {
            const result = buildRunArgs([], '/dist', null);
            expect(result[result.length - 1]).toBe('/dist/cucumberSupport');
        });
    });

    describe('featureFilePath construction', () => {
        function buildFeatureFilePath(
            featureFilePathDetected: boolean,
            consumerPathArg: string | undefined
        ): string | null {
            return featureFilePathDetected ? null : `${consumerPathArg || ''}chatpickle`;
        }

        test('should return null when feature file path is detected', () => {
            const result = buildFeatureFilePath(true, 'examples/lex/');
            expect(result).toBeNull();
        });

        test('should return consumerPathArg + chatpickle when no feature file detected', () => {
            const result = buildFeatureFilePath(false, 'examples/lex/');
            expect(result).toBe('examples/lex/chatpickle');
        });

        test('should return just chatpickle when no consumerPathArg and no feature file detected', () => {
            const result = buildFeatureFilePath(false, undefined);
            expect(result).toBe('chatpickle');
        });

        test('should handle empty consumerPathArg', () => {
            const result = buildFeatureFilePath(false, '');
            expect(result).toBe('chatpickle');
        });
    });

    describe('CHATPICKLE_CONSUMER_PATH_ABSOLUTE construction', () => {
        function buildConsumerPathAbsolute(cwd: string, consumerPathArg: string | undefined): string {
            return consumerPathArg ? `${cwd}/${consumerPathArg}` : cwd;
        }

        test('should combine cwd with consumerPathArg when provided', () => {
            const result = buildConsumerPathAbsolute('/home/user/project', 'examples/lex/');
            expect(result).toBe('/home/user/project/examples/lex/');
        });

        test('should return just cwd when consumerPathArg not provided', () => {
            const result = buildConsumerPathAbsolute('/home/user/project', undefined);
            expect(result).toBe('/home/user/project');
        });

        test('should handle root cwd', () => {
            const result = buildConsumerPathAbsolute('/', 'path/');
            expect(result).toBe('//path/');
        });

        test('should handle empty consumerPathArg as falsy', () => {
            const result = buildConsumerPathAbsolute('/home/user', '');
            expect(result).toBe('/home/user');
        });
    });
});
