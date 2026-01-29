// X Article PDF/Markdown Downloader Content Script

console.log("X Article Downloader v2 loaded.");

// --- Constants & Selectors ---
const SELECTORS = {
    ARTICLE_HEADER: 'h2[role="heading"]',
    DRAFT_CONTENT: '.public-DraftEditor-content',
    DRAFT_BLOCK: '.public-DraftStyleDefault-block',
    TITLE: 'div.css-175oi2r.r-13qz1uu',
    CARD_WRAPPER: '[data-testid="card.wrapper"]',
    FOCUS_MODE: 'a[aria-label="Focus mode"]'
};

const ICONS = {
    MARKDOWN: `<svg viewBox="0 0 24 24"><path d="M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6H20.56C21.35 6 22 6.63 22 7.41V16.59C22 17.37 21.35 18 20.56 18ZM6.81 15.19V11.53L8.73 13.88L10.65 11.53V15.19H12.58V8.81H10.65L8.73 11.16L6.81 8.81H4.88V15.19H6.81ZM19.69 12V8.81H17.77V12H15.84L18.73 15.19L21.61 12H19.69Z"/></svg>`,
    PDF: `<svg viewBox="0 0 24 24"><path d="M19,2L14,2L14,4L19,4L19,22L5,22L5,4L10,4L10,2L5,2C3.89,2 3,2.89 3,4L3,22C3,23.11 3.89,24 5,24L19,24C20.11,24 21,23.11 21,22L21,4C21,2.89 20.11,2 19,2M12,9L6,9L6,11L12,11L12,9M12,13L6,13L6,15L12,15L12,13M18,17L6,17L6,19L18,19L18,17M15,2L15,8L21,8L15,2Z"/></svg>`
};

// --- Helpers ---

async function getBase64Image(url) {
    try {
        const response = await fetch(url.replace('format=webp', 'format=jpg'));
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to fetch image:", url, e);
        return null;
    }
}

function isArticlePage() {
    const header = Array.from(document.querySelectorAll(SELECTORS.ARTICLE_HEADER))
        .find(el => el.innerText === "Article" || el.innerText === "Articles");
    return !!header || window.location.pathname.includes('/article/');
}

// --- Content Extraction ---

async function extractArticleData() {
    const title = document.querySelector(SELECTORS.TITLE)?.innerText || document.title.split(' / ')[0] || "X-Article";

    // Header Image Detection: Usually the first large image or one before the draft editor
    const allImages = Array.from(document.querySelectorAll('img[src*="pbs.twimg.com/media/"]'));
    const headerImg = allImages[0]?.src.split('&')[0];

    const contentBlocks = Array.from(document.querySelectorAll(SELECTORS.DRAFT_BLOCK));
    let markdown = `# ${title}\n\n`;
    if (headerImg) markdown += `![Header Image](${headerImg})\n\n`;

    const bodyData = [];
    if (headerImg) bodyData.push({ type: 'image', src: headerImg });

    for (const block of contentBlocks) {
        const text = block.innerText.trim();
        if (text) {
            markdown += `${text}\n\n`;
            bodyData.push({ type: 'text', content: text });
        }

        const images = Array.from(block.querySelectorAll('img')).concat(
            Array.from(block.parentElement.querySelectorAll('img'))
        ).filter(img => img.src.includes('pbs.twimg.com/media/'));

        const uniqueSrcs = [...new Set(images.map(img => img.src.split('&')[0]))];
        for (const src of uniqueSrcs) {
            if (src !== headerImg) {
                markdown += `![Image](${src})\n\n`;
                bodyData.push({ type: 'image', src: src });
            }
        }
    }

    return { title, markdown, bodyData };
}

// --- Generation Logic ---

async function handleDownload(type) {
    const { title, markdown, bodyData } = await extractArticleData();
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if (type === 'markdown') {
        const a = document.createElement("a");
        const file = new Blob([markdown], { type: "text/markdown" });
        a.href = URL.createObjectURL(file);
        a.download = `${safeTitle}.md`;
        a.click();
        URL.revokeObjectURL(a.href);
    } else if (type === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);

        doc.setFontSize(18);
        doc.text(title, margin, y, { maxWidth: contentWidth });
        y += 20;

        for (const item of bodyData) {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            if (item.type === 'text') {
                doc.setFontSize(11);
                const lines = doc.splitTextToSize(item.content, contentWidth);
                doc.text(lines, margin, y);
                y += (lines.length * 6) + 6;
            } else if (item.type === 'image') {
                const base64 = await getBase64Image(item.src);
                if (base64) {
                    try {
                        const imgProps = doc.getImageProperties(base64);
                        const ratio = imgProps.height / imgProps.width;
                        let imgWidth = contentWidth;
                        let imgHeight = imgWidth * ratio;

                        // Limit height if too large
                        if (imgHeight > 150) {
                            imgHeight = 150;
                            imgWidth = imgHeight / ratio;
                        }

                        if (y + imgHeight > 280) {
                            doc.addPage();
                            y = 20;
                        }

                        doc.addImage(base64, 'JPEG', margin, y, imgWidth, imgHeight);
                        y += imgHeight + 10;
                    } catch (e) {
                        console.error("PDF Image add failed", e);
                    }
                }
            }
        }
        doc.save(`${safeTitle}.pdf`);
    }
}

// --- UI Injection ---

function createButtons() {
    if (document.getElementById('x-article-download-container')) return;

    const container = document.createElement('div');
    container.id = 'x-article-download-container';
    container.className = 'x-article-download-container';

    const mdBtn = document.createElement('button');
    mdBtn.className = 'x-article-download-btn';
    mdBtn.innerHTML = ICONS.MARKDOWN;
    mdBtn.setAttribute('data-tooltip', 'Download Markdown');
    mdBtn.onclick = () => handleDownload('markdown');

    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'x-article-download-btn';
    pdfBtn.innerHTML = ICONS.PDF;
    pdfBtn.setAttribute('data-tooltip', 'Download PDF');
    pdfBtn.onclick = () => handleDownload('pdf');

    container.appendChild(mdBtn);
    container.appendChild(pdfBtn);

    // Find insertion point: Right-side actions container in the header
    // Use Focus Mode button as anchor to avoid sidebar account menu
    const focusButton = document.querySelector(SELECTORS.FOCUS_MODE);
    const rightContainer = focusButton ? focusButton.parentElement : null;

    // Ensure we are in the primary column (main article area)
    const isPrimary = rightContainer && rightContainer.closest('[data-testid="primaryColumn"]');

    if (isPrimary) {
        // Prepend to stay to the left of the expand icon
        rightContainer.prepend(container);
    } else {
        // Fallback to title area if specific container not found
        const header = Array.from(document.querySelectorAll(SELECTORS.ARTICLE_HEADER))
            .find(el => el.innerText === "Article" || el.innerText === "Articles");
        if (header) {
            header.parentElement.appendChild(container);
        }
    }
}

function injectIntoFeed() {
    const cards = document.querySelectorAll(SELECTORS.CARD_WRAPPER);
    cards.forEach(card => {
        if (card.querySelector('.x-feed-article-btn')) return;

        const link = card.querySelector('a[href*="/article/"]');
        if (link) {
            const btnContainer = document.createElement('div');
            btnContainer.className = 'x-article-download-container x-feed-article-btn';

            const btn = document.createElement('button');
            btn.className = 'x-article-download-btn';
            btn.innerHTML = ICONS.MARKDOWN;
            btn.setAttribute('data-tooltip', 'Open Article to Extract');
            btn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                window.location.href = link.href;
            };

            btnContainer.appendChild(btn);
            card.appendChild(btnContainer);
        }
    });
}

// --- Message Listener ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "download") {
        if (isArticlePage()) {
            handleDownload(request.type).then(() => sendResponse({ status: "success" }));
        } else {
            sendResponse({ status: "not_an_article" });
        }
    }
    return true;
});

const observer = new MutationObserver(() => {
    if (isArticlePage()) {
        createButtons();
    }
    injectIntoFeed();
});

observer.observe(document.body, { childList: true, subtree: true });
