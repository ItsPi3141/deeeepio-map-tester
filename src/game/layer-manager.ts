import * as PIXI from "pixi.js";
import { gameState, type LayerRefs } from "./game-state";

// Layer order from top to bottom:
// *food
// *shadow
// ceilings
// terrains
// *top water border
// islands
// hide-spaces (above animals)
// animals
// currents
// props
// hide-spaces (below animals)
// hide-spaces (lowest, <=60% opacity)
// platforms
// *bottom water border
// air-pockets
// background-terrains
// water
// sky
// When adding layers in PIXI, lowest layer is added first

export function createLayers(app: PIXI.Application): LayerRefs {
	const skyLayer = new PIXI.Container();
	app.stage.addChild(skyLayer);

	const waterLayer = new PIXI.Container();
	app.stage.addChild(waterLayer);

	const backgroundTerrainsLayer = new PIXI.Container();
	app.stage.addChild(backgroundTerrainsLayer);

	const airPocketsLayer = new PIXI.Container();
	app.stage.addChild(airPocketsLayer);

	const waterBorderLowLayer = new PIXI.Container();
	app.stage.addChild(waterBorderLowLayer);

	const hideSpacesLowerLayer = new PIXI.Container();
	app.stage.addChild(hideSpacesLowerLayer);

	const hideSpacesLowLayer = new PIXI.Container();
	app.stage.addChild(hideSpacesLowLayer);

	const propsLayer = new PIXI.Container();
	app.stage.addChild(propsLayer);

	const platformsLayer = new PIXI.Container();
	app.stage.addChild(platformsLayer);

	const currentsLayer = new PIXI.Container();
	app.stage.addChild(currentsLayer);

	const animalsLayer = new PIXI.Container();
	app.stage.addChild(animalsLayer);

	const animalsUiLayer = new PIXI.Container();
	app.stage.addChild(animalsUiLayer);

	const hideSpacesHighLayer = new PIXI.Container();
	app.stage.addChild(hideSpacesHighLayer);

	const islandsLayer = new PIXI.Container();
	app.stage.addChild(islandsLayer);

	const waterBorderHighLayer = new PIXI.Container();
	app.stage.addChild(waterBorderHighLayer);

	const terrainsLayer = new PIXI.Container();
	app.stage.addChild(terrainsLayer);

	const ceilingsLayer = new PIXI.Container();
	app.stage.addChild(ceilingsLayer);

	const shadowLayer = new PIXI.Container();
	app.stage.addChild(shadowLayer);

	const foodLayer = new PIXI.Container();
	app.stage.addChild(foodLayer);

	const layers: LayerRefs = {
		skyLayer,
		waterLayer,
		backgroundTerrainsLayer,
		airPocketsLayer,
		waterBorderLowLayer,
		hideSpacesLowerLayer,
		hideSpacesLowLayer,
		propsLayer,
		platformsLayer,
		currentsLayer,
		animalsLayer,
		animalsUiLayer,
		hideSpacesHighLayer,
		islandsLayer,
		waterBorderHighLayer,
		terrainsLayer,
		ceilingsLayer,
		shadowLayer,
		foodLayer,
	};

	gameState.layers = layers;
	return layers;
}
