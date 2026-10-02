"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface StatInputProps {
	value: number;
	onChange: (value: number) => void;
	label?: string;
	min?: number;
}

export function StatInput({ value, onChange, label, min = 0 }: StatInputProps) {
	const handleIncrement = () => onChange(value + 1);
	const handleDecrement = () => {
		if (value > min) onChange(value - 1);
	};

	return (
		<div className="grid w-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-1.5 sm:grid-cols-[2.75rem_minmax(3.5rem,1fr)_2.75rem] sm:gap-2">
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-10 min-h-10 min-w-10 rounded-xl bg-background text-base shadow-sm active:scale-95 sm:size-11"
				onClick={handleDecrement}
				disabled={value <= min}
				aria-label={`${label ?? ""} -`}
			>
				<Minus className="size-4" />
			</Button>
			<Input
				type="number"
				value={value}
				onChange={(e) => {
					const newValue = Number.parseInt(e.target.value) || 0;
					if (newValue >= min) onChange(newValue);
				}}
				className="h-10 w-full min-w-0 rounded-xl border-primary/20 bg-background px-1 text-center text-lg font-bold tabular-nums shadow-inner [appearance:textfield] sm:h-11 sm:px-2 sm:text-xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				min={min}
				aria-label={label}
			/>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-10 min-h-10 min-w-10 rounded-xl border-primary/30 bg-primary/10 text-primary shadow-sm hover:bg-primary/20 active:scale-95 sm:size-11"
				onClick={handleIncrement}
				aria-label={`${label ?? ""} +`}
			>
				<Plus className="size-4" />
			</Button>
		</div>
	);
}
