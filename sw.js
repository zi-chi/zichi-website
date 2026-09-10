// Minimal service worker: exists only so Android/Chrome recognizes this page
// as an installable app. It intentionally does not cache anything, so the
// app always loads fresh data over the network (needed for live sync).
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
