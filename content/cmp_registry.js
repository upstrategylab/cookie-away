/**
 * Cookie Away - CMP Registry + shared helpers
 * Loaded before content.js. Everything shared lives on window.CA.
 *
 * Each provider is data, resolved by resolveBanner() in this order:
 *   reject selectors -> reject by label -> go through settings -> accept (if allowed)
 * - name: Display name
 * - banner: selector for the visible banner (or detect(root) for custom logic)
 * - checkGlobal (optional): true if the CMP's script is on the page
 * - reject / accept: button selectors, strongest first
 * - settings: { open, layer, reject, save } selectors for the "Manage options" route
 */

(() => {
    if (window.CA) return; // Guard against double injection

    // --- Keywords -----------------------------------------------------------
    // Matched as whole words/phrases (see matchIndex), so short words like
    // "no", "ok" or "ja" no longer match inside "cookies", "know" or "jahr".

    // Refuse non-essential cookies. Ordered roughly strongest first.
    const REJECT = [
        // English
        'reject all', 'reject', 'decline all', 'decline', 'deny all', 'deny', 'refuse all', 'refuse',
        'only necessary', 'necessary only', 'essential only', 'only essential', 'necessary cookies only',
        'use necessary cookies only', 'continue without accepting', 'i do not agree', 'disagree',
        'refuse non-essential cookies', 'no thanks', 'no, thanks',
        // "Legitimate interest" objections in TCF settings screens
        'object all', 'object to all', 'alle widersprechen', 'widersprechen', "s'opposer à tout", 'oponerse a todo',
        'opporsi a tutto', 'opponiti a tutto', 'invänd mot alla', 'bezwaar maken tegen alles',
        // German
        'alle ablehnen', 'ablehnen', 'verweigern', 'nur notwendige', 'nur essenzielle', 'nur erforderliche',
        // French
        'tout refuser', 'refuser', 'continuer sans accepter', 'je refuse',
        // Spanish
        'rechazar todo', 'rechazar', 'no aceptar', 'solo necesarias',
        // Italian
        'rifiuta tutto', 'rifiuta', 'non accettare', 'continua senza accettare', 'solo necessari',
        // Portuguese
        'rejeitar tudo', 'rejeitar', 'recusar',
        // Dutch
        'alles weigeren', 'weigeren', 'afwijzen', 'alleen noodzakelijke',
        // Swedish
        'avvisa alla', 'avvisa', 'neka alla', 'neka', 'endast nödvändiga', 'bara nödvändiga', 'jag godkänner inte',
        // Danish / Norwegian
        'afvis alle', 'afvis', 'kun nødvendige', 'avslå alle', 'avslå',
        // Finnish
        'hylkää kaikki', 'hylkää', 'vain välttämättömät',
        // Polish / Czech / Slovak
        'odrzuć wszystkie', 'odrzuć', 'odmítnout vše', 'odmítnout', 'odmietnuť',
        // Hungarian / Romanian
        'elutasítom', 'elutasít', 'refuză tot', 'refuză', 'resping',
        // Greek / Turkish
        'απόρριψη όλων', 'απόρριψη', 'tümünü reddet', 'reddet',
        // Japanese / Korean / Chinese
        'すべて拒否', '拒否', '모두 거부', '거부', '全部拒绝', '拒绝', '拒絕'
    ];

    // Agree to cookies. Used only when no reject option exists.
    const ACCEPT = [
        'accept all', 'accept', 'allow all', 'allow', 'agree', 'i agree', 'got it', 'ok', 'okay', 'i understand', 'confirm',
        'alle akzeptieren', 'akzeptieren', 'zustimmen', 'einverstanden',
        'tout accepter', 'accepter', "j'accepte",
        'aceptar todo', 'aceptar', 'acepto',
        'accetta tutto', 'accetta', 'accetto',
        'aceitar tudo', 'aceitar', 'concordo',
        'alles accepteren', 'accepteren', 'akkoord',
        'godkänn alla', 'godkänn', 'jag godkänner', 'acceptera alla', 'acceptera', 'tillåt alla', 'okej',
        'accepter alle', 'godta alle', 'godta', 'aksepter',
        'hyväksy kaikki', 'hyväksy',
        'zaakceptuj', 'akceptuję', 'přijmout vše', 'přijmout', 'súhlasím',
        'elfogadom', 'elfogad', 'accept tot', 'acceptă',
        'αποδοχή', 'kabul et', 'kabul',
        'すべて同意', '同意', '모두 동의', '동의', '全部接受', '接受'
    ];

    // Close / dismiss without a choice. Lowest priority, only for short labels.
    const DISMISS = ['close', 'dismiss', 'schließen', 'fermer', 'cerrar', 'chiudi', 'stäng', 'sluiten', 'luk', 'lukk', 'sulje', 'zamknij', '×', '✕', 'x'];

    // Opens the detailed settings layer ("Manage options").
    const OPEN = [
        'manage options', 'more options', 'manage settings', 'manage preferences', 'manage cookies', 'manage choices',
        'cookie settings', 'privacy settings', 'customize', 'customise', 'settings', 'preferences', 'options', 'manage', 'configure',
        'optionen verwalten', 'weitere optionen', 'einstellungen', 'anpassen',
        'gérer les options', 'gérer mes choix', 'paramétrer', 'personnaliser', 'paramètres', "plus d'options",
        'gestionar opciones', 'más opciones', 'configurar', 'opciones', 'personalizar',
        'gestisci opzioni', 'più opzioni', 'personalizza', 'impostazioni',
        'gerenciar opções', 'configurações', 'opções',
        'opties beheren', 'instellingen', 'aanpassen',
        'fler alternativ', 'inställningar', 'hantera', 'anpassa',
        'indstillinger', 'tilpas', 'innstillinger', 'administrer', 'asetukset', 'muokkaa',
        'więcej opcji', 'zarządzaj', 'ustawienia', 'spravovat', 'nastavení'
    ];

    // Saves the choices in a settings layer. Strongest first.
    const SAVE = [
        'save & exit', 'save and exit', 'save & close', 'save and close', 'confirm choices', 'confirm my choices',
        'confirm selection', 'save my choices', 'save choices', 'save settings', 'save preferences', 'save selection',
        'accept selected', 'accept selection', 'allow selection', 'save', 'confirm',
        'auswahl speichern', 'auswahl bestätigen', 'einstellungen speichern', 'auswahl erlauben', 'speichern', 'bestätigen',
        'enregistrer et quitter', 'confirmer mes choix', 'enregistrer', 'confirmer', 'valider',
        'guardar y salir', 'guardar', 'confirmar', 'salva e esci', 'salva', 'conferma', 'guardar e sair', 'salvar',
        'keuze opslaan', 'opslaan', 'spara och avsluta', 'spara', 'bekräfta', 'gem', 'bekræft', 'lagre', 'bekreft',
        'tallenna', 'vahvista', 'zapisz', 'potvrdit', 'uložit'
    ];

    // Tab that reveals "legitimate interest" toggles in TCF settings screens.
    const LEGIT_INTEREST = [
        'legitimate interest', 'berechtigtes interesse', 'intérêt légitime', 'interés legítimo', 'legittimo interesse',
        'interesse legítimo', 'gerechtvaardigd belang', 'berättigat intresse', 'legitime interesser', 'oikeutettu etu', 'prawnie uzasadniony interes'
    ];

    // Never click these on the first layer: they open settings, policies or other pages.
    const AVOID = [
        'settings', 'preferences', 'customize', 'customise', 'manage', 'options', 'more info', 'learn more', 'read more',
        'policy', 'privacy statement', 'details', 'show purposes', 'vendors', 'partners',
        'einstellungen', 'anpassen', 'mehr erfahren', 'datenschutzerklärung',
        'paramètres', 'personnaliser', 'en savoir plus',
        'configurar', 'configuración', 'más información', 'personalizar',
        'impostazioni', 'personalizza', 'scopri di più',
        'instellingen', 'aanpassen', 'meer informatie',
        'inställningar', 'anpassa', 'läs mer', 'hantera',
        'indstillinger', 'innstillinger', 'asetukset', 'ustawienia', 'nastavení'
    ];

    // "Reject and pay" options (consent-or-pay walls). Never clicked.
    const PAYWALL = [
        'subscribe', 'subscription', 'pay', 'ad-free', 'ad-lite', 'abonnieren', 'abonnement', 'abo', 'werbefrei', 'zahlen',
        "s'abonner", 'abonnez', 'payer', 'sans publicité', 'suscribirse', 'suscríbete', 'suscripción', 'pagar',
        'abbonati', 'abbonamento', 'assinar', 'abonneren', 'betalen', 'prenumerera', 'prenumeration', 'betala',
        'abonner', 'tilaa', 'subskrybuj', 'zapłać', 'předplatit'
    ];

    // Words that make an element look like a consent banner.
    const BANNER = [
        'cookie', 'cookies', 'consent', 'gdpr', 'tracking', 'privacy',
        'kakor', 'samtycke', 'datenschutz', 'einwilligung', 'consentement',
        'consentimiento', 'consenso', 'toestemming', 'samtykke', 'evästeet', 'ciasteczka', 'sütik'
    ];

    // "Accept all"-style labels must never be mistaken for a Save button.
    const ACCEPT_ALL = ACCEPT.filter(p => /\b(all|alle|alla|tout|todo|tutto|tudo|alles|kaikki|vše)\b|すべて|모두|全部/.test(p));

    // --- Helpers ------------------------------------------------------------

    const regexCache = new Map();
    function phraseRegex(phrase) {
        let re = regexCache.get(phrase);
        if (!re) {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // A letter or digit on either side means we're inside a longer word.
            // CJK has no spaces between words, so those phrases match anywhere.
            re = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(phrase)
                ? new RegExp(escaped, 'u')
                : new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'u');
            regexCache.set(phrase, re);
        }
        return re;
    }

    // Index of the first phrase found (lower = stronger), or -1.
    function matchIndex(text, phrases) {
        if (!text) return -1;
        for (let i = 0; i < phrases.length; i++) {
            if (phraseRegex(phrases[i]).test(text)) return i;
        }
        return -1;
    }

    function matchesAny(text, phrases) {
        return matchIndex(text, phrases) !== -1;
    }

    function isVisible(el) {
        if (!el || !el.isConnected) return false;
        if (typeof el.checkVisibility === 'function') {
            if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
        } else {
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function labelOf(el) {
        const raw = el.getAttribute('aria-label') || el.value || el.textContent || el.title || '';
        return raw.replace(/\s+/g, ' ').trim().toLowerCase();
    }

    // Links that navigate away are the main cause of reload loops.
    function wouldNavigate(el) {
        if (el.tagName !== 'A') return false;
        if (el.target === '_blank') return true;
        const href = el.getAttribute('href');
        if (!href || href.startsWith('#') || href.toLowerCase().startsWith('javascript:')) return false;
        try {
            const url = new URL(href, location.href);
            return url.origin + url.pathname !== location.origin + location.pathname;
        } catch (e) {
            return true;
        }
    }

    function safeClick(el) {
        if (!el || !isVisible(el) || wouldNavigate(el)) return false;
        el.click();
        return true;
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitFor(fn, timeout = 4000, step = 200) {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            const result = fn();
            if (result) return result;
            await wait(step);
        }
        return null;
    }

    // Open and closed shadow roots. Extensions can reach closed ones (Transcend uses them);
    // pages like the settings page that load this file without chrome.dom only see open ones.
    function shadowOf(el) {
        if (el.shadowRoot) return el.shadowRoot;
        try {
            return (typeof chrome !== 'undefined' && chrome.dom && chrome.dom.openOrClosedShadowRoot)
                ? chrome.dom.openOrClosedShadowRoot(el) || null
                : null;
        } catch (e) {
            return null;
        }
    }

    // Document plus every shadow root.
    function collectRoots(root = document) {
        const roots = [root];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let node = walker.nextNode();
        while (node) {
            const shadow = shadowOf(node);
            if (shadow) roots.push(...collectRoots(shadow));
            node = walker.nextNode();
        }
        return roots;
    }

    // First visible element for any of the selectors, searching all roots.
    function query(selectors, roots = collectRoots()) {
        for (const sel of selectors || []) {
            for (const root of roots) {
                let el = null;
                try {
                    el = root.querySelector(sel);
                } catch (e) {
                    break; // Invalid selector
                }
                if (isVisible(el)) return el;
            }
        }
        return null;
    }

    const BUTTON_SELECTOR = 'button, input[type="button"], input[type="submit"], a, [role="button"], [role="tab"], [class*="btn" i], [class*="button" i]';

    // Visible, short-labelled clickable elements inside root.
    function findButtons(root) {
        const buttons = [];
        for (const el of root.querySelectorAll(BUTTON_SELECTOR)) {
            if (!isVisible(el)) continue;
            const label = labelOf(el);
            if (!label || label.length > 60) continue;
            buttons.push({ element: el, label });
        }
        // When a wrapper and its child carry the same label, keep the child
        return buttons.filter(b => !buttons.some(o => o !== b && b.element.contains(o.element) && o.label === b.label));
    }

    // Strongest button whose label is in `phrases`, skipping links away and `exclude` labels.
    function findByLabel(buttons, phrases, exclude = []) {
        let best = null;
        for (const b of buttons) {
            if (wouldNavigate(b.element) || matchesAny(b.label, exclude)) continue;
            const i = matchIndex(b.label, phrases);
            if (i !== -1 && (!best || i < best.i)) best = { ...b, i };
        }
        return best;
    }

    // Pick reject > accept > dismiss. Returns { button, kind } or null.
    function pickButton(buttons, { allowAccept = true } = {}) {
        let best = null;
        for (const b of buttons) {
            if (matchesAny(b.label, AVOID) || matchesAny(b.label, PAYWALL) || wouldNavigate(b.element)) continue;
            const r = matchIndex(b.label, REJECT);
            const a = allowAccept ? matchIndex(b.label, ACCEPT) : -1;
            const d = allowAccept ? matchIndex(b.label, DISMISS) : -1;
            let rank = null;
            if (r !== -1) rank = r / 1000;
            else if (a !== -1) rank = 1 + a / 1000;
            else if (d !== -1 && b.label.length <= 12) rank = 2 + d / 1000;
            if (rank !== null && (!best || rank < best.rank)) {
                best = { button: b, rank, kind: rank < 1 ? 'reject' : rank < 2 ? 'accept' : 'dismiss' };
            }
        }
        return best;
    }

    // --- Settings layer ("Manage options" -> untick everything -> Save) -----

    // Switched-on, changeable toggles. Hidden inputs behind custom switches count too.
    function findToggles(scope) {
        const toggles = [];
        for (const el of scope.querySelectorAll('input[type="checkbox"], [role="switch"], [role="checkbox"]')) {
            const on = el.tagName === 'INPUT' ? el.checked : el.getAttribute('aria-checked') === 'true';
            const locked = el.disabled || el.getAttribute('aria-disabled') === 'true';
            if (on && !locked) toggles.push(el);
        }
        return toggles;
    }

    function findSave(scope, hints = {}) {
        const bySelector = query(hints.save, [scope.getRootNode ? scope.getRootNode() : document]);
        if (bySelector) return bySelector;
        const match = findByLabel(findButtons(scope), SAVE, [...ACCEPT_ALL, ...REJECT]);
        return match ? match.element : null;
    }

    function hasLayerControls(el) {
        return findToggles(el).length > 0 && !!findSave(el);
    }

    const LAYER_SELECTOR = [
        '[role="dialog"]', '[aria-modal="true"]', 'dialog[open]', '[id*="consent" i]', '[class*="consent" i]',
        '[id*="cookie" i]', '[class*="cookie" i]', '[id*="privacy" i]', '[class*="privacy" i]', '[class*="cmp" i]'
    ].join(',');

    // The settings layer that appeared after clicking "Manage options".
    function findLayer(banner, hints = {}) {
        const roots = collectRoots();
        if (hints.layer) {
            const el = query([hints.layer], roots);
            if (el && (hasLayerControls(el) || findButtons(el).some(b => matchesAny(b.label, REJECT)))) return el;
        }
        const found = [];
        if (isVisible(banner) && hasLayerControls(banner)) found.push(banner);
        for (const root of roots) {
            for (const el of root.querySelectorAll(LAYER_SELECTOR)) {
                if (el === banner || el.tagName === 'BODY' || el.tagName === 'HTML' || !isVisible(el)) continue;
                if (hasLayerControls(el)) found.push(el);
            }
        }
        // Outermost wins so the whole dialog (tabs, footer, Save) is in scope
        return found.find(el => !found.some(o => o !== el && o.contains(el))) || null;
    }

    // Returns { kind: 'reject' | 'settings', toggles, layer } or null if this route didn't work.
    async function rejectViaSettings(banner, hints = {}) {
        let layer = hasLayerControls(banner) ? banner : null;

        if (!layer) {
            const open = hints.openElement || query(hints.open) ||
                (findByLabel(findButtons(banner), OPEN, [...REJECT, ...ACCEPT]) || {}).element;
            if (!open || !safeClick(open)) return null;
            // The settings open somewhere this frame can't see (e.g. a new iframe); that frame takes over
            if (hints.handoff) return { kind: 'handoff' };
            layer = await waitFor(() => findLayer(banner, hints));
            if (!layer) return null;
        }

        // 1. "Reject all" / "Object all" inside the layer
        const rejectButtons = query(hints.reject) ? [query(hints.reject)] :
            findButtons(layer).filter(b => matchesAny(b.label, REJECT) && !matchesAny(b.label, PAYWALL) && !wouldNavigate(b.element)).map(b => b.element);
        for (const btn of rejectButtons.slice(0, 4)) {
            safeClick(btn);
            await wait(300);
            if (!isVisible(layer)) return { kind: 'reject', toggles: 0, layer };
        }

        // 2. Legitimate interest tab, then its "Object all"
        const liTab = findByLabel(findButtons(layer), LEGIT_INTEREST);
        if (liTab && liTab.label.length <= 40 && safeClick(liTab.element)) {
            await wait(400);
            for (const b of findButtons(layer).filter(b => matchesAny(b.label, REJECT)).slice(0, 2)) {
                safeClick(b.element);
                await wait(200);
            }
        }

        // 3. Switch off everything that's still on (capped: vendor lists can be huge)
        let toggles = 0;
        for (const toggle of findToggles(layer).slice(0, 400)) {
            toggle.click();
            toggles++;
        }
        if (toggles) await wait(250);

        // 4. Save
        const save = findSave(layer, hints);
        if (!save || !safeClick(save)) return rejectButtons.length ? { kind: 'reject', toggles, layer } : null;
        return { kind: 'settings', toggles, layer };
    }

    // --- Providers ----------------------------------------------------------
    // Selectors are full CSS selectors, strongest first.

    const CMP_REGISTRY = [
        {
            name: 'OneTrust',
            checkGlobal: () => !!(window.OneTrust || window.OnetrustActiveGroups),
            banner: '#onetrust-banner-sdk, #onetrust-pc-sdk',
            reject: ['#onetrust-reject-all-handler', '.ot-pc-refuse-all-handler'],
            settings: { open: ['#onetrust-pc-btn-handler'], layer: '#onetrust-pc-sdk', reject: ['.ot-pc-refuse-all-handler'], save: ['.save-preference-btn-handler'] },
            accept: ['#onetrust-accept-btn-handler']
        },
        {
            name: 'Cookiebot',
            checkGlobal: () => !!window.Cookiebot,
            banner: '#CybotCookiebotDialog',
            reject: ['#CybotCookiebotDialogBodyButtonDecline'],
            settings: {
                open: ['#CybotCookiebotDialogBodyLevelButtonCustomize', '#CybotCookiebotDialogNavDetails'],
                layer: '#CybotCookiebotDialog',
                save: ['#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection', '#CybotCookiebotDialogBodyButtonAcceptSelected']
            },
            accept: ['#CybotCookiebotDialogBodyButtonAccept', '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll']
        },
        {
            name: 'Google Funding Choices',
            // Common on ad-funded news sites: "Manage options" -> consent + legitimate interest toggles -> "Confirm choices"
            banner: '.fc-consent-root .fc-dialog-container, .fc-consent-root .fc-dialog',
            reject: ['.fc-cta-do-not-consent', '.fc-data-preferences-dialog .fc-cta-do-not-consent'],
            settings: { open: ['.fc-cta-manage-options'], layer: '.fc-consent-root', save: ['.fc-confirm-choices'] },
            accept: ['.fc-cta-consent']
        },
        {
            name: 'InMobi Choice',
            // Formerly Quantcast Choice. First layer is often only "More options" + "Agree".
            banner: '.qc-cmp2-container, #qc-cmp2-container',
            reject: ['.qc-cmp2-summary-buttons button[mode="secondary"][aria-label*="disagree" i]'],
            settings: { layer: '.qc-cmp2-container' },
            accept: ['.qc-cmp2-summary-buttons button[mode="primary"]']
        },
        {
            name: 'Didomi',
            banner: '#didomi-notice, #didomi-popup, .didomi-popup-container',
            reject: ['#didomi-notice-disagree-button', '.didomi-continue-without-agreeing'],
            settings: { open: ['#didomi-notice-learn-more-button'], layer: '#didomi-popup, .didomi-consent-popup' },
            accept: ['#didomi-notice-agree-button']
        },
        {
            name: 'Sourcepoint',
            // Message and privacy manager each live in their own iframe; this script runs in both (all_frames).
            // The top page only reports the CMP.
            checkGlobal: () => !!(window._sp_ || document.querySelector('[id^="sp_message_container"]')),
            detect: () => sourcepointFrame(),
            reject: ['.sp_choice_type_REJECT_ALL', '.sp_choice_type_13'],
            settings: { open: ['.sp_choice_type_12'], handoff: true },
            accept: ['.sp_choice_type_11']
        },
        {
            name: 'Transcend',
            // Lives in a closed shadow root
            checkGlobal: () => !!document.getElementById('transcend-consent-manager'),
            detect: () => {
                const host = document.getElementById('transcend-consent-manager');
                const root = host && shadowOf(host);
                if (!root) return null;
                return [...root.querySelectorAll('[role="dialog"], [aria-modal="true"], div')]
                    .find(el => el.querySelector('button') && /cookie|consent|privacy/i.test(el.textContent || '') && isVisible(el)) || null;
            }
        },
        {
            name: 'Usercentrics',
            checkGlobal: () => !!window.UC_UI,
            banner: '[data-testid="uc-default-banner"], #uc-center-container, #usercentrics-cmp-ui, #usercentrics-root',
            reject: ['[data-testid="uc-deny-all-button"]', '#uc-btn-deny', '[data-action-type="deny"]'],
            settings: { open: ['[data-testid="uc-more-button"]'], save: ['[data-testid="uc-save-button"]'] },
            accept: ['[data-testid="uc-accept-all-button"]']
        },
        {
            name: 'CookieYes',
            banner: '.cky-consent-container',
            reject: ['.cky-btn-reject'],
            settings: { open: ['.cky-btn-customize'], layer: '.cky-preference-center', save: ['.cky-btn-preferences'] },
            accept: ['.cky-btn-accept']
        },
        {
            name: 'Complianz',
            banner: '.cmplz-cookiebanner',
            reject: ['.cmplz-deny'],
            settings: { open: ['.cmplz-view-preferences'], save: ['.cmplz-save-preferences'] },
            accept: ['.cmplz-accept']
        },
        { name: 'Osano', banner: '.osano-cm-window', reject: ['.osano-cm-denyAll', '.osano-cm-deny'], accept: ['.osano-cm-accept'] },
        { name: 'TrustArc', banner: '#truste-consent-track', reject: ['#truste-consent-required'], accept: ['#truste-consent-button'] },
        { name: 'CookieFirst', banner: '#cookiefirst-root', reject: ['[data-cookiefirst-action="reject"]'], accept: ['[data-cookiefirst-action="accept"]'] },
        { name: 'Termly', banner: '#termly-code-snippet-support', reject: ['[data-tid="banner-decline"]'], accept: ['[data-tid="banner-accept"]'] },
        { name: 'Iubenda', banner: '#iubenda-cs-banner', reject: ['.iubenda-cs-reject-btn'], accept: ['.iubenda-cs-accept-btn'] },
        { name: 'Civic Cookie Control', banner: '#ccc', reject: ['#ccc-reject-settings', '#ccc-notify-reject'], accept: ['#ccc-notify-accept'] },
        { name: 'CookieHub', banner: '.ch2-container', reject: ['.ch2-deny-all-btn'], accept: ['.ch2-allow-all-btn'] },
        { name: 'Consent Manager', banner: '#cmpbox', reject: ['.cmpboxbtnno'], accept: ['.cmpboxbtnyes'] },
        { name: 'Axeptio', banner: '#axeptio_overlay', reject: ['#axeptio_btn_dismiss'], accept: ['#axeptio_btn_acceptAll'] },
        { name: 'Piwik PRO', banner: '#ppms_cm_popup_overlay', reject: ['#ppms_cm_reject-all'], accept: ['#ppms_cm_agree-to-all'] },
        { name: 'Cookie Information', banner: '#coiBannerContainer, #coiOverlay', reject: ['.coi-banner__decline', '#declineButton'], accept: ['.coi-banner__accept'] },
        { name: 'Borlabs Cookie', banner: '#BorlabsCookieBox', reject: ['[data-cookie-refuse]', '.borlabs-cookie-refuse'], accept: ['[data-cookie-accept]'] },
        { name: 'Real Cookie Banner', banner: '.rcb-cookie-banner', reject: ['.rcb-btn-deny'] },
        { name: 'GDPR Cookie Consent', banner: '.cli-modal-dialog, #cookie-law-info-bar', reject: ['#wt-cli-reject-btn', '.wt-cli-reject-btn'], accept: ['#cookie_action_close_header'] },
        { name: 'CookieScript', banner: '#cookiescript_injected', reject: ['#cookiescript_reject'], accept: ['#cookiescript_accept'] },
        { name: 'Ketch', banner: '#lanyard_root', reject: ['[aria-label="Reject All" i]', '#ketch-banner-button-secondary'], accept: ['#ketch-banner-button-primary'] },
        { name: 'Silktide', banner: '#silktide-wrapper', reject: ['.silktide-reject-all', '#silktide-banner .reject-all'], accept: ['.silktide-accept-all'] }
    ];

    function visible(root, selector) {
        const el = root.querySelector(selector);
        return isVisible(el) ? el : null;
    }

    function sourcepointFrame() {
        if (window === window.top) return null;
        const marker = document.querySelector('[class*="sp_choice_type"], .pm-tab');
        if (!marker) return null;
        // The frame's <body> is often 0px tall (absolutely positioned content), so use the root
        const el = marker.closest('.message-container, .message, #notice') || document.documentElement;
        return isVisible(el) ? el : null;
    }

    function detectProvider(provider, root) {
        return provider.detect ? provider.detect(root) : visible(root, provider.banner);
    }

    // Shared by known providers and heuristic banners.
    // Returns { kind, toggles?, layer? } on a click, or null if nothing suitable was found.
    async function resolveBanner(banner, provider = {}, { deep = true, allowAccept = true } = {}) {
        const rejectSel = query(provider.reject);
        if (rejectSel && !matchesAny(labelOf(rejectSel), PAYWALL) && safeClick(rejectSel)) return { kind: 'reject' };

        // Consent-or-pay: the only way to reject is a subscription. Never go there.
        const payWall = findButtons(banner).some(b => matchesAny(b.label, REJECT) && matchesAny(b.label, PAYWALL));

        const reject = pickButton(findButtons(banner), { allowAccept: false });
        if (reject && safeClick(reject.button.element)) return { kind: 'reject' };

        if (deep) {
            const viaSettings = await rejectViaSettings(banner, provider.settings || {});
            if (viaSettings) return viaSettings;
        }

        if (!allowAccept) return payWall ? { kind: 'none', payWall } : null;
        const acceptSel = query(provider.accept);
        if (acceptSel && safeClick(acceptSel)) return { kind: 'accept', payWall };
        if (!isVisible(banner)) return null;
        const accept = pickButton(findButtons(banner), { allowAccept: true });
        if (accept && safeClick(accept.button.element)) return { kind: accept.kind, payWall };
        return payWall ? { kind: 'none', payWall } : null;
    }

    window.CA = {
        REJECT, ACCEPT, DISMISS, AVOID, BANNER, OPEN, SAVE, PAYWALL,
        matchIndex, matchesAny, isVisible, labelOf, wouldNavigate, safeClick, findButtons, findByLabel, pickButton,
        collectRoots, detectProvider, rejectViaSettings, resolveBanner
    };
    window.CMP_REGISTRY = CMP_REGISTRY;
})();
