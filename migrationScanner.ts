/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs'; //access to fs library

export default class MigrationScanner {

    public jsFileCount: number;
    public tsFileCount: number;
    // public path: string; //not sure if need to make a path property..?

    public MigrationScanner(path: string) {
        // this.path = path;
        this.jsFileCount = 0;
        this.tsFileCount = 0;
        setTimeout(() => { }, 100000);
        this.traverseFileSystem(path);
    }

    public traverseFileSystem(path: string) {
        console.log("Descending into " + path);
        const list = fs.readdirSync(path); //read the passed in file path and return a string array of filenames

        for (let i = 0; i < list.length; i++) {
            console.log(list[i]);
            this.checkUnitTests(list[i]);
            this.countScriptingFiles(list[i]);
            // this.checkAngularVersion(list[i]);
            // this.checkRootscope(list[i]);   

            if (fs.statSync(path + "/" + list[i]).isDirectory()) { // must attach current file to next file to produce correct directory
                this.MigrationScanner(path + "/" + list[i]); // if not, go to the child file or next file down
                console.log("moo!");
                //will print undefined unless add a return statement!
            }
        }
    }

    public checkUnitTests(filename: string) {
        if (filename.substr(-7, 4) === 'spec') {
            console.log("Spec found: true!");
            return true;
        }
        return false;
    }

    public countScriptingFiles(filename: string) {
        if (filename.substr(-3) === '.js') { //check if current filename/folder is js file
            this.jsFileCount++;
        } else if (filename.substr(-3) === ".ts") {
            this.tsFileCount++;
        }
    }

    public x(filename: string) {
    }

    public checkAngularVersion(filename: string) {

    }

    public checkRootscope(filename: string) {

    }
}


