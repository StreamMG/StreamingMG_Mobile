/**
 * mock-server.js — StreamMG Mock Backend
 *
 * Lance avec : node mock-server.js
 * URL        : http://<TON_IP>:3001/api
 *
 * Sert aussi des images placeholder localement sur /img/:seed
 * pour que Expo Go sur mobile puisse les charger sans dépendre
 * d'URLs externes (picsum.photos bloqué sur certains réseaux).
 */

const jsonServer  = require('json-server');
const server      = jsonServer.create();
const router      = jsonServer.router('db.json');
const middlewares = jsonServer.defaults({ noCors: false });

server.use(middlewares);
server.use(jsonServer.bodyParser);

// ─── Images placeholder locales ───────────────────────────────────────────────

server.get('/img/:seed', (req, res) => {
  const seed   = req.params.seed;
  const palette = [
    ['#1a3a5c', '#3584e4'],
    ['#1a3d2e', '#2ec27e'],
    ['#3d2a1a', '#e8c547'],
    ['#2a1a3d', '#a855f7'],
    ['#3d1a1a', '#ef4444'],
    ['#1a2a3d', '#06b6d4'],
  ];
  const [bg, accent] = palette[seed.charCodeAt(0) % palette.length];
  const initials = seed.slice(0, 2).toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560">
    <rect width="400" height="560" fill="${bg}"/>
    <rect x="0" y="400" width="400" height="160" fill="rgba(0,0,0,0.55)"/>
    <circle cx="200" cy="210" r="90" fill="${accent}" opacity="0.2"/>
    <circle cx="200" cy="210" r="55" fill="${accent}" opacity="0.35"/>
    <text x="200" y="218" font-family="system-ui" font-size="42" font-weight="bold"
      fill="${accent}" text-anchor="middle" dominant-baseline="central">${initials}</text>
    <text x="200" y="490" font-family="system-ui" font-size="15"
      fill="rgba(255,255,255,0.6)" text-anchor="middle">${seed}</text>
  </svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(svg);
});

// ─── Routes API ───────────────────────────────────────────────────────────────

server.get('/api/contents/featured', (req, res) => {
  res.json({ featured: router.db.getState().featured });
});

server.get('/api/contents/trending', (req, res) => {
  const t = router.db.getState().trending;
  res.json({ trending: t, contents: t });
});

server.get('/api/contents/:id', (req, res) => {
  const content = router.db.getState().contents.find(c => c._id === req.params.id);
  if (!content) return res.status(404).json({ message: 'Contenu introuvable', code: 'CONTENT_NOT_FOUND' });
  res.json(content);
});

server.post('/api/contents/:id/view', (req, res) => res.json({ viewCount: 999 }));

server.get('/api/contents', (req, res) => {
  let contents = [...router.db.getState().contents];
  const { type, category, subCategory, accessType, isTutorial, search, limit = 20, page = 1 } = req.query;
  if (type)        contents = contents.filter(c => c.type === type);
  if (category)    contents = contents.filter(c => c.category === category);
  if (subCategory) contents = contents.filter(c => c.subCategory === subCategory);
  if (accessType) contents = contents.filter(c => c.accessType === accessType);
  if (isTutorial) contents = contents.filter(c => c.isTutorial === (isTutorial === 'true'));
  if (search)     contents = contents.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.artist || '').toLowerCase().includes(search.toLowerCase())
  );
  const total = contents.length;
  const paged = contents.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit));
  res.json({ contents: paged, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

server.get('/api/contents/:id/lessons', (req, res) => res.json({
  tutorialId: req.params.id,
  title: 'Apprendre le Salegy',
  thumbnail: null,
  totalLessons: 6,
  lessons: [
    { index: 0, title: 'Introduction au rythme salegy',  duration: 480, thumbnail: null },
    { index: 1, title: 'Techniques de base à la guitare', duration: 620, thumbnail: null },
    { index: 2, title: 'Accords fondamentaux',            duration: 540, thumbnail: null },
    { index: 3, title: 'Premier morceau complet',         duration: 720, thumbnail: null },
    { index: 4, title: 'Variations et ornements',         duration: 580, thumbnail: null },
    { index: 5, title: 'Performance finale',              duration: 900, thumbnail: null },
  ],
}));

server.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: 'Champs manquants', code: 'MISSING_FIELDS' });
  res.status(201).json({
    token: 'mock-jwt-' + Date.now(),
    refreshToken: 'mock-refresh',
    user: { _id: 'u1', username, email, role: 'user', isPremium: false },
  });
});

server.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(401).json({ message: 'Email ou mot de passe incorrect', code: 'INVALID_CREDENTIALS' });
  res.json({
    token: 'mock-jwt-' + Date.now(),
    refreshToken: 'mock-refresh',
    user: { _id: 'u1', username: 'TestUser', role: 'user', isPremium: false },
  });
});

server.post('/api/auth/logout',  (_, res) => res.json({ message: 'Déconnecté' }));
server.post('/api/auth/refresh', (_, res) => res.json({ token: 'mock-jwt-' + Date.now(), refreshToken: 'mock-refresh-new' }));
server.post('/api/history/:id',       (_, res) => res.json({ message: 'Progression enregistrée' }));
server.get('/api/history',            (_, res) => res.json({ history: [] }));
server.get('/api/tutorial/progress',  (_, res) => res.json({ inProgress: [] }));
server.post('/api/tutorial/progress/:id', (req, res) =>
  res.json({ tutorialId: req.params.id, percentComplete: 16.67, completedLessons: [0], lastLessonIndex: 0 })
);
server.get('/api/hls/:id/token', (req, res) =>
  res.json({ hlsUrl: `/hls/${req.params.id}/index.m3u8?token=mock`, expiresIn: 600 })
);
server.get('/api/audio/:id/url', (_, res) =>
  res.json({
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    expiresIn: 900,
    metadata: { title: 'Mora Mora', artist: 'Tarika Sammy', album: 'Novy', duration: 243, coverArt: null },
  })
);

server.use('/api', router);

// 0.0.0.0 → accessible depuis le réseau local (Expo Go sur téléphone)
server.listen(3001, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIp = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) { localIp = net.address; break; }
    }
  }
  console.log('\n🟢 StreamMG Mock Server');
  console.log(`   Local   : http://localhost:3001/api`);
  console.log(`   Mobile  : http://${localIp}:3001/api  ← mettre dans lib/theme.ts`);
  console.log(`   Images  : http://${localIp}:3001/img/mora\n`);
});
