// X Article Downloader Popup Script

document.getElementById('downloadMD').onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "download", type: "markdown" }, (response) => {
                if (!response) {
                    alert("Could not communicate with the page. Try refreshing.");
                }
            });
        }
    });
};

document.getElementById('downloadPDF').onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "download", type: "pdf" }, (response) => {
                if (!response) {
                    alert("Could not communicate with the page. Try refreshing.");
                }
            });
        }
    });
};
