#!/usr/bin/env TS_NODE_FILES=true ts-node

import { AnalysisTool } from './analysisTool';
import * as fs from 'fs';
import * as process from 'process';
const readline = require("readline-sync");

try {
    let directory = process.argv[2] ? process.argv[2] : process.cwd();
    fs.statSync(directory).isDirectory();
    console.log("\x1b[1m\x1b[34m%s\x1b[0m", "\nWelcome to the ngMigration Assistant!",
        "\x1b[1m\x1b[33m＼(^\x1b[31mᴗ\x1b[33m^)／\x1b[0m");
    new AnalysisTool(directory);
    console.log("\nScanning your files..."
        + " \x1b[1m\x1b[33m~\x1b[36m(\x1b[32m˘\x1b[35m▾\x1b[32m˘\x1b[36m)\x1b[33m~"
        + " \x1b[1m\x1b[33m~\x1b[36m(\x1b[32m˘\x1b[35m▾\x1b[32m˘\x1b[36m)\x1b[33m~"
        + " \x1b[1m\x1b[33m~\x1b[36m(\x1b[32m˘\x1b[35m▾\x1b[32m˘\x1b[36m)\x1b[33m~\x1b[0m");
} catch (e) {
    console.log("\x1b[31mYou entered an invalid directory, please try again.\x1b[0m");
}

