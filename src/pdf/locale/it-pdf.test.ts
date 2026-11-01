import { afterAll, describe, expect, test } from "@jest/globals";
import fs from "fs";
import path from "path";
import { tokenizePDF } from "../lexers/pdf";
import { detectItalianBook, ItalianBook, normalizeItalianTokens, setItalianActive } from "./it";
import { importItems } from "../../apps/pdf-importers/import-items";
import {
	importCoreBasicEquipment,
	importCoreBestiary,
	importHighFantasyBestiary,
	importTechnoFantasyBestiary,
} from "../../apps/pdf-importers/import-core-rulebook";

// Runs against your own PDFs, which never belong in the repository:
// FU_IT_PDF_DIR=<folder with FUCR.pdf, FUHF.pdf, FUTF.pdf> npm run test
const pdfDir = process.env.FU_IT_PDF_DIR;
const describeWithPdfs = pdfDir ? describe : describe.skip;

const STANDARD_FONT_DATA_URL = "node_modules/pdfjs-dist/standard_fonts/";

const importersFor = {
	FUCR: (withPage: Parameters<typeof importItems>[0]) => [
		importItems(withPage, "FUCR"),
		importCoreBasicEquipment(withPage),
		importCoreBestiary(withPage),
	],
	FUHF: (withPage: Parameters<typeof importItems>[0]) => [importItems(withPage, "FUHF"), importHighFantasyBestiary(withPage)],
	FUTF: (withPage: Parameters<typeof importItems>[0]) => [importItems(withPage, "FUTF"), importTechnoFantasyBestiary(withPage)],
};

describeWithPdfs("Italian PDFs", () => {
	const destroyers: (() => Promise<void>)[] = [];
	afterAll(async () => {
		await Promise.all(destroyers.map((d) => d()));
	});

	for (const book of Object.keys(importersFor) as ItalianBook[]) {
		test(
			`${book}: every expected page parses`,
			async () => {
				let detected: ItalianBook | null = null;
				const [withPage, destroy] = await tokenizePDF(
					{
						data: new Uint8Array(fs.readFileSync(path.join(pdfDir!, `${book}.pdf`))),
						standardFontDataUrl: STANDARD_FONT_DATA_URL,
					},
					(tokens) => (detected ? normalizeItalianTokens(tokens, detected) : tokens),
				);
				destroyers.push(destroy);
				detected = await detectItalianBook(withPage, book);
				expect(detected).toBe(book);
				setItalianActive(true);
				const results = (await Promise.all(importersFor[book](withPage))).flat();
				const failures = results.filter((r) => r.type !== "success").map((r) => r.page);
				const details = results
					.filter((r) => r.type !== "success")
					.map((r) => {
						const errors = r.type === "success" ? [] : r.errors;
						const furthest = [...errors].sort((a, b) => b.distance - a.distance)[0];
						return `${r.page}[${r.type}]: ${furthest ? `${furthest.error} @${furthest.distance} -> ${furthest.found}` : "?"}`;
					});
				console.log(`${book}: ${results.length} risultati, pagine fallite: ${failures.join(",") || "nessuna"}\n${details.join("\n")}`);
				const beasts = results.flatMap((r) => (r.type === "success" && "results" in r ? (r.results as { name: string; image?: { width: number }; level?: number }[]) : []));
				const actors = beasts.filter((b) => b.level !== undefined);
				const noArt = actors.filter((b) => !b.image?.width).map((b) => b.name);
				console.log(`${book}: mostri ${actors.length}, senza illustrazione: ${noArt.join(", ") || "nessuno"}`);
				expect(failures).toEqual([]);
			},
			600000,
		);
	}
});
