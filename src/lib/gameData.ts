// ─────────────────────────────────────────────────────────────────────────────
// CEO Empire — datos estáticos del juego (misiones, negocios, NPCs, vehículos,
// armas, tienda y lugares de la historia).
// La ciudad es la de Blender (src/lib/cityLayout.json): calles en x, z = ±20 y
// ±60 (10 m de ancho), manzanas elevadas entre ellas y límite urbano en ±130.
// Todas las posiciones de abajo caen en aceras, plazas o solares libres; las
// pruebas (city.test.ts) comprueban que ninguna queda dentro de un edificio.
// ─────────────────────────────────────────────────────────────────────────────

export type Vec3 = [number, number, number];

// ── Lugares de la historia ───────────────────────────────────────────────────
/** Caja de colisión en planta: centro y medio ancho/fondo. */
export interface Footprint { x: number; z: number; hw: number; hd: number }

export const PLACES = {
  /** La torre de cristal al norte de la plaza es la sede de Shopy Crafter. */
  hq: { x: 0, z: -40, h: 81.5, entrance: [0, 0, -27.5] as Vec3 },
  plaza: { x: 0, z: 0 },
  kiosk: { x: -9, z: 11, w: 6, d: 4 },
  helipad: { x: -40, z: -83, r: 11 },
  club: {
    facade: { x: 0, z: 50.5, w: 22, d: 9, h: 9 },
    terrace: { x: 0, z: 36.5, w: 26, d: 17 },   // z 28..45, entrada por el sur (z 28)
    stage: [0, 0, 40] as Vec3,
    bar: [-9, 0, 37] as Vec3,
    dj: [9, 0, 37] as Vec3,
  },
  tuetanoLair: { x: 109.6, z: -92, name: "Guarida de Tuétano", color: "#ff3030" },
  ring: { x: 78, z: -78, size: 10 },
  crimsonFort: { x: -113, z: -90, w: 18, d: 12, h: 14, name: "Fortaleza Carmesí", color: "#ff5050" },
  scrapyard: { x: -113, z: -118, w: 24, d: 16 },
  shadowBastion: { x: 118, z: 100, w: 16, d: 12, h: 12, name: "Bastión Sombrío", color: "#c040ff" },
  /** El centro de datos de Titán es la torre (0, -91.6); el dragón vive en la explanada del norte. */
  iceTower: { x: 0, z: -91.6, h: 46.8, arena: [0, 0, -115] as Vec3, name: "Torre de Hielo", color: "#5ac8ff" },
};

const lot = (x: number, z: number, w: number, d: number): Footprint => ({ x, z, hw: w / 2, hd: d / 2 });

/** Construcciones de la historia que no están en la ciudad de Blender: también chocan. */
export const PLACE_OBSTACLES: Footprint[] = [
  lot(PLACES.kiosk.x, PLACES.kiosk.z, PLACES.kiosk.w, PLACES.kiosk.d),
  lot(PLACES.club.facade.x, PLACES.club.facade.z, PLACES.club.facade.w, PLACES.club.facade.d),
  lot(PLACES.club.bar[0], PLACES.club.bar[2], 5, 2),
  lot(PLACES.club.dj[0], PLACES.club.dj[2], 4, 2),
  lot(PLACES.club.stage[0], PLACES.club.stage[2], 7, 7),
  lot(PLACES.crimsonFort.x, PLACES.crimsonFort.z, PLACES.crimsonFort.w, PLACES.crimsonFort.d),
  lot(PLACES.shadowBastion.x, PLACES.shadowBastion.z, PLACES.shadowBastion.w, PLACES.shadowBastion.d),
  lot(PLACES.helipad.x, PLACES.helipad.z - 2, 3.4, 7),   // helicóptero
];

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
  pos: Vec3;              // marcador de compra, en la acera frente a la fachada
  /** Edificio de la ciudad que ocupa el negocio: centro, ancho, alto y fondo. */
  building: { x: number; z: number; w: number; h: number; d: number };
  icon: string;
  color: string;
  description: string;
}

/** Negocio en un edificio existente; el marcador va 2,5 m delante de la fachada `side`. */
const biz = (
  id: string, name: string, price: number, incomePerSec: number,
  building: Business["building"], side: "n" | "s" | "e" | "w", icon: string, color: string, description: string,
): Business => {
  const { x, z, w, d } = building;
  const pos: Vec3 =
    side === "n" ? [x, 0, z - d / 2 - 2.5] : side === "s" ? [x, 0, z + d / 2 + 2.5]
    : side === "w" ? [x - w / 2 - 2.5, 0, z] : [x + w / 2 + 2.5, 0, z];
  return { id, name, price, incomePerSec, building, pos, icon, color, description };
};

export const BUSINESSES: Business[] = [
  biz("cafe",      "Cafetería Digital", 5000,    8,    { x: -40,   z: 40,    w: 20,    h: 25.3, d: 20 },   "n", "☕", "#c0795c", "El primer paso hacia el imperio."),
  biz("marketing", "Agencia Marketing", 15000,   20,   { x: 40,    z: -40,   w: 20,    h: 52.3, d: 20 },   "s", "📊", "#5c7cc0", "Amplifica tu marca en toda la ciudad."),
  biz("design",    "Estudio de Diseño", 25000,   35,   { x: 40,    z: 40,    w: 20,    h: 39.4, d: 20 },   "n", "🎨", "#c05c8a", "Arte y funcionalidad unidos."),
  biz("school",    "Escuela de Código", 50000,   60,   { x: 81.49, z: 40,    w: 22.97, h: 25.2, d: 20 },   "w", "💻", "#5cc090", "Forma a los tech del mañana."),
  biz("ecom",      "E-commerce Hub",    100000,  120,  { x: -81.77, z: 0,    w: 23.55, h: 29.3, d: 20 },   "e", "🛒", "#c0a05c", "La columna vertebral del negocio online."),
  biz("apps",      "Fábrica de Apps",   200000,  250,  { x: 40,    z: 74.35, w: 20,    h: 32.8, d: 8.7 },  "n", "📱", "#905cc0", "Lanza apps al mercado global."),
  biz("ai",        "Torre de IA",       450000,  600,  { x: -40,   z: -40,   w: 20,    h: 63.1, d: 20 },   "s", "🤖", "#5ca0c0", "El futuro en tu mano."),
  biz("empire",    "Shopy Empire",      1000000, 1500, { x: 80.8,  z: 0,     w: 21.61, h: 35.2, d: 20 },   "w", "👑", "#ffd700", "La cima del poder CEO."),
  {
    id: "club", name: "Club Diamante", price: 75000, incomePerSec: 90, pos: [-7, 0, 26.5],
    building: { x: PLACES.club.facade.x, z: PLACES.club.facade.z, w: PLACES.club.facade.w, h: PLACES.club.facade.h, d: PLACES.club.facade.d },
    icon: "💎", color: "#ff2d95", description: "El club nocturno más exclusivo. Ingresos x2 de noche.",
  },
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
  | "crafter_ceo" | "formal" | "ejecutiva" | "creativa" | "casual_m" | "casual_f"
  | "vendor" | "goon" | "police" | "lord_tuetano" | "bombon" | "malvik" | "glaciar" | "magnate"
  | "dancer" | "bouncer" | "madame" | "racer" | "intern" | "crafter" | "detective" | "promoter" | "mole";

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
  /** Modelo: "kit/<nombre>" (public/assets/kit) o "<nombre>" (assets/models, si no assets/generated/characters). */
  glb?: string;
}

const ADVISOR_LINES_GARCIA = [
  "CEO, el mercado nos espera. Tu visión cambiará esta ciudad para siempre.",
  "Cada negocio que compras genera ingresos pasivos. Mejóralos con la tecla U.",
  "Los esqueletos de Lord Tuétano rondan el noreste. Ten cuidado por la noche.",
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
  "El Vendedor de la plaza vende armas, munición y un traje blindado.",
];
const CITIZEN_LINES = [
  "Esta ciudad está cambiando mucho. ¡Menuda empresa la tuya!",
  "Dicen que Shopy Empire vale más que toda la bolsa.",
  "¿Has visto la Torre de IA? Dicen que piensa sola.",
  "Ayer vi a Lord Tuétano gritándole a una máquina de café.",
  "Ojalá encontrar un trabajo digno… ¿me contratas, CEO?",
  "Los coches de la ciudad son de alquiler libre, ¡pero conduce con cuidado!",
];
const GOON_LINES = ["¡Fuera de nuestro territorio, trajeado!", "Lord Tuétano manda aquí.", "¡Te vamos a hundir la empresa!"];
const TITAN_LINES = ["Corporación Titán no negocia con startups.", "Tu marketplace será absorbido.", "Nada personal: es solo capital."];

export const NPC_CONFIGS: NpcConfig[] = [
  // ── Asesores en la plaza del HQ ──
  { id: "npc_garcia", name: "Director García", variant: "formal",    type: "friendly", pos: [8, 0, 4],   wanderRadius: 4, dialogue: ADVISOR_LINES_GARCIA, health: 100, damage: 0, glb: "chico_formal" },
  { id: "npc_maria",  name: "María Ejecutiva", variant: "ejecutiva", type: "friendly", pos: [-3, 0, 5],  wanderRadius: 3, dialogue: ADVISOR_LINES_MARIA,  health: 100, damage: 0, glb: "chica_ejecutiva" },
  { id: "npc_elena",  name: "Elena Creativa",  variant: "creativa",  type: "friendly", pos: [11, 0, -8], wanderRadius: 3, dialogue: ADVISOR_LINES_ELENA,  health: 100, damage: 0, glb: "chica_creativa" },
  { id: "npc_victor", name: "Víctor Salas (CFO)", variant: "mole",   type: "friendly", pos: [-5, 0, -12], wanderRadius: 2, dialogue: ["Los números cuadran, CEO. Confía en mí… yo me ocupo de los datos.", "Titán ofrece mucho dinero por gente con talento. Solo lo comento."], health: 100, damage: 0 },
  { id: "npc_nico",   name: "Nico, el becario", variant: "intern",   type: "friendly", pos: [5, 0, -12], wanderRadius: 2, dialogue: ["¡Jefe! Tengo paquetes que repartir y cero coche. ¿Me ayudas?", "Mi madre no se cree que trabajo para Shopy Crafter."], health: 80, damage: 0 },
  { id: "npc_mora",   name: "Detective Mora",  variant: "detective", type: "friendly", pos: [-11, 0, -2], wanderRadius: 2, dialogue: ["La comisaría no da abasto. Si quieres ganarte un extra, tengo recompensas pendientes.", "Cuidado con las estrellas: a partir de tres, mis compañeros no preguntan."], health: 120, damage: 0 },
  { id: "npc_rayo",   name: "Rayo",            variant: "racer",     type: "friendly", pos: [12, 0, 11], wanderRadius: 2, dialogue: ["¿Ese deportivo rojo es tuyo? Demuéstralo en mi circuito.", "Las carreras se corren de noche, pero yo no tengo horario."], health: 90, damage: 0 },
  // ── Vendedor y crafters ──
  { id: "npc_vendor", name: "El Vendedor",     variant: "vendor",    type: "friendly", pos: [-5, 0, 10.5], wanderRadius: 0, dialogue: ["Armas, munición, medicinas… todo lo que un CEO necesita. ¿Qué te pongo?"], health: 100, damage: 0 },
  { id: "npc_valeria", name: "Valeria, artesana", variant: "crafter", type: "friendly", pos: [-75, 0, 12.5], wanderRadius: 3, dialogue: ["Vendo cerámica en Shopy Crafter desde el primer día. Tu plataforma me cambió la vida.", "Si invirtieras en mi taller, te devolvería el doble. Palabra de crafter."], health: 80, damage: 0 },
  { id: "npc_lia",    name: "Lía, la becaria", variant: "intern",    type: "friendly", pos: [-80, 0, -72], wanderRadius: 2, dialogue: ["¡Socorro! Vine a una reunión y el parque está lleno de… ¿esqueletos?", "Gracias por sacarme de ahí. Nunca más reuniones al aire libre."], health: 80, damage: 0 },
  // ── Club Diamante (manzana sur de la plaza) ──
  { id: "npc_vega",   name: "Madame Vega",     variant: "madame",    type: "friendly", pos: [6, 0, 32],    wanderRadius: 2, dialogue: ["Bienvenido al Diamante, CEO. Aquí se cierran los tratos que no caben en una oficina.", "Los matones de Tuétano molestan a mis chicas. Un socio de verdad se ocuparía de ello."], health: 100, damage: 0 },
  { id: "npc_gorila", name: "Gorila (portero)", variant: "bouncer",  type: "friendly", pos: [-3.5, 0, 27], wanderRadius: 0, dialogue: ["Lista de invitados o nada. …Ah, eres el CEO. Pasa, Madame te espera en la terraza."], health: 200, damage: 0 },
  { id: "npc_dj",     name: "DJ Neón",         variant: "casual_m",  type: "friendly", pos: [9, 0, 39.5],  wanderRadius: 0, dialogue: ["¡Esta noche el Diamante arde! Pide lo que quieras, menos reguetón viejo."], health: 80, damage: 0 },
  { id: "npc_dancer1", name: "Kiara",          variant: "dancer",    type: "friendly", pos: [-1.6, 0, 40.6], wanderRadius: 0, dialogue: ["¡Hola, jefe! Si compras el club, pide que cambien los focos… ¡a rosa!"], health: 80, damage: 0 },
  { id: "npc_dancer2", name: "Naomi",          variant: "dancer",    type: "friendly", pos: [1.6, 0, 40.6],  wanderRadius: 0, dialogue: ["Madame dice que eres el próximo gran nombre de la ciudad. Ya veremos."], health: 80, damage: 0 },
  { id: "npc_dancer3", name: "Sasha",          variant: "dancer",    type: "friendly", pos: [0, 0, 38.2],    wanderRadius: 0, dialogue: ["Mi tienda de vestidos en Shopy Crafter vende más que este escenario, ¿sabes?"], health: 80, damage: 0 },
  // ── Promotor de peleas (ring del noreste) ──
  { id: "npc_rufo",   name: "Don Rufo",        variant: "promoter",  type: "friendly", pos: [70, 0, -70], wanderRadius: 2, dialogue: ["Apuestas, sangre y gloria. Brock lleva 40 combates invicto. ¿Te atreves?"], health: 100, damage: 0 },
  // ── Ciudadanos (en las aceras) ──
  { id: "npc_cit1", name: "Carlos",  variant: "casual_m", type: "neutral", pos: [32, 0, 12.5],   wanderRadius: 12, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true, glb: "chico_casual" },
  { id: "npc_cit2", name: "Lucía",   variant: "casual_f", type: "neutral", pos: [-27.5, 0, 30],  wanderRadius: 12, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  { id: "npc_cit3", name: "Tomás",   variant: "casual_m", type: "neutral", pos: [-67.5, 0, -12.5], wanderRadius: 12, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  { id: "npc_cit4", name: "Ana",     variant: "casual_f", type: "neutral", pos: [70, 0, 67.5],   wanderRadius: 12, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  { id: "npc_cit5", name: "Pedro",   variant: "casual_m", type: "neutral", pos: [-67.5, 0, 70],  wanderRadius: 12, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  { id: "npc_cit6", name: "Sofía",   variant: "casual_f", type: "neutral", pos: [52.5, 0, 30],   wanderRadius: 6,  dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  { id: "npc_cit7", name: "Diego",   variant: "casual_m", type: "neutral", pos: [12.5, 0, -68],  wanderRadius: 12, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  { id: "npc_cit8", name: "Marta",   variant: "casual_f", type: "neutral", pos: [27.5, 0, 102],  wanderRadius: 12, dialogue: CITIZEN_LINES, health: 60, damage: 0, respawn: true },
  // ── Ejército de esqueletos de Lord Tuétano (noreste) ──
  { id: "goon1", name: "Esqueleto de Tuétano", variant: "goon", type: "hostile", pos: [92, 0, -72], wanderRadius: 10, dialogue: GOON_LINES, health: 70, damage: 8, group: "tuetano", respawn: true, aggroRange: 16, glb: "kit/ks_Skeleton_Minion" },
  { id: "goon2", name: "Esqueleto pícaro",     variant: "goon", type: "hostile", pos: [112, 0, -72], wanderRadius: 10, dialogue: GOON_LINES, health: 70, damage: 8, group: "tuetano", respawn: true, aggroRange: 16, glb: "kit/ks_Skeleton_Rogue" },
  { id: "goon3", name: "Esqueleto guerrero",   variant: "goon", type: "hostile", pos: [124, 0, -82], wanderRadius: 8,  dialogue: GOON_LINES, health: 90, damage: 9, group: "tuetano", respawn: true, aggroRange: 16, glb: "kit/ks_Skeleton_Warrior" },
  { id: "park1", name: "Esqueleto del parque", variant: "goon", type: "hostile", pos: [-86, 0, -86], wanderRadius: 7, dialogue: GOON_LINES, health: 60, damage: 7, group: "park_skeletons", respawn: false, aggroRange: 14, glb: "kit/ks_Skeleton_Minion" },
  { id: "park2", name: "Esqueleto del parque", variant: "goon", type: "hostile", pos: [-74, 0, -86], wanderRadius: 7, dialogue: GOON_LINES, health: 60, damage: 7, group: "park_skeletons", respawn: false, aggroRange: 14, glb: "kit/ks_Skeleton_Minion" },
  { id: "park3", name: "Esqueleto mago",       variant: "goon", type: "hostile", pos: [-80, 0, -90], wanderRadius: 6, dialogue: GOON_LINES, health: 80, damage: 9, group: "park_skeletons", respawn: false, aggroRange: 14, glb: "kit/ks_Skeleton_Mage" },
  // ── Mercenarios de Corporación Titán ──
  { id: "goon4", name: "Caballero de Titán",   variant: "goon", type: "hostile", pos: [-106, 0, -72], wanderRadius: 8, dialogue: TITAN_LINES, health: 110, damage: 10, group: "titan", respawn: true, aggroRange: 14, glb: "kit/ka_Knight" },
  { id: "goon5", name: "Mago de Titán",        variant: "goon", type: "hostile", pos: [112, 0, 118], wanderRadius: 8, dialogue: TITAN_LINES, health: 90, damage: 11, group: "titan", respawn: true, aggroRange: 14, glb: "kit/ka_Mage" },
  { id: "goon6", name: "Pícaro de Titán",      variant: "goon", type: "hostile", pos: [-122, 0, -104], wanderRadius: 6, dialogue: TITAN_LINES, health: 90, damage: 9, group: "titan", respawn: true, aggroRange: 14, glb: "kit/ka_Rogue" },
  // ── Matones del club ──
  { id: "club1", name: "Matón del Diamante",   variant: "goon", type: "hostile", pos: [-10, 0, 31], wanderRadius: 3, dialogue: GOON_LINES, health: 70, damage: 8, group: "club", respawn: false, aggroRange: 10 },
  { id: "club2", name: "Matón del Diamante",   variant: "goon", type: "hostile", pos: [-10, 0, 43], wanderRadius: 3, dialogue: GOON_LINES, health: 70, damage: 8, group: "club", respawn: false, aggroRange: 10 },
  { id: "club3", name: "Matón del Diamante",   variant: "goon", type: "hostile", pos: [11, 0, 31],  wanderRadius: 3, dialogue: GOON_LINES, health: 70, damage: 8, group: "club", respawn: false, aggroRange: 10 },
  { id: "club4", name: "Matón del Diamante",   variant: "goon", type: "hostile", pos: [11, 0, 43],  wanderRadius: 3, dialogue: GOON_LINES, health: 70, damage: 8, group: "club", respawn: false, aggroRange: 10 },
  // ── Objetivos de misiones secundarias ──
  { id: "boss_chatarrero", name: "El Chatarrero", variant: "goon", type: "boss", pos: [-113, 0, -118], wanderRadius: 6, dialogue: ["Nadie cobra la recompensa por mi cabeza… ¡nadie!"], health: 220, damage: 12, scale: 1.1, aggroRange: 14, glb: "kit/ks_Skeleton_Rogue" },
  { id: "boss_brock",      name: "Brock el Bárbaro", variant: "goon", type: "boss", pos: [78, 0, -78], wanderRadius: 3, dialogue: ["¡Cuarenta combates, cuarenta trajeados en el suelo!"], health: 300, damage: 14, scale: 1.15, aggroRange: 12, glb: "kit/ka_Barbarian" },
  // Socios de Tuétano: siguen con el negocio de copias cuando él cae
  { id: "boss_bombon",     name: "Barón Bombón",     variant: "bombon", type: "boss", pos: [82, 0, -104], wanderRadius: 4, dialogue: ["¡Mis copias son más dulces que tus originales! ¿Un caramelo envenenado?"], health: 260, damage: 13, scale: 1.1, aggroRange: 14, glb: "baron_bombon" },
  { id: "boss_malvik",     name: "Malvik el Especulador", variant: "malvik", type: "boss", pos: [125, 0, -86], wanderRadius: 4, dialogue: ["Compro barato, vendo caro y hundo lo que no puedo comprar. Empezando por ti."], health: 280, damage: 14, scale: 1.1, aggroRange: 14, glb: "malvik" },
  // ── Jefes principales ──
  { id: "boss_tuetano",  name: "Lord Tuétano",      variant: "lord_tuetano", type: "boss", pos: [106, 0, -82], wanderRadius: 5, dialogue: ["¡Tu marketplace no vale nada! Mis copias baratas dominan este mercado."], health: 320, damage: 14, scale: 1.0, aggroRange: 18, glb: "lord_tuetano" },
  { id: "boss_guerrero", name: "Guerrero Carmesí",  variant: "goon",         type: "boss", pos: [-113, 0, -78], wanderRadius: 5, dialogue: ["Corporación Titán me paga por hundirte. Nada personal, CEO."], health: 420, damage: 16, scale: 1.15, aggroRange: 18, glb: "guerrero" },
  { id: "boss_sombrio",  name: "Guerrero Sombrío",  variant: "goon",         type: "boss", pos: [118, 0, 88],   wanderRadius: 5, dialogue: ["Desde las sombras controlo el mercado. Nadie compra sin permiso de Titán."], health: 400, damage: 15, scale: 1.15, aggroRange: 18, glb: "guerrero_2" },
  { id: "boss_glaciar",  name: "Conde Glaciar",     variant: "glaciar",      type: "boss", pos: [-8, 0, -110],  wanderRadius: 4, dialogue: ["Guardo la Torre de Hielo para Titán. Aquí dentro, tu imperio se congela."], health: 380, damage: 15, scale: 1.15, aggroRange: 16, glb: "conde_glaciar" },
  { id: "boss_dragon",   name: "Dragón de Hielo",   variant: "goon",         type: "boss", pos: [6, 0, -116],   wanderRadius: 5, dialogue: ["GRRRAAAH… La IA de Titán congelará tu imperio como todos los demás."], health: 700, damage: 20, scale: 1.0, aggroRange: 20, glb: "mini_dragon_blue" },
];

export const BOSS_IDS = NPC_CONFIGS.filter(n => n.type === "boss").map(n => n.id);
export const SIDE_BOSS_IDS = ["boss_chatarrero", "boss_brock", "boss_bombon", "boss_malvik"];

// ── Vehículos ────────────────────────────────────────────────────────────────
export interface VehicleConfig {
  id: string;
  /** GLB en public/assets/generated/vehicles (blender/cars.py). */
  model: string;
  name: string;
  color: string;
  pos: Vec3;
  /** Rumbo inicial en radianes (0 = mirando a +Z). */
  heading: number;
  /** Velocidad punta en m/s. */
  speed: number;
  /** Aceleración en m/s². */
  accel: number;
  /** Extra montado encima del modelo. */
  roof?: "taxi" | "police";
  /** Conducido por la IA (persecución de El Topo). */
  ai?: boolean;
}

export const VEHICLE_CONFIGS: VehicleConfig[] = [
  { id: "car1",     model: "rosso_ceo",     name: "Rosso CEO",       color: "#b3110f", pos: [22.5, 0, 6],    heading: 0,           speed: 46, accel: 13 },
  { id: "car2",     model: "toro_azul",     name: "Toro Azul",       color: "#1846c9", pos: [-17.5, 0, 8],   heading: Math.PI,     speed: 52, accel: 15 },
  { id: "car3",     model: "volt_verde",    name: "Volt Verde",      color: "#17714a", pos: [40, 0, -17.5],  heading: Math.PI / 2, speed: 42, accel: 16 },
  { id: "car4",     model: "dorado_royale", name: "Dorado Royale",   color: "#c8a034", pos: [-57.5, 0, 40],  heading: 0,           speed: 36, accel: 8 },
  { id: "car5",     model: "bianco_gt",     name: "Bianco GT",       color: "#eef0f2", pos: [62.5, 0, -40],  heading: 0,           speed: 44, accel: 12 },
  { id: "car6",     model: "taxi_crafter",  name: "Taxi Crafter",    color: "#f2c318", pos: [57.5, 0, 30],   heading: Math.PI,     speed: 38, accel: 12, roof: "taxi" },
  { id: "car7",     model: "patrulla",      name: "Patrulla",        color: "#f4f6f8", pos: [-22.5, 0, -6],  heading: 0,           speed: 44, accel: 14, roof: "police" },
  { id: "car_mole", model: "sedan_negro",   name: "Sedán de Víctor", color: "#16171b", pos: [17.5, 0, -36],  heading: Math.PI,     speed: 30, accel: 10, ai: true },
];

/** Ruta de huida del topo por las calles (en bucle). */
export const CHASE_ROUTE: Vec3[] = [
  [20, 0, -60], [60, 0, -60], [60, 0, 20], [60, 0, 60], [20, 0, 60], [-20, 0, 60],
  [-60, 0, 60], [-60, 0, 20], [-60, 0, -20], [-20, 0, -20], [-20, 0, -60],
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
  { key: "crafter",   variant: "crafter_ceo", label: "CEO Crafter",   icon: "😎", description: "El fundador de Shopy Crafter", perk: "+10 % ingresos pasivos",        glb: "ceo_crafter" },
  { key: "magnate",   variant: "magnate",     label: "CEO Magnate",   icon: "🎩", description: "Dinero antiguo, ideas nuevas", perk: "Empieza con $2.500 más",        glb: "ceo_magnate" },
  { key: "formal",    variant: "formal",      label: "CEO Formal",    icon: "👔", description: "Elegante y estratégico",       perk: "Negocios un 10 % más baratos",  glb: "chico_formal" },
  { key: "ejecutiva", variant: "ejecutiva",   label: "CEO Ejecutiva", icon: "💼", description: "Liderazgo con estilo",         perk: "+20 % de salud máxima",         glb: "chica_ejecutiva" },
  { key: "creativa",  variant: "creativa",    label: "CEO Creativa",  icon: "🎨", description: "Innovación sin límites",       perk: "+15 % velocidad de movimiento", glb: "chica_creativa" },
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
  { id: "p1",  kind: "money",  pos: [-27.5, 0, 12],   value: 400 },
  { id: "p2",  kind: "money",  pos: [52.5, 0, 12.5],  value: 600 },
  { id: "p3",  kind: "money",  pos: [-110, 0, -68],   value: 800 },
  { id: "p4",  kind: "money",  pos: [125, 0, 52.5],   value: 900 },
  { id: "p5",  kind: "money",  pos: [-12.5, 0, 100],  value: 700 },
  { id: "p6",  kind: "money",  pos: [150, 0, -150],   value: 1500 },
  { id: "p7",  kind: "money",  pos: [-150, 0, 150],   value: 1500 },
  { id: "p8",  kind: "medkit", pos: [12.5, 0, 67.5],  value: 1 },
  { id: "p9",  kind: "medkit", pos: [-52.5, 0, -110], value: 1 },
  { id: "p10", kind: "medkit", pos: [100, 0, -12.5],  value: 1 },
  { id: "p11", kind: "medkit", pos: [12, 0, -100],    value: 1 },
  { id: "p12", kind: "ammo",   pos: [88, 0, -100],    value: 15 },
  { id: "p13", kind: "ammo",   pos: [-100, 0, 27.5],  value: 15 },
  { id: "p14", kind: "money",  pos: [-27.5, 0, 100],  value: 500 },
  { id: "p15", kind: "money",  pos: [100, 0, 100],    value: 650 },
];

// Chips de datos de la misión "Datos Perdidos" (en aceras, repartidos por la ciudad)
export const DATA_CHIPS: Vec3[] = [
  [-27.5, 0, -5], [52.5, 0, -45], [-100, 0, 52.5], [27.5, 0, 85], [12.5, 0, -50], [100, 0, 27.5],
];

// ── Historia ─────────────────────────────────────────────────────────────────
export const STORY = {
  title: "CEO Empire",
  subtitle: "La historia del CEO de Shopy Crafter",
  intro: [
    "Shopy Crafter nació como un pequeño marketplace para creadores: diseñadores, ilustradores y artesanos que querían vender al mundo sin intermediarios.",
    "Hoy llegas a la plaza del Shopy HQ con cinco mil dólares y una idea: convertir esa plataforma en el mayor imperio comercial jamás construido.",
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
  epilogue: "Shopy Crafter sale a bolsa valorada en mil millones. Los crafters de todo el mundo venden en tu plataforma y la ciudad lleva tu nombre. Pero un imperio nunca duerme…",
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
  /** Una de las cinco misiones originales de CEO Empire, integrada en la campaña. */
  original?: boolean;
  color: string;
  rewardMoney: number;
  rewardKarma: number;
  completeText: string;
  nextMissionId: string | null;
}

const bizPos = (id: string) => BUSINESSES.find(b => b.id === id)!.pos;

export const MISSIONS: Mission[] = [
  // ═══════════════ ACTO I — EL GARAJE ═══════════════
  {
    id: "m1", category: "main", original: true, title: "El Inicio del Imperio", giverNpcId: "npc_garcia", type: "goto",
    briefing: "Bienvenido a la ciudad, CEO. En el vestíbulo del Shopy HQ —la torre de cristal al norte de la plaza— te espera el maletín con la base de datos de nuestros primeros mil crafters. Sin esos datos no hay empresa. Cruza la avenida y recógelo (marcador azul). Corre con Shift.",
    objective: "Recoge el maletín de datos en la entrada del Shopy HQ",
    markerPos: PLACES.hq.entrance, color: "#00f5ff", rewardMoney: 3000, rewardKarma: 10,
    completeText: "Maletín recogido. Mil crafters confían en ti.", nextMissionId: "m2",
  },
  {
    id: "m2", category: "main", original: true, title: "Expansión de Mercado", giverNpcId: "npc_garcia", type: "buy", targetBusiness: "cafe",
    briefing: "Shopy Crafter necesita presencia física. La Cafetería Digital, al suroeste de la plaza, será nuestro primer showroom: los crafters expondrán allí sus productos. Acércate al círculo dorado y pulsa B.",
    objective: "Compra la Cafetería Digital (tecla B en el marcador dorado)",
    markerPos: bizPos("cafe"), color: "#ffd700", rewardMoney: 8000, rewardKarma: 15,
    completeText: "¡Primer showroom abierto! Ya generas ingresos cada segundo.", nextMissionId: "m3",
  },
  {
    id: "m3", category: "main", title: "Entrega Urgente", giverNpcId: "npc_maria", type: "deliver", timeLimit: 75,
    briefing: "La Agencia Marketing quiere lanzar nuestra campaña, pero el contrato caduca en 75 segundos. Coge un coche de la plaza (tecla E) y vuela al marcador naranja, junto a la torre de cristal del este.",
    objective: "Entrega el contrato en la Agencia Marketing antes de que acabe el tiempo",
    markerPos: bizPos("marketing"), color: "#ff8c00", rewardMoney: 7000, rewardKarma: 5,
    completeText: "Contrato firmado. La ciudad empieza a hablar de nosotros.", nextMissionId: "m4",
  },
  // ═══════════════ ACTO II — COMPETENCIA SUCIA ═══════════════
  {
    id: "m4", category: "main", title: "Limpieza de Barrio", giverNpcId: "npc_garcia", type: "kill_group", targetGroup: "tuetano", targetCount: 3,
    briefing: "Lord Tuétano vende copias baratas de los productos de nuestros crafters y su ejército de esqueletos extorsiona a los comercios del noreste. Elimina a tres esqueletos. Golpea con clic izquierdo; el Vendedor de la plaza tiene un bate.",
    objective: "Elimina a 3 esqueletos de Tuétano en el distrito noreste",
    markerPos: [100, 0, -78], color: "#ff4444", rewardMoney: 10000, rewardKarma: -5,
    completeText: "Barrio limpio. Los comerciantes vuelven a vender productos originales.", nextMissionId: "m5",
  },
  {
    id: "m5", category: "main", original: true, title: "El Rival Amenaza", giverNpcId: "npc_garcia", type: "kill_boss", targetBosses: ["boss_tuetano"],
    briefing: "Lord Tuétano en persona te espera ante su guarida del noreste. Si cae, el mercado de copias cae con él y los crafters recuperan el barrio. Pisar su guarida no basta: tienes que derribarlo. Lleva kits médicos (tecla R), es un hueso duro.",
    objective: "Derrota a Lord Tuétano en su guarida",
    markerPos: [106, 0, -82], color: "#ff2222", rewardMoney: 25000, rewardKarma: -5,
    completeText: "Lord Tuétano ha caído. El mercado de copias se desmorona.", nextMissionId: "m6",
  },
  // ═══════════════ ACTO III — CRECIMIENTO ═══════════════
  {
    id: "m6", category: "main", original: true, title: "Imperio Imparable", giverNpcId: "npc_maria", type: "own_count", targetCount: 4,
    briefing: "Los inversores quieren ver músculo. Controla al menos cuatro negocios de la ciudad; los marcadores dorados del minimapa señalan los que están en venta. Mejorar los que ya tienes (tecla U) acelera tus ingresos.",
    objective: "Posee 4 negocios en la ciudad",
    color: "#00ff88", rewardMoney: 50000, rewardKarma: 20,
    completeText: "¡Cuatro negocios controlados! Eres imparable y tu nombre empieza a sonar en la bolsa.", nextMissionId: "m7",
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
    briefing: "Los grandes tratos de esta ciudad se cierran en el Club Diamante, justo al sur de la plaza, y Madame Vega solo negocia con socios. Compra el club (marcador rosa en la entrada) y tendrás mesa con los inversores. Ingresos x2 cada noche.",
    objective: "Compra el Club Diamante",
    markerPos: bizPos("club"), color: "#ff2d95", rewardMoney: 35000, rewardKarma: 0,
    completeText: "El Diamante es tuyo. Madame Vega te presenta a los inversores de la ronda B.", nextMissionId: "m10",
  },
  // ═══════════════ ACTO IV — GUERRA DE MERCADO ═══════════════
  {
    id: "m10", category: "main", title: "Guerra de Mercado", giverNpcId: "npc_garcia", type: "kill_boss", targetBosses: ["boss_guerrero", "boss_sombrio"],
    briefing: "Corporación Titán ha contratado mercenarios: el Guerrero Carmesí, en su fortaleza del noroeste, y el Guerrero Sombrío, en su bastión del sureste, atacan nuestras tiendas. Derrota a ambos. Una pistola y el traje blindado te vendrán bien.",
    objective: "Derrota al Guerrero Carmesí y al Guerrero Sombrío",
    color: "#c040ff", rewardMoney: 80000, rewardKarma: -10,
    completeText: "Los mercenarios han caído. Titán tendrá que ensuciarse las manos.", nextMissionId: "m11",
  },
  {
    id: "m11", category: "main", title: "Dueño de la Ciudad", giverNpcId: "npc_maria", type: "own_count", targetCount: 6,
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
    id: "m13", category: "main", title: "La Torre de Hielo", giverNpcId: "npc_garcia", type: "kill_boss", targetBosses: ["boss_glaciar", "boss_dragon"],
    briefing: "El centro de datos de Titán, la Torre de Hielo del norte, está protegido por el Conde Glaciar y por su arma definitiva: una IA con forma de dragón que congela cualquier negocio que se acerque. Derrota a los dos y Titán quedará ciega. Ve preparado.",
    objective: "Derrota al Conde Glaciar y al Dragón de Hielo en la Torre de Hielo",
    markerPos: PLACES.iceTower.arena, color: "#66ccff", rewardMoney: 200000, rewardKarma: 30,
    completeText: "La Torre de Hielo ha caído. Titán ya no tiene con qué competir.", nextMissionId: "m14",
  },
  {
    id: "m14", category: "main", original: true, title: "CEO del Año", giverNpcId: "npc_garcia", type: "goto",
    briefing: "Los inversores te esperan en el helipuerto del noroeste para firmar la salida a bolsa de Shopy Crafter: mil millones de valoración. Sube al helipuerto y cierra el trato. ¡Es tu momento!",
    objective: "Sube al helipuerto y firma la salida a bolsa",
    markerPos: [PLACES.helipad.x, 0, PLACES.helipad.z + 6], color: "#ffd700", rewardMoney: 1000000, rewardKarma: 50,
    completeText: "¡ERES EL CEO DEL AÑO! Shopy Crafter cotiza en bolsa.", nextMissionId: null,
  },

  // ═══════════════ MISIONES SECUNDARIAS ═══════════════
  {
    id: "s_express", category: "side", title: "Reparto Express", giverNpcId: "npc_nico", type: "waypoints", timeLimit: 150, unlockAfter: "m2",
    waypoints: [bizPos("cafe"), bizPos("marketing"), [-5, 0, 7.5], bizPos("design")],
    briefing: "Tengo cuatro paquetes de crafters para la cafetería, la agencia, el Vendedor y el estudio de diseño… y el reparto caduca en dos minutos y medio. ¿Me haces el favor, jefe?",
    objective: "Entrega los 4 paquetes en orden antes de que acabe el tiempo",
    color: "#ffb347", rewardMoney: 6000, rewardKarma: 5,
    completeText: "Cuatro clientes felices. Nico promete invitarte a un café… cuando cobre.", nextMissionId: null,
  },
  {
    id: "s_race1", category: "side", title: "Carrera Crafter", giverNpcId: "npc_rayo", type: "race", timeLimit: 110, requireVehicle: true, unlockAfter: "m3",
    waypoints: [[20, 0, 60], [60, 0, 60], [60, 0, -20], [20, 0, -60], [-20, 0, -60], [-60, 0, -20], [-60, 0, 20], [-20, 0, 60], [0, 0, 20]],
    briefing: "Nueve puntos de control por el centro, contrarreloj. Sube a un coche, pasa por los marcadores en orden y vuelve a la avenida de la plaza en menos de 110 segundos.",
    objective: "Completa los 9 puntos de control en coche antes de que acabe el tiempo",
    color: "#ff8c00", rewardMoney: 12000, rewardKarma: 0,
    completeText: "¡Récord del circuito! Rayo te mira con respeto por primera vez.", nextMissionId: null,
  },
  {
    id: "s_taxi", category: "side", title: "Taxi Nocturno", giverNpcId: "npc_cit6", type: "deliver", requireVehicleId: "car6", timeLimit: 120, unlockAfter: "m3",
    markerPos: [80, 0, 67.5],
    briefing: "El taxi de la esquina lleva parado toda la tarde y necesito llegar al parque del sureste. Si lo conduces tú, te pago la carrera… y la propina.",
    objective: "Lleva a Sofía al parque del sureste conduciendo el Taxi Crafter",
    color: "#f2c318", rewardMoney: 5000, rewardKarma: 5,
    completeText: "Sofía llega a tiempo. «Cinco estrellas, CEO».", nextMissionId: null,
  },
  {
    id: "s_intern", category: "side", title: "Rescate en el Parque", giverNpcId: "npc_maria", type: "kill_group", targetGroup: "park_skeletons", targetCount: 3, unlockAfter: "m4",
    markerPos: [-80, 0, -80],
    briefing: "Lía, nuestra becaria, fue a una reunión en el parque del noroeste y no ha vuelto. Elena dice que los esqueletos de Tuétano rondan por allí. Sácala de ahí.",
    objective: "Elimina a los 3 esqueletos del parque y rescata a Lía",
    color: "#7dffb0", rewardMoney: 10000, rewardKarma: 10,
    completeText: "Lía está a salvo. «Nunca más reuniones al aire libre», jura.", nextMissionId: null,
  },
  {
    id: "s_bouncer", category: "side", title: "Noche Movida", giverNpcId: "npc_vega", type: "kill_group", targetGroup: "club", targetCount: 4, unlockAfter: "m5",
    markerPos: [0, 0, 36],
    briefing: "Cuatro matones de Tuétano se han quedado sin jefe y ahora molestan a mis chicas en el Diamante. Un socio de verdad se ocuparía de ellos. ¿Eres un socio de verdad?",
    objective: "Elimina a los 4 matones que rondan el Club Diamante",
    color: "#ff2d95", rewardMoney: 15000, rewardKarma: 5,
    completeText: "El Diamante vuelve a ser seguro. Madame Vega te debe una.", nextMissionId: null,
  },
  {
    id: "s_bounty", category: "side", title: "Cazarrecompensas", giverNpcId: "npc_mora", type: "kill_boss", targetBosses: ["boss_chatarrero"], unlockAfter: "m5",
    markerPos: [PLACES.scrapyard.x, 0, PLACES.scrapyard.z],
    briefing: "El Chatarrero desguaza los coches que roba y los apila en su desguace del extremo noroeste. La comisaría no tiene efectivos. Hay veinte mil de recompensa por él. Vivo o… bueno, ya sabes.",
    objective: "Elimina al Chatarrero en el desguace del noroeste",
    color: "#7fb3ff", rewardMoney: 20000, rewardKarma: 5,
    completeText: "Recompensa cobrada. Mora te guiña un ojo: «Tengo más trabajo cuando quieras».", nextMissionId: null,
  },
  {
    id: "s_partners", category: "side", title: "Los Socios de Tuétano", giverNpcId: "npc_mora", type: "kill_boss", targetBosses: ["boss_bombon", "boss_malvik"], unlockAfter: "m5",
    markerPos: [100, 0, -86],
    briefing: "Tuétano ha caído, pero sus socios siguen fabricando copias detrás de su guarida: el Barón Bombón, que las disfraza de golosinas, y Malvik el Especulador, que revienta los precios. Mientras sigan ahí, los crafters del noreste no venden. Termina el trabajo.",
    objective: "Derrota al Barón Bombón y a Malvik el Especulador",
    color: "#ff7a3c", rewardMoney: 30000, rewardKarma: 5,
    completeText: "Se acabaron las copias. Los crafters del noreste vuelven a vender originales.", nextMissionId: null,
  },
  {
    id: "s_champ", category: "side", title: "El Reto del Bárbaro", giverNpcId: "npc_rufo", type: "kill_boss", targetBosses: ["boss_brock"], unlockAfter: "m5",
    markerPos: [PLACES.ring.x, 0, PLACES.ring.z],
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
    waypoints: [[20, 0, 60], [60, 0, 60], [60, 0, 125], [-20, 0, 125], [-60, 0, 60], [-60, 0, -20], [-60, 0, -125], [20, 0, -125], [60, 0, -60], [20, 0, -20]],
    briefing: "El circuito grande: toda la ciudad en diez puntos de control, de punta a punta de las avenidas. Nadie lo ha bajado de 200 segundos. Si lo haces, la bolsa es tuya.",
    objective: "Completa los 10 puntos de control del gran circuito en coche",
    color: "#ff8c00", rewardMoney: 30000, rewardKarma: 0,
    completeText: "Campeón de la ciudad. Rayo cuelga tu foto en el garaje.", nextMissionId: null,
  },
];

export const MAIN_MISSIONS = MISSIONS.filter(m => m.category === "main");
export const SIDE_MISSIONS = MISSIONS.filter(m => m.category === "side");

export const missionById = (id: string | null | undefined) => MISSIONS.find(m => m.id === id);
