import { AnalysisTool } from './analysisTool';

console.log("\x1b[1m\x1b[34m%s\x1b[0m", "\nWelcome to the ngMigration Assistant!",
 "\x1b[1m\x1b[33m＼(^\x1b[31mᴗ\x1b[33m^)／\x1b[0m");
console.log("I will scan you AngularJS application and recommend a migration path to Angular.");

// var readline = require("readline-sync");
// var directory = readline.question("Enter the directory you would like me to scan here: ");
// let analysis = new AnalysisTool (directory);

//For testing purposes, use above commented lines for real app
let analysis = new AnalysisTool ("../ShoppingList-ajs");
//let analysis = new AnalysisTool ("../testFolderMigrationTool");
//let analysis2 = new AnalysisTool ("../my-angular6-app");
//let analysis3 = new AnalysisTool ("../angularjs-j2z6hs");
//let analysis4 = new AnalysisTool ("../Plunk-todoapp-ajs");

console.log("\nScanning your files..." 
+ " \x1b[1m\x1b[33m~\x1b[36m(\x1b[32m˘\x1b[35m▾\x1b[32m˘\x1b[36m)\x1b[33m~" 
+ " \x1b[1m\x1b[33m~\x1b[36m(\x1b[32m˘\x1b[35m▾\x1b[32m˘\x1b[36m)\x1b[33m~"
+ " \x1b[1m\x1b[33m~\x1b[36m(\x1b[32m˘\x1b[35m▾\x1b[32m˘\x1b[36m)\x1b[33m~\x1b[0m");