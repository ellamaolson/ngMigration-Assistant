// Default button from <input type = "file">
const realFileButton = document.getElementById("real-file");

// Bootstrap button connected to realFileButton
const customButton = document.getElementById("custom-button");

// Displays file name
const customText = document.getElementById("custom-text");

// Opens file manager
customButton.addEventListener("click", function() {
    realFileButton.click();
});

// Displays file name when user selects a file
realFileButton.addEventListener("change", function() {
    
    // realFileButton performs all actions --> contains value of file
    // Updates customText to name of file
    if(realFileButton.value) {
        customText.innerHTML = realFileButton.value.match(/[\/\\]([\w\d\s\.\-\(\)]+)$/)[1];
    }
    else {
        customText.innerHTML = "No file chosen";
    }
});