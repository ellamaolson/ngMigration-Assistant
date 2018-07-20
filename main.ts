import { AnalysisTool } from './analysisTool';

var readline = require('readline-sync');

var directory = readline.question("Enter your AngularJS directory: ");

let analysis = new AnalysisTool (directory);