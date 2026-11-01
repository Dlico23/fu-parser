import { afterEach, describe, expect, test } from "@jest/globals";
import { Token } from "../lexers/token";
import {
	localizeFolderName,
	normalizeItalianTokens,
	parseItalianSpellDamage,
	restoreDescriptions,
	setItalianActive,
} from "./it";

const ICON = "ABCDEF+FabulaUltimaicons-Regular";
const BOLD = "ABCDEF+PTSans-NarrowBold";
const NARROW = "ABCDEF+PTSans-Narrow";
const SECTION = "ABCDEF+Antonio-Bold";
const LEVEL = "ABCDEF+Antonio-Regular";
const t = (string: string, font: string): Token => ({ kind: "String", string, font });
const strings = (tokens: Token[]) => tokens.map((x) => (x.kind === "String" ? x.string : "<image>"));

describe("normalizeItalianTokens", () => {
	test("translates a stat block", () => {
		const tokens = [
			t("GOLEM (Campione 3)", SECTION),
			t("Liv 10", LEVEL),
			t("•", ICON),
			t("NON MORTO", LEVEL),
			t("DES d8", SECTION),
			t("INT d6", SECTION),
			t("VIG d10", SECTION),
			t("VOL d12", SECTION),
			t("PV", SECTION),
			t("Speciale", SECTION),
			t("PM", SECTION),
			t("50", SECTION),
			t("Iniz. 9", SECTION),
			t("DIF +1", SECTION),
			t("D.MAG +2", SECTION),
			t("AS", SECTION),
			t("ATTACCHI BASE", SECTION),
		];
		expect(strings(normalizeItalianTokens(tokens, "FUHF"))).toEqual([
			"GOLEM (Champion 3)",
			"Lv 10",
			"•",
			"UNDEAD",
			"DEX d8",
			"INS d6",
			"MIG d10",
			"WLP d12",
			"HP",
			"Special",
			"MP",
			"50",
			"Init. 9",
			"DEF +1",
			"M. DEF +2",
			"AB",
			"BASIC ATTACKS",
		]);
		expect(strings(normalizeItalianTokens([t("D.MAG +2", SECTION)], "FUCR"))).toEqual(["M.DEF +2"]);
	});

	test("moves the damage type of an attack and leaves rules text alone", () => {
		const attack = [
			t("•", ICON),
			t("(", ICON),
			t("TM + 5", BOLD),
			t(")", ICON),
			t("danni da", NARROW),
			t("fuoco", BOLD),
			t(", poi cade.", NARROW),
		];
		expect(strings(normalizeItalianTokens(attack, "FUHF"))).toEqual(["•", "(", "HR + 5", ")", "fire", ", poi cade."]);

		const rule = [t("Infligge", NARROW), t("(", ICON), t("TM + 5", BOLD), t(")", ICON), t("danni da", NARROW), t("fuoco", BOLD)];
		expect(strings(normalizeItalianTokens(rule, "FUHF"))).toEqual(["Infligge", "(", "HR + 5", ")", "danni da", "fuoco"]);
	});

	test("translates a weapon row, also when the light damage type is split", () => {
		const row = [
			t("100 z", NARROW),
			t("(", ICON),
			t("DES +", BOLD),
			t("VIG", BOLD),
			t(")", ICON),
			t("(", ICON),
			t("TM + 6", BOLD),
			t(")", ICON),
			t("l", BOLD),
			t("uce", BOLD),
			t("Da rissa", BOLD),
			t("•", ICON),
			t("Una mano", NARROW),
			t("•", ICON),
			t("Mischia", NARROW),
			t("•", ICON),
			t("Nessuna Qualità.", NARROW),
		];
		expect(strings(normalizeItalianTokens(row, "FUHF"))).toEqual([
			"100 z",
			"(",
			"DEX + MIG",
			")",
			"(",
			"HR + 6",
			")",
			"light",
			"Brawling",
			"•",
			"One-handed",
			"•",
			"Melee",
			"•",
			"No Quality.",
		]);
	});

	test("keeps the Core Rulebook equipment list in one token", () => {
		const tokens = [t("Equipaggiamento:", BOLD), t("bastone, veste", NARROW), t(".", NARROW), t("ATTACCHI BASE", SECTION)];
		expect(strings(normalizeItalianTokens(tokens, "FUCR"))).toEqual(["Equipment:", "bastone, veste.", "BASIC ATTACKS"]);
	});

	test("does not touch the last token of a page", () => {
		const watermark = t("Nome Cognome - 123456", "Helvetica");
		expect(normalizeItalianTokens([watermark], "FUHF")).toEqual([watermark]);
	});
});

describe("restored text", () => {
	afterEach(() => setItalianActive(false));

	test("gives rules text back its Italian abbreviations and keeps system values", () => {
		setItalianActive(true);
		const attack = {
			accuracy: { primary: "DEX" },
			description: ", poi usa ( HR + 5 ) e un Test di (DEX + INS).",
			image: { description: "HR + 1" },
		};
		restoreDescriptions(attack);
		expect(attack.description).toBe("Poi usa (TM + 5) e un Test di (DES + INT).");
		expect(attack.accuracy.primary).toBe("DEX");
		expect(attack.image.description).toBe("HR + 1");
	});

	test("capitalizes inside HTML and removes an orphan damage clause", () => {
		setItalianActive(true);
		const items = [{ description: "<p>quando colpisci.</p>" }, { description: "danni. Tira un d6." }];
		restoreDescriptions(items);
		expect(items[0].description).toBe("<p>Quando colpisci.</p>");
		expect(items[1].description).toBe("Tira un d6.");
	});

	test("does nothing for English books", () => {
		setItalianActive(false);
		const item = { description: "( HR + 5 ) fire damage." };
		restoreDescriptions(item);
		expect(item.description).toBe("( HR + 5 ) fire damage.");
		expect(localizeFolderName("Weapons")).toBe("Weapons");
	});

	test("localizes folders for Italian books", () => {
		setItalianActive(true);
		expect(localizeFolderName("Weapons")).toBe("Armi");
		expect(localizeFolderName("Fuori Lista")).toBe("Fuori Lista");
	});
});

describe("parseItalianSpellDamage", () => {
	test("reads both damage forms", () => {
		expect(parseItalianSpellDamage("Infligge (TM + 15) danni da aria.")).toEqual({ value: 15, type: "air" });
		expect(parseItalianSpellDamage("Infligge (TM + 5) danni fisici.")).toEqual({ value: 5, type: "physical" });
		expect(parseItalianSpellDamage("Recupera 40 Punti Vita.")).toBeNull();
	});
});
