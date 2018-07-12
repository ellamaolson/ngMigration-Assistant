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
    private hasUnitTest;
    private maxCodeLimit: number = 880; // 880 lines is considered to be 1 month's worth of efficient coding 
    private codeLimitMultiplier: number = 1.5;
    private codeLimitDouble: number = 2;
    private path: string; // not sure if need to make a path property..?

    constructor(path: string) {
        this.path = path;
        this.jsFileCount = 0;
        this.tsFileCount = 0;
        this.hasUnitTest = false;
    }

    public recommendation() {
        this.decisionTree();
    }

    private decisionTree() {
        setTimeout(() => { }, 100000);
        this.traverseFileSystem();

        /**
         *  Scripting Language/Unit Tests checks: (1) Check is has JS and no TS, 
         *  (2) has both, then check if JS > TS or if TS >= JS. Also check for unit tests here.
         *  If TS >= JS, this means they are already at TS conversion.
         */
        console.log("Js: " + this.jsFileCount + " Ts: " + this.tsFileCount);
        if (this.jsFileCount > 0 && this.tsFileCount == 0) {
            this.maxCodeLimit *= this.codeLimitMultiplier; //(this.jsFileCount / 10); //EG
        } else if (this.jsFileCount > 0 && this.tsFileCount > 0) {
            if (this.jsFileCount > this.tsFileCount) {
                let jsFilesNeedConverting = this.jsFileCount - this.tsFileCount;
                console.log("You still have " + jsFilesNeedConverting + " JavaScript file left to convert to TypeScript.")
                this.maxCodeLimit *= this.codeLimitMultiplier; //(jsFilesNeedConverting / 10); //EG
            } else { //if (this.jsFileCount <= this.tsFileCount && this.hasUnitTest) {
                    console.log("Good Job, you have have already converted to Typescript!");
            }
        }

        if (this.hasUnitTest) {
            this.maxCodeLimit *= this.codeLimitMultiplier; //EG
        }
    }

    /**
     * Attaches current file to next file to produce correct directory 
     * and traverse down the tree. Will print undefined unless return
     * statement added.
     */
    private traverseFileSystem() {
        console.log("Descending into " + this.path);
        const list = fs.readdirSync(this.path);

        for (let i = 0; i < list.length; i++) {
            console.log(list[i]);
            this.checkForUnitTests(list[i]);
            this.countScriptingFiles(list[i]);
            this.checkAngularVersion(list[i]);
            // this.checkRootscope(list[i]);   

            if (fs.statSync(this.path + "/" + list[i]).isDirectory()) {
                this.path += "/" + list[i];
                this.traverseFileSystem(); 
            }
        }
    }

    private checkForUnitTests(filename: string) {
        if (filename.substr(-7, 4) === 'spec') {
            console.log("Spec found: true!");
            this.hasUnitTest = true;
        }
        return this.hasUnitTest;
    }

    private countScriptingFiles(filename: string) {
        if (filename.substr(-3) === '.js') { 
            this.jsFileCount++;
        } else if (filename.substr(-3) === ".ts") {
            this.tsFileCount++;
        }
    }

    private x(filename: string) {
    }

    /**
     * check pacakage.json under key dependencies and see AJS version in angular and A in @angular/core
     * if use bower -> do this: bower.json which has dependencies key and angular
     * */
    private checkAngularVersion(filename: string) {

    }

    private checkRootscope(filename: string) {

    }
}