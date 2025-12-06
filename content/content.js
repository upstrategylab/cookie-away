/**
 * Cookie Away 4.0 - Smart Content Script
 * Uses heuristics and observation to detect and handle cookie banners.
 */

const CONFIG = {
    maxClicks: 3,
    clickDelay: 500,
    knownIds: [
        'onetrust-reject-all-handler',
        'ot-pc-refuse-all-handler',
        'CybotCookiebotDialogBodyButtonDecline',
        'uc-btn-deny',
        'cookie-reject-all',
        'reject-all-cookies'
    ],
    keywords: {
        banner: [
            'cookie', 'cookies', 'consent', 'privacy', 'gdpr', 'data', 'tracking',
            'kakor', 'integritet', 'samtycke', // Swedish
            'datenschutz', 'privatsphäre' // German
        ],
        reject: [
            'reject', 'decline', 'no', 'necessary', 'deny', 'refuse',
            'disagree', 'not accept', 'dismiss', 'close',
            'ablehnen', 'verweigern', 'nein', 'nur notwendige', // German
            'refuser', 'non', 'tout refuser', // French
            'rechazar', 'negar', 'no aceptar', // Spanish
            'avvisa', 'neka', 'endast nödvändiga', 'jag godkänner inte', 'nej', // Swedish
            'i do not agree', 'refuse non-essential cookies', 'save & exit', 'save preferences' // User specific
        ],
        accept: [
            'accept', 'agree', 'allow', 'ok', 'yes', 'got it', 'understand', 'confirm',
            'akzeptieren', 'zustimmen', 'alles', // German
            'accepter', 'oui', // French
            'aceptar', 'si', // Spanish
            'godkänn', 'acceptera', 'okej', 'ja', 'tillåt' // Swedish
        ]
    }
};

let state = {
    clicks: 0,
    enabled: true
};

// Initialize
(async () => {
    const data = await chrome.storage.local.get(['enabled', 'ignoredSites']);
    if (data.enabled === false) return;

    // Check if site is ignored
    const hostname = window.location.hostname;
    if (data.ignoredSites && data.ignoredSites.includes(hostname)) {
        console.log('Cookie Away 4.0: Site ignored by user settings.');
        return;
    }

    console.log('Cookie Away 4.0: Active');

    // Start observing
    const observer = new MutationObserver(debounce(scanForBanners, 500));
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial scan
    scanForBanners();
})();

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function scanForBanners() {
    if (state.clicks >= CONFIG.maxClicks) return;

    // 0. Check CMP Registry (New Scalable System)
    if (window.CMP_REGISTRY) {
        // Collect all roots (Document + Shadow Roots)
        const roots = [document.body, ...findAllRoots(document.body)];

        for (const provider of window.CMP_REGISTRY) {
            // A. Global Object Check (The "Brain" Check)
            const globalDetected = provider.checkGlobal && provider.checkGlobal();

            // B. Element Check (The "Body" Check)
            let elementDetected = false;
            let targetRoot = null;

            for (const root of roots) {
                if (provider.detect(root)) {
                    elementDetected = true;
                    targetRoot = root;
                    break;
                }
            }

            if (globalDetected || elementDetected) {
                console.log(`Cookie Away 4.0: Detected ${provider.name} (Global: ${!!globalDetected}, Element: ${elementDetected})`);

                // Notify background immediately
                chrome.runtime.sendMessage({
                    type: 'CMP_DETECTED',
                    name: provider.name
                });

                // Attempt Action with Retry Logic
                attemptAction(provider, targetRoot || document.body, 0);
                return; // Focus on this provider
            }
        }
    }

    // ... (Fallback logic)

    // 1. Find potential banner elements (fixed/sticky, high z-index)
    // ... (rest of the heuristic logic remains as fallback)
    const candidates = findBannerCandidates(document.body);

    // 2. Also check Shadow DOMs
    const shadowCandidates = findShadowBanners(document.body);

    const allCandidates = [...candidates, ...shadowCandidates];

    for (const element of allCandidates) {
        if (isCookieBanner(element)) {
            console.log('Cookie Away 4.0: Found banner', element);
            handleBanner(element);
            // Only handle one at a time to be safe
            break;
        }
    }
}

function findBannerCandidates(root) {
    const candidates = [];
    const elements = root.querySelectorAll('*');

    for (const el of elements) {
        // Filter by visibility first
        if (!isVisible(el)) continue;

        const style = window.getComputedStyle(el);
        const classId = (el.className + ' ' + el.id).toLowerCase();

        // Strategy 1: Fixed/Sticky positioning with high Z-index
        if (style.position === 'fixed' || style.position === 'sticky') {
            const rect = el.getBoundingClientRect();
            const isBottom = rect.bottom >= window.innerHeight - 150; // Increased tolerance
            const isTop = rect.top <= 150;

            if ((isBottom || isTop) && style.zIndex !== 'auto' && parseInt(style.zIndex) > 0) {
                candidates.push(el);
            }
        }

        // Strategy 2: Explicit Roles
        if (el.getAttribute('role') === 'dialog' || el.getAttribute('role') === 'alertdialog') {
            candidates.push(el);
        }

        // Strategy 3: Strong Class/ID signals (New)
        if (classId.includes('cookie') ||
            classId.includes('consent') ||
            classId.includes('gdpr') ||
            classId.includes('privacy') ||
            classId.includes('kakor') ||
            classId.includes('samtycke') ||
            classId.includes('datenschutz') ||
            classId.includes('aviso')) {
            // Only if it looks like a container (has children)
            if (el.children.length > 0) {
                candidates.push(el);
            }
        }
    }

    return candidates;
}

function findAllRoots(root) {
    let roots = [];
    const elements = root.querySelectorAll('*');

    for (const el of elements) {
        if (el.shadowRoot) {
            roots.push(el.shadowRoot);
            roots = [...roots, ...findAllRoots(el.shadowRoot)];
        }
    }
    return roots;
}

function findShadowBanners(root) {
    let candidates = [];
    const elements = root.querySelectorAll('*');

    for (const el of elements) {
        if (el.shadowRoot) {
            candidates = [...candidates, ...findBannerCandidates(el.shadowRoot)];
            candidates = [...candidates, ...findShadowBanners(el.shadowRoot)];
        }
    }
    return candidates;
}

function isCookieBanner(element) {
    const text = element.textContent.toLowerCase();
    const classId = (element.className + ' ' + element.id).toLowerCase();

    // Strong signal: Class or ID contains "cookie" or "consent"
    const hasStrongSignal = classId.includes('cookie') ||
        classId.includes('consent') ||
        classId.includes('gdpr') ||
        classId.includes('privacy') ||
        classId.includes('kakor') || // Swedish
        classId.includes('samtycke') || // Swedish
        classId.includes('datenschutz') || // German
        classId.includes('privatsphäre') || // German
        classId.includes('aviso'); // Spanish

    // Check keywords
    let matchCount = 0;
    for (const word of CONFIG.keywords.banner) {
        if (text.includes(word)) matchCount++;
    }

    // If we have a strong class/ID signal, we only need 1 keyword (or even 0 if it's very obvious, but let's say 1 to be safe)
    if (hasStrongSignal) {
        return matchCount >= 1 || text.length > 20; // If it has text and the right class, it's probably it
    }

    // Otherwise, we need 2 keywords
    return matchCount >= 2;
}

function handleBanner(banner) {
    // Find buttons
    const buttons = findButtons(banner);

    // 1. Check for specific known IDs first (Highest Priority)
    let targetBtn = buttons.find(btn => {
        return CONFIG.knownIds.some(id => btn.id === id || btn.element.id === id);
    });

    // 2. Prioritize Reject/Decline keywords
    if (!targetBtn) {
        targetBtn = buttons.find(btn => matchesKeywords(btn.text, CONFIG.keywords.reject));
    }

    // 3. Fallback to Accept if no Reject found
    if (!targetBtn) {
        targetBtn = buttons.find(btn => matchesKeywords(btn.text, CONFIG.keywords.accept));
    }

    if (targetBtn) {
        // SAFETY CHECK: Don't click if it looks like a link that opens a new tab
        if (targetBtn.element.tagName === 'A') {
            if (targetBtn.element.target === '_blank') {
                console.log('Cookie Away 4.0: Skipping unsafe link (target=_blank)', targetBtn.text);
                return;
            }
            // Also skip if href looks like a policy page
            const href = targetBtn.element.href || '';
            if (href.includes('policy') || href.includes('statement') || href.includes('info')) {
                // But only if the text doesn't explicitly say "accept" or "reject" strongly
            }
        }

        console.log('Cookie Away 4.0: Clicking', targetBtn.text || targetBtn.id);

        // Check if clickable
        if (!isVisible(targetBtn.element)) {
            return;
        }

        clickElement(targetBtn.element);
        state.clicks++;

        // Notify background
        chrome.runtime.sendMessage({ type: 'BANNER_HANDLED' });

        // Verification: Check if banner is gone after a short delay
        setTimeout(() => {
            if (isVisible(banner)) {
                console.warn('Cookie Away 4.0: Banner still visible after click. Marking as failed.');
                chrome.runtime.sendMessage({ type: 'BANNER_MISSED' });
            }
        }, 1500);
    } else {
        // Banner found but no buttons found
        console.warn('Cookie Away 4.0: Banner found but no buttons detected.');
        chrome.runtime.sendMessage({ type: 'BANNER_MISSED' });
    }
}

function findButtons(root) {
    // Look for button tags, input[type=button], or div/a with role=button or button-like classes
    // Added: elements with class containing 'btn' or 'button'
    const elements = root.querySelectorAll('button, input[type="button"], input[type="submit"], a, div[role="button"], [class*="btn"], [class*="button"]');
    const buttons = [];

    for (const el of elements) {
        if (isVisible(el)) {
            // Skip links that are likely just "Read Policy" links
            const text = el.textContent.toLowerCase().trim();
            if (text.includes('policy') || text.includes('read') || text.includes('view') || text.includes('more info')) {
                continue;
            }

            buttons.push({
                element: el,
                text: text,
                id: el.id // Capture ID for matching
            });
        }
    }

    return buttons;
}

function matchesKeywords(text, keywords) {
    return keywords.some(kw => text.includes(kw));
}

function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function clickElement(el) {
    el.click();
}

function attemptAction(provider, root, attempt) {
    if (attempt > 5) {
        console.warn(`Cookie Away 4.0: Failed to handle ${provider.name} after 5 attempts.`);
        chrome.runtime.sendMessage({ type: 'BANNER_MISSED' });
        return;
    }

    try {
        // Re-detect to get fresh element reference
        const banner = provider.detect(root);

        // If we have a banner element, check if it's visible enough to act
        if (banner && isVisible(banner)) {
            console.log(`Cookie Away 4.0: Actioning ${provider.name} (Attempt ${attempt + 1})`);
            provider.action(root);
            state.clicks++;
            chrome.runtime.sendMessage({ type: 'BANNER_HANDLED' });
        } else {
            // Not visible yet, or not found yet (but global was found)
            console.log(`Cookie Away 4.0: Waiting for ${provider.name} banner... (Attempt ${attempt + 1})`);
            setTimeout(() => attemptAction(provider, root, attempt + 1), 1000);
        }
    } catch (e) {
        console.warn(`Cookie Away 4.0: Error in ${provider.name} action`, e);
        setTimeout(() => attemptAction(provider, root, attempt + 1), 1000);
    }
}
