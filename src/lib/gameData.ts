// ─────────────────────────────────────────────────────────────────────────────
// CEO Empire — datos estáticos del juego (misiones, negocios, NPCs, vehículos,
// armas, tienda y trazado de la ciudad).
// La ciudad es una cuadrícula de bloques de 40 unidades: el bloque (i, j) está
// centrado en (i*40, j*40); las calles (ancho 10) pasan por i*40 ± 20.
// ─────────────────────────────────────────────────────────────────────────────

export type Vec3 = [number, number, number];

export const WORLD = {
  blockSize: 40,
  roadWidth: 10,
  blocksPerSide: 7,          // índices -3..3
  bounds: 158,               // límite jugable (|x|,|z| < bounds)
  hqPos: [0, 0, 0] as Vec3,
  helipadPos: [40, 0, 0] as Vec3,
};

export const blockCenter = (i: number, j: number): Vec3 => [i * WORLD.blockSize, 0, j * WORLD.blockSize];

// ── Armas ────────────────────────────────────────────────────────────────────
export interface Weapon {
  id: string;
  name: string;
  icon: string;
  damage: number;
  range: number;      // metros
  cooldown: number;   // segundos
  ranged: boolean;
  price: number;
  description: string;
}

export const WEAPONS: Record<string, Weapon> = {
  fists:  { id: "fists",  name: "Puños",            icon: "👊", damage: 12, range: 2.6, cooldown: 0.5,  ranged: false, price: 0,    description: "Negociación agresiva cuerpo a cuerpo." },
  bat:    { id: "bat",    name: "Bate Ejecutivo",   icon: "🏏", damage: 28, range: 3.2, cooldown: 0.65, ranged: false, price: 800,  description: "Para cerrar tratos difíciles." },
  pistol: { id: "pistol", name: "Pistola Corporativa", icon: "🔫", damage: 45, range: 24, cooldown: 0.42, ranged: true, price: 4000, description: "Consume munición. Alcance largo." },
};

export const WEAPON_ORDER = ["fists", "bat", "pistol"];

// ── Objetos de tienda ────────────────────────────────────────────────────────
export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  description: string;
  kind: "consumable" | "weapon" | "ammo" | "perk";
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "medkit", name: "Kit Médico CEO",     icon: "💊", price: 300,   kind: "consumable", description: "Recupera 50 de salud." },
  { id: "ammo",   name: "Caja de munición (x20)", icon: "📦", price: 250, kind: "ammo",     description: "20 balas para la pistola." },
  { id: "bat",    name: "Bate Ejecutivo",     icon: "🏏", price: 800,   kind: "weapon",     description: "Daño 28 · alcance corto." },
  { id: "pistol", name: "Pistola Corporativa", icon: "🔫", price: 4000, kind: "weapon",     description: "Daño 45 · alcance largo. Incluye 20 balas." },
  { id: "armor",  name: "Traje Blindado",     icon: "🦺", price: 12000, kind: "perk",       description: "Reduce el daño recibido un 40 % (permanente)." },
];

// ── Negocios ─────────────────────────────────────────────────────────────────
export interface Business {
  id: string;
  name: string;
  price: number;
  incomePerSec: number;   // nivel 1
  block: [number, number];
  pos: Vec3;              // marcador de compra (frente al edificio)
  buildingPos: Vec3;
  size: [number, number, number]; // ancho, alto, fondo
  icon: string;
  color: string;
  description: string;
}

const biz = (
  id: string, name: string, price: number, incomePerSec: number,
  block: [number, number], size: [number, number, number], icon: string, color: string, description: string,
): Business => {
  const c = blockCenter(block[0], block[1]);
  return {
    id, name, price, incomePerSec, block, size, icon, color, description,
    pos: [c[0], 0, c[2] + 12],
    buildingPos: [c[0], 0, c[2] - 2],
  };
};

export const BUSINESSES: Business[] = [
  biz("cafe",      "Cafetería Digital",  5000,    8,    [-1, -1], [14, 7, 12],  "☕", "#c0795c", "El primer paso hacia el imperio."),
  biz("marketing", "Agencia Marketing",  15000,   20,   [1, -1],  [16, 18, 12], "📊", "#5c7cc0", "Amplifica tu marca en toda la ciudad."),
  biz("design",    "Estudio de Diseño",  25000,   35,   [-2, 1],  [16, 12, 14], "🎨", "#c05c8a", "Arte y funcionalidad unidos."),
  biz("school",    "Escuela de Código",  50000,   60,   [2, 2],   [18, 16, 14], "💻", "#5cc090", "Forma a los tech del mañana."),
  biz("ecom",      "E-commerce Hub",     100000,  120,  [-1, -2], [20, 24, 14], "🛒", "#c0a05c", "La columna vertebral del negocio online."),
  biz("apps",      "Fábrica de Apps",    200000,  250,  [1, 2],   [18, 30, 14], "📱", "#905cc0", "Lanza apps al mercado global."),
  biz("ai",        "Torre de IA",        450000,  600,  [-3, -3], [18, 48, 18], "🤖", "#5ca0c0", "El futuro en tu mano."),
  biz("empire",    "Shopy Empire",       1000000, 1500, [3, 3],   [22, 60, 22], "👑", "#ffd700", "La cima del poder CEO."),
];

export const MAX_BUSINESS_LEVEL = 3;
export const upgradeCost = (b: Business, currentLevel: number) => Math.round(b.price * 0.6 * currentLevel);
export const businessIncome = (b: Business, level: number) => b.incomePerSec * Math.pow(1.6, level - 1);
export const MAX_EMPLOYEES = 6;
export const HIRE_COST = 2500;
export const EMPLOYEE_BONUS = 0.1; // +10 % ingresos por empleado

// ── NPCs ─────────────────────────────────────────────────────────────────────
export type NpcType = "friendly" | "neutral" | "hostile" | "boss" | "police";
export type CharacterVariant =
  | "alec" | "formal" | "ejecutiva" | "creativa" | "casual_m" | "casual_f"
  | "vendor" | "goon" | "police" | "lord_tuetano" | "majin" | "illidan" | "arthas";

export interface NpcConfig {
  id: string;
  name: string;
  variant: CharacterVariant;
  type: NpcType;
  pos: Vec3;
  wanderRadius: number;
  dialogue: string[];
  health: number;
  damage: number;
  scale?: number;
  group?: string;         // grupo para misiones de "eliminar"
  respawn?: boolean;      // reaparece tras morir
  aggroRange?: number;
  glb?: string;           // modelo GLB opcional en public/assets/models
}

const ADVISOR_LINES_GARCIA = [
  "CEO, el mercado nos espera. Tu visión cambiará esta ciudad para siempre.",
  "Cada negocio que compras genera ingresos pasivos. Mejóralos con la tecla U.",
  "Los matones de Lord Tuétano rondan el noreste. Ten cuidado por la noche.",
];
const ADVISOR_LINES_MARIA = [
  "Los inversores están listos. ¡Hoy es el día del éxito!",
  "Contrata talento hablando con los ciudadanos: cada empleado suma un 10 % a tus ingresos.",
  "Si la policía te persigue, aléjate y espera: el nivel de búsqueda baja con el tiempo.",
];
const ADVISOR_LINES_ELENA = [
  "El diseño es el alma del negocio. Juntos crearemos algo extraordinario.",
  "Por la ciudad hay maletines con dinero y kits médicos. ¡Explora!",
  "El Vendedor del suroeste vende armas, munición y un traje blindado.",
];
const CITIZEN_LINES = [
  "Esta ciudad está cambiando mucho. ¡Menuda empresa la tuya!",
  "Dicen que Shopy Empire vale más que toda la bolsa.",
  "¿Has visto la Torre de IA? Dicen que piensa sola.",
  "Ayer vi a Lord Tuétano gritándole a una máquina de café.",
  "Ojalá encontrar un trabajo digno… ¿me contratas, CEO?",
  "Los coches del centro son de alquiler libre, ¡pero conduce con cuidado!",
];
const GOON_LINES = ["¡Fuera de nuestro territorio, trajeado!", "Lord Tuétano manda aquí.", "¡Te vamos a hundir la empresa!"];

export const NPC_CONFIGS: NpcConfig[] = [
  // Asesores (HQ)
  { id: "npc_garcia", name: "Director García", variant: "formal",    type: "friendly", pos: [8, 0, 10],  wanderRadius: 4, dialogue: ADVISOR_LINES_GARCIA, health: 100, damage: 0, glb: "chico_formal" },
  { id: "npc_maria",  name: "María Ejecutiva", variant: "ejecutiva", type: "friendly", pos: [-8, 0, 12], wanderRadius: 4, dialogue: ADVISOR_LINES_MARIA,  health: 100, damage: 0, glb: "chica_ejecutiva" },
  { id: "npc_elena",  name: "Elena Creativa",  variant: "creativa",  type: "friendly", pos: [12, 0, -2],  wanderRadius: 4, dialogue: ADVISOR_LINES_ELENA,  health: 100, damage: 0, glb: "chica_creativa" },
  // Vendedor
  { id: "npc_vendor", name: "El Vendedor",     variant: "vendor",    type: "friendly", pos: [-40, 0, 46], wanderRadius: 0, dialogue: ["Armas, munición, medicinas… todo lo que un CEO necesita. ¿Qué te pongo?"], health: 100, damage: 0 },
  // Ciudadanos
  { id: "npc_cit1", name: "Carlos",  variant: "casual_m", type: "neutral", pos: [30, 0, 22],   wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true, glb: "chico_casual" },
  { id: "npc_cit2", name: "Lucía",   variant: "casual_f", type: "neutral", pos: [-26, 0, 24],  wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  { id: "npc_cit3", name: "Tomás",   variant: "casual_m", type: "neutral", pos: [-62, 0, -18], wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true, glb: "chico_casual" },
  { id: "npc_cit4", name: "Ana",     variant: "casual_f", type: "neutral", pos: [58, 0, 62],   wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  { id: "npc_cit5", name: "Pedro",   variant: "casual_m", type: "neutral", pos: [-82, 0, 78],  wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true, glb: "chico_casual" },
  { id: "npc_cit6", name: "Sofía",   variant: "casual_f", type: "neutral", pos: [82, 0, -22],  wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  { id: "npc_cit7", name: "Diego",   variant: "casual_m", type: "neutral", pos: [-20, 0, -62], wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true, glb: "chico_casual" },
  { id: "npc_cit8", name: "Marta",   variant: "casual_f", type: "neutral", pos: [22, 0, 102],  wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  // Matones de Lord Tuétano (bloque 2,-2 → 80,-80)
  { id: "goon1", name: "Matón de Tuétano", variant: "goon", type: "hostile", pos: [70, 0, -70], wanderRadius: 12, dialogue: GOON_LINES, health: 70, damage: 8, group: "tuetano", respawn: true, aggroRange: 16 },
  { id: "goon2", name: "Matón de Tuétano", variant: "goon", type: "hostile", pos: [92, 0, -74], wanderRadius: 12, dialogue: GOON_LINES, health: 70, damage: 8, group: "tuetano", respawn: true, aggroRange: 16 },
  { id: "goon3", name: "Matón de Tuétano", variant: "goon", type: "hostile", pos: [84, 0, -92], wanderRadius: 12, dialogue: GOON_LINES, health: 70, damage: 8, group: "tuetano", respawn: true, aggroRange: 16 },
  { id: "goon4", name: "Guardaespaldas",   variant: "goon", type: "hostile", pos: [-112, 0, 48], wanderRadius: 10, dialogue: GOON_LINES, health: 90, damage: 9, group: "illidan", respawn: true, aggroRange: 14 },
  { id: "goon5", name: "Guardaespaldas",   variant: "goon", type: "hostile", pos: [112, 0, -88], wanderRadius: 10, dialogue: GOON_LINES, health: 90, damage: 9, group: "majin", respawn: true, aggroRange: 14 },
  // Jefes
  { id: "boss_tuetano", name: "Lord Tuétano",      variant: "lord_tuetano", type: "boss", pos: [80, 0, -84],   wanderRadius: 6, dialogue: ["¡Tu empresa no vale nada! ¡Yo domino este mercado y lo aplasto todo!"], health: 320, damage: 14, scale: 1.25, aggroRange: 18, glb: "lord_tuetano" },
  { id: "boss_illidan", name: "Illidan Marcados", variant: "illidan",      type: "boss", pos: [-120, 0, 38],  wanderRadius: 6, dialogue: ["No estás preparado… para competir conmigo en el mercado."], health: 420, damage: 16, scale: 1.3, aggroRange: 18, glb: "illidan" },
  { id: "boss_majin",   name: "Majin CEO",         variant: "majin",        type: "boss", pos: [120, 0, -80],  wanderRadius: 6, dialogue: ["¡MAJIN CEO DESTRUYE TODOS LOS NEGOCIOS! ¡CHOCOLATE!"], health: 400, damage: 15, scale: 1.35, aggroRange: 18, glb: "majin_bu" },
  { id: "boss_arthas",  name: "Arthas, Rey Exánime", variant: "arthas",     type: "boss", pos: [0, 0, -118],   wanderRadius: 6, dialogue: ["Este mundo no necesita héroes empresariales… sólo al Rey Exánime de los negocios."], health: 700, damage: 20, scale: 1.4, aggroRange: 20, glb: "arthas" },
];

export const BOSS_IDS = NPC_CONFIGS.filter(n => n.type === "boss").map(n => n.id);

// ── Vehículos ────────────────────────────────────────────────────────────────
export interface VehicleConfig {
  id: string;
  name: string;
  color: string;
  pos: Vec3;
  heading: number;
  maxSpeed: number;   // m/s
  accel: number;
  handling: number;
}

export const VEHICLE_CONFIGS: VehicleConfig[] = [
  { id: "car1", name: "Ferrari CEO",      color: "#d1202a", pos: [23, 0, 30],   heading: 0,            maxSpeed: 30, accel: 14, handling: 2.4 },
  { id: "car2", name: "Lamborghini Azul", color: "#2a5bd7", pos: [-23, 0, 30],  heading: 0,            maxSpeed: 34, accel: 16, handling: 2.2 },
  { id: "car3", name: "Tesla Verde",      color: "#2fa85a", pos: [23, 0, -30],  heading: Math.PI,      maxSpeed: 26, accel: 18, handling: 2.6 },
  { id: "car4", name: "Rolls Dorado",     color: "#d4a51b", pos: [-23, 0, -30], heading: Math.PI,      maxSpeed: 22, accel: 10, handling: 1.8 },
  { id: "car5", name: "Porsche Blanco",   color: "#eeeeee", pos: [-57, 0, 62],  heading: 0,            maxSpeed: 28, accel: 15, handling: 2.5 },
  { id: "car6", name: "Taxi Urbano",      color: "#f2c318", pos: [57, 0, -62],  heading: Math.PI,      maxSpeed: 22, accel: 11, handling: 2.0 },
];

// ── Personajes jugables ──────────────────────────────────────────────────────
export interface PlayableCharacter {
  key: string;
  variant: CharacterVariant;
  label: string;
  icon: string;
  description: string;
  perk: string;
  glb?: string;
}

export const CHARACTERS: PlayableCharacter[] = [
  { key: "alec",      variant: "alec",      label: "Alec CEO",      icon: "🎩", description: "El millonario del mercado",  perk: "+10 % ingresos pasivos",          glb: "alec_monopoly" },
  { key: "formal",    variant: "formal",    label: "CEO Formal",    icon: "👔", description: "Elegante y estratégico",     perk: "Negocios un 10 % más baratos",    glb: "chico_formal" },
  { key: "ejecutiva", variant: "ejecutiva", label: "CEO Ejecutiva", icon: "💼", description: "Liderazgo con estilo",       perk: "+20 % de salud máxima",            glb: "chica_ejecutiva" },
  { key: "creativa",  variant: "creativa",  label: "CEO Creativa",  icon: "🎨", description: "Innovación sin límites",     perk: "+15 % velocidad de movimiento",   glb: "chica_creativa" },
];

export const characterByKey = (key: string) => CHARACTERS.find(c => c.key === key) ?? CHARACTERS[0];

// ── Objetos coleccionables del mundo ─────────────────────────────────────────
export interface PickupConfig {
  id: string;
  kind: "money" | "medkit" | "ammo" | "data";
  pos: Vec3;
  value: number;
}

export const PICKUPS: PickupConfig[] = [
  { id: "p1",  kind: "money",  pos: [-30, 0, -6],   value: 400 },
  { id: "p2",  kind: "money",  pos: [58, 0, 18],    value: 600 },
  { id: "p3",  kind: "money",  pos: [-96, 0, -58],  value: 800 },
  { id: "p4",  kind: "money",  pos: [104, 0, 58],   value: 900 },
  { id: "p5",  kind: "money",  pos: [-18, 0, 98],   value: 700 },
  { id: "p6",  kind: "money",  pos: [140, 0, -140], value: 1500 },
  { id: "p7",  kind: "money",  pos: [-140, 0, 140], value: 1500 },
  { id: "p8",  kind: "medkit", pos: [18, 0, 58],    value: 1 },
  { id: "p9",  kind: "medkit", pos: [-58, 0, -98],  value: 1 },
  { id: "p10", kind: "medkit", pos: [98, 0, -18],   value: 1 },
  { id: "p11", kind: "medkit", pos: [-4, 0, -98],   value: 1 },
  { id: "p12", kind: "ammo",   pos: [62, 0, -102],  value: 15 },
  { id: "p13", kind: "ammo",   pos: [-102, 0, 22],  value: 15 },
  { id: "p14", kind: "money",  pos: [-60, 0, 100],  value: 500 },
  { id: "p15", kind: "money",  pos: [100, 0, 100],  value: 650 },
];

// Chips de datos de la misión "Datos Perdidos"
export const DATA_CHIPS: Vec3[] = [
  [-42, 0, 0], [42, 0, -40], [-80, 0, 60], [20, 0, 80], [-6, 0, -60], [96, 0, 40],
];

// ── Misiones ─────────────────────────────────────────────────────────────────
export type MissionType = "goto" | "buy" | "kill_group" | "kill_boss" | "own_count" | "collect" | "deliver" | "hire";

export interface Mission {
  id: string;
  title: string;
  giverNpcId: string;
  briefing: string;
  objective: string;
  type: MissionType;
  markerPos?: Vec3;
  targetBusiness?: string;
  targetGroup?: string;
  targetCount?: number;
  targetBosses?: string[];
  timeLimit?: number;
  color: string;
  rewardMoney: number;
  rewardKarma: number;
  completeText: string;
  nextMissionId: string | null;
}

export const MISSIONS: Mission[] = [
  {
    id: "m1", title: "Primeros Pasos", giverNpcId: "npc_garcia", type: "goto",
    briefing: "Bienvenido, CEO. Tu maletín con los datos del inversor está en el kiosco del Vendedor, al suroeste. Ve a por él: el marcador azul te guía. Puedes correr con Shift.",
    objective: "Recoge el maletín de datos en el kiosco del Vendedor",
    markerPos: [-40, 0, 40], color: "#00f5ff", rewardMoney: 3000, rewardKarma: 5,
    completeText: "Maletín recogido. Los datos del inversor están a salvo.", nextMissionId: "m2",
  },
  {
    id: "m2", title: "Primer Negocio", giverNpcId: "npc_garcia", type: "buy", targetBusiness: "cafe",
    briefing: "Todo imperio empieza por un café. Compra la Cafetería Digital al noroeste de la plaza (marcador amarillo). Acércate al círculo dorado y pulsa B.",
    objective: "Compra la Cafetería Digital (tecla B en el marcador dorado)",
    markerPos: [-40, 0, -28], color: "#ffd700", rewardMoney: 5000, rewardKarma: 10,
    completeText: "¡Cafetería adquirida! Ya generas ingresos pasivos cada segundo.", nextMissionId: "m3",
  },
  {
    id: "m3", title: "Entrega Urgente", giverNpcId: "npc_maria", type: "deliver", timeLimit: 75,
    briefing: "La Agencia Marketing necesita este contrato firmado en menos de 75 segundos. Coge un coche de la plaza (tecla E) y corre al marcador naranja.",
    objective: "Entrega el contrato en la Agencia Marketing antes de que acabe el tiempo",
    markerPos: [40, 0, -28], color: "#ff8c00", rewardMoney: 7000, rewardKarma: 5,
    completeText: "Contrato entregado a tiempo. La agencia quiere trabajar contigo.", nextMissionId: "m4",
  },
  {
    id: "m4", title: "Limpieza de Barrio", giverNpcId: "npc_garcia", type: "kill_group", targetGroup: "tuetano", targetCount: 3,
    briefing: "Los matones de Lord Tuétano extorsionan a los comercios del noreste. Elimina a tres de ellos. Golpea con clic izquierdo; el Vendedor vende un bate si lo necesitas.",
    objective: "Elimina a 3 matones de Tuétano en el distrito noreste",
    markerPos: [80, 0, -80], color: "#ff4444", rewardMoney: 10000, rewardKarma: -5,
    completeText: "Barrio limpio. Los comerciantes vuelven a respirar.", nextMissionId: "m5",
  },
  {
    id: "m5", title: "El Rival Amenaza", giverNpcId: "npc_garcia", type: "kill_boss", targetBosses: ["boss_tuetano"],
    briefing: "Lord Tuétano en persona te espera en su guarida del noreste. Derrótalo y el distrito será tuyo. Lleva kits médicos.",
    objective: "Derrota a Lord Tuétano en su guarida",
    markerPos: [80, 0, -84], color: "#ff2222", rewardMoney: 25000, rewardKarma: -5,
    completeText: "Lord Tuétano ha caído. El mercado del noreste es tuyo.", nextMissionId: "m6",
  },
  {
    id: "m6", title: "Expansión de Mercado", giverNpcId: "npc_maria", type: "own_count", targetCount: 4,
    briefing: "Es hora de crecer. Controla al menos cuatro negocios de la ciudad. Los marcadores dorados del minimapa señalan los que están en venta.",
    objective: "Posee 4 negocios en la ciudad",
    color: "#ffd700", rewardMoney: 40000, rewardKarma: 15,
    completeText: "¡Cuatro negocios! Tu nombre empieza a sonar en la bolsa.", nextMissionId: "m7",
  },
  {
    id: "m7", title: "Datos Perdidos", giverNpcId: "npc_elena", type: "collect", targetCount: DATA_CHIPS.length,
    briefing: "Unos chips con los datos de nuestros clientes se han perdido por la ciudad. Recupera los seis chips verdes brillantes; aparecen en el minimapa.",
    objective: "Recupera los 6 chips de datos repartidos por la ciudad",
    color: "#00ff88", rewardMoney: 30000, rewardKarma: 15,
    completeText: "Datos recuperados. Elena ya prepara el rediseño de la marca.", nextMissionId: "m8",
  },
  {
    id: "m8", title: "Captación de Talento", giverNpcId: "npc_maria", type: "hire", targetCount: 3,
    briefing: "Un imperio necesita gente. Habla con los ciudadanos (tecla F) y contrata a tres empleados. Cada uno suma un 10 % a tus ingresos.",
    objective: "Contrata a 3 empleados hablando con ciudadanos",
    color: "#7fd1ff", rewardMoney: 20000, rewardKarma: 20,
    completeText: "Equipo formado. La productividad se dispara.", nextMissionId: "m9",
  },
  {
    id: "m9", title: "Guerra de Mercado", giverNpcId: "npc_garcia", type: "kill_boss", targetBosses: ["boss_illidan", "boss_majin"],
    briefing: "Illidan Marcados (oeste) y Majin CEO (este) han formado un cártel contra ti. Derrota a ambos. Una pistola y el traje blindado te vendrán bien.",
    objective: "Derrota a Illidan Marcados y a Majin CEO",
    color: "#c040ff", rewardMoney: 80000, rewardKarma: -10,
    completeText: "El cártel se ha disuelto. Ya nadie discute tu liderazgo.", nextMissionId: "m10",
  },
  {
    id: "m10", title: "Imperio Imparable", giverNpcId: "npc_maria", type: "own_count", targetCount: 6,
    briefing: "Seis negocios y serás la mayor fortuna de la ciudad. Mejora los que ya tienes (tecla U) para acelerar tus ingresos.",
    objective: "Posee 6 negocios en la ciudad",
    color: "#ffd700", rewardMoney: 150000, rewardKarma: 20,
    completeText: "Seis negocios. Los periódicos ya hablan de tu imperio.", nextMissionId: "m11",
  },
  {
    id: "m11", title: "El Rey Exánime", giverNpcId: "npc_garcia", type: "kill_boss", targetBosses: ["boss_arthas"],
    briefing: "Arthas, el Rey Exánime de los negocios, controla la Torre Exánime al norte. Es el enemigo más poderoso que verás. Ve preparado.",
    objective: "Derrota a Arthas en la Torre Exánime",
    markerPos: [0, 0, -118], color: "#66ccff", rewardMoney: 200000, rewardKarma: 30,
    completeText: "Arthas ha caído. Ya no queda rival en la ciudad.", nextMissionId: "m12",
  },
  {
    id: "m12", title: "CEO del Año", giverNpcId: "npc_garcia", type: "goto",
    briefing: "El inversor te espera en el helipuerto junto al HQ para cerrar el trato del siglo. Ve al marcador dorado. ¡Es tu momento!",
    objective: "Ve al helipuerto y cierra el trato del siglo",
    markerPos: [40, 0, 0], color: "#ffd700", rewardMoney: 1000000, rewardKarma: 50,
    completeText: "¡ERES EL CEO DEL AÑO! El imperio es tuyo.", nextMissionId: null,
  },
];

export const missionById = (id: string | null | undefined) => MISSIONS.find(m => m.id === id);

// ── Trazado de la ciudad ─────────────────────────────────────────────────────
export interface BuildingDef {
  x: number; z: number; w: number; d: number; h: number;
  color: string;
  style: number;   // índice de textura de ventanas
  roof?: "flat" | "antenna" | "helipad";
}

export interface ObstacleAABB { x: number; z: number; hw: number; hd: number }

const RESERVED_BLOCKS = new Set<string>([
  "0,0",                     // HQ
  "1,0",                     // Helipuerto
  "-1,1",                    // Vendedor
  "-2,-2", "2,-1", "-2,2",   // Parques
  "2,-2", "-3,1", "3,-2",    // Guaridas de jefes
  "0,-3",                    // Torre Exánime
  ...BUSINESSES.map(b => `${b.block[0]},${b.block[1]}`),
]);

// RNG determinista para que la ciudad sea siempre igual
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = ["#8ca0b0", "#6d8b9e", "#7a8fa0", "#9aacb8", "#b0956a", "#a0855a", "#c0a876", "#9090b0", "#8080a0", "#a0a0c0", "#b090b0", "#b8a080", "#7890a8", "#6080a0", "#c89060", "#d0c0a0", "#88a0a8"];

function generateBuildings(): BuildingDef[] {
  const rnd = mulberry32(20240917);
  const out: BuildingDef[] = [];
  const half = Math.floor(WORLD.blocksPerSide / 2);
  for (let i = -half; i <= half; i++) {
    for (let j = -half; j <= half; j++) {
      if (RESERVED_BLOCKS.has(`${i},${j}`)) continue;
      const [cx, , cz] = blockCenter(i, j);
      const distCenter = Math.hypot(i, j);
      const layout = rnd();
      const pick = () => PALETTE[Math.floor(rnd() * PALETTE.length)];
      const height = (base: number) => Math.round(base * (distCenter < 1.6 ? 2.2 : distCenter < 2.6 ? 1.4 : 1) + rnd() * 10);
      if (layout < 0.35) {
        // Un rascacielos grande
        out.push({ x: cx, z: cz, w: 18 + rnd() * 4, d: 18 + rnd() * 4, h: height(30), color: pick(), style: Math.floor(rnd() * 4), roof: rnd() < 0.4 ? "antenna" : "flat" });
      } else if (layout < 0.7) {
        // Dos edificios medianos
        out.push({ x: cx - 6.5, z: cz - 5, w: 10, d: 13, h: height(18), color: pick(), style: Math.floor(rnd() * 4) });
        out.push({ x: cx + 6.5, z: cz + 5, w: 10, d: 13, h: height(14), color: pick(), style: Math.floor(rnd() * 4) });
      } else {
        // Cuatro edificios bajos (barrio)
        for (const [ox, oz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
          out.push({ x: cx + ox, z: cz + oz, w: 9, d: 9, h: height(7), color: pick(), style: Math.floor(rnd() * 4) });
        }
      }
    }
  }
  return out;
}

export const CITY_BUILDINGS: BuildingDef[] = generateBuildings();

// Edificios especiales (HQ, guaridas, torre)
export const SPECIAL_BUILDINGS: BuildingDef[] = [
  { x: 0, z: -4, w: 16, d: 14, h: 70, color: "#3d5a80", style: 0, roof: "antenna" },       // Shopy HQ
  { x: 80, z: -92, w: 18, d: 12, h: 12, color: "#4a3030", style: 3 },                      // Guarida Tuétano
  { x: -120, z: 30, w: 16, d: 12, h: 14, color: "#3a2a4a", style: 3 },                     // Guarida Illidan
  { x: 120, z: -90, w: 16, d: 12, h: 12, color: "#4a3a50", style: 3 },                     // Guarida Majin
  { x: 0, z: -128, w: 22, d: 16, h: 56, color: "#243040", style: 2, roof: "antenna" },     // Torre Exánime
  { x: -40, z: 34, w: 6, d: 4, h: 3.2, color: "#7a4a2a", style: 3 },                       // Kiosco del Vendedor
];

export const PARKS: Vec3[] = [blockCenter(-2, -2), blockCenter(2, -1), blockCenter(-2, 2)];

export const ALL_BUILDINGS: BuildingDef[] = [
  ...CITY_BUILDINGS,
  ...SPECIAL_BUILDINGS,
  ...BUSINESSES.map<BuildingDef>(b => ({ x: b.buildingPos[0], z: b.buildingPos[2], w: b.size[0], d: b.size[2], h: b.size[1], color: b.color, style: 1 })),
];

export const OBSTACLES: ObstacleAABB[] = ALL_BUILDINGS.map(b => ({ x: b.x, z: b.z, hw: b.w / 2, hd: b.d / 2 }));

export const ROAD_LINES: number[] = (() => {
  const half = Math.floor(WORLD.blocksPerSide / 2);
  const lines: number[] = [];
  for (let i = -half - 1; i <= half; i++) lines.push(i * WORLD.blockSize + WORLD.blockSize / 2);
  return lines; // -140, -100, ..., 140
})();
