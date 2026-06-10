import type { RoomState } from "./room";

export class RoomStore {
  private rooms = new Map<string, RoomState>();

  create(state: RoomState): RoomState {
    if (this.rooms.has(state.roomId)) {
      throw new Error(`Room "${state.roomId}" already exists.`);
    }
    this.rooms.set(state.roomId, state);
    return state;
  }

  get(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  update(state: RoomState): RoomState {
    if (!this.rooms.has(state.roomId)) {
      throw new Error(`Room "${state.roomId}" does not exist.`);
    }
    this.rooms.set(state.roomId, state);
    return state;
  }

  delete(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  has(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  size(): number {
    return this.rooms.size;
  }

  ids(): string[] {
    return Array.from(this.rooms.keys());
  }

  cleanupStale(opts: { ttlMs: number; now: number }): string[] {
    const removed: string[] = [];
    for (const [roomId, state] of this.rooms) {
      if (opts.now - state.lastActivityAt > opts.ttlMs) {
        this.rooms.delete(roomId);
        removed.push(roomId);
      }
    }
    return removed;
  }
}

export const ROOM_TTL_MS = 10 * 60 * 1000;
