import { ItemWithImageToken } from "../lexers/token";
import { convertCosts, isMartial, parseDescription } from "../parsers-commons";
import { Weapon } from "../model/weapon";
import { DAMAGE_TYPES, DamageType, Distance, DISTANCES, Handed, HANDED, Stat, WeaponCategory } from "../model/common";

export function parseWeapon(weaponToken: ItemWithImageToken, optionalWeaponCategory: string): Weapon {
	// This value will change depending on optional martial and accuracy bonus strings
	let indexShift = 0;

	const weaponStringTokens = weaponToken.strings.map((token) => token.string);
	const name = weaponStringTokens[0];

	const martial = isMartial(weaponToken.strings[1]);

	// Martial string is optional
	if (martial) {
		indexShift++;
	}

	const cost = convertCosts(weaponStringTokens[1 + indexShift]);

	// We skip index 2(+) and 4(+), these are "【" and "】"
	const [primaryAccuracyStat, secondaryAccuracyStat] = weaponStringTokens[3 + indexShift].split("+");

	// Bonus string is optional
	const maybeBonus = Number(weaponStringTokens[5 + indexShift]);
	if (!isNaN(maybeBonus)) {
		indexShift++;
	}
	const bonus = isNaN(maybeBonus) ? 0 : maybeBonus;
	const accuracy = {
		primary: primaryAccuracyStat.trim() as Stat,
		secondary: secondaryAccuracyStat.trim() as Stat,
		bonus: bonus,
	};

	// We skip index 5(+) and 7(+), these are "【" and "】"
	const damage = Number(weaponStringTokens[6 + indexShift].slice(5)); // Removing "HR + " part

	// Sometimes light type damage is separated to l + ight
	const damageType = (
		weaponStringTokens[8 + indexShift] === "l"
			? weaponStringTokens[8 + indexShift] + weaponStringTokens[8 + ++indexShift]
			: weaponStringTokens[8 + indexShift]
	) as DamageType;

	if (optionalWeaponCategory === "") {
		indexShift++;
	}
	const category =
		optionalWeaponCategory === ""
			? (weaponStringTokens[8 + indexShift].toLowerCase() as WeaponCategory)
			: (optionalWeaponCategory.toLowerCase() as WeaponCategory);

	if (optionalWeaponCategory === "") {
		// We skip one index - this is section separator
		indexShift++;
	}

	const hands = weaponStringTokens[9 + indexShift].toLowerCase() as Handed;

	// We skip index 11(+) this is section separator
	const distance = weaponStringTokens[11 + indexShift].toLowerCase() as Distance;

	// We skip index 13(+) this is section separator
	const description = parseDescription(
		weaponToken.strings.slice(13 + indexShift).filter((token) => token.string !== "No Quality."),
	);

	// A row read out of place would otherwise reach Foundry and fail its validation there.
	if (!HANDED.includes(hands) || !DISTANCES.includes(distance) || !DAMAGE_TYPES.includes(damageType)) {
		throw new Error(`Unexpected weapon row: ${name} (${damageType}, ${hands}, ${distance})`);
	}

	return {
		image: weaponToken.image.image,
		name: name,
		martial: martial,
		cost: cost,
		accuracy: accuracy,
		damage: damage,
		damageType: damageType,
		hands: hands,
		melee: distance,
		category: category,
		description: description,
	};
}
