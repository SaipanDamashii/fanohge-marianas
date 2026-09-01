/* ============================================================
   FANOHGE — The Marianas Saga  ·  data.js
   Eras, islands, buildings, industries, policies, story events
   ============================================================ */

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function rnd(a, b){ return a + Math.random() * (b - a); }

/* ---------------- ERAS ---------------- */
const ERAS = [
  { id:"ancient",    name:"Ancient Chamorro Era",      short:"Ancient",   start:1300, end:1520, ypt:10,
    color:"#2e8b57", accent:"#7ed4a4",
    drift:{ culture:0.15, happiness:0.1, gold:0, popGrowth:1 },
    blurb:"For centuries the Chamorro people have lived among the latte stones and limestone cliffs — voyagers, fishers, farmers, and weavers bound to the sea and sky. Build your society on Saipan. Honor the ancestors. And prepare, for the world beyond the horizon is about to change forever." },
  { id:"contact",    name:"Age of Contact",             short:"Contact",   start:1521, end:1667, ypt:12,
    color:"#4a90c4", accent:"#8fc3e8",
    drift:{ culture:-0.1, happiness:-0.15, gold:1, popGrowth:0.5 },
    blurb:"Magellan's ships have touched the reef. Spanish galleons now cross the Marianas each year on the run from Acapulco to Manila. Strangers bring iron, trade — and sicknesses no one has ever survived. The old world and the new are colliding." },
  { id:"spanish",    name:"Spanish Colonial Era",       short:"Spanish",   start:1668, end:1898, ypt:2,
    color:"#c08436", accent:"#e8c06a",
    drift:{ culture:-0.5, happiness:-0.25, gold:2, popGrowth:0.5 },
    blurb:"Padre San Vitores has planted the cross. Missions spread, rebellion flares and is crushed, and the Spanish crown gathers the survivors onto Guam. The galleons call, cattle graze, and the Marianas are remade — language, faith, and blood all mixing under a foreign flag." },
  { id:"german",     name:"German Administration",      short:"German",    start:1899, end:1914, ypt:2,
    color:"#8a8f98", accent:"#c6cbd4",
    drift:{ culture:-0.2, happiness:-0.1, gold:2, popGrowth:1 },
    blurb:"Spain sells the Northern Marianas to the German Empire. A distant kaiser's governor arrives in Saipan with ledgers and laws. Copra is king, the Carolinians thrive, and German is heard in the streets of Garapan." },
  { id:"japanese",   name:"Japanese Mandate Era",       short:"Japanese",  start:1914, end:1944, ypt:2,
    color:"#b04a3a", accent:"#e8a08a",
    drift:{ culture:-0.6, happiness:-0.3, gold:3, popGrowth:3 },
    blurb:"In the opening days of the Great War, Japan takes the islands without a shot. A generation later the South Seas Development Company has turned Saipan into a sugar empire, the northern islands into outposts, and the Chamorro people into a minority in their own homeland. Then the guns of a new war come." },
  { id:"american",   name:"American Administration (TTPI)", short:"TTPI", start:1945, end:1977, ypt:2,
    color:"#3a6ea0", accent:"#7cc4ff",
    drift:{ culture:0.3, happiness:0.5, gold:2, popGrowth:1.5 },
    blurb:"The war ends in fire and ash. Under the United Nations trusteeship, the Marianas begin again — schools, hospitals, roads, and a quiet cultural reawakening. A new generation asks a dangerous question: what should we become?" },
  { id:"commonwealth",name:"Commonwealth Era",           short:"Commonwealth", start:1978, end:2029, ypt:1,
    color:"#4a7a5c", accent:"#8ce09a",
    drift:{ culture:0.3, happiness:0.2, gold:3, popGrowth:1 },
    blurb:"In 1978 the Northern Marianas join the United States as a commonwealth — self-governing, under the American flag. Garment factories rise, tourists pour in, and the islands ride a rollercoaster of boom, bust, and identity. After federalization in 2009, a long transition period — meant to end in 2014, then stretched to 2019 and again to 2029 — keeps the islands bound to a Washington that is itself beginning to unravel." },
  { id:"future",     name:"The Marianas Reborn",         short:"Future",   start:2029, end:null, ypt:1,
    color:"#8a4a9f", accent:"#c89ce0",
    drift:{ culture:0.4, happiness:0.2, gold:2, popGrowth:1 },
    blurb:"The long colonial arc has ended — and the United States is gone, dissolved in 2028. The Marianas stand free to choose their own future: reunify Guam and the north into a single Chamorro Republic, or continue alone as the Chamolinian Commonwealth. The story is yours to write." },
];
const ERA_BY_ID = {}; ERAS.forEach(e => ERA_BY_ID[e.id] = e);

/* ---------------- ISLANDS ---------------- */
const ISLAND_DEFS = {
  fdp:       { id:"fdp",       name:"Farallon de Pajaros", alt:"Uråkas", cx:210, cy:40,  rx:24, ry:17, seed:7,  fert:0, fish:1, forest:0, stone:1, size:0, special:"volcanic",
               blurb:"The northernmost rock of the chain — a lonely volcano cone rising from deep water. Few could ever live here." },
  maug:      { id:"maug",      name:"Maug",                alt:"Påpågan",   cx:210, cy:94,  rx:30, ry:22, seed:13, fert:1, fish:1, forest:0, stone:1, size:0, special:"volcanic",
               blurb:"Three islets circling a flooded volcanic caldera — a harbor inside a crater, and not much else." },
  asuncion:  { id:"asuncion",  name:"Asuncion",            alt:"Aggyo'",    cx:210, cy:152, rx:32, ry:23, seed:21, fert:1, fish:1, forest:1, stone:1, size:0, special:"volcanic",
               blurb:"A near-perfect volcanic cone. Its slopes once grew copra for distant trading firms." },
  agrihan:   { id:"agrihan",   name:"Agrihan",             alt:"Agrigan",   cx:210, cy:215, rx:36, ry:28, seed:29, fert:3, fish:1, forest:1, stone:1, size:1, special:"volcanic",
               blurb:"The tallest peak in all of Micronesia. Deep volcanic soil made this the most populated of the northern islands." },
  pagan:     { id:"pagan",     name:"Pagan",               alt:"Pågan",     cx:210, cy:288, rx:44, ry:33, seed:37, fert:2, fish:1, forest:2, stone:2, size:1, special:"volcanic",
               blurb:"Twin volcanoes wrapped in coconut groves. Sulfur vents and hot springs simmer beneath its black slopes." },
  alamagan:  { id:"alamagan",  name:"Alamagan",            alt:"Alamagan",  cx:210, cy:357, rx:30, ry:24, seed:43, fert:2, fish:1, forest:1, stone:1, size:0, special:"volcanic",
               blurb:"A steep, fertile island where a handful of families once farmed breadfruit and taro in the clouds." },
  guguan:    { id:"guguan",    name:"Guguan",              alt:"Guguan",    cx:210, cy:414, rx:26, ry:21, seed:53, fert:1, fish:1, forest:1, stone:1, size:0, special:"volcanic",
               blurb:"Volcanic, rugged, and almost untouched — a refuge for seabirds rather than people." },
  sarigan:   { id:"sarigan",   name:"Sarigan",             alt:"Sarigan",   cx:210, cy:466, rx:24, ry:19, seed:59, fert:1, fish:1, forest:1, stone:1, size:0, special:"volcanic",
               blurb:"A small green peak between Guguan and Anatahan, settled briefly and abandoned again." },
  anatahan:  { id:"anatahan",  name:"Anatahan",            alt:"Anatahan",  cx:210, cy:515, rx:40, ry:30, seed:67, fert:2, fish:1, forest:1, stone:1, size:1, special:"volcanic",
               blurb:"A long volcanic island with a restless crater. Its tragic wartime story haunts the island to this day." },
  fmedinilla:{ id:"fmedinilla",name:"Farallon de Medinilla", alt:"Fåddai",  cx:210, cy:566, rx:15, ry:11, seed:71, fert:0, fish:1, forest:0, stone:0, size:0, special:"",
               blurb:"A barren sliver of rock used by the U.S. military as a bombing range." },
  saipan:    { id:"saipan",    name:"Saipan",              alt:"Sa'ipan",   cx:210, cy:631, rx:52, ry:42, seed:79, fert:3, fish:4, forest:3, stone:3, size:3, special:"capital",
               blurb:"The heart of the story — limestone cliffs, reef flats, and the lagoons where Chamorro villages have stood for three thousand years." },
  tinian:    { id:"tinian",    name:"Tinian",              alt:"Tågå'",     cx:210, cy:710, rx:44, ry:36, seed:83, fert:5, fish:3, forest:2, stone:3, size:2, special:"fertile",
               blurb:"The flat, impossibly fertile 'cattle ranch of the Pacific' — sugar fields, ranches, and history's heaviest burdens." },
  aguijan:   { id:"aguijan",   name:"Aguijan",             alt:"Aguiguan",  cx:182, cy:754, rx:16, ry:12, seed:89, fert:1, fish:2, forest:1, stone:1, size:0, special:"",
               blurb:"A tiny limestone island off Tinian's southwest point, home to goats, seabirds, and the rare fisherman." },
  rota:      { id:"rota",      name:"Rota",                alt:"Luta",      cx:210, cy:786, rx:44, ry:33, seed:97, fert:3, fish:3, forest:4, stone:4, size:2, special:"stone",
               blurb:"The 'peaceful island' — lush, terraced, and dotted with the most spectacular latte stone quarries in the Marianas." },
  guam:      { id:"guam",      name:"Guam",                alt:"Guåhan",    cx:210, cy:856, rx:66, ry:44, seed:101, fert:4, fish:5, forest:4, stone:4, size:3, special:"capital",
               blurb:"The largest island of the chain — the seat of Spanish power, then an American territory, and always, in the Chamorro heart, home." },
};

/* ============================================================
   Real island outlines — normalized silhouettes of the actual
   Marianas coastline, traced from maps & satellite imagery.
   Coordinate space (map space): x: -1 (west) … +1 (east),
   y: -1 (north) … +1 (south).  Scaled by each island's rx/ry.
   polys: one or more closed outlines (Maug = its three islets).
   cones: optional summit-cone placement for the 3D board
          (Pagan & Guguan each carry two real volcanoes).
   ============================================================ */
/* ---------- Real island outlines (from OpenStreetMap coastlines) ----------
   Each poly is the actual coastline, normalized to unit aspect:
   x: -1 (west) … +1 (east), y: -1 (north) … +1 (south), with the
   island's real km size in kmW × kmH. polys[] holds one closed
   outline per landmass (Maug = its three islets). */
const ISLAND_OUTLINES = {
  fdp: { lat: 20.5449, lon: 144.8947, kmW: 1.77, kmH: 1.95, polys: [
    [[-0.6486,-0.7435],[-0.8773,-0.5782],[-0.9332,-0.3818],[-1,0.5513],[-0.9319,0.7355],[-0.1957,1],[0.3185,0.864],[0.4417,0.6409],[0.5755,0.6181],[0.6053,0.4548],[0.7423,0.4459],[0.682,0.3444],[0.8721,-0.0234],[1,-0.0649],[0.8325,-0.385],[0.8738,-0.5283],[0.5369,-0.4132],[0.1784,-0.5206],[-0.1493,-1],[-0.6292,-0.7541],[-0.6486,-0.7435]],
  ] },
  maug: { lat: 20.0233, lon: 145.2231, kmW: 3.13, kmH: 2.69, polys: [
    [[0.4193,0.5289],[0.3946,0.7552],[0.3304,0.8743],[0.3559,0.9357],[0.422,0.9076],[0.5027,0.7844],[0.6487,0.7111],[0.99,0.3227],[1,0.1324],[0.8195,-0.1157],[0.7572,-0.3276],[0.6576,-0.3981],[0.6258,-0.3613],[0.6202,-0.206],[0.4665,-0.036],[0.4415,0.1224],[0.4984,0.348],[0.4483,0.4592],[0.4193,0.5289]],
    [[-0.6652,0.909],[-0.4975,1],[-0.3759,0.8649],[-0.8045,0.3974],[-0.8876,0.134],[-0.87,-0.2165],[-0.7115,-0.6335],[-0.7815,-0.6166],[-0.8449,-0.4532],[-0.9525,-0.3657],[-0.9844,-0.2127],[-0.9259,-0.0983],[-1,0.421],[-0.9703,0.5934],[-0.8611,0.6914],[-0.8461,0.8597],[-0.7076,0.909],[-0.6652,0.909]],
    [[-0.2575,-0.5787],[-0.0356,-0.6242],[0.0874,-0.5603],[0.1446,-0.6509],[0.4447,-0.6718],[0.4333,-0.7216],[0.2107,-0.7229],[0.0161,-0.8808],[0.0104,-0.9203],[-0.1455,-1],[-0.5283,-0.7681],[-0.528,-0.6964],[-0.4549,-0.6948],[-0.3142,-0.5844],[-0.2575,-0.5787]],
  ] },
  asuncion: { lat: 19.6913, lon: 145.4034, kmW: 3.15, kmH: 3.56, polys: [
    [[0.4897,0.7837],[0.7974,0.5243],[0.9846,0.1974],[1,-0.0033],[0.8276,-0.5678],[0.279,-0.9389],[-0.0053,-1],[-0.3101,-0.9384],[-0.6177,-0.6898],[-0.6763,-0.5196],[-0.7533,-0.5338],[-0.7644,-0.3881],[-0.828,-0.3851],[-0.7736,-0.3337],[-0.8689,-0.143],[-0.9503,-0.1305],[-0.9046,-0.0701],[-1,-0.0627],[-0.8728,0.1162],[-0.9144,0.3634],[-0.8314,0.4875],[-0.8918,0.5542],[-0.6194,0.6486],[-0.6297,0.7147],[-0.404,0.8097],[-0.3982,0.9093],[-0.2043,0.9001],[-0.1811,1],[0.4846,0.7875],[0.4897,0.7837]],
  ] },
  agrihan: { lat: 18.7692, lon: 145.6681, kmW: 6.77, kmH: 9.73, polys: [
    [[-0.1068,-0.9348],[-0.211,-1],[-0.5312,-0.9028],[-0.6137,-0.7096],[-0.8337,-0.5778],[-0.8433,-0.3878],[-0.9385,-0.3315],[-1,-0.176],[-0.9232,-0.1139],[-0.9424,0.0751],[-0.8161,0.2625],[-0.8512,0.3667],[-0.7149,0.4177],[-0.5068,0.6579],[-0.515,0.7704],[-0.2889,0.8254],[-0.166,0.9089],[-0.176,0.9618],[-0.0956,0.935],[-0.0149,1],[0.2605,0.7145],[0.5697,0.7256],[0.7098,0.6487],[0.786,0.5353],[0.7194,0.4367],[0.7371,0.3025],[1,0.1689],[0.864,-0.524],[0.7141,-0.612],[0.5846,-0.6143],[0.3306,-0.8564],[-0.1081,-0.9228],[-0.1068,-0.9348]],
  ] },
  pagan: { lat: 18.1074, lon: 145.759, kmW: 10.84, kmH: 13.75, polys: [
    [[0.4062,-1],[0.2259,-0.9798],[0.0042,-0.8579],[-0.063,-0.7843],[-0.0758,-0.6393],[-0.0511,-0.5924],[0.0335,-0.5629],[0.0688,-0.4563],[0.0273,-0.4214],[0.0232,-0.3284],[-0.0246,-0.3088],[-0.0662,-0.3328],[0.0119,-0.2638],[-0.0275,-0.2343],[-0.0044,-0.0009],[-0.0375,0.1088],[-0.3983,0.3447],[-0.6171,0.3521],[-0.7669,0.4466],[-0.9294,0.7265],[-0.8997,0.7619],[-0.9365,0.7964],[-0.9302,0.8845],[-1,0.9526],[-0.9807,1],[-0.5931,0.9292],[-0.2847,0.7051],[-0.316,0.6659],[-0.2503,0.6301],[-0.2545,0.5395],[0.1641,0.0683],[0.4985,-0.0263],[0.7178,0.1087],[0.7427,0.0873],[0.6835,0.0024],[0.7496,-0.0084],[0.7434,-0.043],[0.8192,-0.0873],[0.9835,-0.4009],[1,-0.5736],[0.9385,-0.6891],[0.9362,-0.7934],[0.7751,-0.9222],[0.4096,-0.9957],[0.4062,-1]],
  ] },
  alamagan: { lat: 17.6002, lon: 145.8331, kmW: 3.94, kmH: 4.51, polys: [
    [[0.3409,-0.7866],[0.2994,-0.9179],[0.2243,-0.9707],[-0.0375,-1],[-0.5164,-0.9136],[-0.6251,-0.7603],[-0.7116,-0.8035],[-0.6622,-0.7114],[-0.7065,-0.6687],[-0.6757,-0.5707],[-0.9338,-0.2802],[-1,-0.1103],[-0.956,0.353],[-0.8509,0.5068],[-0.5722,0.6834],[-0.4407,0.9426],[-0.1813,1],[0.3298,0.9627],[0.4756,0.7614],[0.8566,0.5291],[0.9457,0.367],[1,-0.1014],[0.7113,-0.5464],[0.4721,-0.6485],[0.3629,-0.7489],[0.3409,-0.7866]],
  ] },
  guguan: { lat: 17.3093, lon: 145.8423, kmW: 2.31, kmH: 2.96, polys: [
    [[0.2274,0.9507],[0.6029,0.5654],[0.7568,0.1016],[0.9295,0.0717],[0.8858,-0.0643],[0.9727,-0.0374],[1,-0.1259],[0.6062,-0.1919],[0.5094,-0.3395],[0.7517,-0.5491],[0.721,-0.6098],[-0.007,-0.8944],[-0.0098,-1],[-0.6598,-0.8333],[-0.9854,-0.3854],[-0.9223,-0.2763],[-1,-0.0999],[-0.8835,0.1143],[-0.9955,0.1927],[-0.8858,0.2912],[-0.8835,0.4764],[-0.7415,0.5728],[0.1358,0.9252],[0.1369,1],[0.1557,0.9384],[0.2274,0.9507]],
  ] },
  sarigan: { lat: 16.7046, lon: 145.7785, kmW: 2.5, kmH: 3, polys: [
    [[-1,-0.0876],[-0.971,0.1478],[-0.6596,0.2846],[-0.3745,0.6694],[-0.0372,0.8602],[0.3663,0.8937],[0.4426,1],[0.4297,0.9476],[0.6479,0.9959],[0.7711,0.9164],[0.6685,0.6028],[0.8512,0.1587],[1,0.0504],[0.8291,-0.0638],[0.7339,-0.5711],[0.4951,-0.7635],[0.4195,-0.6952],[0.3204,-0.7386],[0.2311,-1],[-0.0465,-0.9621],[-0.0756,-0.7921],[-0.4501,-0.5343],[-0.784,-0.5948],[-0.9942,-0.144],[-1,-0.0876]],
  ] },
  anatahan: { lat: 16.3507, lon: 145.6787, kmW: 9.8, kmH: 4.33, polys: [
    [[-0.9721,-0.1362],[-0.9769,0.0823],[-0.9128,0.1268],[-0.8837,0.2634],[-0.9113,0.356],[-0.8798,0.355],[-0.8538,0.5985],[-0.7474,0.6317],[-0.7044,0.7484],[-0.7149,0.9668],[-0.6534,1],[-0.5244,0.8031],[-0.4951,0.862],[-0.4222,0.7831],[-0.3601,0.9681],[-0.2362,0.8085],[-0.1269,0.9006],[-0.0857,0.8121],[0.5341,0.8871],[0.7885,0.6992],[0.9005,0.4034],[0.9121,0.1143],[1,-0.0197],[0.9774,-0.4221],[0.9315,-0.5539],[0.8969,-0.5325],[0.7374,-0.8442],[0.5648,-0.9634],[0.0202,-0.8595],[-0.2794,-0.9877],[-0.6571,-1],[-0.771,-0.9046],[-0.88,-0.9964],[-1,-0.8244],[-0.9554,-0.5172],[-0.9725,-0.1601],[-0.9721,-0.1362]],
  ] },
  fmedinilla: { lat: 16.0166, lon: 146.0585, kmW: 1.39, kmH: 2.47, polys: [
    [[-0.9629,0.9933],[-0.5875,0.62],[-0.5963,0.3728],[-0.3486,0.2888],[-0.0973,0.3475],[-0.0243,0.126],[0.2401,0.1113],[0.4731,-0.2348],[0.8684,-0.4543],[0.8014,-0.5431],[1,-0.7599],[0.5776,-1],[0.3083,-0.7926],[0.2358,-0.4969],[-0.3558,-0.1328],[-0.3642,0.1901],[-0.7878,0.3708],[-1,1],[-0.9629,0.9933]],
  ] },
  saipan: { lat: 15.191, lon: 145.7598, kmW: 15.08, kmH: 21.9, polys: [
    [[0.394,-0.7766],[0.2682,-0.6389],[-0.0875,-0.5202],[-0.2093,-0.4286],[-0.298,-0.4101],[-0.2934,-0.3638],[-0.3965,-0.3406],[-0.4319,-0.2796],[-0.4967,-0.269],[-0.4749,-0.3088],[-0.5087,-0.2961],[-0.5187,-0.3183],[-0.5133,-0.2623],[-0.6087,-0.2875],[-0.6148,-0.0373],[-0.6681,0.1259],[-0.7384,0.2651],[-0.851,0.3477],[-0.8525,0.4435],[-0.9604,0.6065],[-0.9415,0.6874],[-1,0.7155],[-0.8249,0.7707],[-0.7355,0.8594],[-0.6083,0.8397],[-0.2718,0.8664],[-0.1503,1],[-0.0403,0.7072],[-0.1987,0.6375],[-0.2665,0.5217],[-0.1483,0.3294],[0.0382,0.2792],[0.1103,0.2948],[0.2104,0.3984],[0.4196,0.4102],[0.4622,0.278],[0.5391,0.2452],[0.3852,0.1786],[0.3516,0.0863],[0.2604,0.0168],[0.2534,-0.0361],[0.3188,-0.1213],[0.2659,-0.1904],[0.4313,-0.3514],[0.5509,-0.38],[0.6015,-0.4564],[0.7074,-0.4957],[0.6776,-0.5402],[0.7469,-0.6164],[0.725,-0.6792],[0.7982,-0.709],[0.9514,-0.693],[0.9937,-0.7467],[1,-0.8301],[0.8399,-0.9656],[0.7372,-1],[0.4002,-0.7806],[0.394,-0.7766]],
  ] },
  tinian: { lat: 15.0117, lon: 145.6281, kmW: 9.84, kmH: 19.71, polys: [
    [[0.3866,0.9455],[0.5308,0.8372],[0.5154,0.7912],[0.5743,0.7436],[0.6766,0.7106],[0.8016,0.7181],[0.8325,0.6992],[0.7296,0.5981],[0.7358,0.5229],[0.8173,0.4666],[0.7756,0.3897],[0.8754,0.3264],[1,0.0593],[0.832,-0.0719],[0.6166,-0.0909],[0.4404,-0.263],[0.4337,-0.3911],[0.6741,-0.5171],[0.6507,-0.5572],[0.5955,-0.5562],[0.6417,-0.7945],[0.6062,-0.858],[0.4412,-0.9705],[0.3424,-1],[0.0952,-0.8514],[-0.2296,-0.7223],[-0.2675,-0.6763],[-0.6894,-0.4666],[-0.6374,-0.4299],[-0.682,-0.3264],[-0.7847,-0.2833],[-0.8642,-0.2941],[-1,-0.0696],[-0.9671,-0.0222],[-0.8602,0.0249],[-0.9505,0.1789],[-0.7791,0.2454],[-0.5069,0.2167],[-0.4236,0.2393],[-0.4393,0.286],[-0.3295,0.3358],[-0.3384,0.4455],[-0.2147,0.5036],[-0.0419,0.5332],[0.0793,0.6578],[0.0083,0.7947],[0.0914,0.9738],[0.2286,1],[0.3808,0.9488],[0.3866,0.9455]],
  ] },
  aguijan: { lat: 14.8536, lon: 145.5583, kmW: 4.47, kmH: 2.87, polys: [
    [[-0.5757,1],[-0.1208,0.7303],[0.2365,0.7367],[0.7574,0.1752],[0.8224,-0.0279],[0.8994,-0.0247],[0.9553,-0.2186],[0.9464,-0.4178],[1,-0.5178],[0.9773,-0.6996],[0.9147,-0.8793],[0.7062,-1],[0.5493,-0.8301],[0.4069,-0.8328],[0.2947,-0.6249],[-0.0399,-0.5071],[-0.3418,-0.241],[-0.6317,-0.1332],[-0.8637,0.0623],[-0.9938,0.4248],[-1,0.7188],[-0.9133,0.9091],[-0.667,0.9999],[-0.5757,1]],
  ] },
  rota: { lat: 14.1554, lon: 145.2057, kmW: 18.25, kmH: 9.92, polys: [
    [[-0.9989,0.8165],[-0.9814,0.8482],[-0.8976,0.7388],[-0.8077,0.4641],[-0.728,0.3518],[-0.6374,0.3919],[-0.4673,0.5892],[-0.4295,0.8188],[-0.4566,0.9642],[-0.4233,1],[-0.3548,0.9885],[-0.3167,0.9075],[-0.2555,0.8736],[-0.1241,0.8968],[-0.0869,0.9529],[-0.0124,0.878],[0.1052,0.8751],[0.1873,0.6539],[0.2978,0.5433],[0.2781,0.3192],[0.4177,0.0899],[0.6196,0.0151],[0.7394,0.0796],[0.9058,-0.1038],[0.931,-0.4583],[1,-0.7589],[0.978,-0.8146],[0.8261,-0.9108],[0.421,-1],[0.1577,-0.7573],[-0.0139,-0.4981],[-0.1093,-0.4167],[-0.3769,-0.2588],[-0.5425,-0.2859],[-0.5615,-0.1939],[-0.7123,0.0775],[-0.7497,0.2486],[-0.8596,0.4673],[-0.8587,0.4121],[-0.8902,0.4409],[-0.8657,0.4723],[-0.929,0.5477],[-0.8967,0.5434],[-0.9777,0.6292],[-1,0.8131],[-0.9989,0.8165]],
  ] },
  guam: { lat: 13.4504, lon: 144.7958, kmW: 34.73, kmH: 45.1, polys: [
    [[-0.8915,0.346],[-0.9147,0.4349],[-1,0.5355],[-0.896,0.5979],[-0.8667,0.7295],[-0.8137,0.7472],[-0.8616,0.7734],[-0.8324,0.8798],[-0.7379,0.9613],[-0.4268,1],[-0.3246,0.9099],[-0.3584,0.8937],[-0.2845,0.8738],[-0.2959,0.8407],[-0.2623,0.8603],[-0.224,0.8365],[-0.1472,0.7242],[-0.153,0.5708],[-0.2117,0.549],[-0.1453,0.5381],[-0.1638,0.4085],[-0.1125,0.3082],[-0.1508,0.2807],[-0.0435,0.1807],[-0.0699,0.1352],[0.0704,0.1136],[0.4656,-0.1739],[0.5664,-0.2048],[0.6004,-0.2747],[0.8106,-0.3475],[0.9001,-0.501],[0.9011,-0.5761],[0.961,-0.6226],[1,-0.7306],[0.6982,-0.7594],[0.5287,-0.9471],[0.3987,-1],[0.2561,-0.8539],[0.2542,-0.6918],[0.0395,-0.4236],[0.0655,-0.3402],[0.0298,-0.2872],[-0.1344,-0.2743],[-0.1657,-0.2414],[-0.1299,-0.1936],[-0.1783,-0.1443],[-0.4182,-0.1503],[-0.5124,-0.1054],[-0.5517,-0.1291],[-0.5632,-0.0983],[-0.6551,-0.0656],[-0.6844,-0.0861],[-0.7965,-0.0665],[-0.6734,-0.0627],[-0.7146,-0.055],[-0.7011,-0.0366],[-0.7959,-0.0381],[-0.7665,-0.0145],[-0.7108,-0.0288],[-0.7039,0.0065],[-0.734,0.0457],[-0.7897,0.0223],[-0.7364,0.1277],[-0.7512,0.1073],[-0.7639,0.1547],[-0.7955,0.1576],[-0.8915,0.346]],
  ] },
};

/* Slight E-W drift so the chain meanders like the real archipelago */
const ISLE_DRIFT = { fdp:-5, maug:-3, asuncion:-1, agrihan:2, pagan:4, alamagan:5, guguan:5, sarigan:4, anatahan:2, fmedinilla:6, saipan:3, tinian:1, aguijan:0, rota:-2, guam:-6 };

/* Per-island size factor (<1 shrinks) so the real km-scaled coastlines
   keep clear water between neighbours on the 2D map. */
const ISLE_FIT = { tinian: 0.70, aguijan: 0.60, rota: 0.60 };

const ISLAND_ORDER = ["fdp","maug","asuncion","agrihan","pagan","alamagan","guguan","sarigan","anatahan","fmedinilla","saipan","tinian","aguijan","rota","guam"];

/* ---------------- BUILDINGS ---------------- */
/* effects keys: housing, food, wood, stone, gold, culture, approval, military, popGrowth, selfSufficiency */
const BUILDING_DEFS = {
  /* --- Ancient Chamorro --- */
  guma:         { id:"guma", icon:"🏠", era:"ancient", name:"Guma' (Thatch House)",
    cost:{ wood:18 }, effects:{ housing:55, approval:1 },
    desc:"A raised thatch home on stone footings. Every guma' is a family, and every family is the nation." },
  village_center:{ id:"village_center", icon:"🏛️", era:"ancient", name:"Village Center",
    cost:{ wood:26, stone:12 }, effects:{ housing:15, approval:3, culture:2 },
    desc:"The heart of the village where councils meet, feasts are shared, and stories are told." },
  canoe:        { id:"canoe", icon:"🛶", era:"ancient", name:"Proa Canoe Fleet",
    cost:{ wood:24 }, effects:{ food:16, popGrowth:1 },
    desc:"The swift outrigger proa — fastest vessel in the Pacific. More canoes mean more fish, more trade, more voyages." },
  taro_patch:   { id:"taro_patch", icon:"🌿", era:"ancient", name:"Taro Patch",
    cost:{ wood:8 }, effects:{ food:15 },
    desc:"Wetland terraces of taro, the sacred staple of the Marianas." },
  yam_field:    { id:"yam_field", icon:"🥔", era:"ancient", name:"Yam Field",
    cost:{ wood:8 }, effects:{ food:13 },
    desc:"Dotted plots of yams and sweet potatoes tended with digging sticks." },
  coconut_grove:{ id:"coconut_grove", icon:"🥥", era:"ancient", name:"Coconut Grove",
    cost:{ wood:10 }, effects:{ food:9, wood:2, gold:1 },
    desc:"The tree of life — food, drink, thatch, cordage, and later, copra for the world's markets." },
  fishtrap:     { id:"fishtrap", icon:"🐟", era:"ancient", name:"Reef Fish Trap",
    cost:{ wood:5 }, effects:{ food:9 },
    desc:"Stone weirs and woven traps in the reef flats. The sea gives generously to the patient." },
  latte:        { id:"latte", icon:"🗿", era:"ancient", name:"Latte Stone House",
    cost:{ stone:38 }, effects:{ culture:4, approval:2 },
    desc:"Megalithic pillars of quarried limestone raising the chiefs' houses above the village — the enduring symbol of Chamorro identity." },
  shrine:       { id:"shrine", icon:"🕯️", era:"ancient", name:"Ancestral Shrine",
    cost:{ wood:14, stone:10 }, effects:{ culture:4 },
    desc:"A place for offerings to taotaomo'na — the spirits of the ancestors who watch over the living." },
  meeting_house: { id:"meeting_house", icon:"🔥", era:"ancient", name:"Guma' Ulitao",
    cost:{ wood:22 }, effects:{ approval:3, culture:2, military:2 },
    desc:"The young men's house, where warriors train, elders teach, and the village's pride is kept burning." },
  warrior_hall: { id:"warrior_hall", icon:"⚔️", era:"ancient", name:"Warrior Hall",
    cost:{ wood:28, stone:6 }, effects:{ military:5, approval:1 },
    desc:"Sling stones, spears, and the fierce pride of the maga'lahi. The Marianas were never conquered — not yet." },
  stone_wall:   { id:"stone_wall", icon:"🧱", era:"ancient", name:"Stone Defenses",
    cost:{ stone:24 }, effects:{ military:3 },
    desc:"Rubble walls and fortifications watching the reef passes." },
  latte_quarry: { id:"latte_quarry", icon:"⛏️", era:"ancient", name:"Latte Stone Quarry",
    cost:{ wood:30, stone:12 }, effects:{ stone:2, approval:1 },
    desc:"Chamorro masons split and dress coral limestone — the very stone that raised the latte pillars. Rota's great quarries are remembered in song." },

  /* --- Spanish era --- */
  church:       { id:"church", icon:"⛪", era:"spanish", name:"Church",
    cost:{ stone:55, wood:25 }, effects:{ approval:4, culture:-2 },
    desc:"The mission bells ring across the village. Faith unites — and the old ways are asked to kneel." },
  mission_house:{ id:"mission_house", icon:"📖", era:"spanish", name:"Mission House",
    cost:{ wood:35, stone:18 }, effects:{ approval:2, culture:-1 },
    desc:"Residence and school for the friars who baptize, teach, and record every soul." },
  plaza:        { id:"plaza", icon:"⛲", era:"spanish", name:"Plaza",
    cost:{ stone:26 }, effects:{ approval:3, culture:1, gold:2 },
    desc:"A paved heart for fiestas, markets, and the slow rhythm of colonial life." },
  market:       { id:"market", icon:"🧺", era:"spanish", name:"Market",
    cost:{ wood:26 }, effects:{ gold:4, approval:1 },
    desc:"Where island produce meets the galleon trade — tobacco, copra, and corn changing hands." },
  cattle_ranch: { id:"cattle_ranch", icon:"🐂", era:"spanish", name:"Cattle Ranch",
    cost:{ wood:18 }, effects:{ food:11, gold:3 },
    desc:"Carabao and cattle roam the pasturelands, hauling, plowing, and feeding the island." },
  corn_field:   { id:"corn_field", icon:"🌽", era:"spanish", name:"Corn & Tobacco Field",
    cost:{ wood:12 }, effects:{ food:12, gold:3 },
    desc:"New world crops that would forever change the island diet and the island purse." },
  road:         { id:"road", icon:"🛤️", era:"spanish", name:"Coral Road",
    cost:{ stone:14 }, effects:{ gold:1, approval:1 },
    desc:"Crushed coral roads linking villages, ranches, and the harbor." },
  stone_bridge: { id:"stone_bridge", icon:"🌉", era:"spanish", name:"Stone Bridge",
    cost:{ stone:24 }, effects:{ gold:1, approval:1 },
    desc:"Solid arches over the streams — engineering that outlasts the empires that built it." },
  fort:         { id:"fort", icon:"🏰", era:"spanish", name:"Fortress Garrison",
    cost:{ stone:55, wood:28 }, effects:{ military:10, approval:-1 },
    desc:"A walled garrison of Spanish and Filipino soldiers watching the harbor and the horizon." },
  galleon_port: { id:"galleon_port", icon:"⚓", era:"spanish", name:"Galleon Port",
    cost:{ wood:75, stone:40 }, effects:{ gold:8, food:3 },
    desc:"Where the Manila galleons and their silver-laden holds call for water, food, and repairs." },
  stone_quarry: { id:"stone_quarry", icon:"🪨", era:"spanish", name:"Limestone Quarry",
    cost:{ wood:45, stone:25 }, effects:{ stone:3 },
    desc:"Coral limestone cut for fort walls, church towers, and cobbled roads — the colonial era runs on stone." },
  church_school:{ id:"church_school", icon:"🎓", era:"spanish", name:"Parish School",
    cost:{ wood:36 }, effects:{ approval:2, culture:-2 },
    desc:"Reading, writing, and the catechism — in Spanish. Education, at the price of a mother tongue." },

  /* --- German era --- */
  copra_plantation:{ id:"copra_plantation", icon:"🌴", era:"german", name:"Copra Plantation",
    cost:{ wood:28 }, effects:{ gold:6, food:2 },
    desc:"Row after row of coconut palms, their dried meat shipped to Hamburg as oil and soap." },
  admin_office: { id:"admin_office", icon:"🏢", era:"german", name:"District Office",
    cost:{ wood:24, stone:10 }, effects:{ gold:2, approval:-1 },
    desc:"The kaiser's flag, the kaiser's ledger, and the kaiser's taxes." },
  german_school:{ id:"german_school", icon:"📚", era:"german", name:"German School",
    cost:{ wood:28 }, effects:{ approval:1, culture:-1 },
    desc:"Children learn to sing the kaiser's anthem in the kaiser's tongue." },
  port_wharf:   { id:"port_wharf", icon:"🛥️", era:"german", name:"Steam Wharf",
    cost:{ wood:55, stone:30 }, effects:{ gold:6, food:3 },
    desc:"A proper wharf where steamships of the Pacific line load copra and unload mail, machines, and merchandise." },
  lighthouse:   { id:"lighthouse", icon:"🗼", era:"german", name:"Lighthouse",
    cost:{ stone:18 }, effects:{ gold:2, approval:1 },
    desc:"A steady beam for the growing night traffic across the Philippine Sea." },

  /* --- Japanese era --- */
  sugarcane_field:{ id:"sugarcane_field", icon:"🎋", era:"japanese", name:"Sugarcane Field",
    cost:{ wood:18 }, effects:{ gold:4, food:-1 },
    desc:"Green oceans of cane swallowing the flatlands of Saipan and Tinian." },
  sugar_mill:   { id:"sugar_mill", icon:"🏭", era:"japanese", name:"Sugar Mill",
    cost:{ wood:70, stone:40 }, effects:{ gold:12, approval:-2 },
    desc:"The great chimney of the Nan'yo Kohatsu mill — crushing cane day and night, feeding an empire's sweet tooth." },
  immigrant_camp:{ id:"immigrant_camp", icon:"⛺", era:"japanese", name:"Laborer Housing",
    cost:{ wood:28 }, effects:{ housing:200, gold:1, approval:-2, culture:-2 },
    desc:"Barracks for Okinawan, Korean, and Japanese laborers — the workforce that remade the islands." },
  railway:      { id:"railway", icon:"🚂", era:"japanese", name:"Sugar Railway",
    cost:{ stone:45, wood:18 }, effects:{ gold:5 },
    desc:"Little locomotives hauling cane from field to mill across Saipan and Tinian." },
  power_plant:  { id:"power_plant", icon:"⚡", era:"japanese", name:"Power Plant",
    cost:{ stone:38, wood:28 }, effects:{ gold:3, approval:2 },
    desc:"Electric lights come to Garapan — the islands hum into the modern age." },
  fish_cannery: { id:"fish_cannery", icon:"🥫", era:"japanese", name:"Fish Cannery",
    cost:{ wood:38, stone:18 }, effects:{ gold:7, food:6 },
    desc:"Tuna, bonito, and mackerel canned for export to the home islands." },
  phosphate_mine:{ id:"phosphate_mine", icon:"⛏️", era:"japanese", name:"Phosphate Mine",
    cost:{ stone:28, wood:8 }, effects:{ gold:9, approval:-3 },
    desc:"Guano and phosphate stripped from the northern isles to fertilize Japan's fields. The price of a mine is a scarred island." },
  harbor_upgrade:{ id:"harbor_upgrade", icon:"🚢", era:"japanese", name:"Deep-Water Harbor",
    cost:{ wood:95, stone:60 }, effects:{ gold:8 },
    desc:"The imperial fleet and the sugar freighters share the new quays of Saipan." },
  military_bunker:{ id:"military_bunker", icon:"🛡️", era:"japanese", name:"Defense Works",
    cost:{ stone:38 }, effects:{ military:8, approval:-3 },
    desc:"Pillboxes, gun emplacements, and tunnels — the islands become a fortress, whether they want to or not." },
  military_base:{ id:"military_base", icon:"🎖️", era:"future", name:"Air Base",
    cost:{ stone:70, gold:25 }, effects:{ military:22, gold:4, approval:-2 },
    desc:"Runways, hangars, radar, and barracks — national air power modeled on Andersen Air Force Base, which returns to the nation with Guam.",
    requires: s => !!s.flags.guam_bases },
  naval_base:{ id:"naval_base", icon:"⚓", era:"future", name:"Naval Base",
    cost:{ stone:65, gold:30 }, effects:{ military:20, gold:3, approval:-1 },
    desc:"Deep-water piers, cranes, and fuel depots for the fleet — modeled on Naval Base Guam at Apra Harbor.",
    requires: s => !!s.flags.guam_bases },

  /* --- American / TTPI --- */
  water_system: { id:"water_system", icon:"🚰", era:"american", name:"Water System",
    cost:{ wood:28, stone:18 }, effects:{ approval:5, food:4 },
    desc:"Pipes and catchments bring clean water to every village. Sickness retreats." },
  power_grid:   { id:"power_grid", icon:"💡", era:"american", name:"Power Grid",
    cost:{ stone:38 }, effects:{ approval:4, gold:2 },
    desc:"Reliable electricity — fridges, fans, and the glow of television in island living rooms." },
  hospital:     { id:"hospital", icon:"🏥", era:"american", name:"Hospital",
    cost:{ stone:48, wood:30 }, effects:{ approval:6, popGrowth:2 },
    desc:"Doctors, nurses, and surgery — the old epidemics become memory." },
  high_school:  { id:"high_school", icon:"🏫", era:"american", name:"High School",
    cost:{ wood:38, stone:18 }, effects:{ approval:4, culture:2 },
    desc:"A generation educated in English — and increasingly curious about its own lost language." },
  airport:      { id:"airport", icon:"✈️", era:"american", name:"Airport",
    cost:{ stone:95, wood:55 }, effects:{ gold:10 },
    desc:"Runways stretch across the old battlefields. The world arrives in hours, not months." },
  deep_harbor:  { id:"deep_harbor", icon:"🛳️", era:"american", name:"Deep Harbor",
    cost:{ stone:110 }, effects:{ gold:12 },
    desc:"Container ships and tour liners tie up where proas once beached." },
  asphalt_roads:{ id:"asphalt_roads", icon:"🛣️", era:"american", name:"Highway Network",
    cost:{ stone:38 }, effects:{ gold:4, approval:2 },
    desc:"Smooth blacktop links every village, beach, and business on the island." },
  telecom:      { id:"telecom", icon:"📡", era:"american", name:"Telecommunications",
    cost:{ stone:28 }, effects:{ gold:4, approval:1 },
    desc:"Satellite dishes and telephone lines — the Marianas join the global conversation." },

  /* --- Commonwealth era --- */
  resort_hotel: { id:"resort_hotel", icon:"🏝️", era:"commonwealth", name:"Resort Hotel",
    cost:{ stone:110, wood:55 }, effects:{ gold:16, approval:1 },
    desc:"White towers on the lagoon, Japanese tour groups on the beach, and cash registers ringing in Garapan." },
  garment_factory:{ id:"garment_factory", icon:"👕", era:"commonwealth", name:"Garment Factory",
    cost:{ wood:55, stone:30 }, effects:{ gold:14, housing:60, approval:-3, culture:-1 },
    desc:"Duty-free labels sewn for the American market by workers from China, Bangladesh, and the Philippines." },
  tourism_pier: { id:"tourism_pier", icon:"⛵", era:"commonwealth", name:"Tourism Pier",
    cost:{ stone:45 }, effects:{ gold:8 },
    desc:"Dive boats and cruise tenders come and go with the tide of visitors." },
  duty_free_mall:{ id:"duty_free_mall", icon:"🛍️", era:"commonwealth", name:"Duty-Free Complex",
    cost:{ stone:55 }, effects:{ gold:8 },
    desc:"Perfume, jewelry, and electronics — shopping as a national industry." },
  labor_housing:{ id:"labor_housing", icon:"🛏️", era:"commonwealth", name:"Worker Dormitories",
    cost:{ wood:36 }, effects:{ housing:300, approval:-1 },
    desc:"Rows of beds for the thousands of guest workers who keep the factories and hotels running." },
  federal_office:{ id:"federal_office", icon:"🏛️", era:"commonwealth", name:"Federal Programs Office",
    cost:{ stone:36 }, effects:{ gold:6, approval:1, culture:-1 },
    desc:"Grants, entitlements, and paperwork — the islands' lifeline to Washington." },
  cultural_center:{ id:"cultural_center", icon:"🥁", era:"commonwealth", name:"Cultural Center",
    cost:{ wood:38, stone:18 }, effects:{ culture:8, approval:3 },
    desc:"Chamorro and Carolinian language classes, dance troupes, and the proud reclaiming of the past." },

  /* --- Future era --- */
  green_energy: { id:"green_energy", icon:"🌞", era:"future", name:"Renewable Energy Farm",
    cost:{ stone:75 }, effects:{ gold:5, approval:3, selfSufficiency:8 },
    desc:"Solar fields and wind turbines — the islands begin to make their own power, and their own future." },
  university:   { id:"university", icon:"🎓", era:"future", name:"University of the Marianas",
    cost:{ stone:95, wood:55 }, effects:{ culture:8, gold:4, approval:4, selfSufficiency:5 },
    desc:"A campus where the next generation studies ocean science, Chamorro literature, and nation-building." },
  tech_park:    { id:"tech_park", icon:"💻", era:"future", name:"Technology Park",
    cost:{ stone:85 }, effects:{ gold:14, selfSufficiency:8, culture:1 },
    desc:"Data centers, software firms, and undersea cables — brains as the new export." },
  deep_sea_port:{ id:"deep_sea_port", icon:"🚢", era:"future", name:"Deep-Sea Transshipment Port",
    cost:{ stone:115 }, effects:{ gold:14, selfSufficiency:6 },
    desc:"Where the Pacific's container lanes meet — a hub of ships, cranes, and commerce." },
  desalination: { id:"desalination", icon:"💧", era:"future", name:"Desalination Plant",
    cost:{ stone:58 }, effects:{ approval:4, selfSufficiency:5 },
    desc:"The ocean itself becomes the well — water security for a changing climate." },
  heritage_site:{ id:"heritage_site", icon:"🗿", era:"future", name:"Heritage & Ecotourism Site",
    cost:{ stone:38 }, effects:{ culture:10, gold:5, approval:3 },
    desc:"Latte parks, reef sanctuaries, and village tours — the past, carefully kept, pays its own way." },
  fish_farm:    { id:"fish_farm", icon:"🐠", era:"future", name:"Offshore Fish Farm",
    cost:{ wood:48, stone:18 }, effects:{ food:20, gold:4 },
    desc:"Floating pens of grouper and snapper — the sea, farmed instead of just fished." },
  film_studio:  { id:"film_studio", icon:"🎬", era:"future", name:"Pacific Film Studio",
    cost:{ stone:58 }, effects:{ gold:10, culture:4 },
    desc:"Lagoons doubling for paradise on screens around the world — and island stories told by island voices." },
  spaceport:    { id:"spaceport", icon:"🚀", era:"future", name:"Equatorial Spaceport",
    cost:{ stone:120 }, effects:{ gold:20, approval:4, selfSufficiency:4 },
    desc:"A launch corridor over the open Pacific — small rockets, big dreams, and a seat at the table of the space age." },
};

/* ---------------- INDUSTRIES (island specialization, future era) ---------------- */
const INDUSTRIES = {
  tourism:   { id:"tourism",   icon:"🏝️", name:"Tourism Hub",      perLvl:{ gold:4, approval:1 },
               desc:"Resorts, cruise calls, and lagoon days. Gold flows in; the beaches pay." },
  agriculture:{ id:"agriculture", icon:"🌾", name:"Agriculture Belt", perLvl:{ food:18, gold:2 },
               desc:"Tinian-style fertility turned to staple crops and export produce." },
  fishing:   { id:"fishing",   icon:"🐟", name:"Fishery Port",     perLvl:{ food:14, gold:2 },
               desc:"Tuna fleets, canneries, and seafood exports from the richest waters on earth." },
  energy:    { id:"energy",    icon:"⚡", name:"Renewable Energy",  perLvl:{ gold:3, selfSufficiency:5, approval:1 },
               desc:"Solar, wind, and volcanic geothermal — the islands power themselves and their neighbors." },
  tech:      { id:"tech",      icon:"💻", name:"Technology Park",   perLvl:{ gold:6, selfSufficiency:4, culture:1 },
               desc:"Data, software, and submarine cable landings. The export is intelligence." },
  logistics: { id:"logistics", icon:"🚢", name:"Logistics Hub",     perLvl:{ gold:5, selfSufficiency:4 },
               desc:"Transshipment, warehousing, and the Pacific's crossroads." },
  heritage:  { id:"heritage",  icon:"🗿", name:"Heritage & Culture", perLvl:{ culture:4, gold:2, approval:1 },
               desc:"Latte parks, museums, and living villages — the ancestors, honored and employed." },
};

/* ---------------- POLICIES (governance) ---------------- */
const POLICIES = {
  free_press:   { id:"free_press", icon:"📰", gov:"dem", era:"future", name:"Free Press & Open Media",
    upkeep:3, research:4, effects:{ happiness:4, culture:2, gold:-2 },
    desc:"An unfettered press holds power accountable. Trust rises; control loosens." },
  media_control:{ id:"media_control", icon:"📺", gov:"aut", era:"future", name:"State Media & Censorship",
    upkeep:2, research:3, effects:{ happiness:-3, culture:-2, gold:2 },
    desc:"One voice, one narrative. Quiet streets — and a quiet fear." },
  labor_rights: { id:"labor_rights", icon:"🤝", gov:"dem", era:"future", name:"Strong Labor Rights",
    upkeep:4, research:4, effects:{ happiness:5, gold:-3, culture:1 },
    desc:"Fair wages, unions, and dignity for every worker, citizen or guest." },
  labor_directives:{ id:"labor_directives", icon:"🛠️", gov:"aut", era:"future", name:"State Labor Directives",
    upkeep:2, research:3, effects:{ gold:5, happiness:-4 },
    desc:"Work is assigned, wages are set, and strikes are forbidden." },
  green_agenda: { id:"green_agenda", icon:"🌱", gov:"dem", era:"future", name:"Green Nation Agenda",
    upkeep:3, research:5, effects:{ selfSufficiency:6, gold:-2, approval:3 },
    desc:"Climate action as national identity — reefs, renewables, and resilience." },
  rapid_industrial:{ id:"rapid_industrial", icon:"🏭", gov:"aut", era:"future", name:"Rapid Industrialization",
    upkeep:3, research:4, effects:{ gold:6, happiness:-3, selfSufficiency:3 },
    desc:"Build now, ask later. The cranes never stop." },
  open_immigration:{ id:"open_immigration", icon:"🌏", gov:"dem", era:"future", name:"Open & Fair Immigration",
    upkeep:2, research:5, effects:{ popGrowth:2, culture:1, happiness:-1 },
    desc:"The islands welcome newcomers as neighbors, with a clear path to belonging." },
  border_control:{ id:"border_control", icon:"🚧", gov:"aut", era:"future", name:"Strict Border Control",
    upkeep:2, research:3, effects:{ happiness:-2, gold:2 },
    desc:"Who enters, who stays, who works — all decided above." },
  heritage_fund:{ id:"heritage_fund", icon:"🗿", gov:"dem", era:"future", name:"Heritage & Language Fund",
    upkeep:3, research:4, effects:{ culture:6, approval:2, gold:-2 },
    desc:"Chamorro and Carolinian language nests, canoe voyaging, and latte restoration." },
  strongman:    { id:"strongman", icon:"👑", gov:"aut", era:"future", name:"Strongman Rule",
    upkeep:1, research:2, effects:{ happiness:-2, gold:2, culture:-1 },
    desc:"The leader is the state. Loyalty is rewarded; doubt is not." },
  anti_corruption:{ id:"anti_corruption", icon:"⚖️", gov:"dem", era:"future", name:"Anti-Corruption Courts",
    upkeep:3, research:6, effects:{ approval:3, gold:2, happiness:2 },
    desc:"Independent courts that bite the hands that feed them." },
  unity_council:{ id:"unity_council", icon:"🕊️", gov:"any", era:"future", name:"Council of Elders & Mayors",
    upkeep:2, research:3, effects:{ happiness:3, culture:2 },
    desc:"Traditional leadership and island mayors share in every major decision." },
  civic_education:{ id:"civic_education", icon:"🎓", gov:"dem", era:"future", name:"Civic Education for All",
    upkeep:2, research:4, effects:{ culture:3, happiness:2, selfSufficiency:2 },
    desc:"Every citizen learns the law, the budget, and the vote — literacy for nationhood." },
  transparency_law:{ id:"transparency_law", icon:"📂", gov:"dem", era:"future", name:"Open Government Records",
    upkeep:2, research:5, effects:{ approval:4, gold:1, culture:1 },
    desc:"Every decision, every contract, every dollar — published and audited." },
  tech_surveillance:{ id:"tech_surveillance", icon:"📡", gov:"aut", era:"future", name:"National Surveillance Grid",
    upkeep:4, research:6, effects:{ military:4, happiness:-4, gold:-1 },
    desc:"Every harbor, road, and phone line watched. Order is kept; privacy fades." },
  state_corporations:{ id:"state_corporations", icon:"🏦", gov:"aut", era:"future", name:"State-Owned Enterprises",
    upkeep:2, research:4, effects:{ gold:7, culture:-2 },
    desc:"The state runs the mills, the ships, and the resorts. Profits flow upward." },
  national_service:{ id:"national_service", icon:"🪖", gov:"aut", era:"future", name:"National Service Corps",
    upkeep:2, research:5, effects:{ military:3, gold:2, happiness:-2 },
    desc:"Every young islander serves — in the fleet, the reefs, or the fields." },
  public_schools:{ id:"public_schools", icon:"🏫", gov:"any", era:"future", name:"Universal Public Schools",
    upkeep:3, research:5, effects:{ culture:4, happiness:3, gold:-2 },
    desc:"A school in every village, on every island — the nation grows literate." },
  coral_reefs:  { id:"coral_reefs", icon:"🐠", gov:"any", era:"future", name:"Reef & Ocean Protection",
    upkeep:2, research:4, effects:{ selfSufficiency:4, culture:2 },
    desc:"No-take marine reserves ring the islands; the sea gives back more." },
  health_clinics:{ id:"health_clinics", icon:"🏥", gov:"any", era:"future", name:"Island Health Clinics",
    upkeep:3, research:4, effects:{ happiness:4, popGrowth:1, gold:-1 },
    desc:"A nurse on every island, a clinic in every port — longer, healthier lives." },
  typhoon_codes:{ id:"typhoon_codes", icon:"🌀", gov:"any", era:"future", name:"Typhoon-Resilient Building Codes",
    upkeep:2, research:5, effects:{ selfSufficiency:3, approval:2 },
    desc:"Storm-proof homes and hardened utilities for the typhoon belt." },
  tourism_board:{ id:"tourism_board", icon:"🏝️", gov:"any", era:"future", name:"National Tourism Board",
    upkeep:2, research:3, effects:{ gold:5, culture:1 },
    desc:"One brand, one booking system, one warm welcome for the world." },
  fisher_coops: { id:"fisher_coops", icon:"🎣", gov:"any", era:"future", name:"Fishermen's Cooperatives",
    upkeep:1, research:3, effects:{ food:6, gold:1 },
    desc:"Boats share catch, ice, and markets — the fleet works as one." },
};

/* ---------------- STORY EVENTS ---------------- */
/* fx keys: food, wood, stone, gold, happiness, culture, military, selfSufficiency,
   pop (global), popIsland {id:delta}, unlockIslands[], lockIslands[], setAccessible{id:bool},
   depopulateIslands[], movePop{from[],to,pct}, unlockBuilding (id), govPath, govMeter,
   era, flags{}, historyNote, revealIndustry, relationsGuam, reputation, stats{}
   Event triggers: era (id), year (exact), minYear, maxYear, after (event id), notFlags, chance (0-1), once */
const EVENTS = [
  /* ============ ANCIENT ============ */
  { id:"prologue", era:"ancient", year:1300, title:"The Guma' Rises",
    text:"The sun breaks over the reef flats of Saipan. Along the shore of Agingan, smoke rises from a new village — your village.\n\nHere, beneath the limestone cliffs, the Chamorro people have lived for three thousand years. The sea feeds you. The forests shelter you. The latte stones carry the memory of chiefs and ancestors who came before.\n\nThis is the beginning. Build your community, gather what the island gives, and honor the ways of your people. The world is about to change — but that story is still far over the horizon.",
    onEnter:{ historyNote:"The village of Agingan is founded on the western shore of Saipan." },
    choices:[
      { label:"Begin the work", hint:"Gather, build, and grow — the first step of a thousand-year journey.",
        text:"The conch shell sounds. Families raise the first guma' — thatch roofs over stone footings — and the island's long story continues.",
        fx:{ food:20, wood:10, culture:2, historyNote:"Founders raise the first guma' and plant the first taro patches." } }
    ]},

  { id:"latte_feast", era:"ancient", year:1310, title:"The Latte Stone Feast",
    text:"The head of the village calls for a great undertaking: the quarrying and raising of a new latte stone house — pillars of limestone taller than any man, to lift a chief's home above the village and honor the ancestors.\n\nIt will cost much stone and labor. But the chiefs of the neighboring villages will see it, and they will remember.",
    choices:[
      { label:"Raise the latte stone", hint:"-40 stone · culture and prestige grow",
        text:"Under the chants of the makhana, the great pillars rise. The village stands taller — in stone and in spirit.",
        fx:{ stone:-40, culture:8, approval:4, historyNote:"A great latte stone house is raised, its pillars visible from the reef." } },
      { label:"Hold a grand feast instead", hint:"-30 food · the villages bond in celebration",
        text:"The feast fires burn for three days. Canoes arrive from every district, and old rivalries dissolve in food and dance.",
        fx:{ food:-30, approval:6, culture:2, historyNote:"A three-day feast unites the villages of Saipan." } },
      { label:"Let it wait", hint:"Keep your resources for now",
        text:"The stones stay in the quarry. There will be other seasons, other chiefs.",
        fx:{ historyNote:"The chief declines to raise the latte stone this year." } }
    ]},

  { id:"typhoon_1340", era:"ancient", year:1340, title:"The Storm King",
    text:"The sky turns green. The sea begins to roar. Every Chamorro knows the signs — a typhoon is coming, the greatest of them all.\n\nFishermen beach their proas. Mothers call the children from the water. You have only hours to prepare.",
    choices:[
      { label:"Tie down and shelter", hint:"-15 wood · the village endures the storm",
        text:"Every guma' is lashed, every canoe hauled to the highest ground. When the wind passes, the village stands — shaken, but whole.",
        fx:{ wood:-15, food:-8, approval:-2, historyNote:"A great typhoon strikes; the village shelters and survives." } },
      { label:"Trust the ancestors", hint:"A gamble — some will be lost",
        text:"The old spirits are called upon, but the wind does not bargain. Several homes are lost, and the village mourns.",
        fx:{ food:-16, pop:-6, culture:2, approval:-6, historyNote:"A typhoon catches the village unprepared; lives are lost." } }
    ]},

  { id:"voyage_1400", era:"ancient", year:1400, title:"The Voyagers",
    text:"A council of navigators gathers under the stars. The proa is the fastest vessel in the Pacific — and some say it is time to prove it again, to sail far beyond the reef to the islands of the southern sea, where the red stone for the finest tools is traded.\n\nIt is a risk. Voyagers sometimes do not return. But they always return with stories — and with wealth.",
    choices:[
      { label:"Send the expedition", hint:"-1 canoe · 40% chance of great reward, 20% of loss",
        text:"The proas vanish over the horizon... ",
        fx:{ flags:{"voyage_sent":true} },
        fxChance:[
          { chance:0.4, text:"After many moons, sails appear on the reef. The voyagers return with red stone, rare shells, and tales of distant peoples.", fx:{ stone:30, gold:4, culture:3, historyNote:"Voyagers return from the southern sea with red stone and rare shells." } },
          { chance:0.4, text:"The expedition returns with modest trade — new fishing grounds charted, a few fine shells.", fx:{ stone:12, culture:1, historyNote:"The voyagers return with modest goods and new charts." } },
          { chance:0.2, text:"The season turns and the proas do not return. The village mourns its bravest sons.", fx:{ pop:-8, approval:-4, historyNote:"A voyaging proa is lost at sea; the village mourns." } }
        ] },
      { label:"Stay close to home", hint:"Keep your people safe",
        text:"The navigators agree to wait for a wiser season. The reef is home, and home is enough.",
        fx:{ historyNote:"The council declines to send a long voyage." } }
    ]},

  { id:"council_1450", era:"ancient", year:1450, title:"The Clans Divide",
    text:"Three great clans of Saipan — the matrilineal houses that trace their blood through mothers and grandmothers — now quarrel over fishing grounds and the right to the best latte stones.\n\nAt the council fire, the elders look to you. Unify them, or let them test each other with sling stones?",
    choices:[
      { label:"Marry the houses together", hint:"A union of blood · approval and culture rise",
        text:"A great marriage feast binds the clans. What was divided is now woven into one family — the foundation of a nation.",
        fx:{ approval:7, culture:4, military:-2, historyNote:"The great clans are united through marriage alliances." } },
      { label:"Let the sling stones fall", hint:"The strongest house will lead",
        text:"The feud plays out in skirmishes on the beach. One house prevails — and the village is poorer for the blood spilled.",
        fx:{ approval:-6, military:4, pop:-3, historyNote:"A clan feud bloodies the beaches of Saipan." } }
    ]},

  { id:"drought_1480", era:"ancient", year:1480, title:"The Dry Years",
    text:"The rains have not come. The taro patches crack, the yam vines wilt, and the streams run thin. Hunger is a slow animal, and it has settled in the village.\n\nThe elders remember droughts before — and how their grandmothers' grandmothers survived them.",
    choices:[
      { label:"Ration and dig deep wells", hint:"Hard months · some hunger, but survival",
        text:"Every household counts its baskets. Wells are dug deeper, and the village tightens its belt through the dry years.",
        fx:{ food:-20, pop:-4, approval:-3, historyNote:"The village endures a drought through rationing and wells." } },
      { label:"Hold the rain ceremony", hint:"The old ways · culture may mend what rain cannot",
        text:"Three nights of chanting and offerings to the taotaomo'na. Whether by spirit or by luck, the rains return thin but true.",
        fx:{ food:-10, pop:-2, culture:5, approval:2, historyNote:"The rain ceremony is held; the drought breaks." } }
    ]},

  { id:"first_iron", era:"ancient", year:1490, title:"Iron From the Sky",
    text:"A fisherman returns with a strange, heavy shard — rusted metal, unlike any shell or stone. A ship of strangers, he says, passed beyond the reef and traded iron for water.\n\nSome say the metal is a gift from the gods. Others say the strangers are omens of something greater.",
    choices:[
      { label:"Study it, and prepare", hint:"Knowledge is a weapon",
        text:"The smiths and the elders study the strange metal. Whatever comes, the village will meet it with open eyes.",
        fx:{ culture:2, military:2, historyNote:"The village examines its first iron, a gift from passing strangers." } },
      { label:"Offer it to the ancestors", hint:"Keep the old ways pure",
        text:"The shard is buried at the foot of the latte stones. The old ways remain the strong ways.",
        fx:{ culture:4, approval:2, historyNote:"The strange iron is offered to the ancestors and buried." } }
    ]},

  /* ============ CONTACT ============ */
  { id:"magellan_1521", era:"contact", year:1521, title:"Sails on the Horizon",
    text:"A lookout cries from the cliff. Across the reef, three strange ships lie at anchor — vast floating houses with white wings, the like of which no living Chamorro has seen.\n\nThe strangers are thin and sick from a long voyage. They call this place the 'Islands of Thieves,' for they did not understand that a guest may take what is freely offered. In their language, no one can speak. In yours, no one answers.\n\nThe world has arrived at your reef.",
    choices:[
      { label:"Trade generously", hint:"Food and water for iron and steel · +gold, −food",
        text:"Canoes paddle out with fish, fruit, and water. In return, the strangers leave iron tools that will change island life forever.",
        fx:{ food:-15, gold:8, wood:10, historyNote:"Magellan's ships stop at the Marianas; the Chamorros trade food and water for iron." } },
      { label:"Keep your distance", hint:"Watch from the cliffs",
        text:"The village watches from the shore as the strange ships take what they need and sail on. The encounter leaves no blood — and no gifts.",
        fx:{ culture:2, historyNote:"Magellan's fleet passes; the islanders keep their distance." } },
      { label:"Take their iron", hint:"Seize the strange metal · the strangers will not forget",
        text:"Impulse and need win the day — iron is taken from the anchored ships. The strangers sail away angry, calling this the 'Islands of Thieves.' Their anger will be remembered by the crowns of Europe.",
        fx:{ wood:12, reputation:-2, military:3, historyNote:"Chamorros take iron from Magellan's ships; he names the islands 'Las Islas de los Ladrones.'" } }
    ]},

  { id:"legazpi_1565", era:"contact", year:1565, title:"The King's Claim",
    text:"More ships. This time they come to stay — not with settlers, but with ceremony. A Spanish adelantado named Legazpi lands on the reef, raises a cross, and declares these islands part of the Kingdom of Spain, in the name of King Philip II.\n\nNo one asks the people who have lived here for three thousand years. The priests say mass on the beach; the soldiers plant a flag. Then, mostly, they sail away — leaving only a claim.",
    choices:[
      { label:"Watch, and remember", hint:"The claim is paper; the island is yours",
        text:"The flag stands on the beach and the ships depart. Life returns to the rhythm of tides and taro.",
        fx:{ culture:1, historyNote:"Legazpi claims the Marianas for Spain; no settlement follows." } },
      { label:"Prepare the island's defenses", hint:"-15 stone · be ready for what follows",
        text:"Lookout posts rise on the cliffs and passes are watched. If the strangers return to take, they will find the island ready.",
        fx:{ stone:-15, military:5, historyNote:"The islanders strengthen their coastal lookouts after the Spanish claim." } }
    ]},

  { id:"galleon_1600", era:"contact", year:1600, title:"The Silver Road",
    text:"Every year now, the great galleons of Spain cross the horizon on their way between Acapulco and Manila — the 'Silver Road' of the Pacific. They stop for water, for food, and sometimes for trade.\n\nSome villages grow rich feeding the galleons. Others fear the strangers' sickness and their greed.",
    choices:[
      { label:"Feed the galleons", hint:"+gold and trade · but the strangers' appetites grow",
        text:"Water, pork, and fruit are loaded onto the great ships in exchange for coins, iron, and cloth. The village's storerooms empty, then fill again.",
        fx:{ food:-18, gold:12, wood:6, historyNote:"The village begins provisioning Spanish galleons for coin and iron." } },
      { label:"Hide the villages", hint:"Protect the people · forgo the silver",
        text:"The villages pull back from the shore, hidden in the limestone hills. The galleons pass unserved, and the island keeps its peace.",
        fx:{ culture:3, approval:2, historyNote:"Villages hide inland, avoiding the galleon trade." } }
    ]},

  { id:"sickness_1660", era:"contact", year:1660, title:"The Coughing Sickness",
    text:"A fever has come to the island — brought, the elders say, by the sailors. It moves through the villages like fire through dry thatch: coughing, burning fevers, and too many graves.\n\nThe old remedies do not work. This sickness has never touched these shores before.",
    choices:[
      { label:"Quarantine the villages", hint:"Hard but necessary · fewer deaths",
        text:"The chiefs enforce a stern separation — the sick remain in their houses, and the healthy keep their distance. The sickness burns itself out.",
        fx:{ pop:-10, approval:-4, culture:1, historyNote:"A foreign fever sweeps the island; quarantine limits the deaths." } },
      { label:"Hold the healing ceremonies", hint:"The old ways against a new enemy",
        text:"Healers work day and night, calling on the ancestors. It is not enough — but the people face the sickness together.",
        fx:{ pop:-18, culture:3, approval:-2, historyNote:"A devastating fever strikes; the healers' ceremonies cannot stop it." } }
    ]},

  /* ============ SPANISH ============ */
  { id:"san_vitores_1668", era:"spanish", year:1668, title:"The Cross Comes Ashore",
    text:"A Jesuit priest named Diego Luis de San Vitores has arrived from Spain with a handful of missionaries and soldiers. He kneels on the beach at Agana, kisses the sand, and declares that he has come to save souls.\n\nThe missionaries are gentle and fierce at once. They baptize freely — sometimes without asking — and they are deeply offended by the ways of the ancestors: the skulls kept in houses, the reverence for the taotaomo'na, the 'pagan' feasts of the old religion.\n\nSome Chamorros embrace the new faith eagerly. Others sharpen their sling stones. The island is about to be torn in two.",
    choices:[
      { label:"Welcome the fathers", hint:"Peace with the newcomers · but the old ways will suffer",
        text:"The mission is welcomed, and its bells ring out over the lagoon. Baptisms multiply — and the sacred skulls of the ancestors are quietly buried.",
        fx:{ approval:5, culture:-8, unlockBuilding:"church", historyNote:"San Vitores founds the mission; many Chamorros are baptized." } },
      { label:"Welcome them warily", hint:"A middle path · watch and wait",
        text:"The fathers are fed and housed, but the elders keep a careful eye on the skull houses and the latte stones. For now, both faiths breathe the same air.",
        fx:{ approval:2, culture:-3, unlockBuilding:"church", historyNote:"The mission is accepted warily; old ways persist in secret." } },
      { label:"Refuse the mission", hint:"The ancestors' anger would be terrible",
        text:"The priests are told the island has its own gods. They leave — but they write letters to Manila, and the letters become soldiers.",
        fx:{ culture:5, military:2, reputation:-3, historyNote:"The mission is refused; San Vitores writes to Manila for protection." } }
    ]},

  { id:"hurao_1670", era:"spanish", year:1670, title:"Hurao's Fire",
    text:"Tension has been building for two years. The missionaries have destroyed ancestral skulls, banned the old dances, and demanded that chiefs send their children to be raised in Spanish ways.\n\nNow the chief Hurao stands on the meeting ground, his voice carrying over the assembled people: 'Our ancestors are buried here! Our gods live in these stones! Will you let them be erased?'",
    choices:[
      { label:"Rise with Hurao", hint:"Resistance begins · +culture, +military, war with Spain",
        text:"The sling stones and spears come out of hiding. Hurao's revolt spreads from village to village — and the Spanish governor sends for soldiers from Mexico and the Philippines.",
        fx:{ culture:8, military:6, approval:4, flags:{"resistance_started":true}, historyNote:"Hurao's revolt erupts against the mission and its abuses." } },
      { label:"Counsel patience", hint:"The Spanish are few; perhaps they will pass",
        text:"The elders counsel restraint — the missionaries are protected by soldiers and by Manila's wrath. Hurao fumes, but the sling stones stay buried.",
        fx:{ approval:-3, culture:-4, flags:{"resistance_started":false}, historyNote:"The chiefs counsel patience as the mission tightens its grip." } }
    ]},

  { id:"war_1672", era:"spanish", year:1672, title:"The War of the Marianas",
    text:"The war has begun in earnest. Spanish soldiers and their Filipino and Mexican allies march through the islands, burning villages that resist and baptizing the survivors by force. The Chamorro warriors fight from the limestone caves and the jungle — sling stones against arquebuses.\n\nIt is not an equal war. But the islanders know their ground, and their anger is deep.",
    choices:[
      { label:"Fight a guerrilla war", hint:"Strike and vanish · +military, but the island bleeds",
        text:"Raids hit the Spanish columns from every ridge. Each victory costs lives, but the war stretches on, and the Spanish purse grows thin.",
        fx:{ military:6, pop:-8, culture:4, historyNote:"Chamorro warriors wage guerrilla war from the caves and jungles." } },
      { label:"Fortify and defend", hint:"-20 stone · hold what you have",
        text:"Stone walls rise around the strongest villages. The Spanish burn the fields and wait — but they cannot take the walls by storm.",
        fx:{ stone:-20, military:5, pop:-4, approval:-3, historyNote:"Villages fortify against the Spanish columns." } },
      { label:"Sue for peace", hint:"End the bloodshed · accept the mission",
        text:"The chiefs lay down their weapons. The war is over; the mission remains. The old ways retreat into the shadows of private homes.",
        fx:{ culture:-8, approval:3, pop:-2, historyNote:"The chiefs sue for peace; the mission's authority is accepted." } }
    ]},

  { id:"plague_1680", era:"spanish", year:1680, title:"The Island Aches",
    text:"War has brought a worse enemy than soldiers: disease. Measles, influenza, and dysentery race through the exhausted villages. The dead are too many for the mourners.\n\nOnce, the elders say, there were thousands upon thousands of Chamorros across these islands. Now the villages grow quiet.",
    choices:[
      { label:"Shelter the survivors", hint:"Gather the people · protect what remains",
        text:"The broken remnants of villages are gathered into the strong places. It is a time of mourning, but the people endure.",
        fx:{ pop:-12, approval:-4, culture:2, historyNote:"Epidemics ravage the war-weary islanders; survivors gather to shelter." } },
      { label:"Keep fighting", hint:"The Spanish must not win, whatever the cost",
        text:"Even in sickness, the raids continue. The Spanish are bleeding too — but there are always more ships from Acapulco.",
        fx:{ military:5, pop:-16, culture:3, historyNote:"Resistance continues despite devastating epidemics." } }
    ]},

  { id:"reduction_1698", era:"spanish", year:1698, title:"The Great Gathering",
    text:"It is over. The wars are lost, the chiefs broken, the island emptied of its young men. Governor Quiroga has issued the final decree: all Chamorros of Saipan, Tinian, and Rota are to abandon their islands and move south, to Guam, where the mission can watch over every soul.\n\nWhole villages will be erased. The latte stones will stand over empty beaches. The people are ordered to gather what they can carry and board the boats.",
    choices:[
      { label:"Obey the decree", hint:"The people survive · but the north is emptied",
        text:"Village by village, the Chamorros board the Spanish boats and sail south to Guam. Saipan's beaches grow silent. The ancestors' stones keep watch alone.",
        fx:{ movePop:{ from:["saipan","tinian","rota"], to:"guam", pct:0.92 }, depopulateIslands:["saipan","tinian","rota"], culture:-6, approval:-5,
             historyNote:"Quiroga's reduction: the northern islands are emptied, the people gathered onto Guam." } },
      { label:"Hide in the highlands", hint:"Some will stay in secret valleys · risk, and defiance",
        text:"A few families slip away into the limestone jungles of Saipan and Tinian, swearing to keep the old names alive. The soldiers find most — but not all.",
        fx:{ movePops:[ { from:["tinian","rota"], to:"guam", pct:1 }, { from:["saipan"], to:"guam", pct:0.8 } ],
             depopulateIslands:["tinian","rota"], popIsland:{ saipan:24 },
             culture:6, pop:-6, flags:{"hidden_villages":true},
             historyNote:"A handful of families hide in the highlands, refusing the reduction." } },
      { label:"Refuse and resist", hint:"A doomed last stand · the cost is terrible",
        text:"The sling stones rise one last time. It ends badly — the soldiers burn the hidden villages. The survivors are marched to the boats in chains.",
        fx:{ movePop:{ from:["saipan","tinian","rota"], to:"guam", pct:0.6 }, depopulateIslands:["saipan","tinian","rota"], culture:6, pop:-20, approval:-8,
             historyNote:"A final desperate resistance is crushed; the reduction proceeds at sword-point." } }
    ]},

  { id:"galleon_century", era:"spanish", year:1710, title:"The Silver Port",
    text:"Guam has become the way-station of the Pacific. The Manila galleons stop in Agana for water, timber, and fresh meat, and the island's stores of corn, tobacco, and cattle grow to feed them.\n\nNew words slip into the Chamorro tongue — words for money, for God, for horses. The people of Guam are becoming something new: neither purely Chamorro nor purely Spanish, but a people of the crossroads.",
    choices:[
      { label:"Invest in the galleon trade", hint:"-20 wood · gold flows with the silver ships",
        text:"Storehouses and wharves are expanded. When the galleons call, Guam answers — and the island's purse fills with silver reales.",
        fx:{ wood:-20, gold:15, food:-6, historyNote:"Guam expands its provisioning trade with the Manila galleons." } },
      { label:"Protect the old ways", hint:"Culture endures · the purse stays light",
        text:"The galleons are served politely and sent on their way. The village keeps its customs — and its quiet.",
        fx:{ culture:4, gold:5, historyNote:"Guam serves the galleons modestly, preserving its own ways." } }
    ]},

  { id:"mestizo_1780", era:"spanish", year:1780, title:"The New People",
    text:"A century of Spanish rule has remade the islanders. The census counts only a few thousand Chamorros left in all the Marianas — a tenth of what the ancestors knew. Spanish, Filipino, Mexican, and Chamorro blood now run together in the same families. The old language survives in kitchens and fishing boats, while the church and the school speak Spanish.\n\nThe elders ask: who are we now?",
    choices:[
      { label:"Embrace the new identity", hint:"A mestizo people · the future is a mixing",
        text:"The islanders learn to be both — Chamorro at the hearth, Spanish in the plaza. New families, new names, new music rise from the blending.",
        fx:{ approval:6, culture:-3, gold:3, historyNote:"A mestizo Chamorro-Spanish identity takes root." } },
      { label:"Guard the Chamorro soul", hint:"Culture preserved · at the price of isolation",
        text:"The elders redouble their teaching of the old tongue and the old crafts, hidden from the friars' eyes. The Chamorro soul survives, stubborn and proud.",
        fx:{ culture:8, approval:-2, historyNote:"Elders secretly preserve the Chamorro language and crafts." } }
    ]},

  { id:"carolinians_1815", era:"spanish", year:1815, title:"Canoes From the South",
    text:"A fleet of small canoes appears on the horizon — not Spanish ships, but the outriggers of the Carolinian people, driven north by hunger.\n\nTheir islands far to the south were devastated by typhoon and famine. They ask, in the old voyaging tongue, for a place to land and live. Saipan lies empty, its latte stones abandoned, its villages silent for more than a century. The Spanish governor is indifferent. The Carolinians ask you: may we make it home?",
    choices:[
      { label:"Welcome them to Saipan", hint:"Saipan lives again · +culture, +population",
        text:"The Carolinian canoes beach on the empty shores of Saipan. They raise their houses beside the old latte stones and teach the island their songs of the sea. The north is no longer silent.",
        fx:{ unlockIslands:["saipan"], popIsland:{ saipan:45 }, culture:6, approval:3, flags:{"carolinians":true},
             historyNote:"Carolinian voyagers, fleeing famine, settle the empty island of Saipan." } },
      { label:"Settle them on Tinian and Rota", hint:"More hands, wider spread · Tinian and Rota stir again",
        text:"Some families are guided south to Tinian's flat fields, and others to Rota's terraced hills. All three islands wake from their long sleep.",
        fx:{ unlockIslands:["saipan","tinian","rota"], popIsland:{ saipan:35, tinian:15, rota:8 }, culture:6, approval:2, flags:{"carolinians":true},
             historyNote:"Carolinian settlers land on Saipan, Tinian, and Rota." } },
      { label:"Turn them away", hint:"The islands are too weak to share",
        text:"The canoes are sent back to the southern sea. The decision haunts the elders — a debt of the voyaging peoples left unpaid.",
        fx:{ approval:-8, culture:-3, historyNote:"The Carolinian refugees are turned away from Saipan." } }
    ]},

  { id:"saipan_reborn_1830", era:"spanish", year:1830, title:"The North Reawakens",
    text:"Saipan is alive again. Carolinian families fish the reef and work the coconut groves, joined now by Chamorros from Guam who remember the old homeland. The Spanish governor in Agana barely notices — and that, perhaps, is a blessing.\n\nTrade is beginning: copra, the dried meat of the coconut, is worth money on the world market. The island could grow fat on it — if it chooses.",
    choices:[
      { label:"Plant copra for the world", hint:"-10 wood · +gold, the islands enter the world economy",
        text:"Coconut groves spread across the lowlands. When the trading schooners call, Saipan has something to sell.",
        fx:{ wood:-10, gold:10, unlockBuilding:"copra_plantation", historyNote:"Copra trade begins to enrich the resettled northern islands." } },
      { label:"Grow food first", hint:"Feed the people · +food, slower money",
        text:"Taro, yams, and breadfruit are planted before anything else. The island grows strong on its own harvest.",
        fx:{ food:14, popIsland:{ saipan:8 }, historyNote:"The settlers of Saipan plant food before cash crops." } }
    ]},

  { id:"typhoon_1852", era:"spanish", year:1852, title:"The Great Wreck",
    text:"A typhoon of terrible fury strikes the islands. On Saipan the Carolinian village is flattened; on Guam the galleon port is wrecked and ships thrown onto the reef. Crops are ruined across the archipelago.\n\nThe people rebuild — they always rebuild — but the granaries are empty and winter is coming.",
    choices:[
      { label:"Open the stores, share all", hint:"Every mouth fed · +approval, −food",
        text:"The chiefs and the governor alike open their storehouses. Nobody starves this year — a small miracle the islanders will remember.",
        fx:{ food:-18, approval:6, historyNote:"A great typhoon wrecks the islands; shared stores prevent famine." } },
      { label:"Let each island fend for itself", hint:"The strong survive · the weak suffer",
        text:"Each village keeps its own stores. Some weather the year; some do not. The typhoon's scars heal slowly.",
        fx:{ food:-8, pop:-6, approval:-5, historyNote:"A great typhoon brings hunger to the least-prepared villages." } }
    ]},

  { id:"smallpox_1880", era:"spanish", year:1880, title:"The Pox",
    text:"Smallpox has reached Guam, carried by a ship from Manila. The disease spreads through the crowded villages, and the island's healers are helpless against it.\n\nThe governor orders a quarantine — but the church resists, insisting the faithful must gather for mass. The choice is yours to make.",
    choices:[
      { label:"Enforce the quarantine", hint:"Defy the church, save the people",
        text:"Mass is suspended; the villages seal themselves off. The pox burns through the island but the deaths are fewer than feared.",
        fx:{ pop:-8, approval:-3, culture:1, historyNote:"A strict quarantine limits a smallpox outbreak on Guam." } },
      { label:"Let the faithful gather", hint:"The church's comfort · at a terrible price",
        text:"The bells ring and the pews fill. The pox rides the crowds from village to village, and the graveyards grow.",
        fx:{ pop:-20, approval:-4, culture:-2, historyNote:"Smallpox spreads through Guam's crowded mission villages." } }
    ]},

  { id:"spanam_1898", era:"spanish", year:1898, title:"The Shot Heard Across the Pacific",
    text:"War has broken out between the United States and Spain. The American cruiser USS Charleston steams into Guam's harbor — and after a puzzled exchange, the Spanish garrison surrenders without a shot. In a single morning, after 330 years, the Spanish flag comes down in the Marianas.\n\nBut the archipelago is split. The United States keeps Guam for itself. And the rest of the islands — Saipan, Tinian, Rota, and the north — are to be sold by a defeated Spain to the highest bidder.\n\nGuam will now live under a new flag, far from your reach. The northern Marianas must find their own path.",
    onEnter:{ lockIslands:["guam"], setAccessible:{ guam:false }, culture:2, reputation:2,
              historyNote:"The Spanish-American War ends Spanish rule; Guam becomes a U.S. territory and the Northern Marianas are sold to Germany." } },

  { id:"german_purchase_1899", era:"spanish", year:1898, after:"spanam_1898", title:"The Kaiser's Islands",
    text:"The ink dries on a treaty in Paris. Spain sells the Northern Marianas — Saipan, Tinian, Rota, and the long volcanic chain to the north — to the German Empire, which wants a foothold in the Pacific and a share of the copra trade.\n\nA new flag rises over the district office in Saipan: black, white, and red. A new era begins.",
    onEnter:{ era:"german", gold:6, historyNote:"Germany purchases the Northern Marianas from Spain; the German era begins." } },

  /* ============ GERMAN ============ */
  { id:"german_start", era:"german", year:1899, title:"The Kaiser's Governor",
    text:"The German governor arrives in Saipan with a ledger, a flag, and a plan. The islands are to be run like a well-ordered plantation: copra harvested, taxes collected, and order kept by a handful of native police.\n\nThe Germans are distant and efficient. They do not burn villages or forbid the old ways — they simply expect the islands to produce.",
    choices:[
      { label:"Cooperate with the administration", hint:"Smooth relations · but the culture quietly fades",
        text:"The copra harvest is delivered on time, and the governor smiles. German becomes the language of the office, and the islands earn their keep.",
        fx:{ gold:8, culture:-3, historyNote:"The German administration is met with cooperation." } },
      { label:"Keep the old ways close", hint:"The villages stay Chamorro · the governor is annoyed",
        text:"The copra is slow, the taxes are late, and the village councils quietly continue the old customs. The governor frowns but does nothing — yet.",
        fx:{ culture:5, gold:-2, historyNote:"The islanders quietly resist German expectations." } }
    ]},

  { id:"german_school", era:"german", year:1905, title:"The Kaiser's Classroom",
    text:"A German school opens in Saipan, with a teacher sent from the Caroline Islands. Children are taught reading, arithmetic, and — of course — the German language, along with the catechism.\n\nFor the first time, formal schooling is offered to the islanders. It is also the first time their own tongues are pushed out of the classroom.",
    choices:[
      { label:"Send the children", hint:"+approval, −culture · a generation reads and writes",
        text:"The schoolroom fills. The children learn German, arithmetic, and the wide world beyond the reef — and speak Chamorro and Carolinian a little less each year.",
        fx:{ approval:4, culture:-4, historyNote:"Children attend the German school; literacy spreads, the mother tongues recede." } },
      { label:"Teach at home first", hint:"+culture · the village keeps its stories",
        text:"The elders insist the children first learn the songs and stories of the ancestors. Some go to the German school late; some never go at all.",
        fx:{ culture:5, approval:-2, historyNote:"Village elders prioritize traditional teaching over the German school." } }
    ]},

  { id:"german_copra_1910", era:"german", year:1910, title:"The Copra Boom",
    text:"Copra prices are rising on the world market, and the German administration sees gold in the coconut groves. Plantations are to be expanded — which means more land cleared, more workers, and more money flowing through Saipan.\n\nBut the plantations are on land the villagers have used for generations.",
    choices:[
      { label:"Expand the plantations", hint:"+gold · the islands become a machine for Hamburg",
        text:"The groves spread, the schooners load, and the money flows. The old groves are gone, but the village storerooms are full.",
        fx:{ gold:14, food:-4, culture:-3, historyNote:"Copra plantations expand across the northern islands." } },
      { label:"Defend the village lands", hint:"+culture · a slower, poorer boom",
        text:"The elders draw lines around the village groves, and the governor — for now — respects them. The boom is smaller, but the land stays in island hands.",
        fx:{ culture:5, gold:6, historyNote:"Village leaders defend communal lands from the copra boom." } }
    ]},

  { id:"ww1_1914", era:"german", year:1914, title:"War in Europe, Ships in the Lagoon",
    text:"A great war has broken out across Europe, and the empires are grabbing each other's colonies. In October 1914, a Japanese squadron steams into the harbor of Saipan. The German governor, hopelessly outnumbered, surrenders without a fight.\n\nThe German era ends as quietly as it began — with a flag lowered and another raised: the rising sun of Japan.",
    onEnter:{ era:"japanese", gold:4, historyNote:"Japan seizes the Northern Marianas at the start of World War I; the German era ends." } },

  /* ============ JAPANESE ============ */
  { id:"japan_start", era:"japanese", year:1914, title:"The Rising Sun",
    text:"The Japanese Navy administers the islands at first — firm, organized, and quietly curious about the people they have inherited. The Chamorro and Carolinian villagers watch the new flag and wonder what it means.\n\nThen the settlers begin to come: fishermen, traders, and officials from Okinawa and the home islands, filling the empty beaches of Saipan.",
    choices:[
      { label:"Adapt to the new order", hint:"Learn Japanese, keep your head down · +gold",
        text:"The village learns the new language, the new currency, and the new rules. The Japanese note with approval that the islanders are orderly and hardworking.",
        fx:{ gold:6, culture:-3, historyNote:"The islanders adapt to Japanese administration." } },
      { label:"Hold the old ways", hint:"The ancestors' language stays first · −gold",
        text:"At home, the elders still speak Chamorro and Carolinian, still fish the old grounds, still tell the old stories. The officials sigh; the culture survives.",
        fx:{ culture:5, gold:-2, historyNote:"The islanders quietly preserve their languages under Japanese rule." } }
    ]},

  { id:"sugar_boom_1925", era:"japanese", year:1925, title:"The Sugar Empire",
    text:"The South Seas Development Company — Nan'yo Kohatsu — has arrived with a plan of staggering scale: turn Saipan and Tinian into one vast sugarcane factory. Land is leased, mills are built, and laborers are brought by the shipload from Okinawa, Korea, and Japan.\n\nBy 1935, the Japanese will outnumber the islanders on Saipan. The Chamorro and Carolinian people — who have been here for three thousand years — will become a minority in their own homeland.",
    choices:[
      { label:"Embrace the boom", hint:"+gold, +population · but the islands are no longer yours alone",
        text:"The cane grows, the mill smoke rises, and the money flows. Garapan becomes a bustling Japanese town. The old village ways recede before the factory whistle.",
        fx:{ gold:16, popIsland:{ saipan:30, tinian:15 }, culture:-8, approval:-3,
             historyNote:"The sugar boom transforms Saipan and Tinian; thousands of laborers arrive from Japan and Korea." } },
      { label:"Limit the company's reach", hint:"Protect Chamorro land and labor · slower money",
        text:"The council resists the company's demands, defending the village lands and the islanders' right to their own fields. The boom happens anyway — but smaller, and with more room for the old life.",
        fx:{ gold:7, culture:5, popIsland:{ saipan:12, tinian:6 }, historyNote:"Island leaders limit the sugar company's expansion." } }
    ]},

  { id:"northern_islands_1930", era:"japanese", year:1930, title:"The Northern Outposts",
    text:"The Japanese administration looks north, to the long volcanic chain of the Marianas — Pagan, Agrihan, Alamagan, Anatahan. There are coconut groves to harvest, phosphate to mine, and islands to populate with loyal settlers.\n\nShips begin to call at the lonely northern anchorages, and the first settlements are planned.",
    choices:[
      { label:"Open the northern islands", hint:"Unlock new islands · development spreads north",
        text:"Settlement parties land on Pagan, Agrihan, and Alamagan, and push on to the lesser isles — Asuncion's cone, Anatahan's long slopes, Sarigan's green peak, Guguan's twin cones, and the islets of Maug. Copra stations and small farms rise on the volcanic slopes, and the northern Marianas enter the modern age.",
        fx:{ unlockIslands:["pagan","agrihan","alamagan","anatahan","asuncion","guguan","sarigan","maug"], popIsland:{ pagan:12, agrihan:14, alamagan:6, anatahan:8, asuncion:5, guguan:4, sarigan:5, maug:3 },
             gold:6, historyNote:"Japanese settlement opens the northern islands of the Marianas." } },
      { label:"Keep the north wild", hint:"The villages stay untouched · the north waits",
        text:"The administration's ships pass the northern islands by. The seabirds keep their kingdom a while longer.",
        fx:{ culture:2, historyNote:"The northern islands remain unsettled." } }
    ]},

  { id:"military_1938", era:"japanese", year:1938, title:"The Fortress Islands",
    text:"War clouds gather over the Pacific, and the Japanese military begins turning the Marianas into a fortress. Runways are carved into Tinian's flatlands, gun emplacements rise on Saipan's cliffs, and thousands of soldiers arrive to man them.\n\nThe islanders watch the soldiers drill on the beaches where their children once played. The future is being decided by men in other capitals.",
    choices:[
      { label:"Cooperate with the military", hint:"+gold, +military works · but the islands are a target",
        text:"The village supplies labor and goodwill to the garrison. The officers nod approvingly — and the island becomes a prize the Americans will someday want to take.",
        fx:{ gold:8, military:6, approval:-4, historyNote:"The Marianas are fortified as Japan prepares for war." } },
      { label:"Keep the people clear", hint:"Protect the civilians · the soldiers are annoyed",
        text:"The council keeps its people away from the military works, fishing and farming as before. The soldiers grumble — but the war is not theirs, and the people know it.",
        fx:{ culture:3, approval:-2, historyNote:"Islanders keep their distance from the military buildup." } }
    ]},

  { id:"ww2_1941", era:"japanese", year:1941, title:"The World on Fire",
    text:"December 1941: Japan attacks Pearl Harbor, and the Pacific explodes into war. The Marianas — your islands — are now a front line of the Japanese empire, buzzing with aircraft and warships.\n\nThere is nowhere to hide on a small island. The people can only watch, work, and pray for peace.",
    choices:[
      { label:"Help the community endure", hint:"Ration, shelter, and prayer · +approval",
        text:"Village councils organize shelters, rationing, and watch posts. The people face the war together, as they have faced every storm.",
        fx:{ approval:5, food:-8, historyNote:"The Pacific War begins; island communities organize shelters and rationing." } },
      { label:"Hope for a short war", hint:"Nothing to do but wait",
        text:"The radios crackle with propaganda; the patrols march past. The island waits, holding its breath.",
        fx:{ historyNote:"The islands wait anxiously as the war expands." } }
    ]},

  { id:"battle_saipan_1944", era:"japanese", year:1944, title:"The Longest Day",
    text:"June 15, 1944. The horizon fills with the greatest invasion fleet the Pacific has ever seen — the United States Navy, come to take Saipan.\n\nThe battle lasts three terrible weeks. The civilian population is caught between the Japanese garrison and the American assault. Families shelter in limestone caves as shells rain down. In the final days, hundreds of civilians — told by the garrison that the Americans will butcher them — leap from the cliffs at Marpi Point rather than surrender.\n\nIt is the darkest moment in the island's history. And it is nearly over.",
    choices:[
      { label:"Guide the people to the caves", hint:"Shelter the families · the horrors cannot all be prevented",
        text:"Through the chaos, the village elders guide their people to the caves of the north. Many survive. Some are lost — to the shells, the hunger, and the cliffs. The survivors emerge into a world of ash and American soldiers.",
        fx:{ pop:-18, approval:-8, culture:3, flags:{"liberated":true},
             historyNote:"The Battle of Saipan: after weeks of horror, U.S. forces take the island. Civilian casualties are staggering." } },
      { label:"Urge surrender to the Americans", hint:"End it sooner · at great personal risk",
        text:"Your voice carries through the caves: do not jump. The Americans are not butchers. Some listen; some do not. When the guns fall silent, the survivors are led down to the camps — alive.",
        fx:{ pop:-14, approval:-6, culture:2, flags:{"liberated":true},
             historyNote:"The Battle of Saipan ends; U.S. forces liberate the island after weeks of brutal fighting." } }
    ]},

  { id:"tinian_1944", era:"japanese", year:1944, title:"Tinian's Silent Fields",
    text:"Tinian falls to the Americans in August 1944, after a battle as fierce as Saipan's. The flat fields that once grew sugar are bulldozed into the largest airfield in the world — six runways, two miles long, for the new B-29 Superfortresses.\n\nFrom these runways, in August 1945, aircraft will take off carrying the atomic bombs that end the war. Tinian's silent fields will be remembered by the world — and carried forever by the Chamorro families who lived there.",
    onEnter:{ popIsland:{ tinian:-8 }, historyNote:"Tinian falls; the U.S. builds the world's largest airfield on its fields." } },

  /* ============ AMERICAN / TTPI ============ */
  { id:"liberation_1945", era:"american", year:1945, title:"After the Fire",
    text:"The war is over. The Marianas are in American hands, and the islands lie in ruins — burned cane fields, shattered buildings, and camps of displaced families. The U.S. Navy rules the islands now, strictly but not cruelly.\n\nThe people begin to come home: to the caves, the clearings, the places where their guma' once stood. It is time to rebuild.",
    choices:[
      { label:"Build the camps into villages", hint:"+approval · the long rebuilding begins",
        text:"Tents become houses; clearings become streets. The Americans bring food, medicine, and the first real schools. The islands begin again.",
        fx:{ approval:6, popIsland:{ saipan:15 }, unlockBuilding:"water_system", historyNote:"Reconstruction begins under U.S. Navy administration." } },
      { label:"Rebuild the old way first", hint:"+culture · the guma' rise from the ashes",
        text:"Before the new roads, the people raise the thatch roofs and the stone footings, re-planting the taro and remembering the old patterns. The ancestors' way returns to the land.",
        fx:{ culture:6, approval:3, popIsland:{ saipan:10 }, historyNote:"Islanders rebuild in the traditional manner, reclaiming their identity." } }
    ]},

  { id:"susupe_liberation_1946", era:"american", year:1946, title:"The Gates of Susupe Open",
    text:"When the guns fell silent, the U.S. military gathered the survivors of Saipan — Chamorro and Carolinian alike — out of the caves and the ashes of their villages, and enclosed them behind barbed wire in a string of concentration camps. The largest stood at Susupe on the west coast: rows of tents and tarpaper shacks where families waited out the long tail of the war, watched by armed guards, their own fields lying just beyond the fence.\n\nFor two years the people of Saipan lived inside the wire — until July 4, 1946, when the gates were thrown open. The camp at Susupe was abandoned, and families walked home through their burned villages to begin again.\n\nDecades later, the islands would mark that date each year as Liberation Day — commemorated not for any flag or empire, but because it was the day the people of Saipan were freed from Camp Susupe and the other concentration camps, and came home to their own island.",
    onEnter:{ culture:4, approval:3, historyNote:"July 4, 1946 — the U.S. military closes Camp Susupe and the other Saipan concentration camps and the civilians return home; the date is later designated CNMI Liberation Day." } },

  { id:"ttpi_1947", era:"american", year:1947, title:"The Trust Territory",
    text:"The United Nations places the former Japanese islands — including the Northern Marianas — under a new arrangement: the Trust Territory of the Pacific Islands, administered by the United States. It is a 'sacred trust' to prepare the islands for self-government.\n\nAmerican money begins to flow: schools, hospitals, roads, and salaries. A new generation grows up speaking English and dreaming American dreams.\n\nAcross the water, the emptied islands wake again — families return to Tinian's flat fields and Rota's terraced hills, replanting villages where the grass has grown tall.",
    choices:[
      { label:"Embrace the American programs", hint:"+gold, +approval · the islands modernize fast",
        text:"The schools fill, the hospital opens, and the roads spread. The old village economy gives way to paychecks and store-bought goods. On Tinian and Rota, the new settlers rebuild homesteads on the abandoned fields.",
        fx:{ unlockIslands:["tinian","rota"], popIsland:{ tinian:30, rota:25 }, gold:10, approval:5, culture:-2, unlockBuilding:"high_school", historyNote:"The Northern Marianas join the TTPI; Tinian and Rota are resettled." } },
      { label:"Take the aid, keep the soul", hint:"Balanced · modernization with caution",
        text:"The roads are welcome, the language lessons are noted — but the elders keep the Chamorro and Carolinian tongues alive in every home. On Tinian and Rota, the returning families plant their guma' beside the old stone foundations.",
        fx:{ unlockIslands:["tinian","rota"], popIsland:{ tinian:30, rota:25 }, gold:7, culture:4, approval:3, unlockBuilding:"high_school", historyNote:"The TTPI era brings aid and resettlement; the islands keep their culture close." } }
    ]},

  { id:"typhoon_karen_1962", era:"american", year:1962, title:"Typhoon Karen",
    text:"Typhoon Karen, one of the strongest storms ever recorded, smashes into Saipan with winds of 180 miles an hour. Every building on the island is damaged or destroyed. Garapan, the island's only town, is flattened.\n\nThe islanders have survived typhoons for three thousand years. They will survive this one too — but it will take everything they have.",
    choices:[
      { label:"Rally the rebuilding", hint:"−gold · every hand to the work",
        text:"With American help and island determination, the wreckage is cleared and the town rises again — stronger, with new schools and a new water system.",
        fx:{ gold:-15, wood:-10, approval:4, historyNote:"Typhoon Karen flattens Saipan; the island rebuilds with American aid." } },
      { label:"Lean entirely on federal aid", hint:"+gold debt · faster relief, more dependency",
        text:"Washington sends relief supplies and rebuilding funds, and the island accepts them all. The town returns quickly — and the habit of dependency deepens.",
        fx:{ gold:8, approval:2, culture:-3, historyNote:"Typhoon Karen: federal aid rebuilds Saipan, deepening reliance on Washington." } }
    ]},

  { id:"congress_micronesia_1965", era:"american", year:1965, title:"A Congress of Islands",
    text:"The Trust Territory convenes its first elected legislature — the Congress of Micronesia — bringing together delegates from the Marshalls, the Carolines, and the Marianas. For the first time, Micronesian leaders sit together and ask the same question: what will become of us when the trusteeship ends?\n\nThe Marianas must choose where it belongs: with the rest of Micronesia, or on a separate path.",
    choices:[
      { label:"Join the Micronesian federation", hint:"Unity with the Pacific · a shared future",
        text:"The Marianas delegates take their seats in the Congress and dream of a united Micronesian nation — one people of many islands.",
        fx:{ culture:4, approval:2, flags:{"comi_path":true}, historyNote:"The Marianas join the Congress of Micronesia." } },
      { label:"Pursue a separate status", hint:"The Marianas' own road · closer to the United States",
        text:"The delegates argue that the Marianas' history is different — Spanish, then Japanese, then American — and that its future should be its own. The seeds of the Commonwealth are sown.",
        fx:{ gold:3, flags:{"comi_path":false}, historyNote:"The Marianas begin charting a separate political future from the rest of Micronesia." } }
    ]},

  { id:"status_1972", era:"american", year:1972, title:"The Great Decision",
    text:"The United States and the Marianas begin formal status negotiations. The options on the table: independence, full integration with Guam, or a new invention — a 'Commonwealth' that would give the islands self-government under American sovereignty, with generous federal funding.\n\nThe people must choose their future. It is the most important decision in a thousand years of island history.",
    choices:[
      { label:"Choose Commonwealth", hint:"Self-rule + U.S. ties · the historic path",
        text:"The Covenant is negotiated: the Marianas become a U.S. commonwealth, with their own constitution, their own governor, and a special economic relationship. In 1976 the people vote overwhelmingly for it.",
        fx:{ approval:6, gold:8, unlockBuilding:"federal_office", historyNote:"The Marianas negotiate Commonwealth status with the United States." } },
      { label:"Choose Independence", hint:"The harder road · freedom without a safety net",
        text:"A bold minority argues for full independence. The vote goes the other way, but the dream is recorded — and it will not die.",
        fx:{ culture:5, gold:-4, flags:{"independence_voice":true}, historyNote:"A minority voice argues for independence; Commonwealth status is chosen." } }
    ]},

  /* ============ COMMONWEALTH ============ */
  { id:"cnmi_start_1978", era:"commonwealth", year:1978, title:"A New Covenant",
    text:"January 9, 1978. The Commonwealth of the Northern Mariana Islands comes into being under its own constitution. The islands have their own governor, their own legislature, and their own courts — while the stars and stripes fly over the district office.\n\nAfter centuries of being ruled by Spain, Germany, Japan, and the United States, the people of the Marianas finally govern themselves.",
    onEnter:{ approval:8, culture:3, historyNote:"The Commonwealth of the Northern Mariana Islands is inaugurated." },
    choices:[
      { label:"Build the new government well", hint:"+approval · honest institutions take root",
        text:"The new legislature writes laws, collects taxes, and builds the machinery of self-government — with Chamorro and Carolinian leaders at every level.",
        fx:{ approval:6, gold:-4, historyNote:"The Commonwealth's first government is organized." } },
      { label:"Prioritize the economy first", hint:"+gold · jobs before institutions",
        text:"The new government focuses on attracting business — anything to put food on the table. Institutions will come later.",
        fx:{ gold:8, approval:2, historyNote:"The Commonwealth prioritizes economic development." } }
    ]},

  { id:"garment_boom_1983", era:"commonwealth", year:1983, title:"The Needles and the Thread",
    text:"An unexpected industry blooms: garment factories. Because the Commonwealth is U.S. territory, its exports enter American stores duty-free — a loophole the world's clothing makers rush to exploit. Factories rise in Saipan, and with them thousands of immigrant workers from China, Bangladesh, and the Philippines, housed in crowded dormitories.\n\nBy the 1990s, the Marianas will be sewing a billion dollars of clothing a year. The islands have never been richer — or more divided.",
    choices:[
      { label:"Embrace the garment boom", hint:"+gold, +population · labor conditions become the question",
        text:"The factories multiply and the money pours in. Saipan's population swells with guest workers, and the streets of Garapan fill with new languages and new tensions.",
        fx:{ gold:20, popIsland:{ saipan:40 }, approval:-3, unlockBuilding:"garment_factory", historyNote:"The garment industry booms; immigrant workers arrive by the thousands." } },
      { label:"Regulate the industry", hint:"Fewer factories, fairer conditions · slower money",
        text:"The Commonwealth writes labor protections into law — wages, housing standards, inspections. Some factories leave; those that stay treat their workers better.",
        fx:{ gold:10, approval:4, popIsland:{ saipan:18 }, unlockBuilding:"garment_factory", historyNote:"The garment industry is regulated; labor standards are set." } }
    ]},

  { id:"tourism_boom_1989", era:"commonwealth", year:1989, title:"The Age of the Tourist",
    text:"Japanese tourists discover the Marianas. Charter jets fill the new airport, and resort hotels rise along the lagoons of Saipan and the beaches of Tinian. Duty-free shopping, dive boats, and golf courses follow.\n\nTourism overtakes garments as the islands' biggest business — bringing money, jobs, and a new question: what does the island owe the visitor, and what does it owe itself?",
    choices:[
      { label:"Build the resorts", hint:"+gold · the lagoons become a product",
        text:"The hotels multiply, the piers lengthen, and the tourists come by the planeload. The economy roars — and the quiet beaches grow crowded.",
        fx:{ gold:16, approval:2, unlockBuilding:"resort_hotel", historyNote:"Tourism booms as Japanese visitors discover the Marianas." } },
      { label:"Protect the reefs and villages", hint:"+culture, +approval · slower growth",
        text:"The Commonwealth draws careful limits — no resorts on the sacred headlands, reef protections enforced, village life respected. Tourism grows, but gently.",
        fx:{ gold:8, culture:4, approval:3, historyNote:"Tourism grows under careful environmental and cultural rules." } }
    ]},

  { id:"typhoon_yuri_1991", era:"commonwealth", year:1991, title:"The Storm Returns",
    text:"Typhoon Yuri, one of the strongest storms of the century, batters Saipan and Tinian. Hotels are gutted, houses lose their roofs, and the garment factories close for weeks. The islands know this dance — rebuild, replant, renew.",
    choices:[
      { label:"Rebuild with insurance and aid", hint:"−gold · the modern recovery",
        text:"Insurance claims and federal aid smooth the recovery. Within a year, the hotels are open and the tourists are back.",
        fx:{ gold:-12, approval:3, historyNote:"Typhoon Yuri damages the islands; recovery is swift with modern resources." } },
      { label:"Rebuild stronger than before", hint:"−gold, −wood · typhoon-proof standards",
        text:"New building codes make the rebuilt island harder and stronger — concrete roofs, storm shutters, reinforced utilities. The next storm will meet a tougher island.",
        fx:{ gold:-16, wood:-10, approval:5, historyNote:"After Typhoon Yuri, the islands rebuild to typhoon-proof standards." } }
    ]},

  { id:"garment_decline_2005", era:"commonwealth", year:2005, title:"The Needles Fall Silent",
    text:"The garment miracle is ending. China joins the World Trade Organization, quotas vanish, and the duty-free advantage that built Saipan's factories disappears overnight. Factory after factory closes; the sewing machines go quiet, and thousands of guest workers are sent home.\n\nThe Commonwealth must find a new economy — or face the consequences.",
    choices:[
      { label:"Invest in the transition", hint:"−gold · retraining, tourism, and new industries",
        text:"The government spends on worker retraining, tourism promotion, and small-business support. The transition is painful, but the islands adapt — as they always have.",
        fx:{ gold:-14, approval:3, culture:1, historyNote:"The garment industry collapses; the Commonwealth invests in economic transition." } },
      { label:"Let the market decide", hint:"+gold saved · a harsher adjustment",
        text:"The factories close with little government help. Unemployment spikes, families struggle, and the islands wait for the next boom to arrive.",
        fx:{ approval:-6, popIsland:{ saipan:-15 }, historyNote:"The garment industry collapses without intervention; unemployment rises." } }
    ]},

  { id:"federalization_2009", era:"commonwealth", year:2009, title:"The Federal Embrace",
    text:"Washington passes the Consolidated Natural Resources Act, extending full U.S. immigration law and federal minimum wage to the Commonwealth. In a stroke, the islands' remaining garment industry — built on cheap immigrant labor — is doomed, and the long debate over who belongs in the Marianas is handed to the federal government.\n\nThe people of the CNMI have been U.S. citizens by birth ever since the Covenant's citizenship provisions took effect in 1986 — federalization changes none of that. What changes is the economy: the islands must now compete on American terms, under American immigration law.",
    choices:[
      { label:"Support federalization", hint:"+approval, +rights · the American path is sealed",
        text:"The federal minimum wage arrives; the last garment factories close. Citizenship — held by birth since 1986 — is confirmed, and the Marianas bet their future on the American connection.",
        fx:{ approval:6, gold:-6, popIsland:{ saipan:-10 }, culture:-2, historyNote:"Federalization: full U.S. immigration and wage law come to the CNMI; the garment era ends." } },
      { label:"Fight for local control", hint:"+culture, −approval in Washington · the islands keep their say",
        text:"The Commonwealth challenges the federal takeover, defending its own immigration and wage rules. Washington's law stands, but the islands win a reputation for independence of spirit.",
        fx:{ culture:5, gold:-4, approval:-2, historyNote:"The Commonwealth resists federalization but U.S. law prevails." } }
    ]},

  { id:"worker_strikes_2012", era:"commonwealth", year:2012, title:"The Workers Rise",
    text:"Across Saipan, the guest workers — garment workers, hotel maids, construction crews — begin to organize. They demand the wages and rights that have been denied them for decades: back pay, fair hours, protection from abuse. Hundreds walk off the job; the hotels and the mall feel it.\n\nThe strike is a test not just of the economy, but of the islands' conscience.",
    choices:[
      { label:"Support the workers", hint:"+approval, +reputation · costs the employers",
        text:"The Commonwealth government and many island families stand with the strikers. New labor laws follow, protecting every worker regardless of passport.",
        fx:{ approval:7, culture:2, gold:-8, reputation:3, historyNote:"Island leaders support striking guest workers; labor rights are strengthened." } },
      { label:"Mediate a compromise", hint:"Balanced · wages up a little, no one happy",
        text:"Long negotiations produce a modest wage increase and a promise of better housing. The strikes end — but the underlying inequalities remain.",
        fx:{ approval:2, gold:-3, historyNote:"Strikes end with a mediated compromise." } },
      { label:"Suppress the strike", hint:"+gold short-term · a wound in the islands' soul",
        text:"The government sides with the employers; police clear the picket lines. The money flows again — and the workers' anger settles into something darker.",
        fx:{ gold:6, approval:-8, culture:-3, reputation:-2, historyNote:"The government suppresses the worker strike; bitterness grows." } }
    ]},

  { id:"transition_2014", era:"commonwealth", year:2014, title:"The Transition Stretches",
    text:"The federalization transition period — meant to give the Commonwealth time to adjust to U.S. immigration and wage law — was supposed to end this year. Washington, entangled in its own quarrels, extends it to 2019 instead.\n\nThe islands are used to waiting on someone else's clock by now. The Carolinians waited. The Chamorros waited. What is five more years?",
    onEnter:{ approval:2, historyNote:"The CNMI federal transition period, meant to end in 2014, is extended to 2019." } },

  { id:"transition_2019", era:"commonwealth", year:2019, title:"The Transition, Again",
    text:"The transition period ends — and is extended once more, this time to 2029. Washington's promises grow thin, and a strange unease spreads across the mainland: its own union, people whisper, is coming apart.\n\nThe Marianas watch, and wait, and quietly prepare for a world without a patron.",
    onEnter:{ culture:3, relationsGuam:3, historyNote:"The CNMI transition period is extended again, to 2029 — the islands prepare for life without Washington." } },

  { id:"covid_2020", era:"commonwealth", year:2020, title:"The Long Silence",
    text:"A pandemic sweeps the world. The borders close, the tourists vanish, and the islands fall quiet for the first time in generations. The Commonwealth, like every island nation, must choose how to face the invisible enemy.",
    choices:[
      { label:"Lock down hard and early", hint:"−gold · few cases, protected lives",
        text:"The borders slam shut and the curfews hold. The islands suffer economically but stay almost free of the virus — a small miracle of island discipline.",
        fx:{ gold:-12, approval:5, popIsland:{ saipan:-4 }, historyNote:"The pandemic: strict lockdowns protect the islands but hurt the economy." } },
      { label:"Keep the economy open", hint:"+gold · a risk that proves costly",
        text:"The resorts stay open as long as they can. When the virus arrives anyway, the cost is paid in both lives and livelihoods.",
        fx:{ gold:4, approval:-6, popIsland:{ saipan:-6 }, historyNote:"The pandemic reaches the islands; the economy and the people suffer together." } }
    ]},

  { id:"present_day_2024", era:"commonwealth", year:2024, title:"The Threshold",
    text:"The year is 2024. The Commonwealth is nearly fifty years old. The garment factories are gone; tourism is recovering; the federal transition period drags on, extended now to 2029. Guam, 120 miles to the south, remains an American territory with its own dreams and its own debates about the future.\n\nAnd across the sea, in Washington, the center is not holding. Every year the mainland's union seems a little less certain — and every islander knows what happens to small peoples when empires fall.",
    choices:[
      { label:"Strengthen the Commonwealth", hint:"+approval · unity against uncertain times",
        text:"The legislature votes new powers to the island governments, stockpiles food and fuel, and tightens the bonds between Saipan and the outer islands. Whatever comes, the Commonwealth will face it together.",
        fx:{ approval:5, food:10, culture:2, historyNote:"The Commonwealth strengthens itself against the coming uncertainty." } },
      { label:"Reach out to Guam", hint:"+relations with the south · one people, two flags",
        text:"Quiet exchanges resume between Agaña and Capitol Hill — cultural festivals, student exchanges, family reunions across the strait. The old dream of one Marianas stirs again.",
        fx:{ relationsGuam:6, culture:3, approval:2, historyNote:"The Marianas rekindle ties with Guam as America's union weakens." } }
    ]},

  { id:"dissolution_2028", era:"commonwealth", year:2028, title:"The Union Dissolves",
    text:"It happens faster than anyone dared predict. The mainland's long crisis peaks in a constitutional showdown; the tyrannical Trump regime collapses, and the United States of America dissolves in 2028. States and territories are left to fend for themselves, each trying to figure out new ways of organizing, rebuilding, and surviving.\n\nOvernight, the far-off patron that has ruled the Marianas for eighty years is gone. The Commonwealth's own compact — the Covenant, the federal laws, the transition period — is a dead letter. There is no Washington anymore.\n\nGuam, too, is free — suddenly, and completely. The archipelago's two halves look at each other across the strait and ask the oldest question of all: together, or apart?",
    choices:[
      { label:"The islands will stand together", hint:"+approval · the Marianas brace for the new world",
        text:"The Commonwealth declares its readiness to stand alone. Reserves are laid in, the outer islands are secured, and the conch is sounded across the archipelago: whatever comes next, the Marianas will face it as one.",
        fx:{ relationsGuam:10, reputation:4, gold:10, culture:3, approval:3, historyNote:"2028 — the United States of America dissolves; the Marianas and Guam are left free to choose their own futures." } }
    ]},

  { id:"dawn_of_choice_2029", era:"commonwealth", year:2029, title:"The Dawn of Choice",
    text:"The transition period expires in silence — there is no one left to extend it. The Commonwealth stands alone at last, and the whole archipelago is free: the northern islands and Guam, together under the same sun for the first time since 1898.\n\nTwo futures call. One nation, north and south reunited, bound by blood and language — the Chamorro Republic of the Marianas. Or the northern islands alone, proud and self-sufficient — the Chamolinian Commonwealth of the Pacific.\n\nThe conch sounds. Choose.",
    choices:[
      { label:"Reunify — the Chamorro Republic of the Marianas", hint:"Guam joins · her bases and technologies become yours · nationality: Chamorro",
        text:"Guam's leaders agree to union. The Chamorro Republic of the Marianas is proclaimed from Agaña to the northern volcanoes — one nation, one people, one flag. Guam's military bases, airfields, and high technology are folded into the national arsenal, and the republic is armed as no Marianas nation has been since the Spanish war.",
        fx:{ unlockIslands:["guam"], setAccessible:{ guam:true }, popIsland:{ guam:120 }, military:30, gold:50, selfSufficiency:10, culture:6, approval:8, reputation:5, relationsGuam:10,
             flags:{"reunified":true,"nationality":"chamorro","guam_bases":true}, era:"future",
             historyNote:"2029 — THE CHAMORRO REPUBLIC OF THE MARIANAS IS FOUNDED. Guam reunites with the north; her bases and technologies join the national arsenal." } },
      { label:"Stand alone — the Chamolinian Commonwealth of the Pacific", hint:"Guam remains separate · nationality: Chamolinian",
        text:"The north chooses its own road. The Chamolinian Commonwealth of the Pacific is proclaimed — Chamorro and Carolinian, the two peoples of the islands, one nation under the northern stars. Guam is left to chart its own course, watched with hope rather than claim.",
        fx:{ culture:5, approval:4, reputation:3, gold:8, flags:{"nationality":"chamolinian"}, era:"future",
             historyNote:"2029 — THE CHAMOLINIAN COMMONWEALTH OF THE PACIFIC IS PROCLAIMED. The northern Marianas choose their own road; reunification with Guam is declined." } }
    ]},

  /* ============ FUTURE ============ */
  { id:"future_start", era:"future", year:2029, title:"The Future Begins",
    text:"The nation is born. Now the questions are no longer about survival — they are about destiny.\n\nDo you build an open, democratic society, where every voice is heard and progress is slow but sure? Or do you build a strong, centralized state that delivers results at the price of freedom? Or do you keep the safe, familiar path — postponing the great decisions?\n\nChoose the kind of leader you will be. The islands will remember.",
    choices:[
      { label:"The Democratic Path", hint:"Freedom, fairness, and the slow building of trust",
        text:"Free press, strong labor rights, referenda, and the rule of law. Progress is patient — but the people walk with you.",
        fx:{ govPath:"dem", govMeter:60, happiness:6, culture:4, reputation:3, historyNote:"The Marianas commit to the democratic path." } },
      { label:"The Authoritarian Path", hint:"Discipline, speed, and control",
        text:"A strong leader, a single vision, and no time for debate. The cranes rise faster — and the people learn to whisper.",
        fx:{ govPath:"aut", govMeter:-60, gold:10, happiness:-4, historyNote:"The Marianas take the authoritarian path." } },
      { label:"The Caretaker Path", hint:"Continue the Commonwealth · postpone the great choice",
        text:"Keep the familiar arrangement, manage quietly, and let the future arrive on its own schedule. Safe — but the dream of nationhood waits.",
        fx:{ govPath:"caretaker", govMeter:0, approval:3, historyNote:"The Marianas choose to continue as a Commonwealth for now." } }
    ]},

  { id:"governance_guide_2029", era:"future", year:2029, title:"Shaping the Nation",
    text:"The nation is born — and it must be governed. A flag and a constitution are not enough: the Marianas need laws, institutions, and choices to become real.\n\nOpen the People & Governance tab. There you will find the governance meter and the policy table — free press or state media, labor rights or directives, heritage funds, borders, and more. Click a policy to begin researching it; after a few turns — more for the biggest changes — it is written into law.\n\nFifteen policies must be enacted before the nation can be called complete — as many laws as there are islands in the Marianas — and before the road to victory opens.",
    choices:[
      { label:"Go to the Governance tab", hint:"People & Governance · research & enact policies to shape the new nation",
        text:"The leaders gather at the governance table. Quills are sharpened, and the first policies of the new nation are drafted — fifteen of them, as many as the islands of the Marianas.",
        fx:{ culture:2, approval:2, historyNote:"The new nation turns to governance — fifteen policies, as many as the islands of the Marianas, must be researched and enacted to shape the nation and unlock the road to victory." } }
    ]},

  { id:"republic_workers_2030", era:"future", year:2030, flags:["reunified"], title:"The Workers Become Citizens",
    text:"The new Republic's first great act answers the oldest wound in the islands. For decades the foreign workers of the CNMI — garment hands from China and Bangladesh, hotel staff from the Philippines and Micronesia — were trapped in an uncertain fate: bound to their employers first by the old CNMI Guest Worker Program, then by the United States' CW-1 visa program, never allowed to put down roots, never knowing if the next renewal would send them home.\n\nThey built the mills and the resorts, the roads and the kitchens — and the Republic chooses to keep them, and to do right by them. Thousands of foreign workers and their families are granted permanent residency and an expedited pathway to Chamorro citizenship.\n\nThey become voters — voters bound by no family, no clan, no blood tie. The old politics of the CNMI had run on exactly such ties: a web of kinship and patronage that laundered corruption for generations. The new electorate breaks it. The elections that follow are the freest and fairest the Marianas have ever seen — and they pave the way toward a truly prosperous and secure future for the islands.",
    choices:[
      { label:"Welcome the new citizens", hint:"+population · +approval · the humane path is sealed",
        text:"The residency offices open their doors. Families who have called the Marianas home for a generation or more sign their names, and the Republic grows by thousands, stronger and freer than before.",
        fx:{ popIsland:{ saipan:45, tinian:30, rota:12 }, gold:12, selfSufficiency:5, approval:6, culture:4, reputation:5,
             flags:{"workers_citizens":true},
             historyNote:"The Republic grants thousands of foreign workers permanent residency and a fast path to Chamorro citizenship — new voters with no family or clan ties break the CNMI's old patronage politics, and the freest elections in Marianas history follow." } }
    ]},

  { id:"ccp_deportation_2030", era:"future", year:2030, notFlags:["reunified"], title:"The Long Boats",
    text:"The Chamolinian Commonwealth's first great act is a harsh one. For decades the foreign workers of the CNMI — garment hands from China and Bangladesh, hotel staff from the Philippines and Micronesia — had been held in an uncertain fate by the old Guest Worker Program and then the American CW-1 visas, never knowing if the next renewal would send them home.\n\nNow they know. The new government, Chamorro and Carolinian, decides they have no place in the new nation. They are sent back — thousands upon thousands, to the countries they left decades ago. The garment mills and hotel kitchens empty overnight. The young Commonwealth's economy is gutted; the workforce that built the boom is gone.\n\nThe rebuilding ahead will be harder, longer, and paid for by the families who stayed. Some whisper that the islands have cut off their own hands.",
    choices:[
      { label:"Send them home", hint:"−population · −gold · the economy is gutted",
        text:"The boats take them away, port by port, island by island. The Commonwealth is pure of foreign influence — and emptied of the hands that built it. The hard rebuilding begins.",
        fx:{ popIsland:{ saipan:-45, tinian:-30, rota:-12 }, gold:-18, selfSufficiency:-6, approval:-4, happiness:-3, culture:2,
             flags:{"workers_deported":true},
             historyNote:"The Chamolinian Commonwealth deports the foreign workers who built the modern economy — thousands sent home, the workforce gutted, rebuilding made far harder." } }
    ]},

  { id:"specialization_unlock", era:"future", year:2030, title:"The Strategy of Specialization",
    text:"For the first time in the islands' history, the archipelago can be planned as one economy. The old colonial powers always treated each island as a raw material to be stripped. Now you can make each island a center of excellence — this one for tourism, that one for agriculture, another for technology or energy or the deep-sea trade.\n\nOpen the People & Governance tab and scroll to the National Industry Strategy section. There, for every island, you can assign one industry center — click the industry you want for that island. Centers generate income and self-sufficiency every turn, and can be upgraded with gold (level 1 → 3) for bigger returns. You can change an island's center at any time.\n\nA nation of islands, each doing what it does best, bound together by ships, cables, and a common flag.",
    onEnter:{ revealIndustry:true, historyNote:"Island industry specialization is unlocked." },
    choices:[
      { label:"Open the National Industry Strategy", hint:"People & Governance · assign each island its center",
        text:"The planners sharpen their pencils. Saipan will welcome the world; Tinian will feed it; the northern isles will power it. The archipelago becomes more than the sum of its islands.",
        fx:{ selfSufficiency:5, approval:3, historyNote:"The national specialization strategy begins — assign each island its industry center." } }
    ]},

  { id:"reunification_push", era:"future", year:2030, notFlags:["reunified"], title:"The Dream of One Marianas",
    text:"The Chamolinian Commonwealth stands alone — and across the strait, Guam is charting its own course after the fall of the American union. Families separated by a line on a map. A people split between two flags.\n\nNow, a movement rises across both island groups: 'One Marianas.' The question of reunification moves to the center of public life.",
    choices:[
      { label:"Launch the reunification campaign", hint:"−gold · the dream becomes a national project",
        text:"Funds flow to a joint campaign with Guam's own reunification advocates. Polls on Guam show growing interest in a shared future.",
        fx:{ gold:-15, culture:8, approval:4, relationsGuam:6, historyNote:"The 'One Marianas' reunification movement gains momentum." } },
      { label:"Move cautiously", hint:"Quiet diplomacy · the dream waits",
        text:"The government pursues reunification quietly, through back channels and academic exchanges. Progress is slow — but the door stays open.",
        fx:{ culture:3, relationsGuam:2, historyNote:"Reunification is pursued through quiet diplomacy." } }
    ]},

  { id:"guam_referendum", era:"future", year:2031, notFlags:["reunified"], title:"Guam Decides",
    text:"After years of debate, the people of Guam hold a historic vote on their own future. The options include seeking a new patron, full independence — or reunification with the Northern Marianas as a new, independent nation.\n\nThe world watches. The counting begins.",
    choices:[
      { label:"Negotiate the union", hint:"Requires goodwill · Guam joins the new nation",
        text:"The vote is close, but the Marianas' dream wins. Guam and the Commonwealth agree to form a single nation — to be written together, by all its people.\n\nGuam does not arrive as an empty island. Decades of running its own economy have left it with a population and infrastructure to rival the most developed of the northern isles, and its military bases — the air base at Andersen, the naval base at Apra Harbor — are folded into the national arsenal. The archipelago is whole again.",
        fx:{ unlockIslands:["guam"], setAccessible:{ guam:true }, guamReunify:true, military:25, gold:40, selfSufficiency:6, culture:12, approval:8, relationsGuam:10,
             flags:{"reunified":true,"guam_bases":true}, historyNote:"GUAM VOTES TO REUNIFY. The archipelago is whole for the first time in 130 years — Guam arrives with its full population, economy, and the Andersen and Apra Harbor bases." } },
      { label:"Let Guam choose its own road", hint:"Reunification can wait · respect the vote",
        text:"Guam's vote is inconclusive — independence and reunification fall just short. The dream remains alive, but the islands stay divided a while longer.",
        fx:{ culture:4, approval:-2, relationsGuam:2, historyNote:"Guam's status vote is inconclusive; reunification waits." } }
    ]},

  { id:"independence_declaration", era:"future", year:2032, title:"The Declaration",
    text:"The moment has come. The Marianas — north and south — prepare to declare themselves a sovereign nation: independent, self-governing, and answerable to no foreign capital.\n\nWith the old empires gone, there is no permission to ask and no one to deny it. A constitutional convention has drafted the founding document. On the beach where the first guma' rose a thousand years ago, the flag of the Marianas is raised.",
    choices:[
      { label:"Proclaim sovereignty", hint:"The ultimate goal · the islands take their place in the world",
        text:"In a ceremony before the old latte stones, {nation} is proclaimed. Ships in the harbor sound their horns; the world's capitals send greetings. Every rock of the chain is claimed as home — a research post on Uråkas's lonely cone, a watch station on Fåddai's sliver. After a thousand years of empires, the islands belong to themselves.",
        fx:{ unlockIslands:["fdp","fmedinilla"], popIsland:{ fdp:2, fmedinilla:1 }, flags:{"independent":true}, culture:15, approval:10, reputation:6, gold:-10,
             historyNote:"THE MARIANAS DECLARE INDEPENDENCE. The archipelago becomes a sovereign nation." } },
      { label:"Negotiate a longer transition", hint:"Safer, slower · the flag waits a few more years",
        text:"The declaration is drafted but held — a longer transition, more guarantees, fewer risks. Independence is certain; only the date is not.",
        fx:{ approval:3, reputation:2, historyNote:"Independence is negotiated with a longer transition." } }
    ]},
];

/* ---------------- RANDOM / FLAVOR EVENTS ---------------- */
const RANDOM_EVENTS = [
  { id:"rand_festival", eras:["ancient"], chance:0.3, title:"The Festival of the Sea",
    text:"The village gathers for a feast of flying fish, coconut, and song. Canoes race across the lagoon while the children dive for coins thrown by the chiefs.",
    fx:{ food:8, happiness:3, culture:2 } },
  { id:"rand_taotaomo", eras:["ancient","contact"], chance:0.2, title:"Signs of the Ancestors",
    text:"The elders say the taotaomo'na — the spirits of the forest — are restless. Offerings are left at the banyan trees, and the village walks softly for a season.",
    fx:{ culture:3, happiness:-1 } },
  { id:"rand_reef", eras:["ancient","contact"], chance:0.25, title:"A Fine Season on the Reef",
    text:"The fish are running thick in the reef flats. Every net and spear comes home heavy.",
    fx:{ food:12 } },
  { id:"rand_shipwreck", eras:["contact","spanish"], chance:0.15, title:"A Ship on the Reef",
    text:"A trading ship has wrecked on the outer reef. Salvage crews bring ashore timber, iron, and strange cloth — a windfall for the island.",
    fx:{ wood:14, gold:5 } },
  { id:"rand_drought2", eras:["spanish","german"], chance:0.18, title:"A Thin Season",
    text:"The rains are late and the fields are thin. Rations are stretched; the people grumble and endure.",
    fx:{ food:-8, happiness:-3 } },
  { id:"rand_fiesta", eras:["spanish","german"], chance:0.25, title:"Fiesta!",
    text:"The patron saint's day brings fiesta — roast pig, coconut candy, and dancing in the plaza. Even the governor attends.",
    fx:{ food:-6, happiness:5, culture:2 } },
  { id:"rand_copra", eras:["german","japanese"], chance:0.25, title:"A Full Harvest",
    text:"The copra sheds are overflowing; the schooners can barely take it all. The ledger books show black ink.",
    fx:{ gold:9 } },
  { id:"rand_storm_small", eras:["spanish","german","japanese"], chance:0.2, title:"A Hard Storm",
    text:"A strong typhoon passes near the islands, tearing roofs and flooding the taro patches, but the worst is avoided.",
    fx:{ food:-6, wood:-4, happiness:-3 } },
  { id:"rand_school", eras:["american","commonwealth"], chance:0.25, title:"Graduation Day",
    text:"The high school graduates march in white gowns under the banyan trees. Parents weep; the future smiles.",
    fx:{ happiness:4, culture:2 } },
  { id:"rand_tourists", eras:["commonwealth","future"], chance:0.25, title:"A Planeload of Visitors",
    text:"The charter jets are full again. Hotels report sold-out nights, and the duty-free counters ring.",
    fx:{ gold:10 } },
  { id:"rand_typhoon_modern", eras:["commonwealth","future"], chance:0.15, title:"Storm Watch",
    text:"A typhoon warning sends everyone to the shelters. It passes with a glancing blow — a reminder of the ocean's power.",
    fx:{ gold:-6, happiness:-2 } },
  { id:"rand_worker_day", eras:["commonwealth","future"], chance:0.2, title:"A Day for the Workers",
    text:"May Day brings a parade of unions and guest-worker associations — a celebration of the hands that build the islands.",
    fx:{ happiness:3, culture:1, gold:-2 } },
  { id:"rand_culture_night", eras:["future"], chance:0.28, title:"The Village Night Market",
    text:"The night market fills with the smell of kelaguen and the sound of the belembaotuyan. Tourists and locals mix in the warm sea air.",
    fx:{ gold:6, culture:3, happiness:3 } },
  { id:"rand_volcano", eras:["future"], chance:0.12, title:"Rumbles From Pagan",
    text:"Seismometers on Pagan pick up tremors; ash dusts the northern slopes. Scientists watch closely — and the island's geothermal potential is noted.",
    fx:{ gold:-3, culture:1 } },
  { id:"rand_tech", eras:["future"], chance:0.18, title:"A Submarine Cable Lands",
    text:"A new undersea cable comes ashore, slashing internet costs and opening the islands to the digital economy.",
    fx:{ gold:8, selfSufficiency:2 } },
];

/* ---------------- MISC HELPERS ---------------- */
function islandById(id){ return ISLAND_DEFS[id]; }
function eraById(id){ return ERA_BY_ID[id]; }
