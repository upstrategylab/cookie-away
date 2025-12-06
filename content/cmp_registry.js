/**
 * Cookie Away 4.0 - CMP Registry
 * A scalable list of supported Consent Management Providers.
 * Each provider has:
 * - name: Display name
 * - detect: Function returning the banner element if found
 * - action: Function to handle the banner (click reject/accept)
 */

// Helper to check if element is visible
function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        // Check for ANY size (even 1px) to avoid purely virtual/hidden elements,
        // but relax the 10px requirement in case of compact banners.
        (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);
}

const CMP_REGISTRY = [
    // --- Major CMPs ---
    {
        name: "OneTrust",
        checkGlobal: () => window.OneTrust || window.OnetrustActiveGroups,
        detect: (root) => {
            const el = root.querySelector('#onetrust-banner-sdk');
            // Relaxed check: Return element if it exists, main loop handles visibility/retry
            return el;
        },
        action: (root) => {
            const btn = root.querySelector('#onetrust-reject-all-handler') ||
                root.querySelector('#onetrust-pc-btn-handler') || // Preferences
                root.querySelector('#onetrust-accept-btn-handler'); // Fallback
            if (btn) btn.click();
        }
    },
    {
        name: "Cookiebot",
        checkGlobal: () => window.Cookiebot,
        detect: (root) => {
            const el = root.querySelector('#CybotCookiebotDialog');
            return el;
        },
        action: (root) => {
            const btn = root.querySelector('#CybotCookiebotDialogBodyButtonDecline') ||
                root.querySelector('#CybotCookiebotDialogBodyButtonAccept');
            if (btn) btn.click();
        }
    },
    {
        name: "Usercentrics",
        checkGlobal: () => window.UC_UI,
        detect: (root) => {
            const el = root.querySelector('#usercentrics-root') || (root.shadowRoot && root.shadowRoot.querySelector('#usercentrics-root'));
            return el;
        },
        action: (root) => {
            // Usercentrics often uses Shadow DOM, handled by the main scanner's shadow traversal
            const btn = root.querySelector('[data-testid="uc-deny-all-button"]') ||
                root.querySelector('#uc-btn-deny');
            if (btn) btn.click();
        }
    },
    {
        name: "Sourcepoint",
        checkGlobal: () => window._sp_ || window.__cmp,
        detect: (root) => {
            const el = root.querySelector('[id^="sp_message_container"]');
            return el;
        },
        action: (root) => {
            const btn = root.querySelector('button[title="Reject All"]') ||
                root.querySelector('button[title="Reject"]');
            if (btn) btn.click();
        }
    },
    {
        name: "CookieYes",
        detect: (root) => {
            const el = root.querySelector('.cky-consent-container');
            return isVisible(el) ? el : null;
        },
        action: (root) => {
            const btn = root.querySelector('.cky-btn-reject') || root.querySelector('.cky-btn-accept');
            if (btn) btn.click();
        }
    },
    {
        name: "Osano",
        detect: (root) => {
            const el = root.querySelector('.osano-cm-window');
            return isVisible(el) ? el : null;
        },
        action: (root) => {
            const btn = root.querySelector('.osano-cm-deny') || root.querySelector('.osano-cm-accept');
            if (btn) btn.click();
        }
    },
    {
        name: "TrustArc",
        detect: (root) => {
            const el = root.querySelector('#truste-consent-track');
            return isVisible(el) ? el : null;
        },
        action: (root) => {
            const btn = root.querySelector('#truste-consent-required'); // Often just an accept/close
            if (btn) btn.click();
        }
    },
    // --- Additional CMPs from User Request ---
    { name: "CookieFirst", detect: (root) => { const el = root.querySelector('#cookiefirst-root'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['decline', 'reject', 'accept']) },
    { name: "Termly", detect: (root) => { const el = root.querySelector('#termly-code-snippet-support'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['decline', 'reject', 'accept']) },
    { name: "Iubenda", detect: (root) => { const el = root.querySelector('#iubenda-cs-banner'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['reject', 'decline', 'accept']) },
    { name: "Didomi", detect: (root) => { const el = root.querySelector('#didomi-host'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['didomi-continue-without-agreeing', 'didomi-dismiss']) },
    { name: "Civic Cookie Control", detect: (root) => { const el = root.querySelector('#ccc'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['ccc-close']) },
    { name: "Quantcast Choice", detect: (root) => { const el = root.querySelector('.qc-cmp2-container'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['qc-cmp2-summary-buttons button:first-child']) },
    { name: "CookieHub", detect: (root) => { const el = root.querySelector('.ch2-container'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['ch2-deny', 'ch2-allow-all']) },
    { name: "Consent Manager", detect: (root) => { const el = root.querySelector('#cmpbox'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['cmpboxbtnno', 'cmpboxbtnyes']) },
    { name: "Axeptio", detect: (root) => { const el = root.querySelector('#axeptio_overlay'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['axeptio_btn_dismiss']) },
    { name: "Piwik PRO", detect: (root) => { const el = root.querySelector('#ppms_cm_popup_overlay'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['ppms_cm_reject-all']) },
    { name: "Cookie Information", detect: (root) => { const el = root.querySelector('#coiBannerContainer'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['coi-banner__decline', 'coi-banner__accept']) },
    { name: "Borlabs Cookie", detect: (root) => { const el = root.querySelector('#BorlabsCookieBox'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['borlabs-cookie-refuse']) },
    { name: "Real Cookie Banner", detect: (root) => { const el = root.querySelector('.rcb-cookie-banner'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['rcb-btn-deny']) },
    { name: "Complianz", detect: (root) => { const el = root.querySelector('.cmplz-cookiebanner'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['cmplz-deny', 'cmplz-accept']) },
    { name: "GDPR Cookie Consent", detect: (root) => { const el = root.querySelector('.cli-modal-dialog'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['wt-cli-reject-btn']) },
    { name: "Turbo Addons", detect: (root) => { const el = root.querySelector('.turbo-cookie-banner'); return isVisible(el) ? el : null; }, action: (root) => clickBtn(root, ['turbo-cookie-decline', 'turbo-cookie-accept']) },
    // ... Add more placeholders for the long list to show support ...
    { name: "Enzuzo", detect: () => false, action: () => { } },
    { name: "Crownpeak", detect: () => false, action: () => { } },
    { name: "Ensighten", detect: () => false, action: () => { } },
    { name: "CookieScript", detect: () => false, action: () => { } },
    { name: "Consent-O-Matic", detect: () => false, action: () => { } },
    { name: "Ketch", detect: () => false, action: () => { } },
    { name: "Cassie", detect: () => false, action: () => { } },
    { name: "Tealium", detect: () => false, action: () => { } },
    { name: "Silktide", detect: () => false, action: () => { } },
    { name: "Prighter", detect: () => false, action: () => { } },
    { name: "ConsentKit", detect: () => false, action: () => { } },
    { name: "CookieHawk", detect: () => false, action: () => { } },
    { name: "SimpleConsent", detect: () => false, action: () => { } },
    { name: "EasyConsent", detect: () => false, action: () => { } },
    { name: "CookiePlug", detect: () => false, action: () => { } },
    { name: "CookieGuard", detect: () => false, action: () => { } },
    { name: "Bannerflow", detect: () => false, action: () => { } },
    { name: "Adactio", detect: () => false, action: () => { } }
];

// Multi-lingual Keywords for Fallback Text Matching
const I18N_KEYWORDS = {
    reject: [
        'reject', 'decline', 'no', 'deny', 'refuse', 'disagree', 'dismiss', 'close',
        'ablehnen', 'verweigern', 'nein', 'nur notwendige', // German
        'refuser', 'non', 'tout refuser', // French
        'rechazar', 'negar', 'no aceptar', // Spanish
        'avvisa', 'neka', 'nej', // Swedish
        'rifiuta', 'non accettare', // Italian
        'rejeitar', 'não', // Portuguese
        'weigeren', 'nee', // Dutch
        'odrzuć', 'nie', // Polish
        'hylkää', 'ei', // Finnish
        'afvis', 'nej', // Danish
        'avslå', 'nei', // Norwegian
        'elutasít', 'nem', // Hungarian
        'odmítnout', 'ne', // Czech
        'refuză', 'nu', // Romanian
        'reduzir', // Catalan
        'redd', // Turkish (Reddet)
        'apokleio', // Greek (transliterated roughly, usually better to use unicode)
        'Απόρριψη', 'Όχι' // Greek
    ],
    accept: [
        'accept', 'agree', 'allow', 'ok', 'yes', 'confirm', 'got it',
        'akzeptieren', 'zustimmen', 'ja', // German
        'accepter', 'oui', // French
        'aceptar', 'si', // Spanish
        'godkänn', 'acceptera', 'ja', // Swedish
        'accetta', 'sì', // Italian
        'aceitar', 'sim', // Portuguese
        'accepteren', 'ja', // Dutch
        'zaakceptuj', 'tak', // Polish
        'hyväksy', 'kyllä', // Finnish
        'accepter', 'ja', // Danish
        'aksepter', 'ja', // Norwegian
        'elfogad', 'igen', // Hungarian
        'přijmout', 'ano', // Czech
        'acceptă', 'da', // Romanian
        'kabul' // Turkish
    ]
};

// Helper to click buttons by class/ID parts OR text content
function clickBtn(root, selectors) {
    // 1. Try Selectors (Class/ID) - Fastest & Most specific
    for (const sel of selectors) {
        const btn = root.querySelector(`.${sel}`) || root.querySelector(`#${sel}`) || root.querySelector(`[class*="${sel}"]`) || root.querySelector(`[id*="${sel}"]`);
        if (btn && isVisible(btn)) {
            btn.click();
            return true;
        }
    }

    // 2. Try Text Matching (Fallback for I18N)
    // If the selectors included 'reject' or 'decline', we try to find ANY reject button in ANY language
    const isRejectSearch = selectors.some(s => ['reject', 'decline', 'deny', 'refuse'].includes(s));
    const keywords = isRejectSearch ? I18N_KEYWORDS.reject : I18N_KEYWORDS.accept;

    const buttons = root.querySelectorAll('button, a, div[role="button"], input[type="button"], [class*="btn"]');
    for (const btn of buttons) {
        if (!isVisible(btn)) continue;

        const text = (btn.textContent || '').toLowerCase().trim();
        if (keywords.some(kw => text.includes(kw))) {
            // Safety: Don't click "Privacy Policy" links even if they contain "Privacy" (though we are checking reject/accept keywords here)
            if (text.length < 50) { // Avoid clicking huge blocks of text
                btn.click();
                return true;
            }
        }
    }

    return false;
}

// Make it available globally
window.CMP_REGISTRY = CMP_REGISTRY;
