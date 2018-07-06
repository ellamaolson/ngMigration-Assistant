import * as fs from 'fs'; //access to fs library

console.log("Hello Elana");

setTimeout(() => { }, 100000);

function folderhasTS(path: string) {
    console.log("Descending into " + path);
    const list = fs.readdirSync(path);

    for (let i = 0; i < list.length; i++) {
        if (list[i].substr(-3) === '.js') {
            return true;
        } else {
            if (fs.statSync(path + "/" + list[i]).isDirectory()) {
                const result = folderhasTS(path + "/" + list[i]);
                if (result) {
                    return true;
                }
            }
        }
    }
    return false;
}

console.log(folderhasTS('.'));