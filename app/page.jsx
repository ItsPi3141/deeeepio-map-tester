"use client";

import React from "react";

export default class Home extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			gameStarted: false,
			name: "",
			mapId: "",
			mapError: false
		};
	}
	componentDidMount() {
		this.setState({
			name: localStorage.getItem("name") || "",
			mapId: localStorage.getItem("mapId") || ""
		});
	}
	async startGame() {
		window.playerName = this.state.name || "Unnamed";
		window.mapId = this.state.mapId;

		const map = await (await fetch("https://apibeta.deeeep.io/maps/s/" + this.state.mapId)).json();
		if (map.statusCode) {
			this.setState({ mapError: true });
			return;
		} else {
			window.mapData = map;
		}

		localStorage.setItem("name", this.state.name);
		localStorage.setItem("mapId", this.state.mapId);

		document.querySelector("div.menu-screen").classList.add("slide-up-out");
		document.querySelector("div.menu-screen").addEventListener(
			"animationend",
			() => {
				document.querySelector("div.menu-screen").style.display = "none";
				document.querySelector("div.menu-screen").classList.remove("slide-up-out");
			},
			{ once: true }
		);

		require("../src/game.js");
	}
	render() {
		return (
			<main className="w-screen h-[100dvh] bg-gray-800 text-white grid grid-cols-1 grid-rows-1">
				<div className="game w-full h-full col-[1/1] row-[1/1]"></div>

				<div className="menu-screen w-full h-full col-[1/1] row-[1/1] grid grid-cols-1 grid-rows-1">
					<div
						className="w-full h-full col-[1/1] row-[1/1] bg-cover bg-bottom"
						style={{
							backgroundImage: this.state.gameStarted ? "" : "url('/assets/dpbg3.png')",
							filter: this.state.gameStarted ? "" : "brightness(0.6)",
							backgroundColor: "rgba(0,0,0,0.5)"
						}}
					></div>
					<div className="w-full h-full col-[1/1] row-[1/1] flex items-center justify-center z-20">
						<div className="flex flex-col gap-3 justify-center items-stretch w-72 select-none">
							<div className="relative">
								<img
									className="w-full -mb-7"
									src="/assets/logov1.png"
									draggable="false"
								/>
								<p className="text-sm bg-red-500 absolute -top-3 -right-6 rotate-[8deg] px-2 rounded-full shadow-md shadow-[#0003]">Map tester</p>
							</div>
							<input
								className="bg-gray-800 z-10 outline-none py-1.5 px-3 rounded [line-height:1] border border-gray-700 focus:border-blue-500"
								placeholder="Enter a name"
								type="text"
								value={this.state.name}
								onChange={(e) => {
									this.setState({ name: e.target.value });
								}}
							/>
							<div className="flex gap-2">
								<input
									className="bg-gray-800 z-10 outline-none py-1.5 px-3 rounded [line-height:1] border border-gray-700 focus:border-blue-500"
									placeholder="Enter map string ID"
									type="text"
									value={this.state.mapId}
									onChange={(e) => {
										this.setState({ mapId: e.target.value });
										this.setState({ mapError: false });
									}}
									style={{
										borderColor: this.state.mapError ? "#ef4444" : ""
									}}
								/>
								<button
									className="w-24 bg-emerald-500 border-emerald-600 hover:bg-emerald-600 hover:border-emerald-700"
									onClick={() => {
										this.startGame();
									}}
								>
									Play
								</button>
							</div>
						</div>
					</div>
				</div>
			</main>
		);
	}
}
