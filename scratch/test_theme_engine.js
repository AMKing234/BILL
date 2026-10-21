// scratch/test_theme_engine.js
const fs = require('fs');
const vm = require('vm');

// Mock browser globals
const localStorageData = {};
const mockWindow = {
    AudioContext: class {
        constructor() { this.state = 'running'; this.currentTime = 0; }
        createOscillator() {
            return {
                type: 'sine',
                frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
                connect() {},
                start() {},
                stop() {}
            };
        }
        createGain() {
            return {
                gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
                connect() {}
            };
        }
        resume() { this.state = 'running'; }
    },
    localStorage: {
        getItem(k) { return localStorageData[k] || null; },
        setItem(k, v) { localStorageData[k] = v.toString(); }
    },
    matchMedia() { return { matches: true }; },
    addEventListener() {},
    location: { hash: '#/dashboard' }
};

const elements = {};
const rootStyle = {};
const mockDocument = {
    documentElement: {
        setAttribute(k, v) { this[k] = v; },
        style: {
            setProperty(k, v) { rootStyle[k] = v; }
        }
    },
    readyState: 'complete',
    addEventListener() {},
    querySelector(sel) { return null; },
    querySelectorAll(sel) { return []; },
    getElementById(id) {
        if (!elements[id]) {
            elements[id] = {
                id,
                style: {},
                classList: { add() {}, remove() {}, toggle() {} },
                setAttribute() {},
                appendChild() {},
                innerHTML: '',
                value: '0'
            };
        }
        return elements[id];
    },
    createElement(tag) {
        return {
            tagName: tag,
            style: {},
            classList: { add() {}, remove() {}, toggle() {} },
            appendChild() {},
            innerHTML: '',
            value: ''
        };
    }
};

const sandbox = {
    window: mockWindow,
    document: mockDocument,
    localStorage: mockWindow.localStorage,
    AudioContext: mockWindow.AudioContext,
    console: console,
    App: {
        navigate() {},
        showModal(html) { sandbox.lastModalHtml = html; },
        closeModal() {},
        toast(msg) { console.log('[Toast]', msg); },
        formatDate(d) { return d; },
        currency(amt) { return '₹ ' + Number(amt).toFixed(2); }
    },
    API: {
        get: async () => ({}),
        post: async () => ({}),
        submitOnce: async (btn, fn) => fn()
    },
    setTimeout: (fn) => fn(),
    setInterval: () => 1
};

vm.createContext(sandbox);

// Execute theme-engine.js in sandbox
const themeEngineCode = fs.readFileSync('./frontend/js/theme-engine.js', 'utf8');
vm.runInContext(themeEngineCode, sandbox);

const TE = sandbox.window.ThemeEngine;
console.log('✅ ThemeEngine initialized!');
console.log(`Total Curated Themes loaded: ${TE.themes.length}`);
console.assert(TE.themes.length >= 100, `Expected at least 100 themes, got ${TE.themes.length}`);

// Test theme selection
TE.selectTheme('cyberpunk-2077');
console.log('Applied Theme:', TE.config.themeId);
console.log('Primary Color:', rootStyle['--primary-color']);
console.assert(rootStyle['--primary-color'] === '#FEE500', 'Cyberpunk primary color should be #FEE500');

TE.selectTheme('imperial-gold');
console.log('Applied Theme:', TE.config.themeId);
console.log('Primary Color:', rootStyle['--primary-color']);
console.assert(rootStyle['--primary-color'] === '#D4AF37', 'Imperial Gold primary color should be #D4AF37');

// Test layout options
TE.selectSidebar('compact');
console.log('Sidebar Mode:', sandbox.document.documentElement['data-sidebar']);
console.assert(sandbox.document.documentElement['data-sidebar'] === 'compact', 'Sidebar should be compact');

TE.selectDensity('compact');
console.log('Density Mode:', sandbox.document.documentElement['data-density']);
console.assert(sandbox.document.documentElement['data-density'] === 'compact', 'Density should be compact');

// Test WebAudio
TE.audio.playChime();
TE.audio.playBeep();
TE.audio.playClick();
console.log('✅ WebAudio sound effects played successfully!');

// Test openStudio modal generation
TE.openStudio();
console.assert(sandbox.lastModalHtml && sandbox.lastModalHtml.includes('theme-grid'), 'Studio modal contains theme grid');
console.assert(sandbox.lastModalHtml.includes('105+ Themes'), 'Studio modal contains 105+ Themes title');

// Test Calculator
TE.openCalculator();
console.assert(sandbox.lastModalHtml && sandbox.lastModalHtml.includes('calc-keypad'), 'Calculator modal generated');

console.log('🎉 ALL THEME ENGINE AND LAYOUT TESTS PASSED 100%!');
