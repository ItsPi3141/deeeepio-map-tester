import hideSpaces from "./consts/hidespaces.json";
import props from "./consts/props.json";
import animals from "./consts/animals.json";
import simplepolygon from "simplepolygon";

/**
 * Load the map from a JSON object.
 *
 * @param {object} json - The JSON object containing the map data.
 *
 * @typedef {object} root
 * @property {screenObjects[]} screenObjects
 * @property {settings} settings
 * @property {worldSize} worldSize
 *
 * @typedef {object} screenObjects
 * @property {mapObject[]} currents
 * @property {mapObject[]} ceilings
 * @property {mapObject[]} terrains
 * @property {mapObject[]} islands
 * @property {mapObject[]} props
 * @property {mapObject[]} platforms
 * @property {mapObject[]} hide-spaces
 * @property {mapObject[]} air-pockets
 * @property {mapObject[]} background-terrains
 * @property {mapObject[]} water
 * @property {mapObject[]} sky
 *
 * @typedef {object} mapObject
 * @property {number} id
 * @property {string} type
 * @property {string} layerId
 * @property {points[]} points
 * @property {object} settings
 * @property {number[]} colors
 *
 * @typedef {object} points
 * @property {number} x
 * @property {number} y
 *
 * @typedef {object} settings
 * @property {number} gravity
 *
 * @typedef {object} worldSize
 * @property {string} width
 * @property {string} height
 *
 * @returns {{screenObjects: screenObjects, settings: settings, worldSize: worldSize}} The parsed map data.
 */
export function loadMap(json) {
	if (!json.data) return false;
	const data = JSON.parse(json.data);
	data.screenObjects = data.screenObjects.filter((l) => !["animals", "food-spawns", "npc-spawns", "triggers", "currents"].includes(l.layerId));
	var tempObj = {};
	data.screenObjects.forEach((l) => {
		if (!tempObj[l.layerId]) tempObj[l.layerId] = [];
		tempObj[l.layerId].push(l);
	});
	data.screenObjects = tempObj;
	["sky", "water", "air-pockets", "background-terrains", "platforms", "islands", "terrains", "ceilings"].forEach((l) => {
		var newShapesList = [];
		if (!data.screenObjects[l]) return;
		data.screenObjects[l]?.forEach((shape) => {
			const poly = {
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [shape.points.map((p) => [p.x, p.y])]
				}
			};
			const splitPoly = simplepolygon(poly);
			splitPoly.features.forEach((feature) => {
				newShapesList.push({
					...shape,
					points: feature.geometry.coordinates[0].map((p) => ({ x: p[0], y: p[1] }))
				});
			});
		});
		data.screenObjects[l] = newShapesList;
	});
	return data;
}

export function getHidespaceById(id) {
	return hideSpaces.find((h) => h.id == id);
}
export function getPropById(id) {
	return props.find((p) => p.id == id);
}

export function makeBrighter(t, i) {
	const hexString = ("00000" + (0 | t).toString(16)).slice(-6);
	const r = parseInt(hexString.slice(0, 2), 16);
	const o = parseInt(hexString.slice(2, 4), 16);
	const l = parseInt(hexString.slice(4, 6), 16);
	let c = i;

	if (r * i > 280) {
		const a = 280 / r;
		if (a < c) {
			c = a;
		}
	}

	if (o * i > 280) {
		const a = 280 / o;
		if (a < c) {
			c = a;
		}
	}

	if (l * i > 280) {
		const a = 280 / l;
		if (a < c) {
			c = a;
		}
	}

	const newR = r * c;
	const newO = o * c;
	const newL = l * c;
	const [red, green, blue] = redistributeRgb(newR, newO, newL);

	const newHexString = "#" + ("0" + Math.floor(red).toString(16)).slice(-2) + ("0" + Math.floor(green).toString(16)).slice(-2) + ("0" + Math.floor(blue).toString(16)).slice(-2);

	return stringColorToHex(newHexString);
}
function redistributeRgb(red, green, blue) {
	const maxColorValue = 255.999;
	const maxColor = Math.max(red, green, blue);

	if (maxColor <= maxColorValue) {
		return [red, green, blue];
	}

	const sum = red + green + blue;

	if (sum >= 3 * maxColorValue) {
		return [maxColorValue, maxColorValue, maxColorValue];
	}

	const ratio = (3 * maxColorValue - sum) / (3 * maxColor - sum);
	const offset = maxColorValue - ratio * maxColor;

	return [offset + ratio * red, offset + ratio * green, offset + ratio * blue];
}
function stringColorToHex(color) {
	return typeof color === "string" ? parseInt(color.slice(1), 16) : color;
}

export function isClockwise(points) {
	let total = 0;
	for (let i = 0; i < points.length; i++) {
		// Get the current and next point
		let currentPoint = points[i];
		let nextPoint = points[(i + 1) % points.length];

		// Calculate the cross product of the points
		total += (nextPoint.x - currentPoint.x) * (nextPoint.y + currentPoint.y);
	}
	return total < 0;
}

export function getBiomes(n) {
	const habitats = [
		"reef", // 64
		"salt", // 32
		"fresh", // 16
		"deep", // 8
		"shallow", // 4
		"warm", // 2
		"cold" // 1
	];
	return n
		.toString(2)
		.substr(-7)
		.padStart(7, "0")
		.split("")
		.map((e, i) => (e = parseInt(e) == 0 ? null : habitats[i]))
		.reduce((p, c) => (c == null ? p : p.concat(c)), []);
}

export function getAnimalById(id) {
	return animals.find((a) => a.fishLevel == id);
}

// Doesn't account for octopus ink
// Octopus ink has shadowSize of 350
export function getShadowSize(animalId) {
	const animal = getAnimalById(animalId);
	const habitats = getBiomes(animal.habitat);

	var livesInDeep = habitats.includes("deep");
	var livesInShallow = habitats.includes("shallow");
	var livesInFresh = habitats.includes("fresh");
	var livesInWarmSalt = habitats.includes("warm") && habitats.includes("salt");

	if (["blindcavefish", "olm"].includes(animal.name)) {
		return 450;
	} else if (animal.name == "ghost") {
		return 1750;
	} else if (livesInDeep) {
		if (!livesInShallow) {
			return 1750;
		} else if (livesInFresh && !livesInWarmSalt) {
			return 1750;
		} else {
			return 1200;
		}
	} else {
		return 1200;
	}
}
