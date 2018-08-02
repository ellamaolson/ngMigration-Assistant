#!/usr/bin/env TS_NODE_FILES=true ts-node

import { AnalysisTool } from './analysisTool';
import * as fs from 'fs';
const readline = require("readline-sync");

console.log("\x1b[1m\x1b[34m%s\x1b[0m", "\nWelcome to the ngMigration Assistant!",
 "\x1b[1m\x1b[33m＼(^\x1b[31mᴗ\x1b[33m^)／\x1b[0m");
console.log("I will scan you AngularJS application and recommend a migration path to Angular.");

const analysis = new AnalysisTool (analyzeInput());

console.log("\nScanning your files..." 
+ " \x1b[1m\x1b[33m~\x1b[36m(\x1b[32m˘\x1b[35m▾\x1b[32m˘\x1b[36m)\x1b[33m~" 
+ " \x1b[1m\x1b[33m~\x1b[36m(\x1b[32m˘\x1b[35m▾\x1b[32m˘\x1b[36m)\x1b[33m~"
+ " \x1b[1m\x1b[33m~\x1b[36m(\x1b[32m˘\x1b[35m▾\x1b[32m˘\x1b[36m)\x1b[33m~\x1b[0m");

function analyzeInput(): string {
    let directory: string = readline.question("Enter the directory you would like me to scan here [" + process.cwd() +  "]: ");    
    if (directory == "") {
        directory = process.cwd();
    }
    try {
        fs.statSync(directory).isDirectory();
        return directory;
    } catch (e) {
        console.log("\x1b[31m\nNot a directory.\x1b[0m");
        return analyzeInput();
    }
}