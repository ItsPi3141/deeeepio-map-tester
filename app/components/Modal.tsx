"use client";

import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { mdiClose } from "@mdi/js";
import Icon from "@mdi/react";

interface Props {
	children: React.ReactNode;
	title?: string;
	className?: string;
	height?: string;
	width?: string;
	onClose?: () => void;
	visible?: boolean;
}

export default function Modal({ children, title, className, height, width, onClose, visible }: Props) {
	return createPortal(
		<AnimatePresence>
			{visible && (
				<motion.div
					className="z-1000 fixed bottom-0 left-0 right-0 top-0 flex items-center justify-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
				>
					<div className="fixed bottom-0 left-0 right-0 top-0 bg-black/50" />
					<div
						className="relative m-3.5 max-h-[calc(100vh-1.75rem)] min-h-[6rem] min-w-[20rem] max-w-[calc(100vw-1.75rem)] overflow-hidden rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 pb-3 shadow-2xl"
						style={{ height: height || "auto", width: width || "auto" }}
					>
						<div className="flex h-full flex-col items-center justify-start">
							<button className="absolute right-2 top-[0.3rem]" onClick={onClose}>
								<Icon path={mdiClose} size="1.125em" color="gray" />
							</button>
							<p className="mb-2 text-xl font-light text-gray-200">{title || "Modal"}</p>
							<div
								className={`w-full grow ${className || ""}`}
								style={{
									height: "calc(100% - 7rem)",
								}}
							>
								{children}
							</div>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
