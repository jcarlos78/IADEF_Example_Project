import { RoomStore } from "./store";

const KEY = Symbol.for("planning-poker:room-store");
type GlobalWithStore = typeof globalThis & { [KEY]?: RoomStore };
const g = globalThis as GlobalWithStore;

g[KEY] ??= new RoomStore();

export const store: RoomStore = g[KEY];
