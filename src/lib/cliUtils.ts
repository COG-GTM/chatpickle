export interface ParsedArgs {
    consumerPathArg: string | undefined;
    featureFilePathDetected: boolean;
}

export function parseArgs(args: string[]): ParsedArgs {
    let consumerPathArg: string | undefined;
    let featureFilePathDetected = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--cpPath') {
            consumerPathArg = args[i + 1];
        }
        if (arg[0] === '-') {
            i++;
            continue;
        } else {
            featureFilePathDetected = true;
        }
    }

    return { consumerPathArg, featureFilePathDetected };
}

export function buildConsumerPath(consumerPathArg: string | undefined, cwd: string): string {
    return consumerPathArg !== undefined ? `${cwd}/${consumerPathArg}` : cwd;
}

export function buildRunArgs(
    passthruArgs: string[],
    cucumberSupportDir: string
): (string | null)[] {
    return [null, '', ...passthruArgs, '--require', cucumberSupportDir];
}

export function getFeatureFilePath(
    featureFilePathDetected: boolean,
    consumerPathArg: string | undefined
): string | null {
    return featureFilePathDetected ? null : `${consumerPathArg || ''}chatpickle`;
}
