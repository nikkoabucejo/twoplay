/** Which lesson step is shown. Left and right arrows step through it. */
export class Stepper {
	readonly count: number;
	index = $state(0);

	constructor(count: number) {
		this.count = count;
	}

	get isFirst(): boolean {
		return this.index === 0;
	}

	get isLast(): boolean {
		return this.index === this.count - 1;
	}

	go(index: number): void {
		this.index = Math.min(Math.max(index, 0), this.count - 1);
	}

	next(): void {
		this.go(this.index + 1);
	}

	back(): void {
		this.go(this.index - 1);
	}

	/** Returns whether the key moved, or would have moved, the stepper. */
	press(key: string): boolean {
		if (key === "ArrowRight") this.next();
		else if (key === "ArrowLeft") this.back();
		else return false;
		return true;
	}
}
