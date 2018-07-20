/**
 * AnalysisTool scans an AngularJS app for certain critera to recommend
 * a particular migration path to Angular. It employs traversing files,
 * regular expressions, a decision tree algorithm, and final recommendations. 
 */

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';

export class AnalysisTool {

    analysisResults = {
        rootScope: false,
        angularElement: false,
        uiRouter: false,
        angularjsRouter: false,
        angularRouter: false,
        hasUnitTest: false,
        compile: false,
        jsFileCount: 0,
        tsFileCount: 0,
        controllersCount: 0,
        componentDirectivesCount: 0,
        linesOfCode: 0
    };

    private CODE_LIMIT_MULTIPLIER: number = 1.25;
    private VALUE_NOT_FOUND: number = -1;
    private maxCodeLimit: number; // 880 lines considered 1 month's work of coding 


    constructor(path: string) {
        this.maxCodeLimit = 880;
        console.log("\n----------Start Scan----------");
        setTimeout(() => { }, 100000);
        console.log("Analysis Tests Section");

        this.countLinesOfCode(path).then(() => {
            this.recommendation();
            console.log("----------End Scan----------\n")
        });
        this.callAnalysisTests(path);
        this.maxCodeCalculator();
    }

    public recommendation() {
        let recommendation = '';
        console.log("\nRecommendation Section");
        if (this.maxCodeLimit >= this.analysisResults.linesOfCode) {
            console.log("Max LOC: " + this.maxCodeLimit + ",  Your LOC: " + this.analysisResults.linesOfCode);
            recommendation = "Rewrite from Scratch!";
        } else {
            if (this.analysisResults.tsFileCount > 0 &&
                this.analysisResults.componentDirectivesCount > 0 &&
                this.analysisResults.rootScope == false &&
                this.analysisResults.compile == false) {
                recommendation = "You are ready to use ngUpgrade.";
            }
        }
        return recommendation;
    }

    private maxCodeCalculator() {
        console.log("\nMax Code Calculator Outputs");
        //rootScope
        if (this.analysisResults.rootScope) {
            console.log("Found rootScope. Refactor rootScope into Service.");
            this.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        //compile
        if (this.analysisResults.compile) {
            console.log("Found compile. Rewrite compile to eliminate dynamic feature of template.");
            this.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }

        //unit tests
        if (!this.analysisResults.hasUnitTest) {
            console.log("Found no unit tests.");
            this.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        //scripting language
        if (this.analysisResults.jsFileCount > 0) {
            console.log("Found JS files.");
            this.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER; //(this.jsFileCount / 10); 
            console.log("You still have " + this.analysisResults.jsFileCount + " JavaScript file left to convert to TypeScript.")
            console.log("You have " + this.analysisResults.tsFileCount + " TypeScript files already.");
        }
        //component
        if (this.analysisResults.componentDirectivesCount > 0 && this.analysisResults.controllersCount > 0) {
            console.log("Found .controller.");
            console.log("Still have " + this.analysisResults.controllersCount + " controller(s) to convert to component directive before upgrading with ngUpgrade");
            this.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        } else if (this.analysisResults.controllersCount > 0) {
            console.log("Found .controller.");
            console.log("Need to begin converting " + this.analysisResults.controllersCount + " controller(s) to have component directive before upgrading with ngUpgrade.");
            this.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
    }

    /**
     * Recursively traverses file system and scans each .js/.ts/.html file by calling analysis tests.
     * Only scan these extensions to avoid scanning node_modules, .json, yarn lock, .md.
     * Attaches current file to next file to produce correct directory and traverse down the tree.
     */
    callAnalysisTests(path: string) {
        console.log("------>Descending into " + path);
        const list = fs.readdirSync(path);

        let currentFilePath: string = "";
        let fileData: string = "";
        let tests = [
            (filename: string, data: string) => this.checkFileForRootScope(filename, data),
            (filename: string, data: string) => this.checkFileForAngularElement(filename, data),
            (filename: string, data: string) => this.checkFileForRouter(filename, data),
            (filename: string, data: string) => this.checkFileForUnitTests(filename, data),
            (filename: string, data: string) => this.checkFileForCompile(filename, data),
            (filename: string, data: string) => this.checkFileForScriptingLanguage(filename, data),
            (filename: string, data: string) => this.checkFileForComponent(filename, data),
            //(filename: string, data: string) => this.countLinesOfCode(filename, data),
        ];

        for (let file of list) {
            console.log(file);
            currentFilePath = path + "/" + file;
            if (!fs.statSync(currentFilePath).isDirectory()) {
                if (file.substr(-3) === '.js' || file.substr(-3) === '.ts' || file.substr(-5) === '.html') {
                    for (let test of tests) {
                        test(currentFilePath, fs.readFileSync(currentFilePath, "utf8"));
                    }
                }
            } else if (file != "node_modules") {
                path = currentFilePath;
                this.callAnalysisTests(path);
            }
        }
    }

    checkFileForRootScope(filename: string, fileData: string) {
        if (fileData.match(/\$rootScope/)) {
            this.analysisResults.rootScope = true;
        }
    }

    checkFileForAngularElement(filename: string, fileData: string) {
        if (fileData.match(/NgElementConstructor/)) {
            this.analysisResults.angularElement = true;
        }
    }

    checkFileForRouter(filename: string, fileData: string) {
        if (fileData.match(/['"]ui\.router['"]/)) {
            this.analysisResults.uiRouter = true;
        } else if (fileData.match(/['"]ngRoute['"]/)) {
            this.analysisResults.angularjsRouter = true;
        } else if (fileData.match(/['"]\@angular\/router['"]/)) {
            this.analysisResults.angularRouter = true;
        }
    }

    checkFileForUnitTests(filename: string, fileData: string) {
        if (filename.substr(-7, 4) === 'spec') {
            this.analysisResults.hasUnitTest = true;
        }
    }

    checkFileForCompile(filename: string, fileData: string) {
        if (fileData.match(/compile\(/)) {
            this.analysisResults.compile = true;
        }
    }

    checkFileForScriptingLanguage(filename: string, fileData: string) {
        if (filename.substr(-3) === '.js') {
            this.analysisResults.jsFileCount++;
        } else if (filename.substr(-3) === ".ts") {
            this.analysisResults.tsFileCount++;
        }
    }

    checkFileForComponent(filename: string, fileData: string) {
        if (fileData.match(/\.controller\(/)) {
            this.analysisResults.controllersCount++;
        }

        if (fileData.match(/.component\(/)) {
            this.analysisResults.componentDirectivesCount++;
        }
    }

    /**
     * Depends on node-sloc to count source lines of code.
     * Only scans files with extensions: js, ts, or html. Does not scan
     * node_modules directory.
     */
    countLinesOfCode(filename: string): Promise <number> {
        const sloc = require('node-sloc');
        const options = {
            path: filename,
            extensions: ['js', 'ts', 'html'],
            ignorePaths: ['node_modules'],
            ignoreDefault: true
        }

        var mySloc = sloc(options).then((results: any) => {
            this.analysisResults.linesOfCode += results.sloc.sloc;
            console.log("Total: ", this.analysisResults.linesOfCode);
            return results.sloc.sloc;
        });
        return mySloc;
    }
}