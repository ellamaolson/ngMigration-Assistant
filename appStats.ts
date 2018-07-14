/**
 * AppStats scans an AngularJS app for certain critera to recommend
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

export class AppStats {

    private jsFileCount: number;
    private tsFileCount: number;
    private missingUnitTest: boolean;
    private maxCodeLimit: number = 880; // 880 lines is considered to be 1 month's worth of efficient coding 
    private path: string; // not sure if need to make a path property..?
    private controllersCount: number;
    private componentDirectivesCount: number;
    private CODE_LIMIT_MULTIPLIER: number = 1.5;
    private CODE_LIMIT_DOUBLE: number = 2;
    private VALUE_NOT_FOUND: number = -1;

    constructor(path: string) {
        this.path = path;
        this.jsFileCount = 0;
        this.tsFileCount = 0;
        this.missingUnitTest = true;
        this.controllersCount = 0;
        this.componentDirectivesCount = 0;
    }

    public recommendation() {
        console.log("\n");
        this.decisionTree();
        let appLinesOfCode = 0;
        if (this.maxCodeLimit > appLinesOfCode) {

        }
    }

    private decisionTree() {
        setTimeout(() => { }, 100000);
        this.traverseFileSystem();

        console.log("\n***Decision Tree Outputs***");

        if (this.jsFileCount > 0) {
            this.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER; //(this.jsFileCount / 10); 
            console.log("You still have " + this.jsFileCount + " JavaScript file left to convert to TypeScript.")
            console.log("You have converted " + this.tsFileCount + " files successfully to TypeScript.");
        }

        if (this.missingUnitTest) {
            this.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        }

        if (this.componentDirectivesCount > 0 && this.controllersCount == 0) {
            console.log("Prepared for ngUpgrade!")
        } else if (this.componentDirectivesCount > 0 && this.controllersCount > 0) {
            console.log("Still have " + this.controllersCount + " controller(s) to convert to component directive before upgrading with ngUpgrade");
            this.maxCodeLimit *= this.CODE_LIMIT_MULTIPLIER;
        } else if (this.controllersCount > 0) {
            console.log("Need to begin converting " + this.controllersCount + " controller(s) to have component directive before upgrading with ngUpgrade.");
            this.maxCodeLimit *= this.CODE_LIMIT_DOUBLE;
        }

    }

    /**
     * Attaches current file to next file to produce correct directory 
     * and traverse down the tree. Will print undefined unless return
     * statement added.
     */
    private traverseFileSystem() {
        console.log("------>Descending into " + this.path);
        const list = fs.readdirSync(this.path);
        let currentPath: string = "";

        for (let i = 0; i < list.length; i++) {
            console.log(list[i]);
            this.countScriptingFiles(list[i]);
            this.checkForUnitTests(list[i]);

            /**
             * Cannot scan directories with fs.readFileSync(), so must 
             * ensure that it does not pass in a directory to file-scanning
             * methods. If directory, append the path correctly. 
            */

            currentPath = this.path + "/" + list[i];
            if (!fs.statSync(currentPath).isDirectory()) {
                if(currentPath.substr(-3) === '.js' || currentPath.substr(-3) === ".ts" || currentPath.substr(-5) === ".html") {
                    this.hasControllerOrComponent(currentPath, fs.readFileSync(currentPath, "utf8"));
                    this.hasRootscope(currentPath, fs.readFileSync(currentPath, "utf8"));
                }
            } else {
                this.path = currentPath;
                this.traverseFileSystem();
            }
        }
    }

    private checkForUnitTests(filename: string) {
        if (filename.substr(-7, 4) === 'spec') {
            console.log("--->Spec found: true!");
            this.missingUnitTest = false;
        }
        return this.missingUnitTest;
    }

    private countScriptingFiles(filename: string) {
        if (filename.substr(-3) === '.js') {
            this.jsFileCount++;
        } else if (filename.substr(-3) === ".ts") {
            this.tsFileCount++;
        }
    }

    /**
     * Most likely will not include this function, though keeping it here for now.
     * checkAngularVersion()
     * check pacakage.json under key dependencies and see AJS version in angular and A in @angular/core
     * if use bower -> do this: bower.json which has dependencies key and angular
     * 
     * if(filename.substr(-12) === 'package.json' || filename.substr(-10) === 'bower.json') {
            console.log("--->Data: " + fileData);
            console.log("--->Dependencies: " + fileData.includes("angular"));
        }
     * */

    private hasControllerOrComponent(filename: string, fileData: string) {
        let controller: RegExp = /\.controller\(/;
        let componentDirective: RegExp = /.component\(/;
        if (this.searchFileData(filename, fileData, controller)) {
            this.controllersCount++;
            console.log("--->Found a controller in " + filename);
        }
        if (this.searchFileData(filename, fileData, componentDirective)) {
            this.componentDirectivesCount++;
            console.log("--->Found a component-directive in " + filename);
        }
    }

    private hasRootscope(filename: string, fileData: string) {
        let rootscope: RegExp = /\$rootScope/;
        if (this.searchFileData(filename, fileData, rootscope)) {
            return true;
        }
        return false;
    }

    /**
     * Used in hasControllerOrComponent() and hasRootscope to search a file
     * using a RegExp
     */
    private searchFileData(filename: string, fileData: string, regex: RegExp) {
        if (fileData.search(regex) != this.VALUE_NOT_FOUND) {
            return true;
        }
        return false;
    }
}