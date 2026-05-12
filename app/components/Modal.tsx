"use client";

import { mdiClose } from "@mdi/js";
import Icon from "@mdi/react";
import { AnimatePresence, motion } from "motion/react";
import React from "react";
import { createPortal } from "react-dom";

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
					className="fixed top-0 right-0 bottom-0 left-0 z-1000 flex items-center justify-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
				>
					<div className="fixed top-0 right-0 bottom-0 left-0 bg-black/50" />
					<div
						className="relative m-3.5 max-h-[calc(100vh-1.75rem)] min-h-[6rem] max-w-[calc(100vw-1.75rem)] min-w-[20rem] overflow-hidden rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 pb-3 shadow-2xl"
						style={{ height: height || "auto", width: width || "auto" }}
					>
						<div className="flex h-full flex-col items-center justify-start">
							<button className="absolute top-[0.3rem] right-2" onClick={onClose}>
								<Icon path={mdiClose} size="1.125em" color="gray" />
							</button>
							<p className="mb-2 text-xl font-light text-gray-200">{title || "Modal"}</p>
							<div className={`w-full grow ${className || ""}`} style={{ height: "calc(100% - 7rem)" }}>
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
