"use client";

import { VolumeOsdState } from "./hooks/useMediaVolume";

export interface VolumeOsdPillProps {
  volumeOsd?: VolumeOsdState | null;
}

/**
 * VolumeOsdPill has been permanently disabled across the project
 * to keep video playback completely unobstructed and adhere to clean Netflix/Apple TV+ UI.
 */
export function VolumeOsdPill(_props: VolumeOsdPillProps) {
  return null;
}

export default VolumeOsdPill;
