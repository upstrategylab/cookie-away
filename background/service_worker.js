// Cookie Away 4.0 - Background Service Worker

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // Pause on a site after a click/reload loop
const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
const JEV_TIMEOUT_MS = 8000;
const JEV_CACHE_MAX = 300;
const JEV_DAILY_CALLS_PER_HOST = 3;
const JEV_MIN_CHOICE_PROB = 0.6;

// Initialize defaults without wiping existing settings on update
chrome.runtime.onInstalled.addListener(async () => {
    const data = await chrome.storage.local.get(['enabled', 'stats', 'fallback', 'fallbackChosen', 'deepReject']);
    const defaults = {};
    if (data.enabled === undefined) defaults.enabled = true;
    // 'leave' | 'accept' when there's no way to reject. Leave it unless the user picked otherwise.
    if (!data.fallbackChosen) defaults.fallback = 'leave';
    if (data.deepReject === undefined) defaults.deepReject = true;  // Go through "Manage options" and switch everything off
    if (data.stats === undefined) defaults.stats = { bannersHandled: 0, togglesOff: 0, lastHandled: null };
    await chrome.storage.local.set(defaults);
    // Legacy keys from 4.0
    chrome.storage.local.remove(['mode', 'tabCMPs', 'lastStatus']);
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab && sender.tab.id;

    if (message.type === 'BANNER_HANDLED') {
        setBadge(tabId, '✓', '#16A34A');
        setTabStatus(tabId, { state: 'handled', kind: message.kind, source: message.source, toggles: message.toggles || 0, payWall: !!message.payWall });
        chrome.storage.local.get('stats', (data) => {
            const stats = data.stats || { bannersHandled: 0 };
            stats.bannersHandled = (stats.bannersHandled || 0) + 1;
            stats.togglesOff = (stats.togglesOff || 0) + (message.toggles || 0);
            stats.lastHandled = new Date().toISOString();
            chrome.storage.local.set({ stats });
        });
    } else if (message.type === 'BANNER_MISSED') {
        setBadge(tabId, '!', '#D97706');
        setTabStatus(tabId, { state: 'missed', reason: message.reason, source: message.source }, message.correction);
    } else if (message.type === 'LOOP_DETECTED') {
        pauseHost(message.host);
        setBadge(tabId, '||', '#DC2626');
        setTabStatus(tabId, { state: 'paused' });
    } else if (message.type === 'CMP_DETECTED') {
        setTabStatus(tabId, { cmp: message.name });
    } else if (message.type === 'JEV_TEST') {
        testJevKey().then(sendResponse, (e) => sendResponse({ ok: false, reason: String(e) }));
        return true; // Async response
    } else if (message.type === 'JEV_CLASSIFY') {
        classifyWithJev(message).then(sendResponse, (e) => sendResponse({ ok: false, reason: String(e) }));
        return true; // Async response
    }
});

function setBadge(tabId, text, color) {
    if (tabId == null) return;
    // The tab may already be gone (closed, crashed, restarting); that's fine
    chrome.action.setBadgeText({ tabId, text }).catch(() => { });
    chrome.action.setBadgeBackgroundColor({ tabId, color }).catch(() => { });
}

// What happened on each tab, for the popup. Session storage is cleared when Chrome
// restarts, so tab IDs from a previous session can never show up here.
async function setTabStatus(tabId, patch, correction = false) {
    if (tabId == null) return;
    const key = `tab:${tabId}`;
    const { [key]: current = {} } = await chrome.storage.session.get(key);
    // A banner handled in one frame shouldn't be overwritten by a miss in another,
    // unless the same frame is correcting its own early report
    if (current.state === 'handled' && patch.state === 'missed' && !correction) return;
    await chrome.storage.session.set({ [key]: { ...current, ...patch, at: Date.now() } });
}

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove(`tab:${tabId}`);
});

// New page load: forget the previous page's status
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') chrome.storage.session.remove(`tab:${tabId}`);
});

async function pauseHost(host) {
    if (!host) return;
    const { cooldowns = {} } = await chrome.storage.local.get('cooldowns');
    const now = Date.now();
    // Drop expired entries while we're here
    for (const h of Object.keys(cooldowns)) {
        if (cooldowns[h] < now) delete cooldowns[h];
    }
    cooldowns[host] = now + COOLDOWN_MS;
    await chrome.storage.local.set({ cooldowns });
    console.warn(`Cookie Away 4.0: Loop detected on ${host}. Paused for 24h.`);
}

// New Tab Storm guard: a site opening many tabs right after we act usually means
// we clicked a link. Pause that site only, instead of switching the whole extension off.
// Only tabs opened BY another tab count. Tabs restored after a crash/restart (or opened
// by the user) have no opener; counting them used to disable the extension on restart.
const tabStorms = {};

chrome.tabs.onCreated.addListener((tab) => {
    if (tab.openerTabId == null) return;
    const urlStr = tab.pendingUrl || tab.url;
    if (!urlStr || !urlStr.startsWith('http')) return;
    try {
        const hostname = new URL(urlStr).hostname;
        const now = Date.now();
        tabStorms[hostname] = (tabStorms[hostname] || []).filter(t => now - t < 10000);
        tabStorms[hostname].push(now);
        if (tabStorms[hostname].length > 5) {
            console.warn(`Cookie Away 4.0: New Tab Storm for ${hostname}.`);
            pauseHost(hostname);
            tabStorms[hostname] = [];
        }
    } catch (e) {
        console.error('Error in tab storm detector:', e);
    }
});

// --- Jev (TypeSafe System One) fallback -------------------------------------
// Called only when the content script finds a consent-looking overlay it can't read.
// Sends the banner's text and button labels (nothing else) and caches the answer
// per site + banner, so a given banner is classified once.

async function classifyWithJev({ host, text, buttons }) {
    const { jevEnabled, jevApiKey, jevCache = {}, jevUsage = {} } =
        await chrome.storage.local.get(['jevEnabled', 'jevApiKey', 'jevCache', 'jevUsage']);
    if (!jevEnabled || !jevApiKey) return { ok: false, reason: 'disabled' };
    if (!Array.isArray(buttons) || buttons.length === 0) return { ok: false, reason: 'no-buttons' };

    const key = `${host}|${hash(text + '\n' + buttons.join('\n'))}`;
    if (jevCache[key]) return { ...jevCache[key].result, ok: true, cached: true };

    // Per-site daily budget so a page that keeps changing can't burn API calls
    const today = new Date().toISOString().slice(0, 10);
    const usage = jevUsage.day === today ? jevUsage : { day: today, hosts: {} };
    if ((usage.hosts[host] || 0) >= JEV_DAILY_CALLS_PER_HOST) return { ok: false, reason: 'budget' };
    usage.hosts[host] = (usage.hosts[host] || 0) + 1;
    await chrome.storage.local.set({ jevUsage: usage });

    const options = {};
    buttons.forEach((label, i) => {
        options[`b${i}`] = `The button labelled "${label}"`;
    });
    options.none = 'None of the buttons does this';

    const notThese = 'Buttons that open settings, let the visitor customise choices, or link to a policy do not count. Labels may be in any language.';

    const body = {
        model: 'jev-latest',
        state: {
            site: host,
            banner_text: text,
            buttons: buttons.map((label, i) => ({ id: `b${i}`, label }))
        },
        questions: {
            is_consent_banner: {
                type: 'noul',
                instructions: 'Is `banner_text` a cookie or tracking consent notice that asks the visitor to accept or refuse cookies or similar tracking? It may be in any language.',
                criteria: {
                    true: 'A cookie or tracking consent banner or dialog',
                    false: 'Something else, such as a newsletter signup, chat widget, age gate, paywall, login prompt, promotion or ordinary page content'
                }
            },
            reject_button: {
                type: 'choice',
                instructions: `Which of \`buttons\` refuses all non-essential cookies and closes the notice in one click (for example "reject all", "only necessary", or "continue without accepting")? ${notThese}`,
                criteria: options
            },
            accept_button: {
                type: 'choice',
                instructions: `Which of \`buttons\` accepts the cookies and closes the notice in one click? ${notThese}`,
                criteria: options
            },
            settings_button: {
                type: 'choice',
                instructions: 'Which of `buttons` opens the detailed cookie settings, where individual purposes or partners can be switched off (for example "manage options", "more options", "customise" or "settings")? Labels may be in any language.',
                criteria: options
            }
        }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JEV_TIMEOUT_MS);
    let response;
    try {
        response = await fetch(JEV_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jevApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
    } catch (e) {
        return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : 'network' };
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        const reason = response.status === 401 ? 'invalid-key' : `http-${response.status}`;
        await chrome.storage.local.set({ jevStatus: { ok: false, reason, at: Date.now() } });
        return { ok: false, reason };
    }

    const { answers } = await response.json();
    const result = {
        isBanner: answers.is_consent_banner.noul,
        reject: pickIndex(answers.reject_button),
        accept: pickIndex(answers.accept_button),
        settings: pickIndex(answers.settings_button)
    };

    // Store, evicting the oldest entries
    jevCache[key] = { result, at: Date.now() };
    const keys = Object.keys(jevCache);
    if (keys.length > JEV_CACHE_MAX) {
        keys.sort((a, b) => jevCache[a].at - jevCache[b].at)
            .slice(0, keys.length - JEV_CACHE_MAX)
            .forEach(k => delete jevCache[k]);
    }
    await chrome.storage.local.set({ jevCache, jevStatus: { ok: true, at: Date.now() } });

    return { ...result, ok: true };
}

// One minimal request to check the saved key works (from the settings page)
async function testJevKey() {
    const { jevApiKey } = await chrome.storage.local.get('jevApiKey');
    if (!jevApiKey) return { ok: false, reason: 'no-key' };
    try {
        const response = await fetch(JEV_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${jevApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'jev-latest',
                state: 'We use cookies to improve your experience.',
                questions: { ping: { type: 'noul', instructions: 'Is this about cookies?' } }
            }),
            signal: AbortSignal.timeout(JEV_TIMEOUT_MS)
        });
        const jevStatus = response.ok
            ? { ok: true, at: Date.now() }
            : { ok: false, reason: response.status === 401 ? 'invalid-key' : `http-${response.status}`, at: Date.now() };
        await chrome.storage.local.set({ jevStatus });
        return { ok: jevStatus.ok, reason: jevStatus.reason };
    } catch (e) {
        return { ok: false, reason: e.name === 'TimeoutError' ? 'timeout' : 'network' };
    }
}

// Index of the chosen button, or null if Jev chose "none" or isn't sure enough
function pickIndex(answer) {
    if (!answer || answer.choice === 'none') return null;
    const p = answer.probabilities && answer.probabilities[answer.choice];
    if (p == null || p < JEV_MIN_CHOICE_PROB) return null;
    const index = Number(answer.choice.slice(1));
    return Number.isInteger(index) ? index : null;
}

function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}
