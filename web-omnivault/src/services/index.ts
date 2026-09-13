import { liveServices } from "@/services/live/liveServices";
import { mockServices } from "@/services/mock/mockServices";
import type { ProtocolServices } from "@/services/types";
import type { DataMode } from "@/types/protocol";

/**
 * Single switch point between the real protocol and the isolated demo dataset.
 * UI and hooks only ever talk to this abstraction.
 */
export const getServices = (mode: DataMode): ProtocolServices =>
  mode === "demo" ? mockServices : liveServices;

export type { ProtocolServices } from "@/services/types";
