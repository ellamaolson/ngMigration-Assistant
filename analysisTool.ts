/**
 * ngMigration Assistant scans an AngularJS application and recommends
 * a particular migration path to take to Angular. It looks for good practices
 * and anti-patterns to help determine which stage in migration the 
 * application is and which migration path is right for you.
 */

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import { resolve } from 'dns';
const nodesloc = require('node-sloc');
const gitignore = require('parse-gitignore');
const glob = require('glob');

export class AnalysisTool {

    private CODE_LIMIT_MULTIPLIER: number = 1.25;
    private VALUE_NOT_FOUND: number = -1;

    analysisDetails = {
        rewriteThreshold: 880, // 880 lines is considered 1 month's work of coding 
        angularElement: false,
        rootScope: false,
        compile: false,
        uiRouter: false,
        angularjsRouter: false,
        angularRouter: false,
        hasUnitTest: false,
        usingAngular: false,
        usingAngularJS: false,
        totalFilesOrFolderCount: 0,
        relevantFilesOrFolderCount: 0,
        jsFileCount: 0,
        tsFileCount: 0,
        controllersCount: 0,
        componentCount: 0,
        linesOfCode: 0,
        mapOfFilesToConvert: new Map()
    };

    /**
     * Calls countLinesOfCode and waits for it to finish executing before calling 
     * the contained methods: runAnalysis(), runAntiPatternReport() which must 
     * finish executing before calling runRecommendation().
     * @param rootpath user input original directory path
     */
    constructor(rootpath: string) {
        this.analysisDetails.mapOfFilesToConvert = new Map<String, Array<String>>();
        setTimeout(() => { }, 1000);
        this.countLinesOfCode(rootpath, this.buildPathIgnoringGlobs(rootpath))
            .then(sourceLines => {
                this.analysisDetails.linesOfCode = sourceLines;
                this.runAnalysis(rootpath);
                return this.runAntiPatternReport();
            })
            .catch(err => {
                console.error("Error 1: ", err);
            })
            .then(report => {
                console.log(this.runAppStatistics());
                console.log(this.runRecommendation(report));
                console.log("rewriteThreshold: " + Math.round(this.analysisDetails.rewriteThreshold) + ", sloc: " + this.analysisDetails.linesOfCode + "\n");
            })
            .catch(err => {
                console.error("Error 2: ", err);
            });
    }

    /**
     * Builds a new filesystem by removing files matching the ignore globs using glob.
     * Returns as an array of files and folders.
     * @param rootPath original directory path
     */
    buildPathIgnoringGlobs(rootpath: string) {
        let ignoreGlobs = this.getGlobsFromGitignore(rootpath);
        let filesWithoutIgnores = glob.sync("**", { ignore: ignoreGlobs, cwd: rootpath });
        this.analysisDetails.totalFilesOrFolderCount = filesWithoutIgnores.length;
        return filesWithoutIgnores;
    }

    /**
    * Parses .gitignore file into an array of ignoreGlobs and appends default ignoreGlobs 
    * to the array. Filters out patterns starting with ! from the ignoreGlobs array
    * because ! means to never ignore. Returns the globs to ignore.
    * @param rootpath original directory path
    */
    getGlobsFromGitignore(rootpath: string): string[] {
        let allIgnoreGlobs: string[] = [];
        let defaultIgnoreGlobs = [
            'node_modules', 'node_modules/**', '**/node_modules', '**/node_modules/**',
            '.git', '.git/**', '**/.git', '**/.git/**',
            'tsconfig.json', 'tsconfig.json/**', '**/tsconfig.json', '**/tsconfig.json/**',
            'e2e', 'e2e/**', '**/e2e', '**/e2e/**',
            'jquery.js', 'jquery.js/**', '**/jquery.js', '**/jquery.js/**',
            'angular.js', 'angular.js/**', '**/angular.js', '**/angular.js/**'
        ];
        allIgnoreGlobs = [...gitignore(rootpath + "/.gitignore"), ...defaultIgnoreGlobs].filter((pattern) => {
            return !pattern.startsWith("!");
        });
        return allIgnoreGlobs;
    }

    // /**
    //  * DO NOT DELETE - possible for future implementation!
    //  * Another way of parsing the .gitignore and building a new filesystem. Scans only 
    //  * git repos and asks git for a list of files to check from the .gitignore file 
    //  * within the given directory. Uses grep to ignore default ignore globs.
    //  */
    // const exec = require('child_process').exec;
    // buildPathIgnoringGlobs(path: string) {
    //     exec("cd \"" + path + "\" && git ls-tree -r master --name-only | egrep -v \".*(node_modules|e2e|.git|tsconfig.json).*\"", function (error: string, data: string) {
    //         let a = data.split("\n");
    //         a.pop();
    //         console.log(a);
    //     });
    // }

    /**
     * Counts the source lines of code (sloc) using node-sloc to traverse through 
     * the passed in filesystem. Uses filtered filesystem as not count sloc
     * in node_modules and other ignored files. Returns a promise that resolves to sloc.
     * @param rootPath original directory path
     * @param filteredFilePaths filtered filesystem buildPathIgnoringGlobs() returns
    */
    async countLinesOfCode(rootPath: string, filteredFilePaths: string[]): Promise<any> {
        return new Promise((resolve, reject) => {
            const promisesINeedResolvedForMeToBeDone = [];

            let lines: number = 0;
            for (let file of filteredFilePaths) {
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
     * Traverses through filtered filesystem returned by buildPathIgnoringGlobs()
     * and calls testFile() to run the individual tests.
     * @param rootPath original directory path
     */
    private runAnalysis(rootpath: string) {
        const list = fs.readdirSync(rootpath);
        let currentPath: string = "";

        for (let fileOrFolder of this.buildPathIgnoringGlobs(rootpath)) {
            currentPath = rootpath + "/" + fileOrFolder;
            this.testFile(currentPath);
        }
    }

    /**
     * Calls tests on each file in the filtered filesystem to looks for anti-patterns,
     * Angular version, and additional practices. 
     * @param currentPath 
     */
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
            this.analysisDetails.relevantFilesOrFolderCount++;
            for (let test of tests) {
                test(currentPath, fs.readFileSync(currentPath, "utf8"));
            }
        }
    }

    checkFileForRootScope(filename: string, fileData: string) {
        if (filename.substr(-7, 4) != 'spec' && !filename.includes('test')) {
            if (fileData.match(/\$rootScope/)) {
                this.analysisDetails.rootScope = true;
                this.pushValueOnKey(this.analysisDetails.mapOfFilesToConvert, filename, " $rootScope");
            }
        }
    }

    checkFileForCompile(filename: string, fileData: string) {
        if (filename.substr(-7, 4) != 'spec' && !filename.includes('test')) {
            if (fileData.match(/compile\(/)) {
                this.analysisDetails.compile = true;
                this.pushValueOnKey(this.analysisDetails.mapOfFilesToConvert, filename, " $compile");
            }
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
        if (filename.substr(-7, 4) === 'spec' || filename.includes('test')) {
            this.analysisDetails.hasUnitTest = true;
        }
    }

    checkAngularVersion(filename: string, fileData: string) {
        if (filename.substr(-12) === 'package.json' || filename.substr(-10) === 'bower.json') {
            if (fileData.match(/\"\@angular\/core\"\:/) || fileData.match(/\"angular2\"\:/)) {
                this.analysisDetails.usingAngular = true;
            }

            if (fileData.match(/\"angular\"\:/)) {
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
            this.pushValueOnKey(this.analysisDetails.mapOfFilesToConvert, filename, " controller");
        }
        if (fileData.match(/\.component\(/) || fileData.match(/component\(/)) {
            this.analysisDetails.componentCount++;
            this.pushValueOnKey(this.analysisDetails.mapOfFilesToConvert, filename, " AngularJS component");
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
    * Creates the anti-pattern report and calculates the rewriteThreshold runRecommendation() uses.
    * Each time an anti-pattern is found, general instructions and files needing corrections 
    * are appended to the preparation report. Returns a promise that resolves to the preparation report. 
    */
    private runAntiPatternReport(): Promise<any> {
        let preparationReport = "";

        if (this.analysisDetails.rootScope) {
            preparationReport += "\n  * App contains $rootScope, please refactor rootScope into services.";
            this.analysisDetails.rewriteThreshold *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (this.analysisDetails.compile) {
            preparationReport += "\n  * App contains $compile, please rewrite compile to eliminate dynamic feature of templates.";
            this.analysisDetails.rewriteThreshold *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (!this.analysisDetails.hasUnitTest) {
            preparationReport += "\n  * App does not contain unit tests, please include unit tests.";
            this.analysisDetails.rewriteThreshold *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (this.analysisDetails.jsFileCount > 0) {
            preparationReport += "\n  * App contains " + this.analysisDetails.jsFileCount + " JavaScript files that need to be converted to TypeScript."
                + "\n      To learn more, visit https://angular.io/guide/upgrade#migrating-to-typescript";
            this.analysisDetails.rewriteThreshold *= this.CODE_LIMIT_MULTIPLIER;
        }
        if (this.analysisDetails.controllersCount > 0) {
            preparationReport += "\n  * App contains " + this.analysisDetails.controllersCount
                + " controllers that need to be converted to AngularJS components.\n      To learn more, visit https://docs.angularjs.org/guide/component";
            this.analysisDetails.rewriteThreshold *= this.CODE_LIMIT_MULTIPLIER;
        }

        if (this.analysisDetails.mapOfFilesToConvert.size > 0) {
            preparationReport += "\x1b[1m\n\nFiles that contain AngularJS patterns and need to be modified:\x1b[0m";
            let index = 1;
            for (let key of this.analysisDetails.mapOfFilesToConvert.keys()) {
                preparationReport += "\n" + index++ + ".  " + key + " --> Modifications necessary: " + this.analysisDetails.mapOfFilesToConvert.get(key);
            }
        }
        return Promise.resolve(preparationReport);
    }

    public runAppStatistics(): string {
        let report = "\x1b[1m\nApp Statistics\x1b[0m";
        if (this.analysisDetails.controllersCount > 0
            || this.analysisDetails.componentCount > 0
            || this.analysisDetails.jsFileCount > 0
            || this.analysisDetails.tsFileCount > 0) {
            report += "\n  * Complexity: " + this.analysisDetails.controllersCount + " controllers, "
                + this.analysisDetails.componentCount + " AngularJS components, " +
                + this.analysisDetails.jsFileCount + " JavaScript files, and "
                + this.analysisDetails.tsFileCount + " Typescript files.";
        }
        report += "\n  * App size: " + this.analysisDetails.linesOfCode + " lines of code"
            + "\n  * File Count: " + this.analysisDetails.totalFilesOrFolderCount + " total files/folders, "
            + this.analysisDetails.relevantFilesOrFolderCount + " relevant files/folders"
            + "\n  * AngularJS Patterns: ";
        if (this.analysisDetails.rootScope) {
            report += " $rootScope, ";
        }
        if (this.analysisDetails.compile) {
            report += " $compile, ";
        }
        if (!this.analysisDetails.hasUnitTest) {
            report += " no unit tests, ";
        }
        if (this.analysisDetails.jsFileCount > 0) {
            report += " JavaScript, ";
        }
        if (this.analysisDetails.controllersCount > 0) {
            report += " .controller, ";
        }

        if (report.endsWith(", ")) {
            report = report.slice(0, -2);
        } else if (report.endsWith("  * AngularJS Patterns: ")) {
            report += "N/A";
        }
        return report;
    }

    /**
     * Recommendation algorithm that checks type of application (AngularJS, Angular, or 
     * hybrid), checks if sloc is under the rewriteThreshold, and checks if passes the 
     * ngUpgrade requirements. Returns a recommendation with a preparation report only 
     * when needed. 
     * @param preparationReport preparation instructions for upgrading
     */
    public runRecommendation(preparationReport: string): string {
        let recommendation = "\x1b[1m\nYour Recommendation\n\x1b[0m";
        if (this.typeOfApplication() == "angular") {
            recommendation += "\x1b[34mThis is already an Angular application. You do not need to migrate.\n\x1b[0m";
            return recommendation;
        }
        //Rewriting from scratch
        if (this.analysisDetails.rewriteThreshold >= this.analysisDetails.linesOfCode) {
            if (this.typeOfApplication() == "hybrid") {
                recommendation += "\x1b[34mEven though you have already begun making a hybrid application with"
                    + " both AngularJS and Angular, the simplest solution is to rewrite your application from scratch.\n\x1b[0m";;
            } else {
                recommendation += "\x1b[34mThe simplest solution is to rewrite your application from scratch.\n\x1b[0m";
            }
            if (!this.analysisDetails.hasUnitTest) {
                recommendation += "Please include unit tests in your new Angular application.\n";
            }
        } else {
            if (this.passesNgUpgradeRequirements()) {
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
                        + " both AngularJS and Angular, your app does not pass the necessary requirements to use ngUpgrade.\n";
                        + "Please follow these preparation steps before migrating with ngUpgrade.\x1b[0m";
                } else {
                    recommendation += "\x1b[34mPlease follow these preparation steps before migrating with ngUpgrade.\x1b[0m";
                }
                recommendation += preparationReport + "\n";
            }
        }
        return recommendation + "\x1b[34m\nHead to ngMigration-Forum to understand this migration approach.\n\x1b[1mhttps://github.com/angular/ngMigration-Forum/wiki\n\x1b[0m";
    }

    typeOfApplication(): string {
        if (this.analysisDetails.usingAngular && this.analysisDetails.usingAngularJS) {
            return "hybrid";
        } else if (this.analysisDetails.usingAngular && !this.analysisDetails.usingAngularJS) {
            return "angular"
        }
        return "angularjs";
    }

    passesNgUpgradeRequirements(): boolean {
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