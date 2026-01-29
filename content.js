// X Article PDF/Markdown Downloader Content Script

console.log("X Article Downloader (Final Refinement) loaded.");

// --- Constants & Selectors ---
const SELECTORS = {
    ARTICLE_HEADER: 'h2[role="heading"]',
    DRAFT_CONTENT: '.public-DraftEditor-content',
    DRAFT_BLOCK: '.public-DraftStyleDefault-block',
    TITLE: 'div.css-175oi2r.r-13qz1uu',
    HEADER_IMAGE: 'img.css-9pa8cd',
    TWEET: 'article[data-testid="tweet"]',
    ACTION_BAR: 'div[role="group"]',
    // Broad detection: look for "Article" label or article link
    ARTICLE_INDICATOR: '[aria-label="Article"], a[href*="/article/"], a[href*="/i/articles/"]'
};

const ICONS = {
    MARKDOWN: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <text x="12" y="18" font-family="Arial" font-size="6" font-weight="bold" text-anchor="middle" fill="currentColor">.md</text>
        </svg>`,
    PDF: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <text x="12" y="18" font-family="Arial" font-size="6" font-weight="bold" text-anchor="middle" fill="currentColor">.pdf</text>
        </svg>`
};

// --- Core Logic ---

function isArticlePage() {
    const header = Array.from(document.querySelectorAll(SELECTORS.ARTICLE_HEADER))
        .find(el => el.innerText === "Article" || el.innerText === "Articles");
    return !!header || window.location.pathname.includes('/article/') || window.location.pathname.includes('/i/articles/');
}

async function extractArticleData() {
    const title = document.querySelector(SELECTORS.TITLE)?.innerText || document.title.split(' / ')[0] || "X-Article";
    const headerImg = document.querySelector(SELECTORS.HEADER_IMAGE);
    const headerImgUrl = headerImg ? headerImg.src.split('&')[0] : null;

    const contentBlocks = Array.from(document.querySelectorAll(SELECTORS.DRAFT_BLOCK));
    let markdown = `# ${title}\n\n`;

    if (headerImgUrl) markdown += `![Header Image](${headerImgUrl})\n\n`;

    contentBlocks.forEach(block => {
        const text = block.innerText.trim();
        if (text) markdown += `${text}\n\n`;
        const images = Array.from(block.querySelectorAll('img')).filter(img => img.src.includes('pbs.twimg.com/media/'));
        images.forEach(img => {
            const src = img.src.split('&')[0];
            markdown += `![Image](${src})\n\n`;
        });
    });

    return { title, markdown };
}

async function getBase64Image(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) { return null; }
}

async function generatePDF(data) {
    const { jspdf } = window;
    if (!jspdf) return;
    const doc = new jspdf.jsPDF();
    let y = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    doc.setFontSize(22);
    const titleLines = doc.splitTextToSize(data.title, contentWidth);
    doc.text(titleLines, margin, y);
    y += (titleLines.length * 10) + 10;

    const lines = data.markdown.split('\n\n');
    doc.setFontSize(12);

    for (const line of lines) {
        if (line.startsWith('![')) {
            const match = line.match(/\((.*)\)/);
            if (match && match[1]) {
                const base64 = await getBase64Image(match[1]);
                if (base64) {
                    try {
                        const imgProps = doc.getImageProperties(base64);
                        const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
                        if (y + imgHeight > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
                        doc.addImage(base64, 'JPEG', margin, y, contentWidth, imgHeight);
                        y += imgHeight + 10;
                    } catch (e) { }
                }
            }
        } else if (line && !line.startsWith('# ')) {
            const textLines = doc.splitTextToSize(line, contentWidth);
            if (y + (textLines.length * 7) > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
            doc.text(textLines, margin, y);
            y += (textLines.length * 7) + 5;
        }
    }
    doc.save(`${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
}

async function handleDownload(type) {
    const data = await extractArticleData();
    if (type === 'markdown') {
        const blob = new Blob([data.markdown], { type: "text/markdown" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        a.click();
    } else await generatePDF(data);
}

// --- UI Injection ---

function createButtons(parentElement, isFeed = false) {
    if (parentElement.querySelector('.x-article-download-container')) return;

    const container = document.createElement('div');
    container.className = 'x-article-download-container' + (isFeed ? ' x-feed-article-btn' : ' x-page-article-container');

    const mdBtn = document.createElement('button');
    mdBtn.className = 'x-article-download-btn';
    mdBtn.innerHTML = ICONS.MARKDOWN;
    mdBtn.title = "Download Markdown";

    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'x-article-download-btn';
    pdfBtn.innerHTML = ICONS.PDF;
    pdfBtn.title = "Download PDF";

    if (isFeed) {
        const articleLink = parentElement.querySelector('a[href*="/article/"], a[href*="/i/articles/"]')?.href;
        if (articleLink) {
            mdBtn.onclick = (e) => { e.stopPropagation(); e.preventDefault(); window.open(articleLink + '#download=md', '_blank'); };
            pdfBtn.onclick = (e) => { e.stopPropagation(); e.preventDefault(); window.open(articleLink + '#download=pdf', '_blank'); };
            // Inject into the action bar
            const actionBar = parentElement.querySelector(SELECTORS.ACTION_BAR);
            if (actionBar) {
                container.appendChild(mdBtn);
                container.appendChild(pdfBtn);
                actionBar.appendChild(container);
            }
        }
    } else {
        mdBtn.onclick = (e) => { e.stopPropagation(); handleDownload('markdown'); };
        pdfBtn.onclick = (e) => { e.stopPropagation(); handleDownload('pdf'); };
        container.appendChild(mdBtn);
        container.appendChild(pdfBtn);
        document.body.appendChild(container);
    }
}

// --- Main Loop ---

const observer = new MutationObserver(() => {
    // Article Page
    if (isArticlePage() && !document.querySelector('.x-page-article-container')) {
        createButtons(document.body, false);
    }

    // Feed Detection: Improved
    const tweets = document.querySelectorAll(SELECTORS.TWEET);
    tweets.forEach(tweet => {
        const hasArticleIndicator = tweet.querySelector(SELECTORS.ARTICLE_INDICATOR);
        const hasArticleLink = tweet.querySelector('a[href*="/article/"], a[href*="/i/articles/"]');

        if (hasArticleIndicator || hasArticleLink) {
            createButtons(tweet, true);
        }
    });
});

observer.observe(document.body, { childList: true, subtree: true });

// --- Auto-Download via Hash ---
window.addEventListener('load', () => {
    const hash = window.location.hash;
    if (hash.includes('download')) {
        const checkExist = setInterval(() => {
            if (document.querySelector(SELECTORS.DRAFT_CONTENT)) {
                clearInterval(checkExist);
                setTimeout(() => handleDownload(hash.includes('md') ? 'markdown' : 'pdf'), 2000);
            }
        }, 500);
    }
});

// --- Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "download") {
        if (isArticlePage()) handleDownload(request.type).then(() => sendResponse({ status: "success" }));
        else sendResponse({ status: "not_an_article" });
    }
    return true;
});
