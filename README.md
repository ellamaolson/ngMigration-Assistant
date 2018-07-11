REGULAR EXPRESSIONS: 
Though this does not cover the edge cases of:
    - If search value is in a string
    - If search value is the name of a function
    - if search value is the name of a file
This is the easiest and most feasible solution in the time being to search files for bad practices and aggregate the answers into an algorithm.


AST PARSING:
Investigated using eslint rules, esprima, acorn, and typescript parsers. Decided to go with typescript AST parsing b/c it was

(1) Eslint : Can make custom rules to search and report errors. Problem with this solution is that it is a external package where my tool would reside within, rather than the AST functioning residing from with my package. Additionally, can not have nested rules or trigger functions from the rules error. 
*yarn add eslint*
    Configure eslintc.json with my custom rules. Using eslint 4.11.1. 

(2) Esprima : AST library, well supported, but using BSD license.

(3) Acorn: AST library, most recently updated and well supported. Though does not work well with *ts-node* and resorted to using *tsc* when compiling. 
*yarn add acorn*
    Edit app.ts to have a test example of using acorn's walk.simple() and ran into an issue with importing from acorn. 
        Solved by typing: "import * as acorn from "acorn";" in app.ts and adding acorn to @types.
    Also ran into an issue with importing from acorn/dist/walker. 
        Solved by typing "import * as walk from "acorn/dist/walk";" in app.ts, created a file acorn-walk.d.ts containing only "declare module 'acorn/dist/walk';". 
*tsc*
    Ran into an issue using *yarn start* which triggers ts-node 7.0.0 where it returns compiling error even though there are no syntax errors:
        '[ERROR] 12:05:53 ⨯ Unable to compile TypeScript:
        app.ts(3,23): error TS7016: Could not find a declaration file for module 'acorn/dist/walk'. '/Users/elanaolson/Documents/migration-tool/node_modules/acorn/dist/walk.js' implicitly has an 'any' type.
        Try `npm install @types/acorn` if it exists or add a new declaration (.d.ts) file containing `declare module 'acorn';`' 
    Though *yarn start* works on ts-node 3.3.0. 
*node app.js*
    Use the js version of app.ts with *tsc* and it works well.

(4) Typescript: Can also use the typescript's copmpiler parser or typescript-parser library.


