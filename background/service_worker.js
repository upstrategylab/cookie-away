// Cookie Away 4.0 - Background Service Worker

// Initialize default state
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        enabled: true,
        mode: 'reject_all', // or 'necessary_only'
        stats: {
            bannersHandled: 0,
            lastHandled: null
        }
    });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'BANNER_HANDLED') {
        // Update badge
        if (sender.tab) {
            chrome.action.setBadgeText({
                tabId: sender.tab.id,
                text: '✓'
            });
            chrome.action.setBadgeBackgroundColor({
                tabId: sender.tab.id,
                color: '#4CAF50'
            });
        }

        // Update stats
        chrome.storage.local.get('stats', (data) => {
            const stats = data.stats || { bannersHandled: 0 };
            stats.bannersHandled++;
            stats.lastHandled = new Date().toISOString();
            chrome.storage.local.set({ stats });
        });
    } else if (message.type === 'BANNER_MISSED') {
        // Show yellow error badge
        if (sender.tab) {
            chrome.action.setBadgeText({
                tabId: sender.tab.id,
                text: '!'
            });
            chrome.action.setBadgeBackgroundColor({
                tabId: sender.tab.id,
                color: '#FFCC00' // Yellow
            });
        }
    } else if (message.type === 'STATUS_UPDATE') {
        // Save status for popup
        chrome.storage.local.set({ lastStatus: message.status });
    } else if (message.type === 'CMP_DETECTED') {
        // Store detected CMP per tab
        if (sender.tab) {
            chrome.storage.local.get('tabCMPs', (data) => {
                const tabCMPs = data.tabCMPs || {};
                tabCMPs[sender.tab.id] = message.name;
                chrome.storage.local.set({ tabCMPs });
            });
        }
    }
});

// Global Hostname Tracker (to prevent "New Tab Storms")
const globalHostnameTracker = {};

chrome.tabs.onCreated.addListener((tab) => {
    if (tab.pendingUrl || tab.url) {
        try {
            const urlStr = tab.pendingUrl || tab.url;
            if (!urlStr || !urlStr.startsWith('http')) return;

            const url = new URL(urlStr);
            const hostname = url.hostname;
            const now = Date.now();

            if (!globalHostnameTracker[hostname]) {
                globalHostnameTracker[hostname] = [];
            }

            // Add timestamp
            globalHostnameTracker[hostname].push(now);

            // Keep only timestamps from last 10 seconds
            globalHostnameTracker[hostname] = globalHostnameTracker[hostname].filter(t => now - t < 10000);

            // If more than 5 tabs opened for this host in 10 seconds
            if (globalHostnameTracker[hostname].length > 5) {
                console.warn(`Cookie Away 4.0: Detected New Tab Storm for ${hostname}. Disabling extension for this host.`);

                // Disable extension globally or for this host (simple global disable for safety)
                chrome.storage.local.set({ enabled: false });

                // Show notification badge
                chrome.action.setBadgeText({ text: 'ERR' });
                chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
            }
        } catch (e) {
            console.error('Error in global loop detector:', e);
        }
    }
});
