document.addEventListener('DOMContentLoaded', async () => {
    // Load state
    const data = await chrome.storage.local.get(['enabled', 'mode', 'stats', 'lastStatus']);

    // Set toggle
    document.getElementById('master-toggle').checked = data.enabled !== false;

    // Set mode
    const mode = data.mode || 'reject_all';
    document.querySelector(`input[value="${mode}"]`).checked = true;

    // Set stats
    const stats = data.stats || { bannersHandled: 0 };
    document.getElementById('banners-count').textContent = stats.bannersHandled;

    // Set status
    const statusContainer = document.getElementById('status-container');
    // Error reporting removed as per user request ("pointless")
    if (statusContainer) {
        statusContainer.style.display = 'none';
    }

    // Calculate time saved (approx 5s per banner)
    const timeSaved = stats.bannersHandled * 5;
    document.getElementById('time-saved').textContent = formatTime(timeSaved);

    // Load Detected CMP for current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabData = await chrome.storage.local.get('tabCMPs');
    const cmpTag = document.getElementById('cmp-tag');

    if (tabData.tabCMPs && tabData.tabCMPs[tab.id]) {
        cmpTag.textContent = tabData.tabCMPs[tab.id];
        cmpTag.style.display = 'inline-block';
    } else {
        cmpTag.style.display = 'none';
    }

    // Listeners
    document.getElementById('master-toggle').addEventListener('change', (e) => {
        chrome.storage.local.set({ enabled: e.target.checked });
    });

    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            chrome.storage.local.set({ mode: e.target.value });
        });
    });

    // Settings Icon
    document.getElementById('open-settings').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Export Icon
    document.getElementById('export-btn').addEventListener('click', () => {
        // Trigger download logic (assuming exportExtension function exists or needs to be added)
        // For now, we'll just log it as the user didn't provide the export function in the snippet
        // Re-adding the export logic if it was there before
        exportExtension();
    });

    // Ignore Site Button with Feedback
    const ignoreBtn = document.getElementById('ignore-site-btn');
    if (ignoreBtn) {
        ignoreBtn.addEventListener('click', async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) return;

            const url = new URL(tab.url);
            const hostname = url.hostname;

            const data = await chrome.storage.local.get('ignoredSites');
            const ignoredSites = data.ignoredSites || [];

            if (!ignoredSites.includes(hostname)) {
                ignoredSites.push(hostname);
                await chrome.storage.local.set({ ignoredSites });

                // Visual Feedback
                const originalText = ignoreBtn.textContent;
                ignoreBtn.textContent = 'Site Ignored';
                ignoreBtn.style.color = '#34C759'; // Success Green
                ignoreBtn.disabled = true;

                setTimeout(() => {
                    ignoreBtn.textContent = originalText;
                    ignoreBtn.style.color = '';
                    ignoreBtn.disabled = false;
                }, 2000);

                // Reload the tab to apply changes
                chrome.tabs.reload(tab.id);
            }
        });
    }

    document.getElementById('reset-stats').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Reset all statistics?')) {
            chrome.storage.local.set({
                stats: { bannersHandled: 0, lastHandled: null }
            }, () => {
                location.reload();
            });
        }
    });
});

function exportExtension() {
    // Basic export stub or re-implement if needed. 
    // Since the previous file content didn't show the export logic, I'll assume it's needed.
    // However, to be safe and not break things, I'll check if JSZip is loaded.
    if (typeof JSZip === 'undefined') {
        console.error('JSZip not found');
        return;
    }

    const zip = new JSZip();
    // ... (Export logic would go here, but for now let's just alert if it's missing)
    // Actually, I should probably restore the export logic if I can find it in history, 
    // but the user said "The download icon... doesn't work", implying the logic might be missing or disconnected.
    // I will add a simple alert for now if I can't find the original code, or better, 
    // I will just ensure the listener is attached.
    // The previous `popup.js` had it. I will re-add a robust version.

    // For this step, I am just attaching the listener. I will add the export function in a separate block if needed.
}

function formatTime(seconds) {
    if (seconds < 60) return seconds + 's';
    const minutes = Math.floor(seconds / 60);
    return minutes + 'm';
}

async function exportExtension() {
    try {
        const zip = new JSZip();
        const root = zip.folder("Cookie Away 4.0");

        // Add manifest
        const manifest = await fetch('../manifest.json').then(r => r.text());
        root.file("manifest.json", manifest);

        // Add folders (recursively or manually for key files)
        // For simplicity/robustness, we'll just grab the known structure
        const files = [
            'popup/index.html', 'popup/style.css', 'popup/script.js',
            'content/content.js',
            'background/service_worker.js',
            'options/options.html', 'options/options.css', 'options/options.js',
            'icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png'
        ];

        for (const file of files) {
            try {
                const content = await fetch('../' + file).then(r => r.blob());
                root.file(file, content);
            } catch (e) {
                console.warn('Skipping file:', file);
            }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = "cookie-away-source.zip";
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Export failed:', err);
        alert('Export failed. See console for details.');
    }
}
