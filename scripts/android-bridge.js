/**
 * android-bridge.js  –  HostelHome Android-native wrappers
 * ─────────────────────────────────────────────────────────
 * Priority order for every API:
 *   1. window.Android  (3pdroid JavascriptInterface, injected by the WebView host)
 *   2. Browser-native fallback  (works in any plain browser / dev environment)
 *
 * Usage:
 *   HD.alert('message')
 *   HD.confirm('question')                     → Promise<boolean>
 *   HD.prompt('question', 'default value')     → Promise<string|null>
 *   HD.pickFile({ accept, multiple, label })   → Promise<FileList|null>
 *   HD.printReceipt(html, title?)              → Promise<void>
 *   HD.shareText(text, title?)                 → Promise<void>
 *   HD.authenticateWarden(reason?)             → Promise<boolean>
 *   HD.secureStorage.getItem(key)              → Promise<string|null>
 *   HD.secureStorage.setItem(key, value)       → Promise<void>
 *   HD.secureStorage.removeItem(key)           → Promise<void>
 *
 * The 3pdroid JavascriptInterface is expected to expose:
 *   Android.showAlert(title, message)
 *   Android.showConfirm(requestId, title, message)   → result via HD._resolveConfirm(id, bool)
 *   Android.showPrompt(requestId, title, message, defaultValue) → result via HD._resolvePrompt(id, str|null)
 *   Android.openFilePicker(requestId, mimeTypes, allowMultiple)  → result via HD._resolveFilePicker(id, uriListJson)
 *   Android.printReceipt(title, htmlContent)
 *   Android.shareText(title, text)
 *   Android.authenticateWarden(requestId, reason)    → result via HD._resolveBiometric(id, bool)
 *   Android.exitApp()
 *   Android.secureStorageSet(key, value)             — synchronous write to EncryptedSharedPreferences
 *   Android.secureStorageGet(key)                    → String|null — synchronous read
 *   Android.secureStorageRemove(key)                 — synchronous delete
 *
 * If the interface is absent the browser built-ins / localStorage are used transparently.
 */

(function (global) {
    'use strict';

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** True when the 3pdroid JavascriptInterface is present */
    const hasAndroid = () => !!(global.Android);

    /** Monotonically-increasing request ID for async callbacks */
    let _nextId = 1;
    const _pendingConfirm   = {};  // id → { resolve }
    const _pendingPrompt    = {};  // id → { resolve }
    const _pendingFilePick  = {};  // id → { resolve }
    const _pendingBiometric = {};  // id → { resolve }

    // ─── Secure Storage ───────────────────────────────────────────────────────
    //
    // On Android, wraps Android.secureStorageGet/Set/Remove which map to
    // EncryptedSharedPreferences. Falls back to plain localStorage in browser.
    //
    // The public HD.secureStorage object exposes an async API.
    // Additionally, installSecureStorageShim() monkey-patches localStorage so
    // that Supabase session tokens are AUTOMATICALLY stored in EncryptedSharedPrefs
    // with zero changes required in any page's createClient() call.

    /** Keys whose values must be stored securely (regex patterns) */
    const SECURE_KEY_PATTERNS = [
        /^sb-.+-auth-token$/,      // Supabase JWT  e.g. sb-wwpewgll...-auth-token
        /^supabase\.auth\./,       // Alternative Supabase key prefix
        /^hd-session/,             // Any future HostelHome session key
    ];

    function isSecureKey(key) {
        return typeof key === 'string' &&
               SECURE_KEY_PATTERNS.some(p => p.test(key));
    }

    /**
     * Async secure storage API — use this from new code.
     * Falls back to localStorage when the Android bridge is absent.
     */
    const hdSecureStorage = {
        /** @returns {Promise<string|null>} */
        getItem(key) {
            if (hasAndroid()) {
                try {
                    // Android.secureStorageGet is synchronous (returns a String)
                    const val = global.Android.secureStorageGet(String(key));
                    return Promise.resolve(val !== undefined ? val : null);
                } catch (e) {
                    console.warn('[android-bridge] secureStorageGet failed', e);
                }
            }
            return Promise.resolve(localStorage.getItem(key));
        },

        /** @returns {Promise<void>} */
        setItem(key, value) {
            if (hasAndroid()) {
                try {
                    global.Android.secureStorageSet(String(key), String(value ?? ''));
                    return Promise.resolve();
                } catch (e) {
                    console.warn('[android-bridge] secureStorageSet failed', e);
                }
            }
            try { localStorage.setItem(key, value); } catch (_) {}
            return Promise.resolve();
        },

        /** @returns {Promise<void>} */
        removeItem(key) {
            if (hasAndroid()) {
                try {
                    global.Android.secureStorageRemove(String(key));
                    return Promise.resolve();
                } catch (e) {
                    console.warn('[android-bridge] secureStorageRemove failed', e);
                }
            }
            try { localStorage.removeItem(key); } catch (_) {}
            return Promise.resolve();
        },
    };

    /**
     * Transparent shim: intercepts window.localStorage for keys that match
     * SECURE_KEY_PATTERNS and routes them through EncryptedSharedPreferences.
     * All other keys continue to use normal localStorage — no page changes needed.
     *
     * Called once, at the bottom of this IIFE, when running on Android.
     */
    function installSecureStorageShim() {
        if (!hasAndroid()) return; // noop in browser

        const _origSet    = localStorage.setItem.bind(localStorage);
        const _origGet    = localStorage.getItem.bind(localStorage);
        const _origRemove = localStorage.removeItem.bind(localStorage);

        Object.defineProperty(global, 'localStorage', {
            configurable: true,
            get() {
                return {
                    // ── Overridden for secure keys ────────────────────────────
                    setItem(key, value) {
                        if (isSecureKey(key)) {
                            try {
                                global.Android.secureStorageSet(String(key),
                                                                String(value ?? ''));
                                return;
                            } catch (e) { /* fall through to localStorage */ }
                        }
                        _origSet(key, value);
                    },
                    getItem(key) {
                        if (isSecureKey(key)) {
                            try {
                                // synchronous bridge call — returns String|null directly
                                return global.Android.secureStorageGet(String(key));
                            } catch (e) { /* fall through */ }
                        }
                        return _origGet(key);
                    },
                    removeItem(key) {
                        if (isSecureKey(key)) {
                            try {
                                global.Android.secureStorageRemove(String(key));
                                return;
                            } catch (e) { /* fall through */ }
                        }
                        _origRemove(key);
                    },
                    // ── Pass-throughs for everything else ─────────────────────
                    clear()                { localStorage.clear(); },
                    key(n)                 { return localStorage.key(n); },
                    get length()           { return localStorage.length; },
                };
            },
        });

        console.info('[android-bridge] localStorage shim active — ' +
                     'Supabase tokens routed to EncryptedSharedPreferences.');
    }
    // ─── Alert ────────────────────────────────────────────────────────────────

    /**
     * HD.alert(message, title?)
     * Shows a native dialog on Android; falls back to window.alert in browser.
     * Returns a resolved Promise so callers can optionally await it.
     */
    function hdAlert(message, title) {
        message = String(message ?? '');
        title   = title || 'HostelHome';

        if (hasAndroid()) {
            try {
                global.Android.showAlert(title, message);
                return Promise.resolve();
            } catch (e) {
                console.warn('[android-bridge] Android.showAlert failed, falling back', e);
            }
        }

        // Browser fallback
        global.alert(message);
        return Promise.resolve();
    }

    // ─── Confirm ──────────────────────────────────────────────────────────────

    /**
     * HD.confirm(message, title?)  →  Promise<boolean>
     * On Android the result arrives asynchronously via HD._resolveConfirm.
     * In the browser window.confirm is called synchronously and wrapped in a Promise.
     */
    function hdConfirm(message, title) {
        message = String(message ?? '');
        title   = title || 'HostelHome';

        if (hasAndroid()) {
            try {
                const id = _nextId++;
                const promise = new Promise(resolve => {
                    _pendingConfirm[id] = { resolve };
                });
                global.Android.showConfirm(id, title, message);
                return promise;
            } catch (e) {
                console.warn('[android-bridge] Android.showConfirm failed, falling back', e);
            }
        }

        // Browser fallback
        return Promise.resolve(global.confirm(message));
    }

    /**
     * Called BY the Android host once the user taps OK / Cancel.
     * @param {number} id   – the requestId passed to Android.showConfirm
     * @param {boolean} ok  – true = OK, false = Cancel
     */
    function resolveConfirm(id, ok) {
        const pending = _pendingConfirm[id];
        if (pending) {
            delete _pendingConfirm[id];
            pending.resolve(Boolean(ok));
        }
    }

    // ─── Prompt ───────────────────────────────────────────────────────────────

    /**
     * HD.prompt(message, defaultValue?, title?)  →  Promise<string|null>
     * null means the user cancelled.
     */
    function hdPrompt(message, defaultValue, title) {
        message      = String(message ?? '');
        defaultValue = defaultValue != null ? String(defaultValue) : '';
        title        = title || 'HostelHome';

        if (hasAndroid()) {
            try {
                const id = _nextId++;
                const promise = new Promise(resolve => {
                    _pendingPrompt[id] = { resolve };
                });
                global.Android.showPrompt(id, title, message, defaultValue);
                return promise;
            } catch (e) {
                console.warn('[android-bridge] Android.showPrompt failed, falling back', e);
            }
        }

        // Browser fallback
        return Promise.resolve(global.prompt(message, defaultValue));
    }

    /**
     * Called BY the Android host with the user's text (or null on cancel).
     * @param {number}      id    – the requestId passed to Android.showPrompt
     * @param {string|null} value – null = cancelled
     */
    function resolvePrompt(id, value) {
        const pending = _pendingPrompt[id];
        if (pending) {
            delete _pendingPrompt[id];
            pending.resolve(value === undefined ? null : value);
        }
    }

    // ─── File Picker ──────────────────────────────────────────────────────────

    /**
     * HD.pickFile({ accept, multiple, label })  →  Promise<FileList|null>
     *
     * Options:
     *   accept   {string}   – MIME type filter, e.g. "image/*" or ".xlsx,.xls,.csv"
     *                         Converted to MIME types for the Android Intent automatically.
     *   multiple {boolean}  – Allow multi-select (default false)
     *   label    {string}   – Picker dialog title shown on Android (default 'Choose file')
     *
     * On Android: triggers Android.openFilePicker; Android posts URIs back via
     *   HD._resolveFilePicker(id, jsonArrayOfUris) and the wrapper synthesises a
     *   FileList-like object with Blob/File entries fetched from the URIs.
     *
     * In browser: programmatically creates a hidden <input type="file"> and waits
     *   for the 'change' event, then returns the native FileList.
     *
     * Returns null if the user cancels.
     */
    function hdPickFile(opts) {
        opts = opts || {};
        const accept   = opts.accept   || '*/*';
        const multiple = !!opts.multiple;
        const label    = opts.label    || 'Choose file';

        if (hasAndroid()) {
            try {
                const id       = _nextId++;
                const mimeList = _acceptToMimes(accept);
                const promise  = new Promise(resolve => {
                    _pendingFilePick[id] = { resolve };
                });
                global.Android.openFilePicker(id, JSON.stringify(mimeList), multiple);
                return promise;
            } catch (e) {
                console.warn('[android-bridge] Android.openFilePicker failed, falling back', e);
            }
        }

        // Browser fallback: hidden <input type="file">
        return new Promise(resolve => {
            const input = document.createElement('input');
            input.type     = 'file';
            input.accept   = accept;
            input.multiple = multiple;
            input.style.display = 'none';

            // Some browsers need the element in the DOM
            document.body.appendChild(input);

            input.addEventListener('change', () => {
                document.body.removeChild(input);
                resolve(input.files && input.files.length > 0 ? input.files : null);
            });

            // User dismissed the dialog without selecting
            window.addEventListener('focus', function onFocus() {
                window.removeEventListener('focus', onFocus);
                setTimeout(() => {
                    if (!input.files || input.files.length === 0) {
                        if (document.body.contains(input)) document.body.removeChild(input);
                        resolve(null);
                    }
                }, 500);
            }, { once: true });

            input.click();
        });
    }

    /**
     * Called BY the Android host after the user picks file(s).
     * @param {number} id         – the requestId passed to Android.openFilePicker
     * @param {string} uriListJson – JSON array of content:// URI strings, or null/empty on cancel
     */
    async function resolveFilePicker(id, uriListJson) {
        const pending = _pendingFilePick[id];
        if (!pending) return;
        delete _pendingFilePick[id];

        if (!uriListJson) {
            return pending.resolve(null);
        }

        let uris;
        try { uris = JSON.parse(uriListJson); } catch (_) { return pending.resolve(null); }
        if (!Array.isArray(uris) || uris.length === 0) return pending.resolve(null);

        // Fetch each URI (Android should grant temporary read permission) and
        // build a FileList-compatible array. The Android side must expose the
        // URIs via a local file server or return base64 data URIs.
        try {
            const files = await Promise.all(uris.map(async (uri) => {
                const resp = await fetch(uri);
                const blob = await resp.blob();
                const name = uri.split('/').pop() || 'file';
                return new File([blob], name, { type: blob.type });
            }));

            // Produce a FileList-like object (read-only array with .item())
            const fileListLike = Object.assign(files, {
                item: (i) => files[i] ?? null
            });
            pending.resolve(fileListLike);
        } catch (e) {
            console.error('[android-bridge] Failed to fetch Android URIs', e);
            pending.resolve(null);
        }
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /**
     * Converts an HTML accept string to an array of MIME types suitable for
     * an Android Intent (e.g. "image/*,.pdf" → ["image/*","application/pdf"]).
     */
    function _acceptToMimes(accept) {
        const extMap = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.png': 'image/png',  '.gif': 'image/gif',
            '.webp': 'image/webp','.bmp': 'image/bmp',
            '.pdf': 'application/pdf',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.csv': 'text/csv',
            '.txt': 'text/plain',
            '.zip': 'application/zip',
        };

        return accept.split(',')
            .map(s => s.trim())
            .map(s => s.startsWith('.') ? (extMap[s.toLowerCase()] || '*/*') : s)
            .filter(Boolean);
    }

    // ─── Native Printing ──────────────────────────────────────────────────────

    /**
     * HD.printReceipt(html, title?)  →  Promise<void>
     *
     * On Android: calls Android.printReceipt(title, html) which opens the system
     *   print dialog (or a connected thermal printer) via the 3pdroid PrintManager
     *   bridge. The host is expected to expose:
     *     Android.printReceipt(title: String, htmlContent: String): void
     *
     * In browser: falls back to window.print() after writing the HTML into a
     *   hidden iframe so only the receipt content is printed, not the whole page.
     *
     * @param {string} html   – The HTML string of the receipt to print.
     * @param {string} [title]  – Optional document title shown in the print dialog.
     */
    function hdPrintReceipt(html, title) {
        html  = String(html  ?? '');
        title = title || 'HostelHome Receipt';

        if (hasAndroid()) {
            try {
                global.Android.printReceipt(title, html);
                return Promise.resolve();
            } catch (e) {
                console.warn('[android-bridge] Android.printReceipt failed, falling back', e);
            }
        }

        // Browser fallback: hidden iframe print
        return new Promise(resolve => {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(`<!DOCTYPE html><html><head><title>${title}</title>
                <style>body{font-family:monospace;padding:24px;max-width:400px;margin:auto}
                @media print{body{padding:0}}</style>
                </head><body>${html}</body></html>`);
            doc.close();

            iframe.onload = () => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    resolve();
                }, 500);
            };
        });
    }

    // ─── Native Share ─────────────────────────────────────────────────────────

    /**
     * HD.shareText(text, title?)  →  Promise<void>
     *
     * On Android: calls Android.shareText(title, text) which triggers the native
     *   Android share sheet (Intent.ACTION_SEND). The host is expected to expose:
     *     Android.shareText(title: String, text: String): void
     *
     * In browser: uses the Web Share API (navigator.share) if available, otherwise
     *   copies the text to the clipboard and shows a toast.
     *
     * @param {string} text    – Plain text to share (e.g. a receipt summary).
     * @param {string} [title] – Subject/title for the share sheet.
     */
    function hdShareText(text, title) {
        text  = String(text  ?? '');
        title = title || 'HostelHome';

        if (hasAndroid()) {
            try {
                global.Android.shareText(title, text);
                return Promise.resolve();
            } catch (e) {
                console.warn('[android-bridge] Android.shareText failed, falling back', e);
            }
        }

        // Browser fallback: Web Share API → clipboard copy
        if (navigator.share) {
            return navigator.share({ title, text }).catch(err => {
                if (err.name !== 'AbortError') console.warn('[android-bridge] navigator.share failed', err);
            });
        }

        // Last resort: clipboard
        return navigator.clipboard.writeText(text).then(() => {
            if (global.showToast) global.showToast('Receipt details copied to clipboard.', 'info');
        }).catch(() => {
            if (global.showToast) global.showToast('Share is not supported in this browser.', 'warning');
        });
    }

    // ─── Biometric Authentication ─────────────────────────────────────────────

    /**
     * HD.authenticateWarden(reason?)  →  Promise<boolean>
     *
     * On Android: calls Android.authenticateWarden(requestId, reason) which
     *   invokes the BiometricPrompt API. The host posts the result back via
     *   HD._resolveBiometric(id, success).
     *   The host is expected to expose:
     *     Android.authenticateWarden(requestId: Int, reason: String): void
     *
     * In browser: Feature not available — shows a toast and resolves false so
     *   callers can decide whether to proceed or gate the action.
     *
     * @param {string} [reason]  – Prompt subtitle shown to the user (e.g. "Approve payment").
     * @returns {Promise<boolean>}  true = authenticated, false = failed / cancelled / unavailable.
     */
    function hdAuthenticateWarden(reason) {
        reason = reason || 'Authenticate to continue';

        if (hasAndroid()) {
            try {
                const id = _nextId++;
                const promise = new Promise(resolve => {
                    _pendingBiometric[id] = { resolve };
                });
                global.Android.authenticateWarden(id, reason);
                return promise;
            } catch (e) {
                console.warn('[android-bridge] Android.authenticateWarden failed, falling back', e);
            }
        }

        // Browser fallback: feature unavailable
        if (global.showToast) {
            global.showToast('Biometric authentication is only available in the Android app.', 'warning');
        }
        return Promise.resolve(false);
    }

    /**
     * Called BY the Android host after biometric prompt resolves.
     * @param {number}  id      – the requestId passed to Android.authenticateWarden
     * @param {boolean} success – true = authenticated successfully
     */
    function resolveBiometric(id, success) {
        const pending = _pendingBiometric[id];
        if (pending) {
            delete _pendingBiometric[id];
            pending.resolve(Boolean(success));
        }
    }

    // ─── FCM Token Receiver ───────────────────────────────────────────────────

    /**
     * Called BY the Android host to hand over the Firebase Cloud Messaging token.
     * Updates the authenticated user's profile in Supabase silently in the background.
     *
     * @param {string} token - The FCM registration token from the Android device.
     */
    global.receiveFcmToken = async function(token) {
        try {
            if (!token || !global.supabase) return;

            const { data: { user }, error: authError } = await global.supabase.auth.getUser();
            if (authError || !user) {
                console.warn('[android-bridge] FCM token received but no user logged in.');
                return;
            }

            // Determine user role to update the correct table
            let currentLoginRole = global.currentLoginRole || 'unknown';
            if (currentLoginRole === 'unknown') {
                if (global.location.pathname.includes('hstldash')) {
                    currentLoginRole = 'hostellite';
                } else {
                    currentLoginRole = 'warden';
                }
            }

            const table = currentLoginRole === 'warden' ? 'wardens' : 'hostellites';

            // Silently update the fcm_token column
            const { error: updateError } = await global.supabase
                .from(table)
                .update({ fcm_token: token })
                .eq('uid', user.id);

            if (updateError) {
                console.error('[android-bridge] Failed to update FCM token in Supabase:', updateError);
            } else {
                console.info('[android-bridge] FCM token successfully registered for push notifications.');
            }
        } catch (e) {
            console.error('[android-bridge] Error handling FCM token:', e);
        }
    };

    // ─── Public namespace ─────────────────────────────────────────────────────

    global.HD = global.HD || {};

    Object.assign(global.HD, {
        /** Show an informational dialog / alert */
        alert: hdAlert,

        /** Ask yes/no → Promise<boolean> */
        confirm: hdConfirm,

        /** Ask for text input → Promise<string|null> */
        prompt: hdPrompt,

        /** Open a file picker → Promise<FileList|null> */
        pickFile: hdPickFile,

        /** Print a receipt HTML string via the native print dialog / thermal printer */
        printReceipt: hdPrintReceipt,

        /** Open the native share sheet with plain text (e.g. receipt summary) */
        shareText: hdShareText,

        /** Biometric authentication gate → Promise<boolean> */
        authenticateWarden: hdAuthenticateWarden,

        // ── Callbacks invoked by the Android host ──────────────────────────
        _resolveConfirm:    resolveConfirm,
        _resolvePrompt:     resolvePrompt,
        _resolveFilePicker: resolveFilePicker,
        _resolveBiometric:  resolveBiometric,

        // ── Secure Storage ─────────────────────────────────────────────────
        /** Async EncryptedSharedPreferences adapter (falls back to localStorage) */
        secureStorage: hdSecureStorage,
    });

    // Install the transparent localStorage shim for Supabase session keys
    installSecureStorageShim();

    console.info(
        '[android-bridge] Loaded. Android interface %s.',
        hasAndroid() ? 'DETECTED ✓' : 'not present – using browser fallbacks'
    );

}(window));

