import { writable } from "svelte/store";
import type { Writable } from "svelte/store";

export let colorBy: Writable<string> = writable("topic");
export let varTypeColorScale: Writable<Function> = writable(() => {});