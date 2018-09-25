var app = require('electron').remote;
var dialog = app.dialog;
var fs = require('fs');

document.getElementById('openButton').onclick = () => {
    dialog.showOpenDialog((fileNames) => {
        if(fileNames === undefined) {
            alert('No file selected');
        } else {
            readFile(fileNames[0]);
        }
    });
};

function readFile(filepath) {
    fs.readFile(filepath, 'utf-8', (err, data) => {
        if(err) {
            alert('An error occured reading the file.');
            return;
        }

        var textArea = document.getElementById('output')
        textArea.value = data;
    });
}