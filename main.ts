import { AnalysisTool } from './analysisTool';

console.log("\nWelcome to the Migration Scanner! ＼(^ᴗ^)／");
console.log("I will scan you AngularJS application and recommend a migration path to Angular.");

// var readline = require('readline-sync');
// var directory = readline.question("Enter the directory you would like me to scan here: ");
// let analysis = new AnalysisTool (directory);

//For testing purposes, use above commented lines for real app
let analysis = new AnalysisTool ("../testFolderMigrationTool");

console.log("\nScanning your files... ~(˘▾˘)~ ~(˘▾˘)~ ~(˘▾˘)~");