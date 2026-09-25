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
  {
    id: "club", name: "Club Diamante", price: 75000, incomePerSec: 90, block: [-1, 2], size: [20, 9, 12],
    pos: [-40, 0, 61], buildingPos: [-40, 0, 90], icon: "💎", color: "#ff2d95",
    description: "El club nocturno más exclusivo. Ingresos x2 de noche.",
  },
];

export const CLUB = {
  building: [-40, 0, 90] as Vec3,       // fachada (20 × 9 × 12)
  entrance: [-40, 0, 67] as Vec3,       // hueco de la valla
  stage: [-40, 0, 78] as Vec3,
  bar: [-50, 0, 74] as Vec3,
  dj: [-30, 0, 74] as Vec3,
  terrace: { x: -40, z: 76, w: 28, d: 16 }, // z 68..84
};

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
  | "vendor" | "goon" | "police" | "lord_tuetano" | "majin" | "illidan" | "arthas"
  | "dancer" | "bouncer" | "madame" | "racer" | "intern" | "crafter" | "detective" | "promoter" | "mole";
// Nota: "illidan", "majin" y "arthas" son solo estilos del personaje procedural de respaldo;
// en el juego los jefes son Guerrero Carmesí, Guerrero Sombrío y Dragón de Hielo (modelos GLB).

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
  "Dicen que en la Torre de Hielo, al norte, duerme un dragón. Nadie ha vuelto de allí.",
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
const TITAN_LINES = ["Corporación Titán no negocia con startups.", "Tu marketplace será absorbido.", "Nada personal: es solo capital."];

export const NPC_CONFIGS: NpcConfig[] = [
  // ── Asesores del HQ ──
  { id: "npc_garcia", name: "Director García", variant: "formal",    type: "friendly", pos: [8, 0, 10],  wanderRadius: 4, dialogue: ADVISOR_LINES_GARCIA, health: 100, damage: 0, glb: "chico_formal" },
  { id: "npc_maria",  name: "María Ejecutiva", variant: "ejecutiva", type: "friendly", pos: [-8, 0, 12], wanderRadius: 4, dialogue: ADVISOR_LINES_MARIA,  health: 100, damage: 0, glb: "chica_ejecutiva" },
  { id: "npc_elena",  name: "Elena Creativa",  variant: "creativa",  type: "friendly", pos: [12, 0, -2], wanderRadius: 4, dialogue: ADVISOR_LINES_ELENA,  health: 100, damage: 0, glb: "chica_creativa" },
  { id: "npc_victor", name: "Víctor Salas (CFO)", variant: "mole",   type: "friendly", pos: [-4, 0, 4],  wanderRadius: 3, dialogue: ["Los números cuadran, CEO. Confía en mí… yo me ocupo de los datos.", "Titán ofrece mucho dinero por gente con talento. Solo lo comento."], health: 100, damage: 0 },
  { id: "npc_nico",   name: "Nico, el becario", variant: "intern",   type: "friendly", pos: [6, 0, 4],   wanderRadius: 3, dialogue: ["¡Jefe! Tengo paquetes que repartir y cero coche. ¿Me ayudas?", "Mi madre no se cree que trabajo para Shopy Crafter."], health: 80, damage: 0 },
  { id: "npc_mora",   name: "Detective Mora",  variant: "detective", type: "friendly", pos: [-13, 0, 6], wanderRadius: 2, dialogue: ["La comisaría no da abasto. Si quieres ganarte un extra, tengo recompensas pendientes.", "Cuidado con las estrellas: a partir de tres, mis compañeros no preguntan."], health: 120, damage: 0 },
  { id: "npc_rayo",   name: "Rayo",            variant: "racer",     type: "friendly", pos: [17, 0, 14], wanderRadius: 3, dialogue: ["¿Ese Ferrari es tuyo? Demuéstralo en mi circuito.", "Las carreras se corren de noche, pero yo no tengo horario."], health: 90, damage: 0 },
  // ── Vendedor y crafters ──
  { id: "npc_vendor", name: "El Vendedor",     variant: "vendor",    type: "friendly", pos: [-40, 0, 46], wanderRadius: 0, dialogue: ["Armas, munición, medicinas… todo lo que un CEO necesita. ¿Qué te pongo?"], health: 100, damage: 0 },
  { id: "npc_valeria", name: "Valeria, artesana", variant: "crafter", type: "friendly", pos: [-47, 0, -24], wanderRadius: 3, dialogue: ["Vendo cerámica en Shopy Crafter desde el primer día. Tu plataforma me cambió la vida.", "Si invirtieras en mi taller, te devolvería el doble. Palabra de crafter."], health: 80, damage: 0 },
  { id: "npc_lia",    name: "Lía, la becaria", variant: "intern",    type: "friendly", pos: [-80, 0, -75], wanderRadius: 2, dialogue: ["¡Socorro! Vine a una reunión y el parque está lleno de… ¿esqueletos?", "Gracias por sacarme de ahí. Nunca más reuniones al aire libre."], health: 80, damage: 0 },
  // ── Club Diamante ──
  { id: "npc_vega",   name: "Madame Vega",     variant: "madame",    type: "friendly", pos: [-35, 0, 72], wanderRadius: 2, dialogue: ["Bienvenido al Diamante, CEO. Aquí se cierran los tratos que no caben en una oficina.", "Los matones de Tuétano molestan a mis chicas. Un socio de verdad se ocuparía de ello."], health: 100, damage: 0 },
  { id: "npc_gorila", name: "Gorila (portero)", variant: "bouncer",  type: "friendly", pos: [-43.5, 0, 66], wanderRadius: 0, dialogue: ["Lista de invitados o nada. …Ah, eres el CEO. Pasa, Madame te espera en la terraza."], health: 200, damage: 0 },
  { id: "npc_dj",     name: "DJ Neón",         variant: "casual_m",  type: "friendly", pos: [-30, 0, 71.5], wanderRadius: 0, dialogue: ["¡Esta noche el Diamante arde! Pide lo que quieras, menos reguetón viejo."], health: 80, damage: 0 },
  { id: "npc_dancer1", name: "Kiara",          variant: "dancer",    type: "friendly", pos: [-41.6, 0, 77.6], wanderRadius: 0, dialogue: ["¡Hola, jefe! Si compras el club, pide que cambien los focos… ¡a rosa!"], health: 80, damage: 0 },
  { id: "npc_dancer2", name: "Naomi",          variant: "dancer",    type: "friendly", pos: [-38.4, 0, 77.6], wanderRadius: 0, dialogue: ["Madame dice que eres el próximo gran nombre de la ciudad. Ya veremos."], health: 80, damage: 0 },
  { id: "npc_dancer3", name: "Sasha",          variant: "dancer",    type: "friendly", pos: [-40, 0, 80.2], wanderRadius: 0, dialogue: ["Mi tienda de vestidos en Shopy Crafter vende más que este escenario, ¿sabes?"], health: 80, damage: 0 },
  // ── Promotor de peleas ──
  { id: "npc_rufo",   name: "Don Rufo",        variant: "promoter",  type: "friendly", pos: [66, 0, -64], wanderRadius: 2, dialogue: ["Apuestas, sangre y gloria. Brock lleva 40 combates invicto. ¿Te atreves?"], health: 100, damage: 0 },
  // ── Ciudadanos ──
  { id: "npc_cit1", name: "Carlos",  variant: "casual_m", type: "neutral", pos: [30, 0, 22],   wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true, glb: "chico_casual" },
  { id: "npc_cit2", name: "Lucía",   variant: "casual_f", type: "neutral", pos: [-26, 0, 24],  wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  { id: "npc_cit3", name: "Tomás",   variant: "casual_m", type: "neutral", pos: [-62, 0, -18], wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true, glb: "chico_casual" },
  { id: "npc_cit4", name: "Ana",     variant: "casual_f", type: "neutral", pos: [58, 0, 62],   wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  { id: "npc_cit5", name: "Pedro",   variant: "casual_m", type: "neutral", pos: [-82, 0, 78],  wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true, glb: "chico_casual" },
  { id: "npc_cit6", name: "Sofía",   variant: "casual_f", type: "neutral", pos: [82, 0, -22],  wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  { id: "npc_cit7", name: "Diego",   variant: "casual_m", type: "neutral", pos: [-20, 0, -62], wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true, glb: "chico_casual" },
  { id: "npc_cit8", name: "Marta",   variant: "casual_f", type: "neutral", pos: [22, 0, 102],  wanderRadius: 14, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  // ── Ejército de esqueletos de Lord Tuétano (bloque 2,-2 → 80,-80) ──
  { id: "goon1", name: "Esqueleto de Tuétano", variant: "goon", type: "hostile", pos: [70, 0, -70], wanderRadius: 12, dialogue: GOON_LINES, health: 70, damage: 8, group: "tuetano", respawn: true, aggroRange: 16, glb: "kit/ks_Skeleton_Minion" },
  { id: "goon2", name: "Esqueleto pícaro",     variant: "goon", type: "hostile", pos: [92, 0, -74], wanderRadius: 12, dialogue: GOON_LINES, health: 70, damage: 8, group: "tuetano", respawn: true, aggroRange: 16, glb: "kit/ks_Skeleton_Rogue" },
  { id: "goon3", name: "Esqueleto guerrero",   variant: "goon", type: "hostile", pos: [84, 0, -92], wanderRadius: 12, dialogue: GOON_LINES, health: 90, damage: 9, group: "tuetano", respawn: true, aggroRange: 16, glb: "kit/ks_Skeleton_Warrior" },
  { id: "park1", name: "Esqueleto del parque", variant: "goon", type: "hostile", pos: [-80, 0, -66], wanderRadius: 8, dialogue: GOON_LINES, health: 60, damage: 7, group: "park_skeletons", respawn: false, aggroRange: 14, glb: "kit/ks_Skeleton_Minion" },
  { id: "park2", name: "Esqueleto del parque", variant: "goon", type: "hostile", pos: [-72, 0, -82], wanderRadius: 8, dialogue: GOON_LINES, health: 60, damage: 7, group: "park_skeletons", respawn: false, aggroRange: 14, glb: "kit/ks_Skeleton_Minion" },
  { id: "park3", name: "Esqueleto mago",       variant: "goon", type: "hostile", pos: [-88, 0, -84], wanderRadius: 8, dialogue: GOON_LINES, health: 80, damage: 9, group: "park_skeletons", respawn: false, aggroRange: 14, glb: "kit/ks_Skeleton_Mage" },
  // ── Mercenarios de Corporación Titán ──
  { id: "goon4", name: "Caballero de Titán",   variant: "goon", type: "hostile", pos: [-112, 0, 48], wanderRadius: 10, dialogue: TITAN_LINES, health: 110, damage: 10, group: "titan", respawn: true, aggroRange: 14, glb: "kit/ka_Knight" },
  { id: "goon5", name: "Mago de Titán",        variant: "goon", type: "hostile", pos: [112, 0, -88], wanderRadius: 10, dialogue: TITAN_LINES, health: 90, damage: 11, group: "titan", respawn: true, aggroRange: 14, glb: "kit/ka_Mage" },
  { id: "goon6", name: "Pícaro de Titán",      variant: "goon", type: "hostile", pos: [-126, 0, 30], wanderRadius: 10, dialogue: TITAN_LINES, health: 90, damage: 9, group: "titan", respawn: true, aggroRange: 14, glb: "kit/ka_Rogue" },
  // ── Matones del club ──
  { id: "club1", name: "Matón del Diamante",   variant: "goon", type: "hostile", pos: [-58, 0, 72], wanderRadius: 5, dialogue: GOON_LINES, health: 70, damage: 8, group: "club", respawn: false, aggroRange: 12 },
  { id: "club2", name: "Matón del Diamante",   variant: "goon", type: "hostile", pos: [-58, 0, 84], wanderRadius: 5, dialogue: GOON_LINES, health: 70, damage: 8, group: "club", respawn: false, aggroRange: 12 },
  { id: "club3", name: "Matón del Diamante",   variant: "goon", type: "hostile", pos: [-22, 0, 72], wanderRadius: 5, dialogue: GOON_LINES, health: 70, damage: 8, group: "club", respawn: false, aggroRange: 12 },
  { id: "club4", name: "Matón del Diamante",   variant: "goon", type: "hostile", pos: [-22, 0, 84], wanderRadius: 5, dialogue: GOON_LINES, health: 70, damage: 8, group: "club", respawn: false, aggroRange: 12 },
  // ── Objetivos de misiones secundarias ──
  { id: "boss_chatarrero", name: "El Chatarrero", variant: "goon", type: "boss", pos: [-60, 0, -120], wanderRadius: 6, dialogue: ["Nadie cobra la recompensa por mi cabeza… ¡nadie!"], health: 220, damage: 12, scale: 1.1, aggroRange: 14, glb: "kit/ks_Skeleton_Rogue" },
  { id: "boss_brock",      name: "Brock el Bárbaro", variant: "goon", type: "boss", pos: [66, 0, -74], wanderRadius: 4, dialogue: ["¡Cuarenta combates, cuarenta trajeados en el suelo!"], health: 300, damage: 14, scale: 1.15, aggroRange: 12, glb: "kit/ka_Barbarian" },
  // ── Jefes principales ──
  { id: "boss_tuetano",  name: "Lord Tuétano",      variant: "lord_tuetano", type: "boss", pos: [80, 0, -84],  wanderRadius: 6, dialogue: ["¡Tu marketplace no vale nada! Mis copias baratas dominan este mercado."], health: 320, damage: 14, scale: 1.0, aggroRange: 18, glb: "lord_tuetano" },
  { id: "boss_guerrero", name: "Guerrero Carmesí",  variant: "arthas",       type: "boss", pos: [-120, 0, 38], wanderRadius: 6, dialogue: ["Corporación Titán me paga por hundirte. Nada personal, CEO."], health: 420, damage: 16, scale: 1.15, aggroRange: 18, glb: "guerrero" },
  { id: "boss_sombrio",  name: "Guerrero Sombrío",  variant: "illidan",      type: "boss", pos: [120, 0, -80], wanderRadius: 6, dialogue: ["Desde las sombras controlo el mercado. Nadie compra sin permiso de Titán."], health: 400, damage: 15, scale: 1.15, aggroRange: 18, glb: "guerrero_2" },
  { id: "boss_dragon",   name: "Dragón de Hielo",   variant: "majin",        type: "boss", pos: [0, 0, -118],  wanderRadius: 6, dialogue: ["GRRRAAAH… La IA de Titán congelará tu imperio como todos los demás."], health: 700, damage: 20, scale: 1.0, aggroRange: 20, glb: "mini_dragon_blue" },
];

export const BOSS_IDS = NPC_CONFIGS.filter(n => n.type === "boss").map(n => n.id);
export const SIDE_BOSS_IDS = ["boss_chatarrero", "boss_brock"];

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
  model?: string;     // modelo del kit (public/assets/kit)
  ai?: boolean;       // conducido por la IA (persecuciones)
}

export const VEHICLE_CONFIGS: VehicleConfig[] = [
  { id: "car1", name: "Sedán Ejecutivo",  color: "#d1202a", pos: [21, 0, 30],   heading: 0,       maxSpeed: 30, accel: 14, handling: 2.4, model: "kk_car_sedan" },
  { id: "car2", name: "Compacto Turbo",   color: "#2a5bd7", pos: [-21, 0, 30],  heading: 0,       maxSpeed: 34, accel: 16, handling: 2.5, model: "kk_car_hatchback" },
  { id: "car3", name: "Ranchera Familiar", color: "#2fa85a", pos: [21, 0, -30],  heading: Math.PI, maxSpeed: 26, accel: 12, handling: 2.2, model: "kk_car_stationwagon" },
  { id: "car4", name: "Sedán Clásico",    color: "#d4a51b", pos: [-21, 0, -30], heading: Math.PI, maxSpeed: 24, accel: 11, handling: 2.0, model: "kk_car_sedan" },
  { id: "car5", name: "Compacto Blanco",  color: "#eeeeee", pos: [-59, 0, 62],  heading: 0,       maxSpeed: 28, accel: 15, handling: 2.5, model: "kk_car_hatchback" },
  { id: "car6", name: "Taxi Urbano",      color: "#f2c318", pos: [59, 0, -62],  heading: Math.PI, maxSpeed: 24, accel: 12, handling: 2.2, model: "kk_car_taxi" },
  { id: "car7", name: "Patrulla",         color: "#ffffff", pos: [-19, 0, 6],   heading: Math.PI, maxSpeed: 32, accel: 16, handling: 2.6, model: "kk_car_police" },
  { id: "car_mole", name: "Sedán de Víctor", color: "#222", pos: [21, 0, -8],  heading: Math.PI, maxSpeed: 22, accel: 12, handling: 2.4, model: "kk_car_sedan", ai: true },
];

/** Ruta de huida del topo (por las calles, en bucle). */
export const CHASE_ROUTE: Vec3[] = [
  [20, 0, -60], [60, 0, -60], [60, 0, 20], [100, 0, 20], [100, 0, 100], [20, 0, 100], [20, 0, 60], [-60, 0, 60], [-60, 0, -20], [-20, 0, -20], [-20, 0, -100], [20, 0, -100],
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
  { key: "alec",      variant: "alec",      label: "CEO Crafter",   icon: "😎", description: "El fundador de Comic Crafter", perk: "+10 % ingresos pasivos",          glb: "ceo_crafter" },
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

// ── Historia ─────────────────────────────────────────────────────────────────
export const STORY = {
  title: "CEO Empire",
  subtitle: "La historia del CEO de Shopy Crafter",
  intro: [
    "Shopy Crafter nació como un pequeño marketplace para creadores: diseñadores, ilustradores y artesanos que querían vender al mundo sin intermediarios.",
    "Hoy aterrizas en Ciudad Crafter con un maletín, cinco mil dólares y una idea: convertir esa plataforma en el mayor imperio comercial jamás construido.",
    "Pero la ciudad ya tiene dueños. Lord Tuétano controla el mercado de copias baratas con su ejército de esqueletos, y Corporación Titán, el gigante tecnológico, no piensa dejar espacio a una startup.",
    "Compra negocios, contrata talento, gana la calle y cierra el trato del siglo. Tu imperio empieza ahora.",
  ],
  acts: [
    { id: 1, title: "Acto I — El garaje", missions: ["m1", "m2", "m3"] },
    { id: 2, title: "Acto II — Competencia sucia", missions: ["m4", "m5"] },
    { id: 3, title: "Acto III — Crecimiento", missions: ["m6", "m7", "m8", "m9"] },
    { id: 4, title: "Acto IV — Guerra de mercado", missions: ["m10", "m11", "m12"] },
    { id: 5, title: "Acto V — La salida a bolsa", missions: ["m13", "m14"] },
  ],
  epilogue: "Shopy Crafter sale a bolsa valorada en mil millones. Los crafters de todo el mundo venden en tu plataforma y Ciudad Crafter lleva tu nombre. Pero un imperio nunca duerme…",
};

export const actOfMission = (id: string) => STORY.acts.find(a => a.missions.includes(id));

// ── Misiones ─────────────────────────────────────────────────────────────────
export type MissionType =
  | "goto" | "buy" | "kill_group" | "kill_boss" | "own_count" | "collect" | "deliver" | "hire"
  | "race" | "waypoints" | "chase" | "invest";

export interface Mission {
  id: string;
  category: "main" | "side";
  title: string;
  giverNpcId: string;
  briefing: string;
  objective: string;
  type: MissionType;
  markerPos?: Vec3;
  waypoints?: Vec3[];
  requireVehicle?: boolean;
  requireVehicleId?: string;
  targetBusiness?: string;
  targetGroup?: string;
  targetCount?: number;
  targetBosses?: string[];
  targetVehicleId?: string;
  timeLimit?: number;
  cost?: number;
  unlockAfter?: string;      // misión principal que debe estar completada
  color: string;
  rewardMoney: number;
  rewardKarma: number;
  completeText: string;
  nextMissionId: string | null;
}

export const MISSIONS: Mission[] = [
  // ═══════════════ ACTO I — EL GARAJE ═══════════════
  {
    id: "m1", category: "main", title: "Primeros Pasos", giverNpcId: "npc_garcia", type: "goto",
    briefing: "Bienvenido a Ciudad Crafter, CEO. El Vendedor del suroeste guarda el maletín con la base de datos de nuestros primeros mil crafters. Sin esos datos no hay empresa: ve a por él (marcador azul). Corre con Shift.",
    objective: "Recoge el maletín de datos en el kiosco del Vendedor",
    markerPos: [-40, 0, 40], color: "#00f5ff", rewardMoney: 3000, rewardKarma: 5,
    completeText: "Maletín recuperado. Mil crafters confían en ti.", nextMissionId: "m2",
  },
  {
    id: "m2", category: "main", title: "Primer Negocio", giverNpcId: "npc_garcia", type: "buy", targetBusiness: "cafe",
    briefing: "Shopy Crafter necesita presencia física. La Cafetería Digital, al noroeste de la plaza, será nuestro primer showroom: los crafters expondrán allí sus productos. Acércate al círculo dorado y pulsa B.",
    objective: "Compra la Cafetería Digital (tecla B en el marcador dorado)",
    markerPos: [-40, 0, -28], color: "#ffd700", rewardMoney: 5000, rewardKarma: 10,
    completeText: "¡Primer showroom abierto! Ya generas ingresos cada segundo.", nextMissionId: "m3",
  },
  {
    id: "m3", category: "main", title: "Entrega Urgente", giverNpcId: "npc_maria", type: "deliver", timeLimit: 75,
    briefing: "La Agencia Marketing quiere lanzar nuestra campaña, pero el contrato caduca en 75 segundos. Coge un coche de la plaza (tecla E) y vuela al marcador naranja.",
    objective: "Entrega el contrato en la Agencia Marketing antes de que acabe el tiempo",
    markerPos: [40, 0, -28], color: "#ff8c00", rewardMoney: 7000, rewardKarma: 5,
    completeText: "Contrato firmado. Ciudad Crafter empieza a hablar de nosotros.", nextMissionId: "m4",
  },
  // ═══════════════ ACTO II — COMPETENCIA SUCIA ═══════════════
  {
    id: "m4", category: "main", title: "Limpieza de Barrio", giverNpcId: "npc_garcia", type: "kill_group", targetGroup: "tuetano", targetCount: 3,
    briefing: "Lord Tuétano vende copias baratas de los productos de nuestros crafters y su ejército de esqueletos extorsiona a los comercios del noreste. Elimina a tres esqueletos. Golpea con clic izquierdo; el Vendedor tiene un bate.",
    objective: "Elimina a 3 esqueletos de Tuétano en el distrito noreste",
    markerPos: [80, 0, -80], color: "#ff4444", rewardMoney: 10000, rewardKarma: -5,
    completeText: "Barrio limpio. Los comerciantes vuelven a vender productos originales.", nextMissionId: "m5",
  },
  {
    id: "m5", category: "main", title: "El Rival Amenaza", giverNpcId: "npc_garcia", type: "kill_boss", targetBosses: ["boss_tuetano"],
    briefing: "Lord Tuétano en persona te espera en su guarida. Si cae, el mercado de copias cae con él y los crafters recuperan el noreste. Lleva kits médicos: es un hueso duro.",
    objective: "Derrota a Lord Tuétano en su guarida",
    markerPos: [80, 0, -84], color: "#ff2222", rewardMoney: 25000, rewardKarma: -5,
    completeText: "Lord Tuétano ha caído. El mercado de copias se desmorona.", nextMissionId: "m6",
  },
  // ═══════════════ ACTO III — CRECIMIENTO ═══════════════
  {
    id: "m6", category: "main", title: "Expansión de Mercado", giverNpcId: "npc_maria", type: "own_count", targetCount: 4,
    briefing: "Los inversores quieren ver músculo. Controla al menos cuatro negocios de la ciudad; los marcadores dorados del minimapa señalan los que están en venta.",
    objective: "Posee 4 negocios en la ciudad",
    color: "#ffd700", rewardMoney: 40000, rewardKarma: 15,
    completeText: "¡Cuatro negocios! Tu nombre empieza a sonar en la bolsa.", nextMissionId: "m7",
  },
  {
    id: "m7", category: "main", title: "Datos Perdidos", giverNpcId: "npc_elena", type: "collect", targetCount: DATA_CHIPS.length,
    briefing: "Alguien ha filtrado los chips con los datos de nuestros clientes y los ha dejado por la ciudad. Recupera los seis chips verdes antes de que Titán los encuentre; aparecen en el minimapa.",
    objective: "Recupera los 6 chips de datos repartidos por la ciudad",
    color: "#00ff88", rewardMoney: 30000, rewardKarma: 15,
    completeText: "Datos recuperados. Elena sospecha que la filtración vino de dentro…", nextMissionId: "m8",
  },
  {
    id: "m8", category: "main", title: "Captación de Talento", giverNpcId: "npc_maria", type: "hire", targetCount: 3,
    briefing: "Un imperio necesita gente. Habla con los ciudadanos (tecla F) y contrata a tres empleados. Cada uno suma un 10 % a tus ingresos.",
    objective: "Contrata a 3 empleados hablando con ciudadanos",
    color: "#7fd1ff", rewardMoney: 20000, rewardKarma: 20,
    completeText: "Equipo formado. La productividad se dispara.", nextMissionId: "m9",
  },
  {
    id: "m9", category: "main", title: "Noche en el Diamante", giverNpcId: "npc_garcia", type: "buy", targetBusiness: "club",
    briefing: "Los grandes tratos de esta ciudad se cierran en el Club Diamante, y Madame Vega solo negocia con socios. Compra el club (marcador rosa, al suroeste) y tendrás mesa con los inversores. Ingresos x2 cada noche.",
    objective: "Compra el Club Diamante",
    markerPos: [-40, 0, 61], color: "#ff2d95", rewardMoney: 35000, rewardKarma: 0,
    completeText: "El Diamante es tuyo. Madame Vega te presenta a los inversores de la ronda B.", nextMissionId: "m10",
  },
  // ═══════════════ ACTO IV — GUERRA DE MERCADO ═══════════════
  {
    id: "m10", category: "main", title: "Guerra de Mercado", giverNpcId: "npc_garcia", type: "kill_boss", targetBosses: ["boss_guerrero", "boss_sombrio"],
    briefing: "Corporación Titán ha contratado mercenarios: el Guerrero Carmesí (oeste) y el Guerrero Sombrío (este) atacan nuestras tiendas. Derrota a ambos. Una pistola y el traje blindado te vendrán bien.",
    objective: "Derrota al Guerrero Carmesí y al Guerrero Sombrío",
    color: "#c040ff", rewardMoney: 80000, rewardKarma: -10,
    completeText: "Los mercenarios han caído. Titán tendrá que ensuciarse las manos.", nextMissionId: "m11",
  },
  {
    id: "m11", category: "main", title: "Imperio Imparable", giverNpcId: "npc_maria", type: "own_count", targetCount: 6,
    briefing: "Seis negocios y Shopy Crafter será la mayor fortuna de la ciudad. Mejora los que ya tienes (tecla U) para acelerar tus ingresos.",
    objective: "Posee 6 negocios en la ciudad",
    color: "#ffd700", rewardMoney: 150000, rewardKarma: 20,
    completeText: "Seis negocios. Los periódicos ya hablan de tu imperio.", nextMissionId: "m12",
  },
  {
    id: "m12", category: "main", title: "El Topo", giverNpcId: "npc_elena", type: "chase", targetVehicleId: "car_mole", timeLimit: 180,
    briefing: "Lo sabía: Víctor Salas, nuestro director financiero, vendía los datos a Titán. Acaba de huir con el disco maestro en su sedán negro. Coge un coche y alcánzalo: pégate a él hasta detenerlo.",
    objective: "Alcanza el sedán de Víctor y detenlo (mantente pegado a él)",
    color: "#ff6a00", rewardMoney: 60000, rewardKarma: 10,
    completeText: "Víctor, detenido. El disco maestro vuelve a casa y Titán pierde su topo.", nextMissionId: "m13",
  },
  // ═══════════════ ACTO V — LA SALIDA A BOLSA ═══════════════
  {
    id: "m13", category: "main", title: "El Dragón de Hielo", giverNpcId: "npc_garcia", type: "kill_boss", targetBosses: ["boss_dragon"],
    briefing: "El centro de datos de Titán, la Torre de Hielo, está protegido por su arma definitiva: una IA con forma de dragón que congela cualquier negocio que se acerque. Destrúyela y Titán quedará ciega. Ve preparado.",
    objective: "Derrota al Dragón de Hielo en la Torre de Hielo",
    markerPos: [0, 0, -118], color: "#66ccff", rewardMoney: 200000, rewardKarma: 30,
    completeText: "El dragón ha caído. Titán ya no tiene con qué competir.", nextMissionId: "m14",
  },
  {
    id: "m14", category: "main", title: "CEO del Año", giverNpcId: "npc_garcia", type: "goto",
    briefing: "Los inversores te esperan en el helipuerto para firmar la salida a bolsa de Shopy Crafter: mil millones de valoración. Ve al marcador dorado. ¡Es tu momento!",
    objective: "Ve al helipuerto y firma la salida a bolsa",
    markerPos: [40, 0, 0], color: "#ffd700", rewardMoney: 1000000, rewardKarma: 50,
    completeText: "¡ERES EL CEO DEL AÑO! Shopy Crafter cotiza en bolsa.", nextMissionId: null,
  },

  // ═══════════════ MISIONES SECUNDARIAS ═══════════════
  {
    id: "s_express", category: "side", title: "Reparto Express", giverNpcId: "npc_nico", type: "waypoints", timeLimit: 150, unlockAfter: "m2",
    waypoints: [[-40, 0, -28], [40, 0, -28], [-40, 0, 40], [-80, 0, 52]],
    briefing: "Tengo cuatro paquetes de crafters para la cafetería, la agencia, el Vendedor y el estudio de diseño… y el reparto caduca en dos minutos y medio. ¿Me haces el favor, jefe?",
    objective: "Entrega los 4 paquetes en orden antes de que acabe el tiempo",
    color: "#ffb347", rewardMoney: 6000, rewardKarma: 5,
    completeText: "Cuatro clientes felices. Nico promete invitarte a un café… cuando cobre.", nextMissionId: null,
  },
  {
    id: "s_race1", category: "side", title: "Carrera Crafter", giverNpcId: "npc_rayo", type: "race", timeLimit: 110, requireVehicle: true, unlockAfter: "m3",
    waypoints: [[20, 0, 60], [60, 0, 60], [60, 0, -20], [20, 0, -60], [-20, 0, -60], [-60, 0, -20], [-60, 0, 20], [-20, 0, 60], [0, 0, 20]],
    briefing: "Nueve puntos de control por el centro, contrarreloj. Sube a un coche, pasa por los marcadores en orden y vuelve a la plaza en menos de 110 segundos.",
    objective: "Completa los 9 puntos de control en coche antes de que acabe el tiempo",
    color: "#ff8c00", rewardMoney: 12000, rewardKarma: 0,
    completeText: "¡Récord del circuito! Rayo te mira con respeto por primera vez.", nextMissionId: null,
  },
  {
    id: "s_taxi", category: "side", title: "Taxi Nocturno", giverNpcId: "npc_cit6", type: "deliver", requireVehicleId: "car6", timeLimit: 120, unlockAfter: "m3",
    markerPos: [80, 0, -40],
    briefing: "El taxi de la esquina lleva parado toda la tarde y necesito llegar al parque del este. Si lo conduces tú, te pago la carrera… y la propina.",
    objective: "Lleva a Sofía al parque del este conduciendo el Taxi Urbano",
    color: "#f2c318", rewardMoney: 5000, rewardKarma: 5,
    completeText: "Sofía llega a tiempo. «Cinco estrellas, CEO».", nextMissionId: null,
  },
  {
    id: "s_intern", category: "side", title: "Rescate en el Parque", giverNpcId: "npc_maria", type: "kill_group", targetGroup: "park_skeletons", targetCount: 3, unlockAfter: "m4",
    markerPos: [-80, 0, -80],
    briefing: "Lía, nuestra becaria, fue a una reunión en el parque del oeste y no ha vuelto. Elena dice que los esqueletos de Tuétano rondan por allí. Sácala de ahí.",
    objective: "Elimina a los 3 esqueletos del parque y rescata a Lía",
    color: "#7dffb0", rewardMoney: 10000, rewardKarma: 10,
    completeText: "Lía está a salvo. «Nunca más reuniones al aire libre», jura.", nextMissionId: null,
  },
  {
    id: "s_bouncer", category: "side", title: "Noche Movida", giverNpcId: "npc_vega", type: "kill_group", targetGroup: "club", targetCount: 4, unlockAfter: "m5",
    markerPos: [-40, 0, 76],
    briefing: "Cuatro matones de Tuétano se han quedado sin jefe y ahora molestan a mis chicas en el Diamante. Un socio de verdad se ocuparía de ellos. ¿Eres un socio de verdad?",
    objective: "Elimina a los 4 matones que rondan el Club Diamante",
    color: "#ff2d95", rewardMoney: 15000, rewardKarma: 5,
    completeText: "El Diamante vuelve a ser seguro. Madame Vega te debe una.", nextMissionId: null,
  },
  {
    id: "s_bounty", category: "side", title: "Cazarrecompensas", giverNpcId: "npc_mora", type: "kill_boss", targetBosses: ["boss_chatarrero"], unlockAfter: "m5",
    markerPos: [-60, 0, -120],
    briefing: "El Chatarrero desguaza los coches que roba en el norte de la ciudad y la comisaría no tiene efectivos. Hay veinte mil de recompensa por él. Vivo o… bueno, ya sabes.",
    objective: "Elimina al Chatarrero en el desguace del norte",
    color: "#7fb3ff", rewardMoney: 20000, rewardKarma: 5,
    completeText: "Recompensa cobrada. Mora te guiña un ojo: «Tengo más trabajo cuando quieras».", nextMissionId: null,
  },
  {
    id: "s_champ", category: "side", title: "El Reto del Bárbaro", giverNpcId: "npc_rufo", type: "kill_boss", targetBosses: ["boss_brock"], unlockAfter: "m5",
    markerPos: [66, 0, -74],
    briefing: "Brock el Bárbaro lleva cuarenta combates invicto en mi ring clandestino. Si lo tumbas, la bolsa de apuestas es tuya: veinticinco mil. Sin armas de fuego, esto es deporte.",
    objective: "Derrota a Brock el Bárbaro en el ring",
    color: "#ff5050", rewardMoney: 25000, rewardKarma: -5,
    completeText: "Brock besa la lona. Don Rufo paga… de mala gana.", nextMissionId: null,
  },
  {
    id: "s_posters", category: "side", title: "Campaña Viral", giverNpcId: "npc_elena", type: "waypoints", unlockAfter: "m6",
    waypoints: [[0, 0, -18], [58, 0, 18], [-58, 0, 18], [18, 0, 58], [-18, 0, -58]],
    briefing: "He diseñado cinco carteles de Shopy Crafter y quiero que estén en los cinco cruces con más tráfico de la ciudad. Pásate por cada marcador y los pegamos.",
    objective: "Pega los 5 carteles en los cruces marcados",
    color: "#ff9ff3", rewardMoney: 9000, rewardKarma: 5,
    completeText: "La campaña es viral. Las ventas de los crafters suben un 30 %.", nextMissionId: null,
  },
  {
    id: "s_angel", category: "side", title: "Inversión Ángel", giverNpcId: "npc_valeria", type: "invest", cost: 20000, timeLimit: 300, unlockAfter: "m6",
    briefing: "Necesito veinte mil para un horno nuevo. Dame cinco minutos de producción y te devuelvo cuarenta y cinco mil. Palabra de crafter.",
    objective: "Espera 5 minutos: Valeria te devolverá la inversión con beneficios",
    color: "#ffd700", rewardMoney: 45000, rewardKarma: 10,
    completeText: "Valeria cumple: cuarenta y cinco mil y una vajilla de regalo.", nextMissionId: null,
  },
  {
    id: "s_race2", category: "side", title: "Gran Premio Crafter", giverNpcId: "npc_rayo", type: "race", timeLimit: 200, requireVehicle: true, unlockAfter: "m10",
    waypoints: [[20, 0, 100], [100, 0, 100], [140, 0, 20], [100, 0, -60], [20, 0, -140], [-60, 0, -100], [-140, 0, -20], [-100, 0, 60], [-60, 0, 140], [0, 0, 20]],
    briefing: "El circuito grande: toda la ciudad en diez puntos de control. Nadie lo ha bajado de 200 segundos. Si lo haces, la bolsa es tuya.",
    objective: "Completa los 10 puntos de control del gran circuito en coche",
    color: "#ff8c00", rewardMoney: 30000, rewardKarma: 0,
    completeText: "Campeón de Ciudad Crafter. Rayo cuelga tu foto en el garaje.", nextMissionId: null,
  },
];

export const MAIN_MISSIONS = MISSIONS.filter(m => m.category === "main");
export const SIDE_MISSIONS = MISSIONS.filter(m => m.category === "side");

export const missionById = (id: string | null | undefined) => MISSIONS.find(m => m.id === id);

// ── Trazado de la ciudad ─────────────────────────────────────────────────────
export interface BuildingDef {
  x: number; z: number; w: number; d: number; h: number;
  color: string;
  style: number;   // índice de textura de ventanas
  roof?: "flat" | "antenna" | "helipad";
  kit?: string;    // modelo del kit (public/assets/kit) en lugar de caja procedural
  kitScale?: number;
  rotation?: number;
}

export interface ObstacleAABB { x: number; z: number; hw: number; hd: number }

const RESERVED_BLOCKS = new Set<string>([
  "0,0",                     // HQ
  "1,0",                     // Helipuerto
  "-1,1",                    // Vendedor
  "-2,-2", "2,-1", "-2,2",   // Parques
  "-1,2",                    // Club Diamante
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

const KIT_LOWRISE: Array<{ kit: string; w: number; scale: number; h: number }> = [
  { kit: "kk_building_A", w: 10, scale: 5, h: 8.3 }, { kit: "kk_building_B", w: 10, scale: 5, h: 8.3 },
  { kit: "kk_building_C", w: 10, scale: 5, h: 8.3 }, { kit: "kk_building_D", w: 10, scale: 5, h: 8.3 },
  { kit: "kk_building_E", w: 10, scale: 5, h: 8.3 }, { kit: "kk_building_F", w: 10, scale: 5, h: 8.3 },
  { kit: "kk_building_G", w: 10, scale: 5, h: 8.3 }, { kit: "kk_building_H", w: 10, scale: 5, h: 8.3 },
  { kit: "ke_building-small-a", w: 9, scale: 9, h: 8.6 }, { kit: "ke_building-small-b", w: 9, scale: 9, h: 8.6 },
  { kit: "ke_building-small-c", w: 9, scale: 9, h: 8.6 }, { kit: "ke_building-small-d", w: 9, scale: 9, h: 8.6 },
  { kit: "ke_building-garage", w: 9, scale: 9, h: 6 },
];

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
        // Cuatro edificios bajos del kit (barrio)
        for (const [ox, oz, rot] of [[-6, -6, Math.PI], [6, -6, Math.PI], [-6, 6, 0], [6, 6, 0]]) {
          const k = KIT_LOWRISE[Math.floor(rnd() * KIT_LOWRISE.length)];
          out.push({ x: cx + ox, z: cz + oz, w: k.w, d: k.w, h: k.h, color: "#fff", style: 0, kit: k.kit, kitScale: k.scale, rotation: rot });
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
  { x: 0, z: -128, w: 22, d: 16, h: 56, color: "#243040", style: 2, roof: "antenna" },     // Torre de Hielo
  { x: -40, z: 34, w: 6, d: 4, h: 3.2, color: "#7a4a2a", style: 3 },                       // Kiosco del Vendedor
  { x: -40, z: 90, w: 20, d: 12, h: 9, color: "#1a0f1f", style: 3 },                        // Club Diamante (fachada)
  { x: -50, z: 74, w: 5, d: 2, h: 1.2, color: "#2a1a2a", style: 3 },                        // Barra del club
  { x: -30, z: 74, w: 4, d: 2, h: 1.2, color: "#2a1a2a", style: 3 },                        // Cabina del DJ
  { x: -40, z: 78, w: 7, d: 7, h: 0.6, color: "#2a1a2a", style: 3 },                         // Escenario
];

export const PARKS: Vec3[] = [blockCenter(-2, -2), blockCenter(2, -1), blockCenter(-2, 2)];

export const ALL_BUILDINGS: BuildingDef[] = [
  ...CITY_BUILDINGS,
  ...SPECIAL_BUILDINGS,
  ...BUSINESSES.filter(b => b.id !== "club").map<BuildingDef>(b => ({ x: b.buildingPos[0], z: b.buildingPos[2], w: b.size[0], d: b.size[2], h: b.size[1], color: b.color, style: 1 })),
];

export const OBSTACLES: ObstacleAABB[] = ALL_BUILDINGS.map(b => ({ x: b.x, z: b.z, hw: b.w / 2, hd: b.d / 2 }));

export const ROAD_LINES: number[] = (() => {
  const half = Math.floor(WORLD.blocksPerSide / 2);
  const lines: number[] = [];
  for (let i = -half - 1; i <= half; i++) lines.push(i * WORLD.blockSize + WORLD.blockSize / 2);
  return lines; // -140, -100, ..., 140
})();
