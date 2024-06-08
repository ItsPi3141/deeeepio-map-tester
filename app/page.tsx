"use client";

import React from "react";

declare global {
	interface Window {
		playerName: string;
		mapId: string;
		mapData: Record<string, string | number | object>;
	}
}

export default class Home extends React.Component {
	state: Readonly<{
		gameStarted: boolean;
		name: string;
		mapId: string;
		mapError: boolean;
	}> = {
		gameStarted: false,
		name: "",
		mapId: "",
		mapError: false,
	};

	componentDidMount() {
		this.setState({
			name: localStorage.getItem("name") || "",
			mapId: localStorage.getItem("mapId") || "",
		});
	}
	async startGame(builtInMap = "") {
		window.playerName = this.state.name || "Unnamed";
		window.mapId = this.state.mapId;

		if (!builtInMap) {
			const map: Record<string, string | number | object> = await (await fetch(`https://apibeta.deeeep.io/maps/s/${this.state.mapId}`)).json();
			if (map.statusCode) {
				this.setState({ mapError: true });
				return;
			}
			window.mapData = map;
		} else {
			switch (builtInMap) {
				case "star_rain_ffa":
					window.mapData = require("../src/star_rain_ffa.json");
					break;
			}
		}

		localStorage.setItem("name", this.state.name);
		localStorage.setItem("mapId", this.state.mapId);

		(document.querySelector("div.menu-screen") as HTMLDivElement).classList.add("slide-up-out");
		(document.querySelector("div.menu-screen") as HTMLDivElement).addEventListener(
			"animationend",
			() => {
				(document.querySelector("div.menu-screen") as HTMLDivElement).style.display = "none";
				(document.querySelector("div.menu-screen") as HTMLDivElement).classList.remove("slide-up-out");
			},
			{ once: true }
		);

		require("../src/game.ts");
	}
	render() {
		return (
			<main className="grid grid-cols-1 grid-rows-1 bg-gray-800 w-screen h-[100dvh] text-white">
				<div className="row-[1/1] w-full h-full col-[1/1] game" />

				<div className="grid grid-cols-1 grid-rows-1 row-[1/1] w-full h-full col-[1/1] menu-screen">
					<div
						className="bg-cover bg-bottom row-[1/1] w-full h-full col-[1/1]"
						style={{
							backgroundImage: this.state.gameStarted ? "" : "url('/assets/dpbg3.png')",
							filter: this.state.gameStarted ? "" : "brightness(0.6)",
							backgroundColor: "rgba(0,0,0,0.5)",
						}}
					/>
					<div className="z-20 flex justify-center items-center row-[1/1] w-full h-full col-[1/1]">
						<div className="flex flex-col justify-center items-stretch gap-3 w-72 select-none">
							<div className="relative">
								<img className="-mb-7 w-full" src="/assets/logov1.png" draggable="false" />
								<p className="-top-3 -right-6 absolute bg-red-500 shadow-[#0003] shadow-md px-2 rounded-full text-sm rotate-[8deg]">
									Map tester
								</p>
							</div>
							<input
								className="z-10 border-gray-700 bg-gray-800 px-3 py-1.5 border focus:border-blue-500 rounded outline-none [line-height:1]"
								placeholder="Enter a name"
								type="text"
								value={this.state.name}
								onChange={(e) => {
									this.setState({ name: e.target.value });
								}}
							/>
							<div className="flex gap-2">
								<input
									className="z-10 border-gray-700 bg-gray-800 px-3 py-1.5 border focus:border-blue-500 rounded outline-none [line-height:1]"
									placeholder="Enter map string ID"
									type="text"
									value={this.state.mapId}
									onChange={(e) => {
										this.setState({
											mapId: e.target.value,
										});
										this.setState({ mapError: false });
									}}
									style={{
										borderColor: this.state.mapError ? "#ef4444" : "",
									}}
								/>
								<button
									className="border-emerald-600 hover:border-emerald-700 bg-emerald-500 hover:bg-emerald-600 w-24"
									type="button"
									onClick={() => {
										this.startGame();
									}}
								>
									Play
								</button>
							</div>
							<button
								className="bg-blue-500 hover:bg-blue-600 border-blue-600 hover:border-blue-700 w-72"
								type="button"
								onClick={() => {
									this.startGame("star_rain_ffa");
								}}
							>
								Try star_rain_ffa
							</button>
						</div>
					</div>
				</div>
			</main>
		);
	}
}
