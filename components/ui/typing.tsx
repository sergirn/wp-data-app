"use client";

import { useEffect, useState } from "react";

interface SequentialTypewriterProps {
	lines: string[];
	className?: string;
	speed?: number;
	delayBetween?: number;
}

export function SequentialTypewriter({
	lines,
	speed = 28,
	delayBetween = 250,
	className,
}: {
	lines: string[];
	speed?: number;
	delayBetween?: number;
	className?: string;
}) {
	const [position, setPosition] = useState({
		line: 0,
		char: 0,
		done: false,
	});

	useEffect(() => {
		setPosition({ line: 0, char: 0, done: false });

		let timeout: number;

		function tick(line: number, char: number) {
			const currentLine = lines[line];

			if (!currentLine) {
				setPosition({ line: lines.length - 1, char: lines[lines.length - 1]?.length ?? 0, done: true });
				return;
			}

			if (char < currentLine.length) {
				timeout = window.setTimeout(() => {
					setPosition({ line, char: char + 1, done: false });
					tick(line, char + 1);
				}, speed);

				return;
			}

			if (line < lines.length - 1) {
				timeout = window.setTimeout(() => {
					setPosition({ line: line + 1, char: 0, done: false });
					tick(line + 1, 0);
				}, delayBetween);

				return;
			}

			setPosition({ line, char, done: true });
		}

		tick(0, 0);

		return () => window.clearTimeout(timeout);
	}, [lines.join("|"), speed, delayBetween]);

	return (
		<div className={className}>
			{lines.map((line, index) => {
				const isPast = index < position.line;
				const isCurrent = index === position.line;
				const text = isPast
					? line
					: isCurrent
						? line.slice(0, position.char)
						: "";

				return (
					<div key={`${index}-${line}`} className={index > position.line ? "invisible" : ""}>
						{text}
						{isCurrent && !position.done ? (
							<span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-primary" />
						) : null}
					</div>
				);
			})}
		</div>
	);
}