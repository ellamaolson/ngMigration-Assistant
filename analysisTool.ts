/**
 * ngmigration AnalysisTool scans an AngularJS app for certain critera to recommend
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
const exec = require('child_process').exec;

export class AnalysisTool {

    private CODE_LIMIT_MULTIPLIER: number = 1.25;
    private VALUE_NOT_FOUND: number = -1;

    analysisDetails = {
        maxCodeLimit: 880, // 880 lines considered 1 month's work of coding 
        angularElement: false,
        rootScope: false,
        compile: false,
        uiRouter: false,
        angularjsRouter: false,
        angularRouter: false,
        hasUnitTest: false,
        usingAngular: false,
        usingAngularJS: false,
        jsFileCount: 0,
        tsFileCount: 0,
        controllersCount: 0,
        componentDirectivesCount: 0,
        linesOfCode: 0,
        ignorePaths: [""],
        ignoreGlobs: [""],
        mapOfFilesToConvert: new Map()
    };

    constructor(path: string) {
        this.analysisDetails.mapOfFilesToConvert = new Map<String, Array<String>>();
        setTimeout(() => { }, 1000);
        this.getGlobsFromGitignore(path);
        this.countLinesOfCode(path, this.buildPathIgnoringGlobs(path))
            .then(sourceLines => {
                this.analysisDetails.linesOfCode = sourceLines;
                this.runAnalysis(path);
                return this.runAntiPatternReport();
            })
            .catch(err => {
                console.error("Error 2", err);
            })
            .then(report => {
                console.log(this.runRecommendation(report));
                console.log("\x1b[32m%s\x1b[0m", "MaxCodeLimit: " + Math.round(this.analysisDetails.maxCodeLimit) + ", SLOC: " + this.analysisDetails.linesOfCode + "\n");
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
            'tsconfig.json', 'tsconfig.json/**', '**/tsconfig.json', '**/tsconfig.json/**',
            'e2e', 'e2e/**', '**/e2e', '**/e2e/**'
        ];
        this.analysisDetails.ignoreGlobs = [...gitignore(path + "/.gitignore"), ...defaultIgnoreGlobs];
        this.analysisDetails.ignoreGlobs = this.analysisDetails.ignoreGlobs.filter((pattern) => {
            return !pattern.startsWith("!");
        });
    }

    /**
     * Builds a new filesystem without the ignored files and
     * returns an array of filesnames.
     */
    buildPathIgnoringGlobs(path: string) {
        let filesWithoutIgnores = glob.sync("**", { ignore: this.analysisDetails.ignoreGlobs, cwd: path });
        return filesWithoutIgnores;
    }

    // //DO NOT DELETE
    // //This scans only git repos, asks git for a list of files to check from the .gitignore file within the given directory.
    // //Uses grep to ignore the defaultIgnoreGlobs. 
    // buildPathIgnoringGlobs(path: string) {
    //     exec("cd \"" + path + "\" && git ls-tree -r master --name-only | egrep -v \".*(node_modules|e2e|.git|package.json|tsconfig.json).*\"", function (error: string, data: string) {
    //         let a = data.split("\n");
    //         a.pop();
    //         console.log(a);
    //     });
    // }

    /**
     * Depends on node-sloc to count source lines of code (sloc).
     * Only scans files with extensions: js, ts, or html. Does not scan node_modules directory.
     * Returns a promise that resolves to sloc.
    */
    async countLinesOfCode(rootPath: string, filePaths: string[]): Promise<any> {
        return new Promise((resolve, reject) => {
            const promisesINeedResolvedForMeToBeDone = [];

            let lines: number = 0;
            for (let file of filePaths) {
                const options = {
                    path: rootPath + "/" + file,
                    extensions: ['js', 'ts', 'html'],
                    ignorePaths: ['node_modules'],
                    ignoreDefaut: false,
                }
                promisesINeedResolvedForMeToBeDone.push(
                    nodesloc(options)
                        .then((results: any) => {
                            lines += results.sloc.sloc || 0;
                        })
                        .catch((err: any) => {
                            console.log("Is there")
                            console.error(err);
                            reject(err);
                        })
                );
            }
            Promise.all(promisesINeedResolvedForMeToBeDone).then(() => resolve(lines));
        });
    }



    /**
     * Recursively traverses file system and scans each .js/.ts/.html file by calling analysis tests.
     * Only scan these extensions to avoid scanning node_modules, .json, yarn lock, .md.
     * Attaches current file to next file to produce correct directory and traverse down the tree.
     */
    private runAnalysis(path: string) {
        const list = fs.readdirSync(path);
        let currentPath: string = "";

        for (let fileOrFolder of this.buildPathIgnoringGlobs(path)) {
            currentPath = path + "/" + fileOrFolder;
            this.testFile(currentPath);
            currentPath = fileOrFolder;
        }
    }

    testFile(currentPath: string) {
        let tests = [
            (filename: string, data: string) => this.checkFileForRootScope(filename, data),
            (filename: string, data: string) => this.checkFileForCompile(filename, data),
            (filename: string, data: string) => this.checkFileForAngularElement(filename, data),
            (filename: string, data: string) => this.checkFileForRouter(filename, data),
            (filename: string, data: string) => this.checkFileForUnitTests(filename, data),
            (filename: string, data: string) => this.checkAngularVersion(filename, data),
            (filename: string, data: string) => this.checkFileForScriptingLanguage(filename, data),
            (filename: string, data: string) => this.checkFileForComponent(filename, data),
        ];
        if (currentPath.substr(-3) === '.js' || currentPath.substr(-3) === '.ts' || currentPath.substr(-5) === '.html' || currentPath.substr(-5) === '.json') {
            for (let test of tests) {
                test(currentPath, fs.readFileSync(currentPath, "utf8"));
            }
        }
    }

    checkFileForRootScope(filename: string, fileData: string) {
        if (fileData.match(/\$rootScope/)) {
            this.analysisDetails.rootScope = true;
            this.pushValueOnKey(this.analysisDetails.mapOfFilesToConvert, filename, " $rootScope");
        }
    }

    checkFileForCompile(filename: string, fileData: string) {
        if (fileData.match(/compile\(/)) {
            this.analysisDetails.compile = true;
            this.pushValueOnKey(this.analysisDetails.mapOfFilesToConvert, filename, " $compile");
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

    checkAngularVersion(filename: string, fileData: string) {
        if (filename.substr(-12) === 'package.json' || filename.substr(-10) === 'bower.json') {
            if (fileData.match(/\"\@angular\/core\"\:/) || fileData.match(/\"angular2\"\:/)) {
                this.analysisDetails.usingAngular = true;
            } else if (fileData.match(/\"angular\"\:/)) {
                this.analysisDetails.usingAngularJS = true;
            }
        } else if (fileData.match(/https\:\/\/ajax\.googleapis\.com\/ajax\/libs\/angularjs/)) {
            this.analysisDetails.usingAngularJS = true;
        }
    }

    checkFileForScriptingLanguage(filename: string, fileData: string) {
        if (filename.substr(-3) === '.js') {
            this.analysisDetails.jsFileCount++;
            this.pushValueOnKey(this.analysisDetails.mapOfFilesToConvert, filename, " JavaScript");
        } else if (filename.substr(-3) === ".ts") {
            this.analysisDetails.tsFileCount++;
        }
    }

    checkFileForComponent(filename: string, fileData: string) {
        if (fileData.match(/\.controller\(/)) {
            this.analysisDetails.controllersCount++;
            this.pushValueOnKey(this.analysisDetails.mapOfFilesToConvert, filename, " .controller");
        }
        if (fileData.match(/.component\(/)) {
            this.analysisDetails.componentDirectivesCount++;
            this.pushValueOnKey(this.analysisDetails.mapOfFilesToConvert, filename, " .component");
        }
    }

    pushValueOnKey(map: Map<any, any>, key: string, value: string) {
        if (map.has(key)) {
            let values = map.get(key);
            values.push(value);
            map.set(key, values);
        } else {
            let newValuesArray: string[] = [value];
            map.set(key, newValuesArray);
        }
    }

    /**
    * Calculates the maxCodeLimit and generates a preparation report. 
    * Reports on rootScope, compile, unit tests, scripting language, and component architecture.
    */
    private runAntiPatternReport(): Promise<any> {
        let preparationReport = "The below changes are necessary for preparing your app for upgrading."
            + " See the files to modify list to know where to make these changes and what each file contains that"
            + " needs to be corrected. Once you have made the appropriate changes to prepare for migrating,"
            + " rerun this test and determine your migration path.";

        if (this.analysisDetails.rootScope) {
            preparationReport += "\n   \x1b[34m*\x1b[0m App contains $rootScope, must refactor rootScope into services.";
            this.analysisDetails.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (this.analysisDetails.compile) {
            preparationReport += "\n   \x1b[34m*\x1b[0m App contains $compile, must rewrite compile to eliminate dynamic feature of templates.";
            this.analysisDetails.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (!this.analysisDetails.hasUnitTest) {
            preparationReport += "\n   \x1b[34m*\x1b[0m App does not contain unit tests, must write unit tests.";
            this.analysisDetails.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (this.analysisDetails.jsFileCount > 0) {
            preparationReport += "\n   \x1b[34m*\x1b[0m App contains " + this.analysisDetails.jsFileCount + " JavaScript files that need to be converted to TypeScript.";
            this.analysisDetails.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (this.analysisDetails.controllersCount > 0) {
            preparationReport += "\n   \x1b[34m*\x1b[0m App contains " + this.analysisDetails.controllersCount + " controllers that need to be converted to component directives.";
            this.analysisDetails.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }

        if (this.analysisDetails.mapOfFilesToConvert.size > 0) {
            preparationReport += "\n\n   \x1b[34mFiles To Modify\x1b[0m";
            for (let key of this.analysisDetails.mapOfFilesToConvert.keys()) {
                preparationReport += "\n   " + key + " \x1b[34m-->\x1b[0m Contains: " + this.analysisDetails.mapOfFilesToConvert.get(key);
            }
        }
        return Promise.resolve(preparationReport);
    }

    /**
     * Takes in a preparation report to tack onto the end of the recommendation.
     * Based on analysis results and maxCodeLimit calculation, provides a recommendation.
     * If app is a hybrid app, the recommendation is slightly modified. 
     * @param preparationReport 
     */
    public runRecommendation(preparationReport: string): string {
        let recommendation = "\x1b[4m\nYour Recommendation\n\x1b[0m";
        if (this.typeOfApplication() == "angular") {
            return "\x1b[34mThis is already an Angular application. You do not need to migrate.\x1b[0m";
        }

        if (this.analysisDetails.maxCodeLimit >= this.analysisDetails.linesOfCode) {
            
            if (this.typeOfApplication() == "hybrid") {
                recommendation += "\x1b[34mEven though you have already begun making a hybrid application with"
                    + " both AngularJS and Angular, the simplest solution is to rewrite your application from scratch.\n\x1b[0m";
            } else {
                recommendation += "\x1b[34mThe simplest solution is to rewrite your application from scratch.\n\x1b[0m";
            }
            //If preparationReport contains actual corrects, include it. 
            if (this.analysisDetails.mapOfFilesToConvert.size > 0 || !this.analysisDetails.hasUnitTest) {
                recommendation += preparationReport + "\n";
            }
        } else {
            if (this.passesngUpgradeRequirements()) {
                recommendation += "\x1b[34mYou have passed the necessary requirements and can use ngUpgrade as your migration path.\n\x1b[0m";
                if (this.analysisDetails.angularElement == true) {
                    recommendation += "Continue using Angular Elements for components.";
                } else if (this.analysisDetails.uiRouter == true) {
                    recommendation += "Use the hybrid ui-router in addition.";
                } else if (this.analysisDetails.angularjsRouter) {
                    recommendation += "Use the hyrbid AngularJS and Angular router in addition.";
                }
            } else {
                if (this.typeOfApplication() == "hybrid") {
                    recommendation += "\x1b[34mEven though you have already begun making a hybrid application with"
                        + " both AngularJS and Angular, your app does not pass the necessary requirements to use ngUpgrade.\n\x1b[0m";
                } else {
                    recommendation += "\x1b[34mYour app does not pass the necessary requirements to use ngUpgrade.\n\x1b[0m";
                }
                recommendation += preparationReport + "\n";
            }
        }
        return recommendation;
    }

    typeOfApplication(): string {
        if (this.analysisDetails.usingAngular && this.analysisDetails.usingAngularJS) {
            return "hybrid";
        } else if (this.analysisDetails.usingAngular && !this.analysisDetails.usingAngularJS) {
            return "angular"
        }
        return "angularjs";
    }

    passesngUpgradeRequirements(): boolean {
        if (this.analysisDetails.rootScope == false &&
            this.analysisDetails.compile == false &&
            this.analysisDetails.hasUnitTest == true &&
            this.analysisDetails.jsFileCount == 0 &&
            this.analysisDetails.controllersCount == 0) {
            return true;
        }
        return false;
    }

}