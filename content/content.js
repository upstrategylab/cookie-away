/**
 * Cookie Away 4.0 - Smart Content Script
 * 1. Known CMPs (cmp_registry.js) by selector
 * 2. Heuristics: consent-looking overlays + multilingual button labels
 * 3. No reject button? Open "Manage options", switch everything off, save
 * 4. Optional Jev fallback (via the service worker) for banners the heuristics can't read
 *
 * Safety rails against click/reload loops:
 * - Every action is verified; the banner must disappear
 * - At most LIMITS.maxActionsPerPage actions per page load
 * - Actions are logged in sessionStorage (survives reloads); too many in a short window
 *   pauses the extension on this site and tells the service worker
 * - Links that navigate away are never clicked
 */

(() => {
    if (window.__cookieAwayLoaded || !window.CA) return;
    window.__cookieAwayLoaded = true;

    const {
        BANNER, AVOID, matchesAny, isVisible, wouldNavigate, safeClick, findButtons,
        collectRoots, detectProvider, rejectViaSettings, resolveBanner
    } = window.CA;

    const LIMITS = {
        scanDelay: 400,          // Throttle between scans after DOM changes
        watchMs: 30000,          // Stop watching the DOM after this long
        maxScans: 40,
        verifyDelay: 1500,       // Wait before checking the banner is gone
        maxActionsPerPage: 2,
        loopWindowMs: 2 * 60 * 1000,
        loopMaxActions: 3        // This many actions on one site within loopWindowMs = loop
    };

    const LOOP_KEY = '__cookieAwayActions';
    const IS_TOP = window === window.top;
    const host = location.hostname;

    // Elements whose class/id/label suggests a consent UI, plus dialogs.
    const CANDIDATE_SELECTOR = [
        '[id*="cookie" i]', '[class*="cookie" i]', '[id*="consent" i]', '[class*="consent" i]',
        '[id*="gdpr" i]', '[class*="gdpr" i]', '[aria-label*="cookie" i]', '[aria-label*="consent" i]',
        '[role="dialog"]', '[role="alertdialog"]', '[aria-modal="true"]', 'dialog[open]'
    ].join(',');
    const STRONG_CLASS = /cookie|consent|gdpr|kakor|samtycke|datenschutz|einwilligung|cmp-|privacy-banner/;

    let page;
    let settings = {};

    function resetPage() {
        if (page && page.observer) page.observer.disconnect();
        if (page) clearTimeout(page.timer);
        page = {
            scans: 0,
            actions: 0,
            busy: false,
            done: false,
            jevAsked: false,
            cmpReported: false,
            tried: new WeakSet(),
            timer: null,
            observer: null
        };
    }

    resetPage();
    init();

    // "Try again" from the popup
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type !== 'RESCAN') return;
        try {
            sessionStorage.removeItem(LOOP_KEY);
        } catch (e) { }
        resetPage();
        init();
    });

    async function init() {
        settings = await chrome.storage.local.get(['enabled', 'ignoredSites', 'cooldowns', 'jevEnabled', 'fallback', 'deepReject']);
        if (settings.enabled === false) return;
        if ((settings.ignoredSites || []).includes(host)) return;

        const pausedUntil = (settings.cooldowns || {})[host];
        if (pausedUntil && pausedUntil > Date.now()) {
            log(`Paused on ${host} until ${new Date(pausedUntil).toLocaleString()} (loop protection).`);
            return;
        }

        // Ignore tiny frames (ads, trackers, pixels). Consent iframes are often created at 0x0
        // and resized when shown, so wait for a resize before giving up on them.
        if (!IS_TOP && isTinyFrame()) {
            const onResize = () => {
                if (isTinyFrame()) return;
                window.removeEventListener('resize', onResize);
                init();
            };
            window.addEventListener('resize', onResize);
            setTimeout(() => window.removeEventListener('resize', onResize), LIMITS.watchMs);
            return;
        }

        if (recentActions().length >= LIMITS.loopMaxActions) {
            reportLoop();
            return;
        }

        if (IS_TOP) log('Active');
        scan();

        page.observer = new MutationObserver(schedule);
        page.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-hidden']
        });
        const current = page;
        setTimeout(() => current === page && stop(), LIMITS.watchMs);
    }

    function isTinyFrame() {
        return window.innerWidth < 120 || window.innerHeight < 60;
    }

    function options() {
        return { deep: settings.deepReject !== false, allowAccept: settings.fallback === 'accept' };
    }

    // Throttle, not debounce: a constantly animating page would otherwise never scan.
    function schedule() {
        if (page.timer || page.done) return;
        page.timer = setTimeout(() => {
            page.timer = null;
            scan();
        }, LIMITS.scanDelay);
    }

    function stop() {
        page.done = true;
        if (page.observer) page.observer.disconnect();
        clearTimeout(page.timer);
    }

    function scan() {
        if (page.done || page.busy) return;
        if (++page.scans > LIMITS.maxScans) return stop();

        const roots = collectRoots(document);

        // 1. Known CMPs
        for (const provider of window.CMP_REGISTRY || []) {
            let banner = null;
            for (const root of roots) {
                banner = detectProvider(provider, root);
                if (banner) break;
            }

            const scriptPresent = !banner && provider.checkGlobal && safe(provider.checkGlobal);
            if (banner || scriptPresent) reportCmp(provider.name);
            if (!banner || page.tried.has(banner)) continue;

            log(`Detected ${provider.name}`);
            handle(banner, provider, provider.name);
            return;
        }

        // 2. Heuristics
        for (const candidate of findCandidates(roots)) {
            if (page.tried.has(candidate.el)) continue;

            const buttons = findButtons(candidate.el);
            if (buttons.length === 0) continue;

            const verdict = classify(candidate);
            if (verdict === 'yes') {
                handle(candidate.el, null, 'heuristic');
                return;
            }

            // An overlay we can't read (unfamiliar language/layout): let Jev decide once.
            if (verdict === 'maybe' && jevAvailable() && buttons.length <= 6) {
                askJev(candidate.el, buttons);
                return;
            }
        }
    }

    function findCandidates(roots) {
        const found = new Map(); // element -> { el, overlay }

        for (const root of roots) {
            for (const el of root.querySelectorAll(CANDIDATE_SELECTOR)) {
                if (!found.has(el)) found.set(el, { el, overlay: el.matches('[role="dialog"],[role="alertdialog"],[aria-modal="true"],dialog') });
            }
        }

        // Fixed/sticky bars near the top or bottom: only check the top two levels of the page,
        // which is where banners are mounted, instead of computing styles for every element.
        if (document.body) {
            for (const el of document.body.querySelectorAll(':scope > *, :scope > * > *')) {
                if (found.has(el)) continue;
                const style = getComputedStyle(el);
                if (style.position !== 'fixed' && style.position !== 'sticky') continue;
                const rect = el.getBoundingClientRect();
                const atBottom = rect.bottom >= window.innerHeight - 150;
                const coversCenter = rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2 &&
                    rect.width >= window.innerWidth / 2;
                // Top bars are usually site headers: only consider them with consent keywords (overlay: false)
                if (atBottom || coversCenter || rect.top <= 150) found.set(el, { el, overlay: atBottom || coversCenter });
            }
        }

        const list = [...found.values()].filter(c => {
            const tag = c.el.tagName;
            if (tag === 'HTML' || tag === 'BODY' || tag === 'SCRIPT' || tag === 'STYLE') return false;
            const len = (c.el.textContent || '').length;
            return len >= 20 && len <= 6000 && isVisible(c.el);
        });

        // Keep the outermost match, so nested ".cookie-banner__text" etc. collapse into one banner.
        return list.filter(c => !list.some(o => o !== c && o.el.contains(c.el)));
    }

    // 'yes' = consent banner, 'maybe' = overlay we can't read (Jev may), 'no' = skip
    function classify({ el, overlay }) {
        const text = (el.textContent || '').replace(/\s+/g, ' ').toLowerCase();
        const className = typeof el.className === 'string' ? el.className : (el.getAttribute('class') || '');
        const classId = `${el.id} ${className}`.toLowerCase();

        let hits = 0;
        for (const word of BANNER) {
            if (matchesAny(text, [word])) hits++;
        }

        if (STRONG_CLASS.test(classId) && (hits >= 1 || text.length > 20)) return 'yes';
        if (hits >= 2) return 'yes';
        // Unreadable overlay (unknown language?): worth asking Jev, unless it's site navigation
        if (overlay && text.length >= 40 && text.length <= 2500 && !isNavigation(el)) return 'maybe';
        return 'no';
    }

    function isNavigation(el) {
        return /^(HEADER|NAV|FOOTER)$/.test(el.tagName) || !!el.querySelector('nav') || !!el.closest('header, nav');
    }

    function jevAvailable() {
        return settings.jevEnabled && !page.jevAsked;
    }

    // Known provider or recognised banner: reject -> settings route -> accept (per user settings)
    async function handle(banner, provider, source) {
        page.tried.add(banner);
        page.busy = true;

        let result = null;
        try {
            result = await resolveBanner(banner, provider || {}, options());
        } catch (e) {
            log(`Failed on ${source}`, e);
        }

        // Recognised as consent but nothing we could understand: Jev may read it
        if (!result && jevAvailable() && isVisible(banner)) {
            const buttons = findButtons(banner);
            if (buttons.length > 0 && buttons.length <= 12) {
                page.busy = false;
                return askJev(banner, buttons);
            }
        }

        await finish(banner, result, source);
    }

    async function askJev(banner, buttons) {
        page.jevAsked = true;
        page.tried.add(banner);
        page.busy = true;

        const usable = buttons.slice(0, 12);
        let res = null;
        try {
            res = await chrome.runtime.sendMessage({
                type: 'JEV_CLASSIFY',
                host,
                text: (banner.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 1500),
                buttons: usable.map(b => b.label)
            });
        } catch (e) {
            res = null;
        }

        if (!res || !res.ok) {
            log('Jev unavailable', res && res.reason);
            page.busy = false;
            return;
        }
        if (res.isBanner < 0.75) {
            page.busy = false; // Not a consent banner (newsletter, chat, etc.)
            return;
        }

        const usableButton = (i) => {
            const b = i != null ? usable[i] : null;
            return b && !wouldNavigate(b.element) ? b : null;
        };
        const { deep, allowAccept } = options();

        let result = null;
        const reject = usableButton(res.reject);
        const settingsBtn = usableButton(res.settings);
        const accept = usableButton(res.accept);

        if (reject && !matchesAny(reject.label, AVOID) && safeClick(reject.element)) {
            result = { kind: 'reject' };
        } else if (deep && settingsBtn) {
            result = await rejectViaSettings(banner, { openElement: settingsBtn.element });
        }
        if (!result && allowAccept && accept && safeClick(accept.element)) {
            result = { kind: 'accept' };
        }

        if (result) log(`Jev resolved banner (${result.kind}${res.cached ? ', cached' : ''})`);
        await finish(banner, result, 'jev');
    }

    // Verify the banner (and any settings layer) actually went away.
    async function finish(banner, result, source) {
        if (!result) {
            page.busy = false;
            send('BANNER_MISSED', { reason: 'no-button', source });
            return;
        }

        // Settings opened in another frame, which handles the rest
        if (result.kind === 'handoff') {
            log(`Opened settings for ${source}; the settings frame takes over`);
            stop();
            return;
        }

        // Consent-or-pay wall and the user chose "Leave it"
        if (result.kind === 'none') {
            page.busy = false;
            send('BANNER_MISSED', { reason: 'pay-wall', source });
            stop();
            return;
        }

        page.actions++;
        recordAction();

        // Banners in their own iframe (Sourcepoint etc.) are usually removed together with the
        // frame, so this code never gets to verify. Report now; a miss below corrects it.
        const report = { source, kind: result.kind, toggles: result.toggles || 0, payWall: !!result.payWall };
        if (!IS_TOP) send('BANNER_HANDLED', report);

        await wait(LIMITS.verifyDelay);
        page.busy = false;

        const gone = !isVisible(banner) && !(result.layer && isVisible(result.layer));
        if (gone) {
            if (IS_TOP) send('BANNER_HANDLED', report);
            stop();
            return;
        }

        log(`Banner still visible after ${result.kind} (${source})`);
        send('BANNER_MISSED', { reason: 'still-visible', source, correction: !IS_TOP });

        if (recentActions().length >= LIMITS.loopMaxActions) reportLoop();
        else if (page.actions >= LIMITS.maxActionsPerPage) stop();
        else schedule();
    }

    // --- Loop guard ---------------------------------------------------------

    function recentActions() {
        try {
            const now = Date.now();
            return JSON.parse(sessionStorage.getItem(LOOP_KEY) || '[]').filter(t => now - t < LIMITS.loopWindowMs);
        } catch (e) {
            return [];
        }
    }

    function recordAction() {
        const actions = recentActions();
        actions.push(Date.now());
        try {
            sessionStorage.setItem(LOOP_KEY, JSON.stringify(actions));
        } catch (e) {
            // Storage blocked (sandboxed frame); the per-page cap still applies
        }
    }

    function reportLoop() {
        stop();
        console.warn(`Cookie Away 4.0: Banner keeps coming back on ${host}. Pausing here to avoid a click/reload loop.`);
        send('LOOP_DETECTED', { host });
    }

    // --- Utils --------------------------------------------------------------

    function reportCmp(name) {
        if (page.cmpReported) return;
        page.cmpReported = true;
        send('CMP_DETECTED', { name });
    }

    function send(type, extra = {}) {
        try {
            chrome.runtime.sendMessage({ type, host, ...extra }).catch(() => { });
        } catch (e) {
            // Extension was reloaded; this content script is orphaned
            stop();
        }
    }

    function safe(fn) {
        try {
            return fn();
        } catch (e) {
            return false;
        }
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function log(...args) {
        console.log('Cookie Away 4.0:', ...args);
    }
})();
