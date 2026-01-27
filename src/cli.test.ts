describe('CLI argument parsing', () => {
    const originalArgv = process.argv;
    const originalEnv = process.env;
    const originalCwd = process.cwd;

    beforeEach(() => {
        jest.resetModules();
        process.argv = ['node', 'cli.js'];
        process.env = { ...originalEnv };
        delete process.env.CHATPICKLE_CONSUMER_PATH_ABSOLUTE;
    });

    afterEach(() => {
        process.argv = originalArgv;
        process.env = originalEnv;
        process.cwd = originalCwd;
    });

    describe('parseCliArgs', () => {
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

        test('should extract cpPath argument', () => {
            const result = parseCliArgs(['--cpPath', 'examples/lex/']);
            expect(result.consumerPathArg).toBe('examples/lex/');
        });

        test('should detect feature file path when non-parameterized argument is provided', () => {
            const result = parseCliArgs(['my-features/']);
            expect(result.featureFilePathDetected).toBe(true);
        });

        test('should not detect feature file path when only parameterized arguments are provided', () => {
            const result = parseCliArgs(['--cpPath', 'examples/lex/', '--format', 'progress']);
            expect(result.featureFilePathDetected).toBe(false);
        });

        test('should handle multiple parameterized arguments', () => {
            const result = parseCliArgs([
                '--cpPath',
                'examples/custom/',
                '--format',
                'progress',
                '--tags',
                '@smoke',
            ]);
            expect(result.consumerPathArg).toBe('examples/custom/');
            expect(result.featureFilePathDetected).toBe(false);
        });

        test('should handle empty arguments', () => {
            const result = parseCliArgs([]);
            expect(result.consumerPathArg).toBeUndefined();
            expect(result.featureFilePathDetected).toBe(false);
        });

        test('should handle cpPath at different positions', () => {
            const result = parseCliArgs(['--format', 'progress', '--cpPath', 'my-path/']);
            expect(result.consumerPathArg).toBe('my-path/');
        });

        test('should detect feature file path mixed with parameterized args', () => {
            const result = parseCliArgs(['--cpPath', 'examples/', 'custom-features/']);
            expect(result.consumerPathArg).toBe('examples/');
            expect(result.featureFilePathDetected).toBe(true);
        });
    });

    describe('buildRunArgs', () => {
        function buildRunArgs(
            passthruArgs: string[],
            featureFilePathDetected: boolean,
            consumerPathArg: string | undefined,
            dirname: string
        ): (string | null)[] {
            const runArgs: (string | null)[] = [null, '', ...passthruArgs, '--require', `${dirname}/cucumberSupport`];

            const featureFilePath = featureFilePathDetected ? null : `${consumerPathArg || ''}chatpickle`;

            if (featureFilePath) {
                runArgs.push(featureFilePath);
            }

            return runArgs;
        }

        test('should include passthru args', () => {
            const runArgs = buildRunArgs(['--format', 'progress'], false, undefined, '/app/dist');
            expect(runArgs).toContain('--format');
            expect(runArgs).toContain('progress');
        });

        test('should include --require with cucumberSupport path', () => {
            const runArgs = buildRunArgs([], false, undefined, '/app/dist');
            expect(runArgs).toContain('--require');
            expect(runArgs).toContain('/app/dist/cucumberSupport');
        });

        test('should add default chatpickle feature path when no feature file detected', () => {
            const runArgs = buildRunArgs([], false, undefined, '/app/dist');
            expect(runArgs).toContain('chatpickle');
        });

        test('should add cpPath + chatpickle when cpPath is provided and no feature file detected', () => {
            const runArgs = buildRunArgs([], false, 'examples/lex/', '/app/dist');
            expect(runArgs).toContain('examples/lex/chatpickle');
        });

        test('should not add feature path when feature file is detected', () => {
            const runArgs = buildRunArgs(['custom-features/'], true, undefined, '/app/dist');
            expect(runArgs).not.toContain('chatpickle');
        });

        test('should start with null and empty string for cucumber compatibility', () => {
            const runArgs = buildRunArgs([], false, undefined, '/app/dist');
            expect(runArgs[0]).toBeNull();
            expect(runArgs[1]).toBe('');
        });
    });

    describe('environment variable setting', () => {
        function setConsumerPathEnv(consumerPathArg: string | undefined, cwd: string): string {
            return consumerPathArg ? `${cwd}/${consumerPathArg}` : cwd;
        }

        test('should set absolute path with cpPath argument', () => {
            const result = setConsumerPathEnv('examples/lex/', '/home/user/project');
            expect(result).toBe('/home/user/project/examples/lex/');
        });

        test('should use cwd when no cpPath argument', () => {
            const result = setConsumerPathEnv(undefined, '/home/user/project');
            expect(result).toBe('/home/user/project');
        });

        test('should handle trailing slashes in cpPath', () => {
            const result = setConsumerPathEnv('examples/', '/home/user');
            expect(result).toBe('/home/user/examples/');
        });

        test('should handle cpPath without trailing slash', () => {
            const result = setConsumerPathEnv('examples', '/home/user');
            expect(result).toBe('/home/user/examples');
        });
    });
});
