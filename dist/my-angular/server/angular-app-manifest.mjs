
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: 'https://he182531nguyenvanquy.github.io/TaO10/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "preload": [
      "chunk-B45F2YAW.js"
    ],
    "route": "/TaO10"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-VVXGA3ZJ.js"
    ],
    "route": "/TaO10/de-thi"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-BGLHKQZU.js"
    ],
    "route": "/TaO10/test"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-VSFZ6DV5.js"
    ],
    "route": "/TaO10/ai-analysis"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-NB52Q4EB.js"
    ],
    "route": "/TaO10/ngu-phap"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-5YU5YR7T.js"
    ],
    "route": "/TaO10/tu-vung"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-L2KKFL5X.js"
    ],
    "route": "/TaO10/tai-lieu"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-2QAILRFQ.js"
    ],
    "route": "/TaO10/dien-dan"
  },
  {
    "renderMode": 2,
    "redirectTo": "/TaO10",
    "route": "/TaO10/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 22809, hash: '94c9d95d2e13152eb5a889e3c112672329ca11c582521f5602f5fed445c4fd84', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 11921, hash: 'a0e8695c137c1491f8854354d8733b916f7df0aa3a8cf0c57315bcc05a09b53c', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 100134, hash: 'aa534b1d9803ea4def77e724179a93ed3704aadf3a561169fb6758632bbaee1b', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'de-thi/index.html': {size: 89428, hash: 'b2d7539270b1531d23f7355920e6b806e427756b8eda3470ffeb91da8f0b67a6', text: () => import('./assets-chunks/de-thi_index_html.mjs').then(m => m.default)},
    'tu-vung/index.html': {size: 120865, hash: 'c0480907837502e8a62c6541e56820a6c6827e8a0b5c11cdc2f8f362d8c77524', text: () => import('./assets-chunks/tu-vung_index_html.mjs').then(m => m.default)},
    'ngu-phap/index.html': {size: 114831, hash: '5d7ae8bd777cb281c29b10d2ace4d1fd023b7ef67ea2aaba5efaec7143c02ee8', text: () => import('./assets-chunks/ngu-phap_index_html.mjs').then(m => m.default)},
    'tai-lieu/index.html': {size: 124636, hash: 'c9afd49f486ed57655cbb5fc29d9cb87de664007dc0bc52f2362522a5f7cf64d', text: () => import('./assets-chunks/tai-lieu_index_html.mjs').then(m => m.default)},
    'test/index.html': {size: 140257, hash: '3fe4ec8a1e752c9396e3cae5cae911280a841c21bc9ff99e69413452669af888', text: () => import('./assets-chunks/test_index_html.mjs').then(m => m.default)},
    'dien-dan/index.html': {size: 109428, hash: 'f04a0f20d48451ced9b235bc478012a4e732ccd79a991906a6a6ebd0d7fa138f', text: () => import('./assets-chunks/dien-dan_index_html.mjs').then(m => m.default)},
    'ai-analysis/index.html': {size: 82496, hash: 'e94e5809d5c17d3df2301e198f9103392d5b9933fc9b35ea0c502f6b10384053', text: () => import('./assets-chunks/ai-analysis_index_html.mjs').then(m => m.default)},
    'styles-JCOSND5S.css': {size: 11646, hash: 'IhB6cGKRVUU', text: () => import('./assets-chunks/styles-JCOSND5S_css.mjs').then(m => m.default)}
  },
};
