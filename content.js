// X Article PDF/Markdown Downloader Content Script

console.log("X Article Downloader v2 loaded.");

// --- Constants & Selectors ---
const CONFIG = {
    x: {
        ARTICLE_HEADER: 'h2[role="heading"]',
        DRAFT_BLOCK: '.public-DraftStyleDefault-block',
        TITLE: 'div.css-175oi2r.r-13qz1uu',
        CARD_WRAPPER: '[data-testid="card.wrapper"]',
        FOCUS_MODE: 'a[aria-label="Focus mode"]',
        PRIMARY_COLUMN: '[data-testid="primaryColumn"]'
    },
    linkedin: {
        TITLE: 'h1.pulse-title, h1.main-title, .reader-article-header__title',
        BODY_CONTENT: 'div[data-test-id="article-content-blocks"], .article-main__content, article.article-main',
        COVER_IMAGE: 'article.article-main figure img, .article-main-card__image-container img, .cover-img',
        INJECTION_ANCHOR: '.pulse-header__actions, .publisher-author-card, .ellipsis-menu, h1.pulse-title'
    }
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

function getPlatform() {
    if (window.location.host.includes('x.com')) return 'x';
    if (window.location.host.includes('linkedin.com')) return 'linkedin';
    return null;
}

function isArticlePage() {
    const platform = getPlatform();
    if (platform === 'x') {
        const header = Array.from(document.querySelectorAll(CONFIG.x.ARTICLE_HEADER))
            .find(el => el.innerText === "Article" || el.innerText === "Articles");
        return !!header || window.location.pathname.includes('/article/');
    }
    if (platform === 'linkedin') {
        return window.location.pathname.includes('/pulse/');
    }
    return false;
}

// --- Content Extraction ---

async function extractArticleData() {
    const platform = getPlatform();
    let title = "Article";
    let bodyData = [];
    let markdown = "";

    if (platform === 'x') {
        title = document.querySelector(CONFIG.x.TITLE)?.innerText || document.title.split(' / ')[0] || "X-Article";
        const allImages = Array.from(document.querySelectorAll('img[src*="pbs.twimg.com/media/"]'));
        const headerImg = allImages[0]?.src.split('&')[0];
        const contentBlocks = Array.from(document.querySelectorAll(CONFIG.x.DRAFT_BLOCK));

        markdown = `# ${title}\n\n`;
        if (headerImg) {
            markdown += `![Header Image](${headerImg})\n\n`;
            bodyData.push({ type: 'image', src: headerImg });
        }

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
    } else if (platform === 'linkedin') {
        title = document.querySelector(CONFIG.linkedin.TITLE)?.innerText || document.title.split(' | ')[0] || "LinkedIn-Article";
        const coverImg = document.querySelector(CONFIG.linkedin.COVER_IMAGE)?.src;

        // Try the specific content blocks container first
        let contentContainer = document.querySelector('div[data-test-id="article-content-blocks"]');
        // Fallback to article.article-main if not found
        if (!contentContainer) {
            contentContainer = document.querySelector('article.article-main');
        }

        markdown = `# ${title}\n\n`;
        if (coverImg) {
            markdown += `![Cover Image](${coverImg})\n\n`;
            bodyData.push({ type: 'image', src: coverImg });
        }

        if (contentContainer) {
            console.log("LinkedIn: Content container found", contentContainer.tagName, contentContainer.className);
            // Select all text-bearing elements including blockquotes
            const elements = Array.from(contentContainer.querySelectorAll('p, h2, h3, h4, li, blockquote, figcaption'));
            console.log("LinkedIn: Found", elements.length, "text elements");
            for (const el of elements) {
                // Get text directly from element, handling nested spans
                const text = el.innerText?.trim();
                if (text && text.length > 0) {
                    // Format based on tag type
                    if (el.tagName === 'BLOCKQUOTE') {
                        markdown += `> ${text}\n\n`;
                    } else if (el.tagName === 'LI') {
                        markdown += `- ${text}\n`;
                    } else if (el.tagName.startsWith('H')) {
                        const level = el.tagName.charAt(1);
                        markdown += `${'#'.repeat(parseInt(level) + 1)} ${text}\n\n`;
                    } else {
                        markdown += `${text}\n\n`;
                    }
                    bodyData.push({ type: 'text', content: text });
                }
            }

            // Also get inline images
            const images = Array.from(contentContainer.querySelectorAll('img:not([aria-hidden="true"])')).filter(img => img.src && !img.src.includes('data:'));
            for (const img of images) {
                if (img.src !== coverImg) {
                    markdown += `![Image](${img.src})\n\n`;
                    bodyData.push({ type: 'image', src: img.src });
                }
            }
        }
    }

    return { title, markdown, bodyData };
}

// --- Generation Logic ---

async function handleDownload(type) {
    console.log("handleDownload called with type:", type);

    // Wait for page to stabilize on LinkedIn
    if (window.location.host.includes('linkedin.com')) {
        console.log("LinkedIn detected, waiting 500ms for DOM...");
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    const { title, markdown, bodyData } = await extractArticleData();
    console.log("Extracted:", { title, markdownLength: markdown.length, bodyItems: bodyData.length });
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

    const platform = getPlatform();
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

    if (platform === 'x') {
        const focusButton = document.querySelector(CONFIG.x.FOCUS_MODE);
        const rightContainer = focusButton ? focusButton.parentElement : null;
        const isPrimary = rightContainer && rightContainer.closest(CONFIG.x.PRIMARY_COLUMN);

        if (isPrimary) {
            rightContainer.prepend(container);
        } else {
            const header = Array.from(document.querySelectorAll(CONFIG.x.ARTICLE_HEADER))
                .find(el => el.innerText === "Article" || el.innerText === "Articles");
            if (header) header.parentElement.appendChild(container);
        }
    } else if (platform === 'linkedin') {
        const anchor = document.querySelector(CONFIG.linkedin.INJECTION_ANCHOR);
        if (anchor) {
            // Check if it's the ellipsis menu or pulse-header-actions
            if (anchor.classList.contains('pulse-header__actions') || anchor.classList.contains('ellipsis-menu') || anchor.classList.contains('publisher-author-card')) {
                anchor.prepend(container);
            } else {
                // Fallback to absolute positioning on title
                anchor.style.position = 'relative';
                container.style.position = 'absolute';
                container.style.right = '0';
                container.style.top = '0';
                anchor.appendChild(container);
            }
        } else {
            // Last resort: find any H1 and try to inject near it
            const h1 = document.querySelector('h1');
            if (h1) h1.parentElement.appendChild(container);
        }
    }
}

function injectIntoFeed() {
    if (getPlatform() !== 'x') return;

    const cards = document.querySelectorAll(CONFIG.x.CARD_WRAPPER);
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
