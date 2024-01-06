import animalConsts from "./consts/animals.json";
const baseScale = {
	x: 48,
	y: 68
};

export function calculateAssetSize(animalId) {
	const animal = animalConsts.find((a) => a.fishLevel == animalId);
	const sx = baseScale.x * animal.sizeScale.x * animal.sizeMultiplier;
	const sy = baseScale.y * animal.sizeScale.y * animal.sizeMultiplier;
	return {
		planck: {
			width: sx / 20,
			height: sy / 20
		},
		pixi: {
			scale: sy / 3.8 / 680
		}
	};
}
