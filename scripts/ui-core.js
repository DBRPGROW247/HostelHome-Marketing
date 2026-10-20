
/**
 * ui-core.js - Shared UI utilities for HostelHome
 * Includes Toast Notifications, Global Error Handling, Haptics, and Pull-to-Refresh
 */

/**
 * HAPTIC FEEDBACK CONSTANTS
 * Simulates Android native feel
 */
window.HapticFeedbackConstants = {
    CONFIRM: [0, 20, 100, 30], // Short double vibration
    REJECT: [0, 40, 100, 40, 100, 40], // Triple vibration
    LIGHT_TICK: [10],
    HEAVY_CLICK: [40],
    SUCCESS: [0, 20, 80, 40],
    WARNING: [0, 30, 50, 30],
    ERROR: [0, 50, 100, 50],
    PULL_REFRESH: [15]
};

window.performHapticFeedback = (pattern) => {
    try {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    } catch (e) {
        // Ignore haptics error
    }
};

const style = document.createElement('style');
style.innerHTML = `
    .toast-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
    }
    .toast-item {
        pointer-events: auto;
        min-width: 300px;
        max-width: 400px;
        padding: 16px;
        border-radius: 12px;
        background: white;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: toast-in 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        border-left: 4px solid #E5E7EB;
        transition: all 0.3s ease;
    }
    .toast-item.success { border-left-color: #10B981; }
    .toast-item.error { border-left-color: #EF4444; }
    .toast-item.warning { border-left-color: #F59E0B; }
    .toast-item.info { border-left-color: #3B82F6; }

    @keyframes toast-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes toast-out {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

let toastContainer = null;

window.showToast = (message, type = 'info', duration = 4000) => {
    if (!toastContainer) {
        if (!document.body) return;
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    
    let icon = '';
    if (type === 'success') {
        icon = '<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
        window.performHapticFeedback(window.HapticFeedbackConstants.SUCCESS);
    } else if (type === 'error') {
        icon = '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
        window.performHapticFeedback(window.HapticFeedbackConstants.ERROR);
    } else if (type === 'warning') {
        icon = '<svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
        window.performHapticFeedback(window.HapticFeedbackConstants.WARNING);
    } else {
        icon = '<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }

    toast.innerHTML = `
        <div class="flex-shrink-0">${icon}</div>
        <div class="flex-grow text-sm font-medium text-gray-800">${message}</div>
        <button class="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none" onclick="this.parentElement.remove()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toast-out 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

// Global Error Handler
window.addEventListener('error', (event) => {
    console.error('Global Error caught:', event.error);
    if (event.message.includes('fetch') || event.message.includes('network') || event.message.includes('Supabase')) {
        window.showToast('Connection issues detected. Please check your internet or refresh.', 'warning');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    const msg = event.reason?.message || '';
    const status = event.reason?.status || event.reason?.code;
    // Only redirect on authentication errors, not transient network issues
    const isAuthError = msg.includes('JWT') || msg.includes('Invalid JWT') ||
                        status === 401 || status === '401' ||
                        (msg.includes('Supabase') && msg.includes('session'));
    if (msg.includes('fetch') || msg.includes('network')) {
        window.showToast('Network error. Please check your connection.', 'warning');
    } else if (isAuthError) {
        window.showToast('Session expired. Redirecting to login...', 'error');
        setTimeout(() => location.href = '/', 3000);
    }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW Registered', reg))
            .catch(err => console.error('SW Registration Failed', err));
    });
}

// Offline/Online Status Handling
const createOfflineBanner = () => {
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.innerHTML = `
        <div style="background: #EF4444; color: white; padding: 8px; text-align: center; font-size: 13px; font-weight: 600; position: fixed; top: 0; left: 0; right: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transform: translateY(-100%); transition: transform 0.3s ease;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" /></svg>
            Working Offline - Changes will sync when connection returns
        </div>
    `;
    document.body.appendChild(banner);
    return banner.firstElementChild;
};

let offlineBannerElement;

const updateOnlineStatus = () => {
    if (!offlineBannerElement) offlineBannerElement = createOfflineBanner();
    
    if (navigator.onLine) {
        offlineBannerElement.style.transform = 'translateY(-100%)';
        window.showToast('Connection restored!', 'success', 2000);
    } else {
        offlineBannerElement.style.transform = 'translateY(0)';
        window.showToast('You are now offline.', 'warning', 3000);
    }
};

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Check status on load
if (!navigator.onLine) {
    window.addEventListener('DOMContentLoaded', updateOnlineStatus);
}

/**
 * ANDROID BACK BUTTON NAVIGATION HANDLER  (enhanced)
 * ─────────────────────────────────────────────────────────────────────────────
 * Three-tier back-button strategy:
 *   1. If any overlay (modal / sidebar) is open  → close it.
 *   2. If we're on a ROOT page with no overlay   → show "Exit?" confirm dialog.
 *   3. If we're on a SUB-page with no overlay    → navigate back (history.back).
 *
 * Root pages are the top-level entry points where pressing back should exit
 * the app rather than navigate to an unknown previous URL.
 */
(function () {
    'use strict';

    // ── Root-page detection ───────────────────────────────────────────────────
    // Pages where pressing back with no overlay open should trigger an exit dialog.
    const ROOT_PAGES = new Set([
        '',            // bare origin (https://hostelhome.app/)
        'index.html',
        'hstldash.html',
        'manage_hostel.html',
    ]);

    function currentPage() {
        return location.pathname.split('/').pop() || '';
    }

    function isRootPage() {
        return ROOT_PAGES.has(currentPage());
    }

    // ── Overlay management ────────────────────────────────────────────────────
    let isUIOpen = false;

    // Global toggleSidebar function
    window.toggleSidebar = () => {
        const sb = document.getElementById('mobile-sidebar') || document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (!sb || !overlay) return;

        const isOpen = sb.classList.contains('open');

        if (!isOpen) {
            // Open sidebar & push state
            sb.classList.add('open');
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            history.pushState({ sidebar: true }, '', '#sidebar');
        } else {
            // Close sidebar by triggering history back
            if (location.hash === '#sidebar') {
                history.back();
            } else {
                // Fallback for direct close without hash state
                sb.classList.remove('open');
                overlay.classList.remove('open');
                document.body.style.overflow = '';
            }
        }
    };

    const closeAllUI = () => {
        let closedSomething = false;

        // Close open sidebars directly (safe & clean)
        document.querySelectorAll('.sidebar.open, #mobile-sidebar.open').forEach(s => {
            s.classList.remove('open');
            closedSomething = true;
        });

        // Close sidebar overlays directly
        document.querySelectorAll('.sidebar-overlay.open, #sidebar-overlay.open').forEach(o => {
            o.classList.remove('open');
            closedSomething = true;
        });

        // Close modals / full-screen overlays
        document.querySelectorAll(
            '.modal-backdrop, [id*="modal"], .fixed.inset-0, .modal-overlay'
        ).forEach(m => {
            // Skip the skeleton loading screen
            if (m.id === 'loading-screen') return;

            const cs = window.getComputedStyle(m);
            const isVisible  = cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
            const hasOpenCls = m.classList.contains('flex') ||
                               m.classList.contains('open') ||
                               !m.classList.contains('hidden');

            if (isVisible && hasOpenCls) {
                const closeBtn = m.querySelector(
                    '#close-modal, .close-modal, [onclick*="hide"], [onclick*="close"]'
                );
                if (closeBtn) closeBtn.click();
                else if (window.hide) window.hide(m);
                else {
                    m.style.display = 'none';
                    m.classList.add('hidden');
                    m.classList.remove('flex', 'open');
                }
                closedSomething = true;
            }
        });

        isUIOpen = false;
        if (closedSomething) {
            document.body.style.overflow = '';
        }
        return closedSomething;
    };

    // ── Exit confirmation (root pages only) ───────────────────────────────────
    let exitPending = false;

    function promptExit() {
        if (exitPending) return; // debounce double-fire
        exitPending = true;

        // Re-push the sentinel so the history stack stays intact while we wait
        history.pushState({ hdSentinel: true }, '');

        const doConfirm = () => {
            // HD.confirm resolves to a Promise<boolean> (see android-bridge.js)
            const confirmPromise = (window.HD && window.HD.confirm)
                ? window.HD.confirm('Are you sure you want to exit?', 'Exit HostelHome')
                : Promise.resolve(window.confirm('Are you sure you want to exit?'));

            confirmPromise.then(ok => {
                exitPending = false;
                if (!ok) return; // user cancelled

                if (window.Android && typeof window.Android.exitApp === 'function') {
                    // Tell the 3pdroid host to finish() the Activity
                    window.Android.exitApp();
                } else {
                    // PWA / browser: best we can do is go back in history
                    history.go(-2);
                }
            });
        };

        // android-bridge.js loads after ui-core.js; give it a tick
        if (window.HD) {
            doConfirm();
        } else {
            setTimeout(doConfirm, 50);
        }
    }

    // ── Sentinel state ────────────────────────────────────────────────────────
    // Push one extra state on page load so there is always something to pop
    // before the browser would leave the page entirely.
    function pushSentinel() {
        if (!history.state || !history.state.hdSentinel) {
            history.pushState({ hdSentinel: true }, '');
        }
    }

    // ── Popstate handler ──────────────────────────────────────────────────────
    window.addEventListener('popstate', (event) => {
        const closed = closeAllUI();

        if (closed) {
            // An overlay was open — closing it IS the back action. Done.
            console.log('[back-btn] Overlay closed.');
            return;
        }

        if (isRootPage()) {
            // On a root page with no overlay: show exit confirmation
            console.log('[back-btn] Root page — prompting exit.');
            promptExit();
        } else {
            // On a sub-page: honour normal browser back navigation
            console.log('[back-btn] Sub-page — navigating back.');
            history.back();
        }
    });

    // ── MutationObserver — push state when overlays open ─────────────────────
    const observer = new MutationObserver((mutations) => {
        let shouldPush = false;

        mutations.forEach((mutation) => {
            if (mutation.type !== 'attributes') return;
            if (!['class', 'style'].includes(mutation.attributeName)) return;

            const target = mutation.target;
            const isSidebar = target.classList.contains('sidebar') || target.id === 'mobile-sidebar';
            const isModal   = target.classList.contains('modal-backdrop') ||
                              (target.id && target.id.toLowerCase().includes('modal')) ||
                              (target.classList.contains('fixed') && target.classList.contains('inset-0'));

            if (isModal) {
                if (target.id === 'loading-screen') return;

                const cs     = window.getComputedStyle(target);
                const isOpen = target.classList.contains('open') ||
                               target.classList.contains('flex') ||
                               (cs.display !== 'none' && !target.classList.contains('hidden'));

                if (isOpen && !isUIOpen) shouldPush = true;
            }
        });

        if (shouldPush) {
            isUIOpen = true;
            if (!history.state || !history.state.uiOpen) {
                history.pushState({ uiOpen: true }, '');
            }
        }
    });

    // ── Initialisation ────────────────────────────────────────────────────────
    const init = () => {
        pushSentinel();
        observer.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['class', 'style'],
        });

        window.HostelHome = window.HostelDesk = window.HostelHome || window.HostelDesk || {};
        window.HostelHome.closeUI = closeAllUI;
    };

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/**
 * PULL-TO-REFRESH IMPLEMENTATION
 * Adds a native-feeling pull-to-refresh to the dashboards
 */
(function initPullToRefresh() {
    const ptrStyle = document.createElement('style');
    ptrStyle.innerHTML = `
        #ptr-container {
            position: fixed;
            top: -60px;
            left: 0;
            width: 100%;
            height: 60px;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            transition: top 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
        }
        .ptr-spinner {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid #E5E7EB;
            border-top-color: #3B82F6;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transform: rotate(0deg);
        }
        .ptr-spinner.spinning {
            animation: ptr-spin 0.8s linear infinite;
        }
        @keyframes ptr-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(ptrStyle);

    const ptrContainer = document.createElement('div');
    ptrContainer.id = 'ptr-container';
    const ptrSpinner = document.createElement('div');
    ptrSpinner.className = 'ptr-spinner';
    ptrContainer.appendChild(ptrSpinner);
    
    // Add to body as soon as possible
    if (document.body) {
        document.body.appendChild(ptrContainer);
    } else {
        window.addEventListener('DOMContentLoaded', () => document.body.appendChild(ptrContainer));
    }

    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let refreshTriggered = false;
    
    const threshold = 120; // Distance to trigger refresh
    const visualMax = 70; // Max visual distance
    const resistance = 0.4; // Pull resistance

    document.addEventListener('touchstart', (e) => {
        // Prevent PTR if interacting with a sidebar, modal, scrollable container, or when body is locked
        if (document.body.style.overflow === 'hidden' || e.target.closest('.sidebar, #mobile-sidebar, .modal, .modal-backdrop, .overflow-y-auto, .custom-scrollbar, [class*="overflow-y-"], [class*="overflow-auto"]')) {
            return;
        }

        if (window.scrollY <= 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
            refreshTriggered = false;
            ptrContainer.style.transition = 'none';
            ptrSpinner.classList.remove('spinning');
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        
        currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;

        // If pulling down and at top of page
        if (pullDistance > 0 && window.scrollY <= 0) {
            // Only prevent default if we're clearly pulling to refresh
            if (pullDistance > 10 && e.cancelable) {
                e.preventDefault();
            }
            
            const visualDistance = Math.min(pullDistance * resistance, visualMax);
            ptrContainer.style.transform = `translateY(${visualDistance}px)`;
            
            // Rotate spinner based on pull distance
            const rotation = Math.min(pullDistance * 2, 360);
            ptrSpinner.style.transform = `rotate(${rotation}deg)`;

            if (pullDistance > threshold && !refreshTriggered) {
                refreshTriggered = true;
                window.performHapticFeedback(window.HapticFeedbackConstants.LIGHT_TICK);
            } else if (pullDistance <= threshold && refreshTriggered) {
                refreshTriggered = false;
            }
        } else if (pullDistance < 0) {
            // User scrolling down, cancel PTR
            isPulling = false;
        }
    }, { passive: false });

    document.addEventListener('touchend', () => {
        if (!isPulling) return;
        isPulling = false;
        
        ptrContainer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        if (refreshTriggered) {
            // Trigger Refresh
            window.performHapticFeedback(window.HapticFeedbackConstants.PULL_REFRESH);
            ptrSpinner.classList.add('spinning');
            ptrContainer.style.transform = `translateY(${visualMax}px)`;
            
            // Allow spinner to show for a moment, then reload
            setTimeout(() => {
                location.reload();
            }, 600);
        } else {
            // Cancel Refresh
            ptrContainer.style.transform = 'translateY(0)';
            ptrSpinner.style.transform = 'rotate(0deg)';
        }
        
        refreshTriggered = false;
    });
})();

/**
 * APP LOCK — Disabled
 */
(function initAppLock() {
    window.HostelHome = window.HostelHome || {};
    window.HostelHome.lockNow = () => {};
    window.HostelHome.unlockNow = () => {};
})();

/**
 * SKELETON LOADER UTILITY
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides two global helpers:
 *
 *   window.showPageSkeleton()       – Shows the page's #loading-screen if it
 *                                     exists, or injects a generic full-page
 *                                     shimmer overlay on the fly.
 *
 *   window.hidePageSkeleton(delay?) – Fades out and removes the skeleton.
 *                                     Optional delay in ms (default 0).
 *
 * Pages that already have a hand-crafted #loading-screen div (e.g. hstldash,
 * hsmeal) will use that; pages without one get a generated placeholder.
 */
(function initSkeletonLoader() {
    'use strict';

    const GENERATED_ID = 'hd-skeleton-overlay';

    // Inlines the shimmer animation so it works even if skeleton.css hasn't
    // been linked on a given page.
    const SHIMMER_CSS = `
        @keyframes hd-shimmer {
            0%   { background-position: -600px 0; }
            100% { background-position:  600px 0; }
        }
        .hd-skel {
            background: #e8eaed;
            background-image: linear-gradient(
                90deg, #e8eaed 0%, #f4f4f6 40%, #e8eaed 80%
            );
            background-size: 1200px 100%;
            animation: hd-shimmer 1.4s ease-in-out infinite;
            border-radius: 6px;
        }
        body.dark-mode .hd-skel {
            background: #1e293b;
            background-image: linear-gradient(
                90deg, #1e293b 0%, #334155 40%, #1e293b 80%
            );
        }
    `;

    let styleInjected = false;
    function ensureStyle() {
        if (styleInjected) return;
        const s = document.createElement('style');
        s.textContent = SHIMMER_CSS;
        document.head.appendChild(s);
        styleInjected = true;
    }

    function buildGenericOverlay() {
        ensureStyle();
        const el = document.createElement('div');
        el.id = GENERATED_ID;
        el.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:200',
            'background:#f3f4f6',
            'display:flex', 'overflow:hidden',
        ].join(';');
        el.innerHTML = `
            <!-- Sidebar shimmer -->
            <div style="width:260px;background:#fff;border-right:1px solid #e5e7eb;
                        padding:32px 24px;display:flex;flex-direction:column;gap:20px">
                <div class="hd-skel" style="width:40px;height:40px;border-radius:10px"></div>
                <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
                    <div class="hd-skel" style="height:38px;border-radius:10px"></div>
                    <div class="hd-skel" style="height:38px;border-radius:10px"></div>
                    <div class="hd-skel" style="height:38px;border-radius:10px"></div>
                    <div class="hd-skel" style="height:38px;border-radius:10px"></div>
                </div>
            </div>
            <!-- Main area shimmer -->
            <div style="flex:1;display:flex;flex-direction:column">
                <!-- Topbar -->
                <div style="height:70px;background:#fff;border-bottom:1px solid #e5e7eb;
                            display:flex;align-items:center;justify-content:space-between;padding:0 32px">
                    <div class="hd-skel" style="width:180px;height:20px"></div>
                    <div class="hd-skel" style="width:36px;height:36px;border-radius:50%"></div>
                </div>
                <!-- Content blocks -->
                <div style="padding:32px;display:flex;flex-direction:column;gap:20px">
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
                        <div class="hd-skel" style="height:90px;border-radius:14px"></div>
                        <div class="hd-skel" style="height:90px;border-radius:14px"></div>
                        <div class="hd-skel" style="height:90px;border-radius:14px"></div>
                    </div>
                    <div class="hd-skel" style="height:200px;border-radius:16px"></div>
                    <div class="hd-skel" style="height:140px;border-radius:16px"></div>
                </div>
            </div>`;
        return el;
    }

    window.showPageSkeleton = function () {
        // Prefer the page's own hand-crafted skeleton
        const existing = document.getElementById('loading-screen');
        if (existing) {
            existing.style.display = 'flex';
            return;
        }
        if (!document.getElementById(GENERATED_ID)) {
            const overlay = buildGenericOverlay();
            if (document.body) {
                document.body.appendChild(overlay);
            } else {
                window.addEventListener('DOMContentLoaded',
                    () => document.body.appendChild(overlay), { once: true });
            }
        }
    };

    window.hidePageSkeleton = function (delay) {
        delay = delay || 0;
        setTimeout(() => {
            // Hide the hand-crafted skeleton
            const handcrafted = document.getElementById('loading-screen');
            if (handcrafted) {
                handcrafted.style.opacity = '0';
                handcrafted.style.transition = 'opacity 0.3s ease';
                setTimeout(() => { handcrafted.style.display = 'none'; }, 300);
            }

            // Hide the generated overlay
            const generated = document.getElementById(GENERATED_ID);
            if (generated) {
                generated.style.opacity = '0';
                generated.style.transition = 'opacity 0.3s ease';
                setTimeout(() => generated.remove(), 300);
            }
        }, delay);
    };

    // Auto-call showPageSkeleton immediately so there's no flash.
    // Skip on index.html and static pages — they never call
    // hidePageSkeleton() so the skeleton would stay stuck forever there.
    // NOTE: Disabled automatic skeleton globally as requested to avoid stuck loading screens.
    /*
    const _currentPage = location.pathname.split('/').pop() || '';
    const _staticPages = ['index.html', '', 'privacy-policy.html', 'terms.html', 'about.html', 'contact.html', 'delete-account.html'];
    if (!_staticPages.includes(_currentPage)) {
        window.showPageSkeleton();
    }
    */
})();

/**
 * IN-APP ACCOUNT DELETION
 * Triggers a confirmation modal and calls the Supabase RPC to wipe data.
 */
window.handleDeleteAccount = async () => {
    try {
        const btn = document.getElementById('btn-confirm-delete-account');
        if (btn) {
            btn.innerHTML = 'Deleting...';
            btn.disabled = true;
        }
        
        // Call the Supabase RPC to delete user from auth.users (which cascades)
        const { error } = await window.supabase.rpc('delete_user_account');
        
        if (error) throw error;
        
        window.showToast('Account deleted successfully.', 'success');
        setTimeout(() => {
            window.supabase.auth.signOut().then(() => {
                location.href = '/';
            });
        }, 1500);
    } catch (e) {
        window.showToast('Failed to delete account. Please try again or use the support portal.', 'error');
        console.error(e);
        const btn = document.getElementById('btn-confirm-delete-account');
        if (btn) {
            btn.innerHTML = 'Yes, Delete My Account';
            btn.disabled = false;
        }
    }
};

/**
 * ANDROID BRIDGE SHIMS
 * ─────────────────────────────────────────────────────────────────────────────
 * Once android-bridge.js (loaded after this file) has set up window.HD, we
 * install thin shims over the browser built-ins so that every existing
 * alert() / confirm() / prompt() call in any page automatically gets routed
 * through the 3pdroid JavascriptInterface without touching call-sites.
 *
 * Shim strategy for synchronous call-sites:
 *  • alert()   – truly fire-and-forget; we can just delegate to HD.alert().
 *  • confirm() – returns a boolean synchronously in legacy code.  We keep the
 *                synchronous path for browser mode and use HD.confirm() only
 *                when window.Android is present (where blocking is fine because
 *                the Android host suspends the thread until the dialog closes).
 *  • prompt()  – same strategy as confirm().
 *
 * Pages that have already been migrated to `await HD.confirm(…)` are unaffected
 * because HD.confirm() always returns a Promise.
 */
(function installBridgeShims() {
    const _nativeAlert   = window.alert.bind(window);
    const _nativeConfirm = window.confirm.bind(window);
    const _nativePrompt  = window.prompt.bind(window);

    const applyShims = () => {
        if (!window.HD) return; // bridge not loaded yet

        window.alert = (msg, title) => {
            if (window.Android) {
                HD.alert(msg, title); // async, fire-and-forget
            } else {
                _nativeAlert(msg);
            }
        };

        window.confirm = (msg, title) => {
            if (window.Android) {
                // Synchronous path: Android.showConfirm blocks until the user responds.
                // HD.confirm returns a Promise but the bridge also calls Android.showConfirm
                // synchronously, so we fall back to native for the return value here.
                HD.confirm(msg, title); // registers the async callback
                return _nativeConfirm(msg); // returns sync bool for legacy call-sites
            }
            return _nativeConfirm(msg);
        };

        window.prompt = (msg, defaultVal, title) => {
            if (window.Android) {
                HD.prompt(msg, defaultVal, title);
                return _nativePrompt(msg, defaultVal);
            }
            return _nativePrompt(msg, defaultVal);
        };
    };

    // android-bridge.js is loaded right after this file, so HD may not exist yet.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyShims);
    } else {
        // Give the next script tag time to execute
        setTimeout(applyShims, 0);
    }
})();

window.confirmAccountDeletion = () => {
    // Check if modal already exists
    if (document.getElementById('delete-account-modal')) {
        document.getElementById('delete-account-modal').remove();
    }
    
    const modalHtml = `
    <div id="delete-account-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[300] backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-sm text-center p-6 mx-4 shadow-2xl animate-[fadeIn_0.3s_ease-out]">
            <div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
                ⚠️
            </div>
            <h2 class="text-xl font-bold text-gray-900 mb-2">Delete Account</h2>
            <p class="text-gray-600 mb-6 text-sm">
                Are you absolutely sure you want to delete your account? This action is permanent and will wipe all your data.
            </p>
            <div class="space-y-3">
                <button id="btn-confirm-delete-account" onclick="window.handleDeleteAccount()" class="inline-flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium w-full transition-colors shadow-lg shadow-red-500/30">
                    Yes, Delete My Account
                </button>
                <button class="inline-flex items-center justify-center px-4 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium w-full transition-colors" onclick="this.closest('#delete-account-modal').remove()">
                    Cancel
                </button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};
/**
 * GLOBAL APP FEEDBACK MODAL
 * Injects the feedback modal on all pages and handles the submission logic.
 */
(function initGlobalFeedbackModal() {
    'use strict';
    
    // Inject HTML if not already present
    const injectHtml = () => {
        if (!document.getElementById('app-feedback-modal')) {
            const modalHtml = `
  <div id="app-feedback-modal" class="fixed inset-0 modal-backdrop hidden flex items-center justify-center z-[150]">
    <div class="modal-card w-full max-w-md animate-[fadeIn_0.2s_ease-out] bg-white p-6 rounded-xl shadow-xl relative">
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-4">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900">App Feedback & Support</h2>
        <p class="text-gray-500 text-sm mt-1">Found a bug? Have a suggestion? Let us know!</p>
        <p class="text-blue-500 text-[10px] font-bold uppercase mt-2 tracking-widest bg-blue-50 px-3 py-1 rounded inline-block">For HostelHome Developers (Technical Support)</p>
      </div>
      <div class="space-y-4 text-left">
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Feedback Type</label>
          <select id="feedback-type" class="w-full border p-2 rounded text-sm bg-gray-50 text-gray-900">
            <option value="bug">Report a Bug/Glitch</option>
            <option value="suggestion">Feature Suggestion</option>
            <option value="error">Error/Issue</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Your Message</label>
          <textarea id="feedback-message" rows="4" placeholder="Please describe the technical issue or your valuable suggestion for the app..." class="w-full border p-2 rounded text-sm bg-gray-50 resize-none text-gray-900"></textarea>
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-8">
        <button id="feedback-cancel" class="btn btn-ghost px-4 py-2 rounded text-gray-600 hover:bg-gray-100 transition-colors font-medium">Cancel</button>
        <button id="feedback-submit" class="btn btn-primary px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium">Submit Feedback</button>
      </div>
      <p id="feedback-status" class="text-sm mt-4 text-center hidden"></p>
    </div>
  </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    };

    // Attach event listeners
    const attachFeedbackListeners = () => {
        if (!document.body) return;

        const openBtns = document.querySelectorAll('#open-app-feedback-btn');
        if (openBtns.length === 0) return;

        injectHtml();

        const feedbackModal = document.getElementById('app-feedback-modal');
        const cancelBtn = document.getElementById('feedback-cancel');
        const submitBtn = document.getElementById('feedback-submit');
        const typeSelect = document.getElementById('feedback-type');
        const messageInput = document.getElementById('feedback-message');
        const statusDisplay = document.getElementById('feedback-status');

        if (!feedbackModal || !cancelBtn || !submitBtn) return;

        openBtns.forEach(btn => {
            btn.onclick = null;
            btn.addEventListener('click', () => {
                let delay = 0;
                if(window.toggleSidebar) {
                    const sb = document.getElementById('mobile-sidebar') || document.querySelector('.sidebar');
                    if (sb && sb.classList.contains('open')) {
                        window.toggleSidebar();
                        delay = 100; // wait for popstate to close overlays
                    }
                }
                setTimeout(() => {
                    feedbackModal.classList.remove('hidden');
                    feedbackModal.classList.add('flex');
                }, delay);
            });
        });

        cancelBtn.onclick = () => {
            feedbackModal.classList.add('hidden');
            feedbackModal.classList.remove('flex');
            statusDisplay.classList.add('hidden');
            messageInput.value = '';
        };

        submitBtn.onclick = async () => {
            const type = typeSelect.value;
            const message = messageInput.value.trim();

            if (!message) {
                statusDisplay.textContent = "Please enter a message.";
                statusDisplay.className = "text-sm mt-4 text-center text-red-600";
                statusDisplay.classList.remove('hidden');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Sending...";

            try {
                const supabase = window.supabase;
                if (!supabase) throw new Error("Supabase client not initialized.");

                const { data: { session } } = await supabase.auth.getSession();
                let userName = "Anonymous";
                let userEmail = session?.user?.email || "N/A";

                let currentLoginRole = window.currentLoginRole || 'unknown';
                let currentHostelId = window.currentHostelId || null;

                if (session?.user) {
                   if (currentLoginRole === 'unknown') {
                       if (window.location.pathname.includes('hstldash')) currentLoginRole = 'hostellite';
                       else currentLoginRole = 'warden';
                   }
                   
                   const table = currentLoginRole === 'warden' ? 'wardens' : 'hostellites';
                   const { data: profile } = await supabase.from(table).select(currentLoginRole === 'warden' ? 'wname, hostel_id' : 'name, hostel_id').eq('uid', session.user.id).maybeSingle();
                   
                   if (profile) {
                       userName = profile.name || profile.wname || "Anonymous";
                       currentHostelId = profile.hostel_id || currentHostelId;
                   }
                }

                const { error } = await supabase.from('app_feedback').insert({
                    user_id: session?.user?.id,
                    role: currentLoginRole,
                    type: type,
                    message: message,
                    user_email: userEmail,
                    user_name: userName,
                    hostel_id: currentHostelId
                });

                if (error) throw error;

                statusDisplay.textContent = "Feedback sent successfully! Thank you.";
                statusDisplay.className = "text-sm mt-4 text-center text-green-600 font-medium";
                statusDisplay.classList.remove('hidden');
                messageInput.value = "";

                setTimeout(() => {
                    feedbackModal.classList.add('hidden');
                    feedbackModal.classList.remove('flex');
                    statusDisplay.classList.add('hidden');
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Submit Feedback";
                }, 2000);

            } catch (err) {
                console.error(err);
                statusDisplay.textContent = "Error: " + err.message;
                statusDisplay.className = "text-sm mt-4 text-center text-red-600";
                statusDisplay.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit Feedback";
            }
        };
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachFeedbackListeners);
    } else {
        // Delay slightly so that page-specific DOM is parsed
        setTimeout(attachFeedbackListeners, 500);
    }
})();

/**
 * INJECT HOSTEL NAME INTO HEADER
 * Ensures the mobile header shows the hostel name on all pages.
 */
(function initHostelHeader() {
    let checkAttempts = 0;
    const checkInterval = setInterval(async () => {
        checkAttempts++;
        if (checkAttempts > 40) clearInterval(checkInterval); // stop after 20s

        if (window.supabase) {
            clearInterval(checkInterval);
            try {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) return;

                // Check if we need to fetch
                if (!window.currentHostelName) {
                    const { data: warden } = await window.supabase.from("wardens").select("hostel_id, hostels(name)").eq("uid", user.id).maybeSingle();
                    if (warden) {
                        const hName = warden.hostels?.name || warden.hostels?.[0]?.name;
                        if (hName) window.currentHostelName = hName;
                        else if (warden.hostel_id) {
                            const { data: h } = await window.supabase.from("hostels").select("name").eq("id", warden.hostel_id).maybeSingle();
                            if (h?.name) window.currentHostelName = h.name;
                        }
                    } else {
                        const { data: hostellite } = await window.supabase.from("hostellites")
                            .select("hostel_id, hostels(name)")
                            .eq("uid", user.id)
                            .neq("status", "archived")
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (hostellite) {
                            const hName = hostellite.hostels?.name || hostellite.hostels?.[0]?.name;
                            if (hName) window.currentHostelName = hName;
                            else if (hostellite.hostel_id) {
                                const { data: h } = await window.supabase.from("hostels").select("name").eq("id", hostellite.hostel_id).maybeSingle();
                                if (h?.name) window.currentHostelName = h.name;
                            }
                        }
                    }
                }

                const name = window.currentHostelName;
                if (!name) return; // Do not overwrite with fallback text if hostel name not resolved yet

                // Update predefined IDs
                const predefinedIds = ['mobile-topbar-title', 'header-hostel-name', 'warden-hostel-name'];
                let hasDesktopOrMobileTitle = false;
                for (const id of predefinedIds) {
                    const el = document.getElementById(id);
                    if (el) {
                        el.textContent = name;
                        hasDesktopOrMobileTitle = true;
                    }
                }

                // If no predefined mobile title exists, inject one into the topbar left section
                if (!hasDesktopOrMobileTitle) {
                    let mobileTitle = document.getElementById('injected-mobile-title');
                    if (!mobileTitle) {
                        const topbarLeft = document.querySelector('header.topbar > div:first-child');
                        if (topbarLeft) {
                            mobileTitle = document.createElement('h2');
                            mobileTitle.id = 'injected-mobile-title';
                            mobileTitle.className = 'text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 px-2 py-1 rounded-md sm:hidden ml-2 truncate max-w-[120px] border border-blue-100 shadow-sm flex-shrink-0';
                            mobileTitle.textContent = name;
                            topbarLeft.appendChild(mobileTitle);
                        }
                    } else {
                        mobileTitle.textContent = name;
                    }
                }
            } catch (e) {
                console.error("Error setting hostel header:", e);
            }
        }
    }, 500);
})();
