"use client";

import dynamic from "next/dynamic";
import React, { Suspense, useState } from "react";
import { DISCORD, GITHUB } from "./const";
import Icon from "@mdi/react";
import { mdiGithub } from "@mdi/js";
import { siDiscord } from "simple-icons";

const Modal = dynamic(() => import("@/components/Modal"), { ssr: false });

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
			const map: Record<string, string | number | object> = await (
				await fetch(`https://apibeta.deeeep.io/maps/s/${this.state.mapId}`)
			).json();
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
			{ once: true },
		);

		require("../src/game.ts");
	}
	render() {
		return (
			<>
				<main className="h-dvh grid w-screen grid-cols-1 grid-rows-1 bg-gray-800 text-white">
					<div className="game col-[1/1] row-[1/1] h-full w-full" />

					<div className="menu-screen col-[1/1] row-[1/1] grid h-full w-full grid-cols-1 grid-rows-1">
						<div
							className="col-[1/1] row-[1/1] h-full w-full bg-cover bg-bottom"
							style={{
								backgroundImage: this.state.gameStarted ? "" : "url('/assets/dpbg3.png')",
								filter: this.state.gameStarted ? "" : "brightness(0.6)",
								backgroundColor: "rgba(0,0,0,0.5)",
							}}
						/>
						<div className="relative z-20 col-[1/1] row-[1/1] flex h-full w-full items-center justify-center">
							<SocialLinks />
							<div className="flex w-72 select-none flex-col items-stretch justify-center gap-3">
								<div className="relative">
									<img className="-mb-7 w-full" src="/assets/logov1.png" draggable="false" />
									<p className="absolute -right-6 -top-3 rotate-[8deg] rounded-full bg-red-500 px-2 text-sm shadow-md shadow-[#0003]">
										Map tester
									</p>
								</div>
								<input
									className="z-10 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 leading-none outline-none focus:border-blue-500"
									placeholder="Enter a name"
									type="text"
									value={this.state.name}
									onChange={(e) => {
										this.setState({ name: e.target.value });
									}}
								/>
								<div className="flex gap-2">
									<input
										className="z-10 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 leading-none outline-none focus:border-blue-500"
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
										className="btn w-24 border-emerald-600 bg-emerald-500 hover:border-emerald-700 hover:bg-emerald-600"
										type="button"
										onClick={() => {
											this.startGame();
										}}
									>
										Play
									</button>
								</div>
								<button
									className="btn w-72 border-blue-600 bg-blue-500 hover:border-blue-700 hover:bg-blue-600"
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
				<WelcomeModal />
			</>
		);
	}
}

const WelcomeModal = () => {
	const [visible, setVisible] = useState(true);
	return (
		<Suspense fallback={null}>
			<Modal
				title="Welcome to Map Tester!"
				visible={visible}
				onClose={() => {
					setVisible(false);
				}}
				className="flex flex-col items-center gap-4"
			>
				<div className="flex max-w-sm flex-col gap-3 text-sm">
					<p>
						This website is a work-in-progress. Any help with the project would be greatly appreciated! Even if you
						don't know how to code, you can still help!
					</p>
					<p>
						If you are interested in contributing, join the Discord server:{" "}
						<a href={`https://discord.gg/${DISCORD}`} className="link" target="_blank" rel="noreferrer">
							discord.gg/{DISCORD}
						</a>
					</p>
					<p>
						This project is also open-source! You can find it on GitHub:{" "}
						<a href={`https://github.com/${GITHUB}`} className="link" target="_blank" rel="noreferrer">
							github.com/{GITHUB}
						</a>
					</p>
				</div>
				<button
					className="btn border-blue-600 bg-blue-500 hover:border-blue-700 hover:bg-blue-600"
					onClick={() => setVisible(false)}
				>
					Close
				</button>
			</Modal>
		</Suspense>
	);
};

const SocialLinks = () => {
	return (
		<div className="absolute right-0 top-0 flex gap-2 rounded-bl-xl bg-black/50 px-3 py-2">
			<a
				href="https://github.com/deeeepio-map-tester/deeeepio-map-tester"
				target="_blank"
				className="flex h-10 w-10 items-center justify-center rounded-lg border-b-4 border-neutral-800 bg-neutral-700 transition-colors hover:border-neutral-900 hover:bg-neutral-800"
				rel="noreferrer"
			>
				<Icon path={mdiGithub} size="1.5em" color="white" />
			</a>
			<a
				href="https://discord.gg/3ydkfFw89r"
				target="_blank"
				className="flex h-10 w-10 items-center justify-center rounded-lg border-b-4 border-sky-600 bg-sky-500 transition-colors hover:border-sky-700 hover:bg-sky-600"
				rel="noreferrer"
			>
				<Icon path={siDiscord.path} size="1.25em" color="white" />
			</a>
		</div>
	);
};
