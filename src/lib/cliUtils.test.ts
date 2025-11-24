import { parseArgs, buildConsumerPath, buildRunArgs, getFeatureFilePath } from './cliUtils';

describe('cliUtils', () => {
    describe('parseArgs', () => {
        it('should return undefined consumerPathArg when no --cpPath is provided', () => {
            const result = parseArgs([]);

            expect(result.consumerPathArg).toBeUndefined();
        });

        it('should extract consumerPathArg when --cpPath is provided', () => {
            const result = parseArgs(['--cpPath', 'examples/lex/']);

            expect(result.consumerPathArg).toBe('examples/lex/');
        });

        it('should detect feature file path when non-parameterized argument is provided', () => {
            const result = parseArgs(['custom/features/']);

            expect(result.featureFilePathDetected).toBe(true);
        });

        it('should not detect feature file path when only parameterized arguments are provided', () => {
            const result = parseArgs(['--cpPath', 'examples/lex/', '--format', 'json']);

            expect(result.featureFilePathDetected).toBe(false);
        });

        it('should handle mixed arguments correctly', () => {
            const result = parseArgs(['--cpPath', 'examples/lex/', 'custom/features/', '--format', 'json']);

            expect(result.consumerPathArg).toBe('examples/lex/');
            expect(result.featureFilePathDetected).toBe(true);
        });

        it('should handle empty args array', () => {
            const result = parseArgs([]);

            expect(result.consumerPathArg).toBeUndefined();
            expect(result.featureFilePathDetected).toBe(false);
        });

        it('should skip parameter values correctly', () => {
            const result = parseArgs(['--format', 'json', '--tags', '@smoke']);

            expect(result.featureFilePathDetected).toBe(false);
        });

        it('should handle --cpPath at the end without value', () => {
            const result = parseArgs(['--cpPath']);

            expect(result.consumerPathArg).toBeUndefined();
        });

        it('should handle single dash arguments', () => {
            const result = parseArgs(['-f', 'json']);

            expect(result.featureFilePathDetected).toBe(false);
        });
    });

    describe('buildConsumerPath', () => {
        it('should return cwd when consumerPathArg is undefined', () => {
            const result = buildConsumerPath(undefined, '/home/user/project');

            expect(result).toBe('/home/user/project');
        });

        it('should combine cwd and consumerPathArg when provided', () => {
            const result = buildConsumerPath('examples/lex/', '/home/user/project');

            expect(result).toBe('/home/user/project/examples/lex/');
        });

        it('should handle empty consumerPathArg by adding trailing slash', () => {
            const result = buildConsumerPath('', '/home/user/project');

            expect(result).toBe('/home/user/project/');
        });
    });

    describe('buildRunArgs', () => {
        it('should build run args with passthru args and cucumber support dir', () => {
            const result = buildRunArgs(['--format', 'json'], '/path/to/cucumberSupport');

            expect(result).toEqual([
                null,
                '',
                '--format',
                'json',
                '--require',
                '/path/to/cucumberSupport',
            ]);
        });

        it('should handle empty passthru args', () => {
            const result = buildRunArgs([], '/path/to/cucumberSupport');

            expect(result).toEqual([null, '', '--require', '/path/to/cucumberSupport']);
        });

        it('should preserve order of passthru args', () => {
            const result = buildRunArgs(['arg1', 'arg2', 'arg3'], '/path/to/cucumberSupport');

            expect(result[2]).toBe('arg1');
            expect(result[3]).toBe('arg2');
            expect(result[4]).toBe('arg3');
        });
    });

    describe('getFeatureFilePath', () => {
        it('should return null when feature file path is detected', () => {
            const result = getFeatureFilePath(true, 'examples/lex/');

            expect(result).toBeNull();
        });

        it('should return chatpickle path when no feature file path is detected and consumerPathArg is provided', () => {
            const result = getFeatureFilePath(false, 'examples/lex/');

            expect(result).toBe('examples/lex/chatpickle');
        });

        it('should return chatpickle when no feature file path is detected and consumerPathArg is undefined', () => {
            const result = getFeatureFilePath(false, undefined);

            expect(result).toBe('chatpickle');
        });

        it('should return chatpickle when no feature file path is detected and consumerPathArg is empty', () => {
            const result = getFeatureFilePath(false, '');

            expect(result).toBe('chatpickle');
        });
    });
});
