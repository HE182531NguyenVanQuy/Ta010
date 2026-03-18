
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/Ta010/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "preload": [
      "chunk-B45F2YAW.js"
    ],
    "route": "/Ta010"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-VVXGA3ZJ.js"
    ],
    "route": "/Ta010/de-thi"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-BGLHKQZU.js"
    ],
    "route": "/Ta010/test"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-VSFZ6DV5.js"
    ],
    "route": "/Ta010/ai-analysis"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-NB52Q4EB.js"
    ],
    "route": "/Ta010/ngu-phap"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-5YU5YR7T.js"
    ],
    "route": "/Ta010/tu-vung"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-L2KKFL5X.js"
    ],
    "route": "/Ta010/tai-lieu"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-2QAILRFQ.js"
    ],
    "route": "/Ta010/dien-dan"
  },
  {
    "renderMode": 2,
    "redirectTo": "/Ta010",
    "route": "/Ta010/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 22771, hash: '26a826640169af12b8755e23308410bb077ff5635dbc442d766195f8f24a4783', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 11883, hash: '1ac2a4d3e9604b000a7fb87d88f836e61bbd53f8655393a0f636a8ca14372d2c', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 98766, hash: 'ac02a7da815db2da685421696a9419a6d160d4c65a572d503206e4411edf5530', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'de-thi/index.html': {size: 88060, hash: 'b0fce4063f948b5ab416ac226fda02f6bccfcef910298ccfe99b9b382dc39e21', text: () => import('./assets-chunks/de-thi_index_html.mjs').then(m => m.default)},
    'tai-lieu/index.html': {size: 123344, hash: '639a913f35aba701cced6d6b8067f07229d99702904d47a44e47f5d223fe424b', text: () => import('./assets-chunks/tai-lieu_index_html.mjs').then(m => m.default)},
    'tu-vung/index.html': {size: 119155, hash: '2536070f59070afd605faa39ed64c9e8831d6c6d0854ac04fa2a838cca5a7f71', text: () => import('./assets-chunks/tu-vung_index_html.mjs').then(m => m.default)},
    'ai-analysis/index.html': {size: 81166, hash: '3d3c4c8ae9bfb8734cc4bf89695b5c65f476f26ec36590844ecaa64e2a7ac9cd', text: () => import('./assets-chunks/ai-analysis_index_html.mjs').then(m => m.default)},
    'ngu-phap/index.html': {size: 113159, hash: '3f8ce3ce35a9777248bd308c5eccc6d258c1758d1fdff9490a0f28c29b3e2cdb', text: () => import('./assets-chunks/ngu-phap_index_html.mjs').then(m => m.default)},
    'dien-dan/index.html': {size: 108136, hash: '866d1e1248211e50e99f65fd5dc1fe629d1d822aa0ad81da602afbfe80eeaa5d', text: () => import('./assets-chunks/dien-dan_index_html.mjs').then(m => m.default)},
    'test/index.html': {size: 139003, hash: '9593bef106853d9ff7e6bcdcfb28f20453d71e8b78e6b726c08b40bb775ae784', text: () => import('./assets-chunks/test_index_html.mjs').then(m => m.default)},
    'styles-JCOSND5S.css': {size: 11646, hash: 'IhB6cGKRVUU', text: () => import('./assets-chunks/styles-JCOSND5S_css.mjs').then(m => m.default)}
  },
};
