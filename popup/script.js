// Cookie Away popup: what happened on this site, plus the few settings that matter.

const $ = (id) => document.getElementById(id);
const SECONDS_SAVED_PER_BANNER = 5;

let tab = null;
let host = null;
let rescanTimer = null;
let scanning = null; // Shown after "Try again" until the page reports back

document.addEventListener('DOMContentLoaded', async () => {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
        const url = new URL(tab.url);
        host = /^https?:$/.test(url.protocol) ? url.hostname : null;
    } catch (e) {
        host = null;
    }

    await render();
    bindEvents();

    // Live updates while the popup is open (e.g. after "Try again")
    chrome.storage.onChanged.addListener((changes, area) => {
        const change = area === 'session' && (changes[`tab:${tab.id}`] || changes[`site:${host}`]);
        if (change) {
            if (change.newValue) {
                scanning = null;
                clearTimeout(rescanTimer);
            }
            render();
        }
        if (area === 'local' && (changes.cooldowns || changes.stats || changes.enabled)) render();
    });
});

async function render() {
    const local = await chrome.storage.local.get([
        'enabled', 'ignoredSites', 'cooldowns', 'stats', 'fallback', 'deepReject', 'jevEnabled', 'jevApiKey'
    ]);
    const key = `tab:${tab.id}`;
    const siteKey = `site:${host}`;
    const session = await chrome.storage.session.get([key, siteKey]);
    const status = session[key] || {};
    const earlier = host ? session[siteKey] : null;

    const enabled = local.enabled !== false;
    $('master-toggle').checked = enabled;
    document.body.classList.toggle('disabled', !enabled);

    $('deep-toggle').checked = local.deepReject !== false;
    const fallback = local.fallback === 'accept' ? 'accept' : 'leave';
    document.querySelector(`input[name="fallback"][value="${fallback}"]`).checked = true;

    const jevOn = !!(local.jevEnabled && local.jevApiKey);
    $('jev-pill').textContent = jevOn ? 'On' : 'Off';
    $('jev-pill').classList.toggle('on', jevOn);

    renderStats(local.stats || {});
    renderSite(scanning || siteState(local, status, enabled, earlier), status);
}

// Decide what to say about the current tab
function siteState(local, status, enabled, earlier) {
    if (!host) return { state: 'idle', title: 'Nothing to do here', detail: 'Cookie Away only runs on websites.', actions: false };
    if (!enabled) return { state: 'idle', title: 'Cookie Away is off', detail: 'Turn it on with the switch above.', actions: false };

    if ((local.ignoredSites || []).includes(host)) {
        return { state: 'idle', title: 'Off on this site', detail: 'Banners here are left alone.', retry: false, siteOn: false };
    }

    const pausedUntil = (local.cooldowns || {})[host];
    if (status.state === 'paused' || (pausedUntil && pausedUntil > Date.now())) {
        const until = pausedUntil ? new Date(pausedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'tomorrow';
        return {
            state: 'paused',
            title: 'Paused on this site',
            detail: `The banner kept coming back after each click, so Cookie Away stopped to avoid a reload loop. Resumes at ${until}.`,
            retryLabel: 'Resume'
        };
    }

    const via = status.source === 'jev' ? ' with Jev' : '';
    if (status.state === 'handled') {
        if (status.kind === 'settings' || status.toggles) {
            const n = status.toggles || 0;
            return {
                state: 'handled',
                title: 'Rejected through the settings',
                detail: n ? `Switched off ${n} setting${n === 1 ? '' : 's'}${via}.` : `Saved with everything off${via}.`
            };
        }
        if (status.kind === 'accept') {
            const detail = status.payWall
                ? 'This site only lets you reject if you pay for a subscription.'
                : `This banner had no way to reject${via}.`;
            return { state: 'accepted', title: 'Accepted', detail };
        }
        if (status.kind === 'dismiss') return { state: 'handled', title: 'Banner closed', detail: `No choice was offered${via}.` };
        return { state: 'handled', title: 'Cookies rejected', detail: via ? `Handled${via}.` : '' };
    }

    if (status.state === 'missed' && status.reason === 'pay-wall') {
        return { state: 'missed', title: 'Left alone', detail: 'This site only lets you reject if you pay. Close it yourself, or set "If that doesn\'t work" to Accept.', retry: false };
    }

    if (status.state === 'missed') {
        const detail = status.reason === 'still-visible'
            ? 'It clicked, but the banner stayed. Try again, or handle this one yourself.'
            : "Found a banner but couldn't work out which button to press.";
        return { state: 'missed', title: "Couldn't handle the banner", detail };
    }

    // Nothing on this page load, but handled earlier in this session (the site remembers the choice)
    if (earlier) {
        const at = new Date(earlier.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const what = earlier.kind === 'accept' ? 'accepted' : 'rejected';
        const n = earlier.toggles || 0;
        return {
            state: earlier.kind === 'accept' ? 'accepted' : 'handled',
            title: `Cookies ${what} earlier`,
            detail: `At ${at}${n ? `, with ${n} setting${n === 1 ? '' : 's'} switched off` : ''}. The site remembers the choice, so there's no banner now.`
        };
    }

    return { state: 'idle', title: 'No cookie banner seen', detail: '' };
}

function renderSite(s, status) {
    $('site').dataset.state = s.state;
    $('site-host').textContent = host ? host.replace(/^www\./, '') : 'This page';
    $('site-avatar').textContent = host ? host.replace(/^www\./, '').charAt(0) : '·';
    $('site-cmp').textContent = status.cmp ? `Uses ${status.cmp}` : '';
    $('status-title').textContent = s.title;
    $('status-detail').textContent = s.detail || '';

    $('site-actions').hidden = s.actions === false;
    $('retry-btn').hidden = s.retry === false;
    $('retry-btn').disabled = s.state === 'scanning';
    // Only shout when something needs attention
    $('retry-btn').classList.toggle('btn-quiet', !['missed', 'paused'].includes(s.state));
    $('retry-btn').querySelector('span').textContent = s.retryLabel || 'Try again';
    $('site-toggle-btn').textContent = s.siteOn === false ? 'Turn on here' : 'Turn off here';
}

function renderStats(stats) {
    const n = stats.bannersHandled || 0;
    if (!n) {
        $('stats').textContent = 'No banners handled yet';
        return;
    }
    $('stats').textContent = `${n.toLocaleString()} banner${n === 1 ? '' : 's'} · ~${formatTime(n * SECONDS_SAVED_PER_BANNER)} saved`;
}

function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function bindEvents() {
    $('master-toggle').addEventListener('change', (e) => {
        chrome.storage.local.set({ enabled: e.target.checked });
    });

    $('deep-toggle').addEventListener('change', (e) => {
        chrome.storage.local.set({ deepReject: e.target.checked });
    });

    document.querySelectorAll('input[name="fallback"]').forEach(radio => {
        radio.addEventListener('change', (e) => chrome.storage.local.set({ fallback: e.target.value, fallbackChosen: true }));
    });

    $('retry-btn').addEventListener('click', retry);
    $('site-toggle-btn').addEventListener('click', toggleSite);
    $('jev-row').addEventListener('click', () => chrome.runtime.openOptionsPage());
    $('open-settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

// Clear any pause, then ask the page to scan again (or reload if the script isn't there)
async function retry() {
    const { cooldowns = {} } = await chrome.storage.local.get('cooldowns');
    if (cooldowns[host]) {
        delete cooldowns[host];
        await chrome.storage.local.set({ cooldowns });
    }
    await chrome.storage.session.remove(`tab:${tab.id}`);
    chrome.action.setBadgeText({ tabId: tab.id, text: '' }).catch(() => { });

    scanning = { state: 'scanning', title: 'Looking for a banner…', detail: '' };
    await render();

    try {
        await chrome.tabs.sendMessage(tab.id, { type: 'RESCAN' });
    } catch (e) {
        // No content script on this page yet (e.g. opened before the extension loaded)
        chrome.tabs.reload(tab.id);
    }

    // If nothing reports back, there was nothing to handle
    clearTimeout(rescanTimer);
    rescanTimer = setTimeout(() => {
        scanning = null;
        render();
    }, 6000);
}

async function toggleSite() {
    const { ignoredSites = [] } = await chrome.storage.local.get('ignoredSites');
    const ignored = ignoredSites.includes(host);
    const next = ignored ? ignoredSites.filter(h => h !== host) : [...ignoredSites, host];
    await chrome.storage.local.set({ ignoredSites: next });
    await chrome.storage.session.remove(`tab:${tab.id}`);
    chrome.tabs.reload(tab.id);
    render();
}
