#!/usr/bin/env node

import { Cli } from 'cucumber';
import { parseArgs, buildConsumerPath, buildRunArgs, getFeatureFilePath } from './lib/cliUtils';

const passthruArgs = process.argv.slice(2);

const { consumerPathArg, featureFilePathDetected } = parseArgs(passthruArgs);

process.env.CHATPICKLE_CONSUMER_PATH_ABSOLUTE = buildConsumerPath(consumerPathArg, process.cwd());

const runArgs = buildRunArgs(passthruArgs, `${__dirname}/cucumberSupport`);

const featureFilePath = getFeatureFilePath(featureFilePathDetected, consumerPathArg);

if (featureFilePath) {
    runArgs.push(featureFilePath);
}

const cliArgs = { argv: runArgs, cwd: process.cwd(), stdout: process.stdout };
const cli = new Cli(cliArgs);

cli.run()
    .then(result => {
        if (result.success) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
