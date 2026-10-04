// Cookie Away settings page

const $ = (id) => document.getElementById(id);
const SECONDS_SAVED_PER_BANNER = 5;

document.addEventListener('DOMContentLoaded', async () => {
    $('version').textContent = `Version ${chrome.runtime.getManifest().version}`;
    renderProviders();
    await render();
    bindEvents();

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') render(changes);
    });
});

async function render(changes) {
    const data = await chrome.storage.local.get([
        'enabled', 'deepReject', 'fallback', 'jevEnabled', 'jevApiKey', 'jevStatus',
        'ignoredSites', 'cooldowns', 'stats'
    ]);

    const enabled = data.enabled !== false;
    $('master-toggle').checked = enabled;
    $('master-label').textContent = enabled ? 'On' : 'Off everywhere';
    document.body.classList.toggle('disabled', !enabled);

    $('deep-toggle').checked = data.deepReject !== false;
    const fallback = data.fallback === 'accept' ? 'accept' : 'leave';
    document.querySelector(`input[name="fallback"][value="${fallback}"]`).checked = true;
    $('fallback-desc').textContent = fallback === 'leave'
        ? 'Leave the banner for you to deal with. The icon shows a ! so you know.'
        : 'Click Accept so the banner goes away. Pay-to-reject options are never clicked.';

    $('jev-enabled').checked = !!data.jevEnabled;
    // Don't overwrite a key that's being typed
    if (!changes || changes.jevApiKey) {
        if (document.activeElement !== $('jev-key')) $('jev-key').value = data.jevApiKey || '';
    }
    renderJevStatus(data);

    renderStats(data.stats || {});
    renderSites(data.ignoredSites || [], data.cooldowns || {});
}

function renderJevStatus({ jevEnabled, jevApiKey, jevStatus }) {
    const el = $('jev-status');
    el.className = 'row-desc';
    if (!jevApiKey) {
        el.textContent = 'Add an API key below to use it.';
        if (jevEnabled) el.classList.add('warn');
    } else if (!jevEnabled) {
        el.textContent = 'Off. The key is saved.';
    } else if (jevStatus && jevStatus.ok === false) {
        el.textContent = jevStatus.reason === 'invalid-key' ? 'The API key was rejected. Check it and save again.' : `Last call failed (${jevStatus.reason}).`;
        el.classList.add('bad');
    } else if (jevStatus && jevStatus.ok) {
        el.textContent = `Working. Last used ${timeAgo(jevStatus.at)}.`;
        el.classList.add('ok');
    } else {
        el.textContent = 'Ready. Used only when a banner can\'t be read.';
    }
}

function renderStats(stats) {
    const n = stats.bannersHandled || 0;
    $('stat-banners').textContent = n.toLocaleString();
    $('stat-toggles').textContent = (stats.togglesOff || 0).toLocaleString();
    $('stat-time').textContent = formatTime(n * SECONDS_SAVED_PER_BANNER);
}

function renderSites(ignored, cooldowns) {
    const now = Date.now();

    fillList($('ignored-list'), ignored.slice().sort(), 'No sites turned off. Use "Turn off here" in the popup, or add one above.', (site) => ({
        meta: '',
        action: 'Turn back on',
        onAction: async () => {
            const { ignoredSites = [] } = await chrome.storage.local.get('ignoredSites');
            await chrome.storage.local.set({ ignoredSites: ignoredSites.filter(s => s !== site) });
            toast(`${site} turned back on`);
        }
    }));

    const paused = Object.entries(cooldowns).filter(([, until]) => until > now).sort((a, b) => a[1] - b[1]);
    fillList($('paused-list'), paused.map(([site]) => site), 'Nothing paused.', (site) => ({
        meta: `until ${new Date(cooldowns[site]).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`,
        action: 'Resume',
        onAction: async () => {
            const data = await chrome.storage.local.get('cooldowns');
            const next = data.cooldowns || {};
            delete next[site];
            await chrome.storage.local.set({ cooldowns: next });
            toast(`${site} resumed`);
        }
    }));
}

function fillList(list, sites, emptyText, describe) {
    list.replaceChildren();
    if (sites.length === 0) {
        const li = document.createElement('li');
        li.className = 'empty';
        li.textContent = emptyText;
        list.appendChild(li);
        return;
    }
    for (const site of sites) {
        const { meta, action, onAction } = describe(site);
        const li = document.createElement('li');

        const avatar = document.createElement('span');
        avatar.className = 'site-avatar';
        avatar.textContent = site.replace(/^www\./, '').charAt(0);

        const name = document.createElement('span');
        name.className = 'site-name';
        name.textContent = site;

        li.append(avatar, name);
        if (meta) {
            const m = document.createElement('span');
            m.className = 'site-meta';
            m.textContent = meta;
            li.appendChild(m);
        }

        const btn = document.createElement('button');
        btn.className = 'btn btn-quiet btn-small';
        btn.type = 'button';
        btn.textContent = action;
        btn.addEventListener('click', onAction);
        li.appendChild(btn);

        list.appendChild(li);
    }
}

// Straight from the registry (cmp_registry.js is loaded on this page)
function renderProviders() {
    const list = $('cmp-list');
    list.replaceChildren();
    const names = (window.CMP_REGISTRY || []).map(p => p.name).sort((a, b) => a.localeCompare(b));
    for (const name of names) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = name;
        list.appendChild(chip);
    }
}

function bindEvents() {
    $('master-toggle').addEventListener('change', (e) => chrome.storage.local.set({ enabled: e.target.checked }));
    $('deep-toggle').addEventListener('change', (e) => chrome.storage.local.set({ deepReject: e.target.checked }));
    document.querySelectorAll('input[name="fallback"]').forEach(radio => {
        radio.addEventListener('change', (e) => chrome.storage.local.set({ fallback: e.target.value, fallbackChosen: true }));
    });

    $('jev-enabled').addEventListener('change', (e) => chrome.storage.local.set({ jevEnabled: e.target.checked }));

    $('jev-reveal').addEventListener('click', () => {
        const input = $('jev-key');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        $('jev-reveal').title = show ? 'Hide key' : 'Show key';
    });

    $('jev-save').addEventListener('click', saveKey);
    $('jev-key').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveKey();
    });

    $('add-site-form').addEventListener('submit', addSite);
    $('reset-stats').addEventListener('click', resetStats);
    $('export-btn').addEventListener('click', exportExtension);
}

// Save, then check the key with one tiny request
async function saveKey() {
    const key = $('jev-key').value.trim();
    await chrome.storage.local.set({ jevApiKey: key, jevStatus: null });
    if (!key) {
        toast('Key removed');
        return;
    }
    $('jev-save').disabled = true;
    $('jev-save').textContent = 'Checking…';
    let res = null;
    try {
        res = await chrome.runtime.sendMessage({ type: 'JEV_TEST' });
    } catch (e) {
        res = { ok: false, reason: 'network' };
    }
    $('jev-save').disabled = false;
    $('jev-save').textContent = 'Save';

    if (res && res.ok) {
        const turnedOn = !$('jev-enabled').checked;
        await chrome.storage.local.set({ jevEnabled: true });
        toast(turnedOn ? 'Key works. Smart detection is on.' : 'Key works');
    } else {
        toast(res && res.reason === 'invalid-key' ? 'That key was rejected' : `Couldn't check the key (${res ? res.reason : 'error'})`);
    }
}

async function addSite(e) {
    e.preventDefault();
    const raw = $('add-site-input').value.trim();
    if (!raw) return;
    let site = raw;
    try {
        site = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname;
    } catch (err) {
        toast('That doesn\'t look like a website');
        return;
    }
    const { ignoredSites = [] } = await chrome.storage.local.get('ignoredSites');
    // A bare domain also covers its www. version
    const add = [site];
    if (!site.startsWith('www.') && site.split('.').length === 2) add.push(`www.${site}`);
    await chrome.storage.local.set({ ignoredSites: [...new Set([...ignoredSites, ...add])] });
    $('add-site-input').value = '';
    toast(`${site} turned off`);
}

async function resetStats() {
    const { stats = {} } = await chrome.storage.local.get('stats');
    await chrome.storage.local.set({ stats: { bannersHandled: 0, togglesOff: 0, lastHandled: null } });
    toast('Stats reset', 'Undo', () => chrome.storage.local.set({ stats }));
}

// Zip the extension's own files (for sharing or backing up a build)
async function exportExtension() {
    const files = [
        'manifest.json',
        'background/service_worker.js',
        'content/cmp_registry.js', 'content/content.js',
        'popup/index.html', 'popup/style.css', 'popup/script.js',
        'options/options.html', 'options/options.css', 'options/options.js',
        'lib/jszip.min.js',
        'icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png'
    ];
    const zip = new JSZip();
    const root = zip.folder('Cookie Away');
    for (const file of files) {
        try {
            root.file(file, await fetch(chrome.runtime.getURL(file)).then(r => r.blob()));
        } catch (e) {
            console.warn('Skipping file:', file);
        }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cookie-away-${chrome.runtime.getManifest().version}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Utils ------------------------------------------------------------------

let toastTimer = null;
function toast(text, actionLabel, onAction) {
    let el = document.querySelector('.toast');
    if (!el) {
        el = document.createElement('div');
        el.className = 'toast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
    }
    el.replaceChildren(document.createTextNode(text));
    if (actionLabel) {
        const btn = document.createElement('button');
        btn.className = 'toast-action';
        btn.textContent = actionLabel;
        btn.addEventListener('click', () => {
            onAction();
            el.classList.remove('show');
        });
        el.appendChild(btn);
    }
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), actionLabel ? 5000 : 2500);
}

function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function timeAgo(at) {
    const mins = Math.round((Date.now() - at) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    return new Date(at).toLocaleDateString();
}
