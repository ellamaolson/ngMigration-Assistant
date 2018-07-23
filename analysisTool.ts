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
import { default as nodesloc } from 'node-sloc';
//import {default as gitignore} from 'parse-gitignore';
//const nodesloc = require('node-sloc');
const gitignore = require('parse-gitignore');

export class AnalysisTool {

    private CODE_LIMIT_MULTIPLIER: number = 1.25;
    private VALUE_NOT_FOUND: number = -1;

    analysisResults = {
        maxCodeLimit: 880, // 880 lines considered 1 month's work of coding 
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
        linesOfCode: 0,
        preparationReport: "\n***Final Report to Prepare for Migration***\nFollow the below guidelines to prepare for migration."
            + " Once you have made the appropriate changes to prepare for migrating, rerun this test and determine your migration path."
    };

    constructor(path: string) {
        setTimeout(() => { }, 1000);
        this.countLinesOfCode(path).then(() => {
            console.log(this.recommendation());
            console.log("MaxCodeLimit: " + Math.round(this.analysisResults.maxCodeLimit) + ", SLOC: " + this.analysisResults.linesOfCode + "\n");
        });
        this.retrieveGitIgnorePaths(path);
        this.runAnalysisTests(path);
        this.reportGenerator();
    }

    public recommendation() {
        let recommendation = '';
        console.log("\n**Your Recommendation**");

        if (this.analysisResults.maxCodeLimit >= this.analysisResults.linesOfCode) {
            recommendation = "Rewrite your app from scratch as an Angular application.";
        } else {
            if (this.analysisResults.tsFileCount > 0 &&
                this.analysisResults.componentDirectivesCount > 0 &&
                this.analysisResults.rootScope == false &&
                this.analysisResults.compile == false) {
                recommendation = "You are ready to use ngUpgrade.";
                if (this.analysisResults.angularElement == true) {
                    recommendation += "Continue using Angular Elements for components.";
                } else if (this.analysisResults.uiRouter == true) {
                    recommendation += "Use the hybrid ui-router in addition.";
                } else if (this.analysisResults.angularjsRouter) {
                    recommendation += "Use the hyrbid AngularJS and Angular router in addition.";
                }
            } else {
                console.log(this.analysisResults.preparationReport + "\n");
            }
        }
        return recommendation;
    }

    /**
     * Calculates the maxCodeLimit and generates a preparation report. 
     * Reports on rootScope, compile, unit tests, scripting language, and component architecture.
     */
    private reportGenerator() {
        if (this.analysisResults.rootScope) {
            this.analysisResults.preparationReport += "\n   * App contains $rootScope, must refactor rootScope into services.";
            this.analysisResults.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (this.analysisResults.compile) {
            this.analysisResults.preparationReport += "\n   * App contains $compile, must rewrite compile to eliminate dynamic feature of templates.";
            this.analysisResults.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (!this.analysisResults.hasUnitTest) {
            this.analysisResults.preparationReport += "\n   * App does not contain unit tests, must write unit tests.";
            this.analysisResults.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (this.analysisResults.jsFileCount > 0) {
            this.analysisResults.preparationReport += "\n   * App contains " + this.analysisResults.jsFileCount + " JavaScript files that need to be converted to TypeScript.";
            this.analysisResults.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (this.analysisResults.controllersCount > 0) {
            this.analysisResults.preparationReport += "\n   * App contains " + this.analysisResults.controllersCount + " controllers that need to be converted to component directives.";
            this.analysisResults.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        return this.analysisResults.preparationReport;
    }

    /**
     * Recursively traverses file system and scans each .js/.ts/.html file by calling analysis tests.
     * Only scan these extensions to avoid scanning node_modules, .json, yarn lock, .md.
     * Attaches current file to next file to produce correct directory and traverse down the tree.
     */
    runAnalysisTests(path: string) {
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
        ];
        for (let file of list) {
            console.log(file);
            currentFilePath = path + "/" + file;
            // if (this.fileNotInGitIgnore(currentFilePath)) {
                if (!fs.statSync(currentFilePath).isDirectory()) {
                    if (file.substr(-3) === '.js' || file.substr(-3) === '.ts' || file.substr(-5) === '.html') {
                        for (let test of tests) {
                            test(currentFilePath, fs.readFileSync(currentFilePath, "utf8"));
                        }
                        currentFilePath = file;
                    }
                } else if(file != "node_modules" && file != ".git"){
                    this.runAnalysisTests(currentFilePath);
                }
            //}

        }
    }

    retrieveGitIgnorePaths(path: string): string[] {
        const list = fs.readdirSync(path);
        let ignorePaths = ['node_modules', '.git', 'package.json', 'tsconfig.json'];
        for (let file of list) {
            if (file == ".gitignore") {
                ignorePaths = gitignore(path + "/" + file, ['node_modules', '.git', 'package.json', 'tsconfig.json']);
                break;
            }
        }

        for(let ignore of ignorePaths) {
            console.log(ignore);
        }
        return ignorePaths;
    }

    // fileNotInGitIgnore(filename: string) {
    //     const ignorePaths = this.retrieveGitIgnorePaths;
    //     for (let currentPath of ignorePaths) {
    //         console.log("Filename: " + filename + ", ignorePath: " + currentPath);
    //         if (filename.match(currentPath)) {
    //             return false;
    //         }
    //     }
    //     return true;
    // }

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
     * Only scans files with extensions: js, ts, or html. Does not scan node_modules directory.
     */
    countLinesOfCode(filename: string): Promise<number> {
        const options = {
            path: filename,
            extensions: ['js', 'ts', 'html'],
            ignorePaths: ['/node_modules', '/.git', '.DS_Store', '/e2e'],
            ignoreDefault: true
        }
        console.log(nodesloc);
        const mySloc = nodesloc(options).then((results: any) => {
            console.log(results.paths, "L: ", results.sloc.sloc, "C: ", results.sloc.comments)
            this.analysisResults.linesOfCode += results.sloc.sloc;
            return results.sloc.sloc;
        });
        return mySloc;
    }
}