document.addEventListener('DOMContentLoaded', () => {
    loadIgnoredSites();
    loadSupportedCMPs();
});

async function loadIgnoredSites() {
    const data = await chrome.storage.local.get('ignoredSites');
    const ignoredSites = data.ignoredSites || [];
    const listContainer = document.getElementById('ignored-list');

    listContainer.innerHTML = '';

    if (ignoredSites.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No ignored sites yet.</div>';
        return;
    }

    ignoredSites.forEach(site => {
        const item = document.createElement('div');
        item.className = 'ignored-item';

        const hostname = document.createElement('span');
        hostname.className = 'site-hostname';
        hostname.textContent = site;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => removeSite(site);

        item.appendChild(hostname);
        item.appendChild(removeBtn);
        listContainer.appendChild(item);
    });
}

async function removeSite(siteToRemove) {
    const data = await chrome.storage.local.get('ignoredSites');
    let ignoredSites = data.ignoredSites || [];

    ignoredSites = ignoredSites.filter(site => site !== siteToRemove);

    await chrome.storage.local.set({ ignoredSites });
    loadIgnoredSites();
}

// Load Supported CMPs
function loadSupportedCMPs() {
    // This list mirrors the registry. In a real build system, we'd import it.
    // For now, we list the major ones we added.
    const cmps = [
        "OneTrust", "Cookiebot", "Usercentrics", "Sourcepoint", "CookieYes",
        "Osano", "TrustArc", "CookieFirst", "Termly", "Iubenda", "Didomi",
        "Civic Cookie Control", "Quantcast Choice", "CookieHub", "Consent Manager",
        "Axeptio", "Piwik PRO", "Cookie Information", "Borlabs Cookie", "Real Cookie Banner",
        "Complianz", "GDPR Cookie Consent", "Enzuzo", "Crownpeak", "Ensighten",
        "CookieScript", "Consent-O-Matic", "Ketch", "Cassie", "Tealium", "Silktide",
        "Prighter", "ConsentKit", "CookieHawk", "SimpleConsent", "EasyConsent",
        "CookiePlug", "CookieGuard", "Bannerflow", "Adactio"
    ];

    const container = document.getElementById('cmp-list');
    if (container) {
        container.innerHTML = cmps.map(name => `<div class="cmp-badge">${name}</div>`).join('');
    }
}
