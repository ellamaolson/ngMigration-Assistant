import { AnalysisTool } from './analysisTool';

console.log("\nWelcome to the Migration Scanner! ＼(^ᴗ^)／");
console.log("I will scan you AngularJS application and recommend a migration path to Angular.");

var readline = require('readline-sync');
var directory = readline.question("Enter the directory you would like me to scan here: ");
let analysis = new AnalysisTool (directory);

console.log("\nScanning your files... ~(˘▾˘)~ ~(˘▾˘)~ ~(˘▾˘)~");