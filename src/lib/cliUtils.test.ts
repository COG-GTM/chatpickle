import {
    parseCliArgs,
    buildConsumerPathAbsolute,
    buildRunArgs,
    buildFeatureFilePath,
    ParsedArgs,
} from './cliUtils';

describe('cliUtils', () => {
    describe('parseCliArgs', () => {
        it('should parse --cpPath argument', () => {
            const args = ['--cpPath', 'examples/lex/'];
            const result = parseCliArgs(args);

            expect(result.consumerPathArg).toBe('examples/lex/');
            expect(result.featureFilePathDetected).toBe(false);
        });

        it('should detect feature file paths (non-parameterized arguments)', () => {
            const args = ['my-features/'];
            const result = parseCliArgs(args);

            expect(result.featureFilePathDetected).toBe(true);
        });

        it('should handle mixed arguments', () => {
            const args = ['--cpPath', 'examples/custom/', '--format', 'json', 'custom-features/'];
            const result = parseCliArgs(args);

            expect(result.consumerPathArg).toBe('examples/custom/');
            expect(result.featureFilePathDetected).toBe(true);
        });

        it('should return undefined consumerPathArg when --cpPath is not provided', () => {
            const args = ['--format', 'json'];
            const result = parseCliArgs(args);

            expect(result.consumerPathArg).toBeUndefined();
        });

        it('should handle empty arguments', () => {
            const args: string[] = [];
            const result = parseCliArgs(args);

            expect(result.consumerPathArg).toBeUndefined();
            expect(result.featureFilePathDetected).toBe(false);
            expect(result.passthruArgs).toEqual([]);
        });

        it('should preserve passthruArgs', () => {
            const args = ['--cpPath', 'path/', '--tags', '@smoke'];
            const result = parseCliArgs(args);

            expect(result.passthruArgs).toEqual(args);
        });

        it('should skip parameter values when detecting feature file paths', () => {
            const args = ['--format', 'json', '--tags', '@smoke'];
            const result = parseCliArgs(args);

            expect(result.featureFilePathDetected).toBe(false);
        });

        it('should handle --cpPath at the end without value', () => {
            const args = ['--format', 'json', '--cpPath'];
            const result = parseCliArgs(args);

            expect(result.consumerPathArg).toBeUndefined();
        });
    });

    describe('buildConsumerPathAbsolute', () => {
        it('should combine cwd with consumerPathArg when provided', () => {
            const result = buildConsumerPathAbsolute('examples/lex/', '/home/user/project');

            expect(result).toBe('/home/user/project/examples/lex/');
        });

        it('should return cwd when consumerPathArg is undefined', () => {
            const result = buildConsumerPathAbsolute(undefined, '/home/user/project');

            expect(result).toBe('/home/user/project');
        });

        it('should return cwd when consumerPathArg is empty string', () => {
            const result = buildConsumerPathAbsolute('', '/home/user/project');

            expect(result).toBe('/home/user/project');
        });
    });

    describe('buildRunArgs', () => {
        it('should build run arguments with cucumber support directory', () => {
            const passthruArgs = ['--cpPath', 'examples/'];
            const cucumberSupportDir = '/path/to/cucumberSupport';

            const result = buildRunArgs(passthruArgs, cucumberSupportDir);

            expect(result).toEqual([
                null,
                '',
                '--cpPath',
                'examples/',
                '--require',
                '/path/to/cucumberSupport',
            ]);
        });

        it('should handle empty passthruArgs', () => {
            const result = buildRunArgs([], '/path/to/support');

            expect(result).toEqual([null, '', '--require', '/path/to/support']);
        });

        it('should preserve all passthru arguments', () => {
            const passthruArgs = ['--format', 'json', '--tags', '@smoke', 'features/'];
            const result = buildRunArgs(passthruArgs, '/support');

            expect(result.slice(2, -2)).toEqual(passthruArgs);
        });
    });

    describe('buildFeatureFilePath', () => {
        it('should return null when featureFilePathDetected is true', () => {
            const result = buildFeatureFilePath('examples/', true);

            expect(result).toBeNull();
        });

        it('should return path with consumerPathArg when provided', () => {
            const result = buildFeatureFilePath('examples/lex/', false);

            expect(result).toBe('examples/lex/chatpickle');
        });

        it('should return just chatpickle when consumerPathArg is undefined', () => {
            const result = buildFeatureFilePath(undefined, false);

            expect(result).toBe('chatpickle');
        });

        it('should return just chatpickle when consumerPathArg is empty string', () => {
            const result = buildFeatureFilePath('', false);

            expect(result).toBe('chatpickle');
        });
    });
});
