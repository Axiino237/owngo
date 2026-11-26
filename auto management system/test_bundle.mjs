class MockMutationObserver {
  observe() {}
  disconnect() {}
}
globalThis.MutationObserver = MockMutationObserver;
const textNode = { data: '', replace: () => '', indexOf: () => -1 };
const mockElem = () => ({
  setAttribute: () => {},
  appendChild: () => {},
  removeChild: () => {},
  click: () => {},
  style: {},
  data: '',
  indexOf: () => -1,
  replace: () => '',
  firstChild: textNode
});
globalThis.window = {
  location: { pathname: '/attendance', href: 'http://localhost/attendance', search: '', hash: '' },
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: {
    getItem: (k) => {
      if (k === 'crm_token') return 'mock_token';
      if (k === 'crm_user') return JSON.stringify({ id: 1, name: 'Admin', role: { level: 'super_admin' }, isSuperAdmin: true });
      return null;
    },
    setItem: () => {},
    removeItem: () => {}
  },
  navigator: { userAgent: 'Mozilla/5.0 Chrome/120.0.0.0' },
  document: {
    createElement: mockElem,
    createTextNode: () => textNode,
    documentElement: mockElem(),
    head: mockElem(),
    body: mockElem(),
    getElementById: () => mockElem(),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  MutationObserver: MockMutationObserver
};
globalThis.localStorage = globalThis.window.localStorage;
globalThis.document = globalThis.window.document;
globalThis.location = globalThis.window.location;

console.log('Loading index-ClaH-O50.js in Node with globals...');
try {
  const mod = await import('./frontend/dist/assets/index-ClaH-O50.js');
  console.log('Module loaded successfully without top-level TDZ error!');
} catch (err) {
  console.error('ERROR LOADING BUNDLE:');
  console.error(err);
}
