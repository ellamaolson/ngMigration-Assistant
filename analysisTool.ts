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
import { resolve } from 'dns';
const gitignore = require('parse-gitignore');
const glob = require('glob');
const minimatch = require('minimatch');
const { execSync } = require('child_process');

export class AnalysisTool {

    private CODE_LIMIT_MULTIPLIER: number = 1.25;
    private VALUE_NOT_FOUND: number = -1;

    analysisDetails = {
        maxCodeLimit: 880, // 880 lines considered 1 month's work of coding 
        ignoreGlobs: [""],
        ignorePaths: [""],
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

    constructor(path: string) {
        setTimeout(() => { }, 1000);
        this.getGlobsFromGitignore(path);
        this.buildPathIgnoringGlobs(path);
        this.countLinesOfCode(path)
            .then(sourceLines => {
                this.analysisDetails.linesOfCode = sourceLines;
                return this.runAnalysis(path);
            })
            .catch(err => {
                console.error("Error 1", err);
            })
            .then(() => {
                return this.runAntiPatternReport()
            })
            .catch(err => {
                console.error("Error 2", err);
            })
            .then(report => {
                this.runRecommendation(report);
                console.log("MaxCodeLimit: " + Math.round(this.analysisDetails.maxCodeLimit) + ", SLOC: " + this.analysisDetails.linesOfCode + "\n");
            })
            .catch(err => {
                console.error("Error 3", err);
            });
    }

    /**
     * Finds and parses the .gitignore file in your app into an array of ignoreGlobs using parse-gitignore.
     * Scans filesystem for any matching globs from ignoreGlobs using glob.
     * Returns all paths to ignore.
     * @param path 
     */
    getGlobsFromGitignore(path: string) {
        let defaultIgnoreGlobs = [
            'node_modules', 'node_modules/**', '**/node_modules', '**/node_modules/**',
            '.git', '.git/**', '**/.git', '**/.git/**',
            'package.json', 'package.json/**', '**/package.json', '**/package.json/**',
            'tsconfig.json', 'tsconfig.json/**', '**/tsconfig.json', '**/tsconfig.json/**',
            'e2e', 'e2e/**', '**/e2e', '**/e2e/**'
        ];
        this.analysisDetails.ignoreGlobs = [...gitignore(path + "/.gitignore"), ...defaultIgnoreGlobs];
        console.log("GLOBS: ", this.analysisDetails.ignoreGlobs);
    }

    buildPathIgnoringGlobs(path: string): boolean {

        //1
        // process.chdir('/tmp');
        let files = execSync("cd \"" + path + "\" && git ls-tree -r master --name-only").split("\n");


        //let filesWithoutIgnores = glob.sync("**", {ignore: this.analysisDetails.ignoreGlobs, cwd: path});
        console.log("\n\nARRAY ", files);
        return true;

        //2
        // for(let thisGlob of this.analysisDetails.ignoreGlobs) {
        //     if(minimatch(fileOrFolder, thisGlob)) {
        //         console.log("Match: " + thisGlob + " --> " + fileOrFolder + " = " + minimatch(fileOrFolder, thisGlob));
        //         return true;
        //     }
        // }
        // return false;

        //3
        // //console.log("\nIgnore Paths: ")
        // let ignorePaths: string[] = [];
        // for (let ignore of this.analysisDetails.ignoreGlobs) {
        //     let filesToIgnore = glob.sync(ignore, { cwd: fileOrFolder });
        //     for (let file of filesToIgnore) {
        //         //console.log(ignore + " --> ", path + "/" + file);
        //         ignorePaths.push(fileOrFolder + "/" + file);
        //     }

        // }
        // this.analysisDetails.ignorePaths = ignorePaths;
        // //console.log(this.analysisDetails.ignorePaths);
    }

    // /**
    //  * Checks is current filepath is to be ignored.
    //  * @param ignorePaths 
    //  * @param filename 
    //  */
    // isIgnore(filename: string) {
    //     for (let ignore of this.analysisDetails.ignorePaths) {
    //         if (filename == ignore) {
    //             console.log("    Ignore this file: " + filename);
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    /**
     * Depends on node-sloc to count source lines of code (sloc).
     * Only scans files with extensions: js, ts, or html. Does not scan node_modules directory.
     * Returns a promise that resolves to sloc.
    */
    async countLinesOfCode(filepath: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const options = {
                path: filepath,
                extensions: ['js', 'ts', 'html'],
                ignorePaths: ['node_modules'],
                ignoreDefaut: false,
            }

            let lines: number = 0;
            const mySloc = nodesloc(options)
                .then((results: any) => {
                    lines += results.sloc.sloc;
                    resolve(lines);
                })
                .catch((err: any) => {
                    console.error(err);
                    reject(err);
                });
        });

    }

    isIgnoreFileOrFolder(fileOrFolder: string): boolean {
        if(fileOrFolder.includes("node_modules") || fileOrFolder.includes(".git") || fileOrFolder.includes("package.json")) {
            return true;
        } 
        return false;
    }

    /**
     * Recursively traverses file system and scans each .js/.ts/.html file by calling analysis tests.
     * Only scan these extensions to avoid scanning node_modules, .json, yarn lock, .md.
     * Attaches current file to next file to produce correct directory and traverse down the tree.
     */
    private runAnalysis(path: string): Promise<any> {
        console.log("------>Descending into " + path);
        const list = fs.readdirSync(path);
        let currentPath: string = "";
        const promisesINeedResolvedForMeToBeDone = [];

        for (let fileOrFolder of list) {
            console.log(fileOrFolder);
            currentPath = path + "/" + fileOrFolder;

            // if (this.isIgnore(currentPath)) {
            //     continue;
            // }

            if(this.isIgnoreFileOrFolder(currentPath)) {
                continue;
            }

            if (fs.statSync(currentPath).isDirectory()) {
                promisesINeedResolvedForMeToBeDone.push(this.runAnalysis(currentPath));
                if (fileOrFolder != "node_modules") {
                }
            } else {
                this.testFile(fileOrFolder, currentPath);
                currentPath = fileOrFolder;

            }
        }
        return Promise.all(promisesINeedResolvedForMeToBeDone);
    }

    /**
  * Calculates the maxCodeLimit and generates a preparation report. 
  * Reports on rootScope, compile, unit tests, scripting language, and component architecture.
  */
    private runAntiPatternReport(): Promise<any> {
        let preparationReport = "\n***Final Report to Prepare for Migration***\nFollow the below guidelines to prepare for migration."
            + " Once you have made the appropriate changes to prepare for migrating, rerun this test and determine your migration path.";

        if (this.analysisDetails.rootScope) {
            preparationReport += "\n   * App contains $rootScope, must refactor rootScope into services.";
            this.analysisDetails.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (this.analysisDetails.compile) {
            preparationReport += "\n   * App contains $compile, must rewrite compile to eliminate dynamic feature of templates.";
            this.analysisDetails.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (!this.analysisDetails.hasUnitTest) {
            preparationReport += "\n   * App does not contain unit tests, must write unit tests.";
            this.analysisDetails.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (this.analysisDetails.jsFileCount > 0) {
            preparationReport += "\n   * App contains " + this.analysisDetails.jsFileCount + " JavaScript files that need to be converted to TypeScript.";
            this.analysisDetails.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (this.analysisDetails.controllersCount > 0) {
            preparationReport += "\n   * App contains " + this.analysisDetails.controllersCount + " controllers that need to be converted to component directives.";
            this.analysisDetails.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }

        return Promise.resolve(preparationReport);
    }

    public runRecommendation(preparationReport: string): void {
        let recommendation = '';
        console.log("\n**Your Recommendation**");

        if (this.analysisDetails.maxCodeLimit >= this.analysisDetails.linesOfCode) {
            recommendation = "Rewrite your app from scratch as an Angular application.";
        } else {
            if (this.analysisDetails.tsFileCount > 0 &&
                this.analysisDetails.componentDirectivesCount > 0 &&
                this.analysisDetails.rootScope == false &&
                this.analysisDetails.compile == false) {
                recommendation = "You are ready to use ngUpgrade.";
                if (this.analysisDetails.angularElement == true) {
                    recommendation += "Continue using Angular Elements for components.";
                } else if (this.analysisDetails.uiRouter == true) {
                    recommendation += "Use the hybrid ui-router in addition.";
                } else if (this.analysisDetails.angularjsRouter) {
                    recommendation += "Use the hyrbid AngularJS and Angular router in addition.";
                }
            } else {
                console.log(preparationReport + "\n");
            }
        }
        console.log(recommendation);
    }

    testFile(file: string, currentPath: string) {
        let tests = [
            (filename: string, data: string) => this.checkFileForRootScope(filename, data),
            (filename: string, data: string) => this.checkFileForAngularElement(filename, data),
            (filename: string, data: string) => this.checkFileForRouter(filename, data),
            (filename: string, data: string) => this.checkFileForUnitTests(filename, data),
            (filename: string, data: string) => this.checkFileForCompile(filename, data),
            (filename: string, data: string) => this.checkFileForScriptingLanguage(filename, data),
            (filename: string, data: string) => this.checkFileForComponent(filename, data),
        ];

        if (file.substr(-3) === '.js' || file.substr(-3) === '.ts' || file.substr(-5) === '.html') {
            for (let test of tests) {
                test(currentPath, fs.readFileSync(currentPath, "utf8"));
            }
        }
    }

    checkFileForRootScope(filename: string, fileData: string) {
        if (fileData.match(/\$rootScope/)) {
            this.analysisDetails.rootScope = true;
        }
    }

    checkFileForAngularElement(filename: string, fileData: string) {
        if (fileData.match(/NgElementConstructor/)) {
            this.analysisDetails.angularElement = true;
        }
    }

    checkFileForRouter(filename: string, fileData: string) {
        if (fileData.match(/['"]ui\.router['"]/)) {
            this.analysisDetails.uiRouter = true;
        } else if (fileData.match(/['"]ngRoute['"]/)) {
            this.analysisDetails.angularjsRouter = true;
        } else if (fileData.match(/['"]\@angular\/router['"]/)) {
            this.analysisDetails.angularRouter = true;
        }
    }

    checkFileForUnitTests(filename: string, fileData: string) {
        if (filename.substr(-7, 4) === 'spec') {
            this.analysisDetails.hasUnitTest = true;
        }
    }

    checkFileForCompile(filename: string, fileData: string) {
        if (fileData.match(/compile\(/)) {
            this.analysisDetails.compile = true;
        }
    }

    checkFileForScriptingLanguage(filename: string, fileData: string) {
        if (filename.substr(-3) === '.js') {
            this.analysisDetails.jsFileCount++;
        } else if (filename.substr(-3) === ".ts") {
            this.analysisDetails.tsFileCount++;
        }
    }

    checkFileForComponent(filename: string, fileData: string) {
        if (fileData.match(/\.controller\(/)) {
            this.analysisDetails.controllersCount++;
        }
        if (fileData.match(/.component\(/)) {
            this.analysisDetails.componentDirectivesCount++;
        }
    }
}