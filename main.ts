#!/usr/bin/env TS_NODE_FILES=true ts-node

import { AnalysisTool } from './analysisTool';
import * as fs from 'fs';
import * as process from 'process';

try {
    let directory = process.argv[2] ? process.argv[2] : process.cwd();
    fs.statSync(directory).isDirectory();
    console.log("\x1b[1m\x1b[34m%s\x1b[0m", "\nWelcome to ngMigration Assistant!",
        "\x1b[1m\x1b[33m＼(^\x1b[31mᴗ\x1b[33m^)／\x1b[0m",
        "\nScanning your files for...\n  * Complexity\n  * App size in lines of code and amount of files and folders"
        + "\n  * Antipatterns\n  * Angularjs version\n  * Preparation necessary for migration ");
    delay(1000);
    new AnalysisTool(directory);
} catch (e) {
    console.log("\x1b[31mYou entered an invalid directory, please try again.\n\x1b[0m");
}

function delay(milliseconds: number) {
    let startTime = new Date().getTime();
    for (let index = 0; index < 1e7; index++) {
        if ((new Date().getTime() - startTime) > milliseconds) {
            break;
        }
    }
}
