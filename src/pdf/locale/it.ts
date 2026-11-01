import { isStringToken, StringToken, Token } from "../lexers/token";
import { DamageType } from "../model/common";

// The Italian PDFs share layout and fonts with the English ones. Structural tokens are rewritten to English
// so the existing parsers can read them, while names and rules text stay in Italian.

export type ItalianBook = "FUCR" | "FUHF" | "FUTF";

// A stat block page of each book: the Italian PDFs read "Liv 10" where the English ones read "Lv 10".
const STAT_BLOCK_PAGES: Record<ItalianBook, number> = { FUCR: 326, FUHF: 172, FUTF: 188 };

export const detectItalianBook = async (
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
	bookType: string,
): Promise<ItalianBook | null> => {
	if (!(bookType in STAT_BLOCK_PAGES)) return null;
	const book = bookType as ItalianBook;
	const [isItalian, cleanup] = await withPage(STAT_BLOCK_PAGES[book], async (tokens) =>
		tokens.some((t) => isStringToken(t) && /^Liv \d+/.test(t.string)),
	);
	cleanup();
	return isItalian ? book : null;
};

const ICON = /FabulaUltimaicons-Regular$/;
const SECTION = /Antonio-Bold$/;
const LEVEL = /Antonio-Regular$/;
const BOLD = /PTSans-NarrowBold$/;
const NARROW = /PTSans-Narrow$/;

const STATS: Record<string, string> = { DES: "DEX", INT: "INS", VIG: "MIG", VOL: "WLP" };

const SECTION_LABELS: Record<string, string> = {
	PV: "HP",
	PM: "MP",
	AS: "AB",
	"ATTACCHI BASE": "BASIC ATTACKS",
	INCANTESIMI: "SPELLS",
	"ALTRE AZIONI": "OTHER ACTIONS",
	"REGOLE SPECIALI": "SPECIAL RULES",
};

const BOLD_LABELS: Record<string, string> = {
	"Tratti:": "Traits:",
	"Tratti tipici:": "Typical Traits:",
	"Equipaggiamento:": "Equipment:",
	"Opportunità:": "Opportunity:",
};

const SPLIT_BOLD_LABELS: Record<string, string> = {
	Tratti: "Traits",
	"Tratti tipici": "Typical Traits",
	Opportunità: "Opportunity",
};

const ITEM_HEADERS: Record<string, string> = {
	ARMA: "WEAPON",
	ARMATURA: "ARMOR",
	SCUDO: "SHIELD",
	ACCESSORIO: "ACCESSORY",
	"MODULO ARMA": "WEAPON MODULE",
	"ARMI BASE": "BASIC WEAPONS",
	"ESEMPI DI ARMI ARCANE RARE": "SAMPLE RARE ARCANE WEAPONS",
	"ESEMPI DI ARCHI RARI": "SAMPLE RARE BOW WEAPONS",
	"ESEMPI DI FLAGELLI RARI": "SAMPLE RARE FLAIL WEAPONS",
	"ESEMPI DI ARMI DA FUOCO RARE": "SAMPLE RARE FIREARM WEAPONS",
	"ESEMPI DI LANCE RARE": "SAMPLE RARE SPEAR WEAPONS",
	"ESEMPI DI ARMI DA LANCIO RARE": "SAMPLE RARE THROWN WEAPONS",
	"ESEMPI DI ARMI PESANTI RARE": "SAMPLE RARE HEAVY WEAPONS",
	"ESEMPI DI PUGNALI RARI": "SAMPLE RARE DAGGER WEAPONS",
	"ESEMPI DI ARMI DA RISSA RARE": "SAMPLE RARE BRAWLING WEAPONS",
	"ESEMPI DI SPADE RARE": "SAMPLE RARE SWORD WEAPONS",
	"ESEMPI DI ARMATURE RARE": "SAMPLE RARE ARMORS",
	"ESEMPI DI SCUDI RARI": "SAMPLE RARE SHIELDS",
};

const ROW_LABELS: Record<string, string> = {
	"Una mano": "One-handed",
	"Due mani": "Two-handed",
	Mischia: "Melee",
	Distanza: "Ranged",
};

const SPECIES: Record<string, string> = {
	BESTIA: "BEAST",
	COSTRUTTO: "CONSTRUCT",
	DEMONE: "DEMON",
	ELEMENTALE: "ELEMENTAL",
	UMANOIDE: "HUMANOID",
	MOSTRO: "MONSTER",
	PIANTA: "PLANT",
	"NON MORTO": "UNDEAD",
};

export const DAMAGE_TYPES_IT: Record<string, DamageType> = {
	fisico: "physical",
	fisici: "physical",
	aria: "air",
	fulmine: "bolt",
	ombra: "dark",
	terra: "earth",
	fuoco: "fire",
	ghiaccio: "ice",
	luce: "light",
	veleno: "poison",
};

const WEAPON_CATEGORIES_IT: Record<string, string> = {
	arcana: "Arcane",
	arco: "Bow",
	flagello: "Flail",
	"da fuoco": "Firearm",
	lancia: "Spear",
	"da lancio": "Thrown",
	pesante: "Heavy",
	pugnale: "Dagger",
	"da rissa": "Brawling",
	spada: "Sword",
};

// Group titles of the Core Rulebook basic weapons tables.
const WEAPON_GROUP_TITLES: Record<string, string> = {
	Arcane: "Arcane",
	Archi: "Bow",
	Flagelli: "Flail",
	"Da Fuoco": "Firearm",
	Lance: "Spear",
	"Da Lancio": "Thrown",
	Pesanti: "Heavy",
	Pugnali: "Dagger",
	"Da Rissa": "Brawling",
	Spade: "Sword",
};

const RANK_SUFFIX = /\((?:(.+?),\s*)?(Soldato|Élite|Elite|Campione|Compagno)(\s+\d+)?\)\s*$/;
const RANKS: Record<string, string> = {
	Soldato: "Soldier",
	Élite: "Elite",
	Elite: "Elite",
	Campione: "Champion",
	Compagno: "Companion",
};

const has = (t: Token | undefined, s: string, font: RegExp): boolean =>
	!!t && isStringToken(t) && t.string === s && font.test(t.font);
const isOpen = (t: Token | undefined) => has(t, "(", ICON);
const isClose = (t: Token | undefined) => has(t, ")", ICON);
const isSep = (t: Token | undefined) => has(t, "•", ICON) || has(t, "-", ICON);
const asString = (t: Token | undefined): StringToken | null => (t && isStringToken(t) ? t : null);

const isSectionToken = (t: Token | undefined) => !!t && isStringToken(t) && SECTION.test(t.font);

const translateAccuracy = (s: string): string | null => {
	const m = s.match(/^(DES|INT|VIG|VOL)\s*\+\s*(DES|INT|VIG|VOL)$/);
	return m ? `${STATS[m[1]]} + ${STATS[m[2]]}` : null;
};

const translateSection = (s: string, previous: Token | undefined, mdefLabel: string): string => {
	if (SECTION_LABELS[s]) return SECTION_LABELS[s];
	const stat = s.match(/^(DES|INT|VIG|VOL) (d\d+)$/);
	if (stat) return `${STATS[stat[1]]} ${stat[2]}`;
	if (/^Iniz\. \d+$/.test(s)) return s.replace("Iniz.", "Init.");
	if (/^DIF /.test(s)) return s.replace("DIF", "DEF");
	if (/^D\.MAG /.test(s)) return s.replace("D.MAG", mdefLabel);
	if (s === "Speciale" && has(previous, "PV", SECTION)) return "Special";
	return s.replace(
		RANK_SUFFIX,
		(_m, qualifier: string | undefined, rank: string, phases: string | undefined) =>
			`(${qualifier ? qualifier + ", " : ""}${RANKS[rank]}${phases ?? ""})`,
	);
};

const translateBold = (s: string, next: Token | undefined): string => {
	if (BOLD_LABELS[s]) return BOLD_LABELS[s];
	if (SPLIT_BOLD_LABELS[s] && has(next, ":", BOLD)) return SPLIT_BOLD_LABELS[s];
	const size = s.match(/^Taglia (DES|INT)( \+\d+)?$/);
	if (size) return `${STATS[size[1]]} size${size[2] ?? ""}`;
	if (WEAPON_GROUP_TITLES[s] && next && !isStringToken(next)) return `${WEAPON_GROUP_TITLES[s]} Category`;
	return s;
};

export const normalizeItalianTokens = (tokens: Token[], book: ItalianBook): Token[] => {
	const mdefLabel = book === "FUCR" ? "M.DEF" : "M. DEF";
	const out: Token[] = [];
	for (let i = 0; i < tokens.length; i++) {
		const t = tokens[i];
		if (!isStringToken(t)) {
			out.push(t);
			continue;
		}
		const previous = tokens[i - 1];
		const next = tokens[i + 1];
		const push = (string: string) => out.push({ ...t, string });

		if (isOpen(previous) && BOLD.test(t.font)) {
			// A line break can split "(VIG + VOL)" into two tokens.
			const split = asString(next);
			const joined = /\+$/.test(t.string) && split && BOLD.test(split.font) ? translateAccuracy(`${t.string} ${split.string}`) : null;
			if (joined) {
				push(joined);
				i++;
				continue;
			}
			const accuracy = translateAccuracy(t.string);
			if (accuracy) {
				push(accuracy);
				continue;
			}
			const damage = t.string.match(/^TM \+ (\d+)$/);
			if (damage) {
				push(`HR + ${damage[1]}`);
				if (isClose(next)) {
					out.push(next);
					i = pushDamageType(tokens, i + 2, tokens[i - 2], out) - 1;
				}
				continue;
			}
		}

		if (SECTION.test(t.font)) {
			if (ITEM_HEADERS[t.string]) push(ITEM_HEADERS[t.string]);
			else push(translateSection(t.string, previous, mdefLabel));
		} else if (LEVEL.test(t.font)) {
			if (ITEM_HEADERS[t.string]) push(ITEM_HEADERS[t.string]);
			else if (/^Liv \d+/.test(t.string)) push(t.string.replace("Liv", "Lv"));
			else if (isSep(previous) && /^Lv|^Liv/.test(asString(tokens[i - 2])?.string ?? "")) {
				const variant = t.string.match(/^VARIANTE (.+)$/);
				push(variant ? `VARIANT ${SPECIES[variant[1]] ?? variant[1]}` : (SPECIES[t.string] ?? t.string));
			} else push(t.string);
		} else if (BOLD.test(t.font)) {
			const bold = translateBold(t.string, next);
			push(bold);
			// The Core Rulebook parser reads the equipment list as a single token.
			if (bold === "Equipment:" && book === "FUCR") {
				let list = "";
				while (i + 1 < tokens.length && !isSectionToken(tokens[i + 1])) {
					list += asString(tokens[i + 1])?.string ?? "";
					i++;
				}
				out.push({ ...t, string: list });
			}
		} else if (NARROW.test(t.font)) {
			if (t.string === "Nessuna Qualità.") push("No Quality.");
			else if (ROW_LABELS[t.string] && (isSep(previous) || isSep(next))) push(ROW_LABELS[t.string]);
			else push(t.string);
		} else if (ITEM_HEADERS[t.string]) {
			// Some table headers are reported with the page ornament font.
			push(ITEM_HEADERS[t.string]);
		} else {
			push(t.string);
		}
	}
	return out;
};

// Rewrites what follows a damage bracket. "beforeBracket" tells a stat line from a mention in rules text:
// attacks read "• (TM + 5) danni da fuoco", table rows read "(DES + VIG) (TM + 5) fuoco Spada • Una mano".
const pushDamageType = (tokens: Token[], start: number, beforeBracket: Token | undefined, out: Token[]): number => {
	const first = asString(tokens[start]);
	const isAttack = isSep(beforeBracket);
	if (isAttack && first && NARROW.test(first.font) && /^danni( da)?$/.test(first.string)) {
		const type = asString(tokens[start + 1]);
		if (type && BOLD.test(type.font) && DAMAGE_TYPES_IT[type.string]) {
			out.push({ ...type, string: DAMAGE_TYPES_IT[type.string] });
			// The description has to start with a regular font token, as the English "damage" does.
			const stop = asString(tokens[start + 2]);
			if (stop && stop.string === "." && BOLD.test(stop.font)) {
				out.push({ ...stop, font: first.font });
				return start + 3;
			}
			return start + 2;
		}
		return start;
	}
	const before = asString(beforeBracket);
	const isTableRow = !!before && (isClose(before) || /^\+\d+$/.test(before.string) || /^(\d+ z|-)$/.test(before.string));
	// The icon font can split "luce" into "l" + "uce", as it does with the English "light".
	const tail = asString(tokens[start + 1]);
	const splitLight = first?.string === "l" && tail?.string === "uce";
	const typeName = splitLight ? "luce" : first?.string;
	if (isTableRow && first && BOLD.test(first.font) && typeName && DAMAGE_TYPES_IT[typeName]) {
		out.push({ ...first, string: DAMAGE_TYPES_IT[typeName] });
		if (splitLight) start++;
		const category = asString(tokens[start + 1]);
		const english = category && BOLD.test(category.font) ? WEAPON_CATEGORIES_IT[category.string.toLowerCase()] : null;
		if (category && english) {
			out.push({ ...category, string: english });
			return start + 2;
		}
		return start + 1;
	}
	return start;
};

const STAT_NAMES_IT: Record<string, string> = { DEX: "DES", INS: "INT", MIG: "VIG", WLP: "VOL" };

const restoreText = (s: string): string =>
	s
		.replace(/\bHR \+ /g, "TM + ")
		.replace(
			/\b(DEX|INS|MIG|WLP)\s*\+\s*(DEX|INS|MIG|WLP)\b/g,
			(_m, a: string, b: string) => `${STAT_NAMES_IT[a]} + ${STAT_NAMES_IT[b]}`,
		)
		.replace(/\(\s+/g, "(")
		.replace(/\s+\)/g, ")")
		// The damage clause moved to the attack fields can leave its trailing punctuation behind.
		.replace(/^[\s.,;:]+/, "")
		// Attacks whose damage type is decided at runtime read "(TM + 5) danni."
		.replace(/^danni\.\s*/, "")
		.replace(/^(<p>)?(\p{Ll})/u, (_m, tag: string | undefined, letter: string) => `${tag ?? ""}${letter.toUpperCase()}`);

let italianActive = false;

// Parsing runs for one PDF at a time, so the importers can read the current language from here.
export const setItalianActive = (active: boolean) => {
	italianActive = active;
};

// Puts rules text back in Italian once parsing is over. Structured fields keep the English system values.
export const restoreDescriptions = <T>(data: T): T => {
	if (!italianActive) return data;
	const walk = (value: unknown): void => {
		if (Array.isArray(value)) {
			value.forEach(walk);
		} else if (value && typeof value === "object") {
			const record = value as Record<string, unknown>;
			for (const key of Object.keys(record)) {
				if (key === "image") continue;
				const field = record[key];
				if ((key === "description" || key === "opportunity") && typeof field === "string") {
					record[key] = restoreText(field);
				} else {
					walk(field);
				}
			}
		}
	};
	walk(data);
	return data;
};

const FOLDERS_IT: Record<string, string> = {
	"Core Rulebook Equipment": "Equipaggiamento Manuale Base",
	"High Fantasy Equipment": "Equipaggiamento High Fantasy",
	"Techno Fantasy Equipment": "Equipaggiamento Techno Fantasy",
	Weapons: "Armi",
	Armors: "Armature",
	Shields: "Scudi",
	Accessories: "Accessori",
	"Weapon Modules": "Moduli Arma",
	Consumables: "Consumabili",
	Beastiary: "Bestiario",
	"High Fantasy Bestiary": "Bestiario High Fantasy",
	"Techno Fantasy Bestiary": "Bestiario Techno Fantasy",
};

export const localizeFolderName = (name: string): string => (italianActive ? (FOLDERS_IT[name] ?? name) : name);

// Matches "(TM + N) danni da <tipo>" and "(TM + N) danni fisici".
export const parseItalianSpellDamage = (description: string): { value: number; type: DamageType } | null => {
	const types = Object.keys(DAMAGE_TYPES_IT).join("|");
	const m = description.match(new RegExp(`\\(\\s*TM\\s*[+＋]\\s*(\\d+)\\s*\\)\\s*danni\\s+(?:da\\s+)?(${types})\\b`, "i"));
	return m ? { value: Number(m[1]), type: DAMAGE_TYPES_IT[m[2].toLowerCase()] } : null;
};
