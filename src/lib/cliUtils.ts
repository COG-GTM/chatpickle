export interface ParsedArgs {
    consumerPathArg: string | undefined;
    featureFilePathDetected: boolean;
    passthruArgs: string[];
}

export function parseCliArgs(args: string[]): ParsedArgs {
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

    return {
        consumerPathArg,
        featureFilePathDetected,
        passthruArgs: args,
    };
}

export function buildConsumerPathAbsolute(
    consumerPathArg: string | undefined,
    cwd: string
): string {
    return consumerPathArg ? `${cwd}/${consumerPathArg}` : cwd;
}

export function buildRunArgs(
    passthruArgs: string[],
    cucumberSupportDir: string
): string[] {
    return [null as any, '', ...passthruArgs, '--require', cucumberSupportDir];
}

export function buildFeatureFilePath(
    consumerPathArg: string | undefined,
    featureFilePathDetected: boolean
): string | null {
    if (featureFilePathDetected) {
        return null;
    }
    return `${consumerPathArg || ''}chatpickle`;
}
