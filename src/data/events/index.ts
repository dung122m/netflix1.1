import { VietnamEvent } from "./types";
import { JANUARY_EVENTS } from "./january";
import { FEBRUARY_EVENTS } from "./february";
import { MARCH_EVENTS } from "./march";
import { APRIL_EVENTS } from "./april";
import { MAY_EVENTS } from "./may";
import { JUNE_EVENTS } from "./june";
import { JULY_EVENTS } from "./july";
import { AUGUST_EVENTS } from "./august";
import { SEPTEMBER_EVENTS } from "./september";
import { OCTOBER_EVENTS } from "./october";
import { NOVEMBER_EVENTS } from "./november";
import { DECEMBER_EVENTS } from "./december";
import { LUNAR_EVENTS } from "./lunar";

export * from "./types";

export const VIETNAM_EVENTS: VietnamEvent[] = [
  ...JANUARY_EVENTS,
  ...FEBRUARY_EVENTS,
  ...MARCH_EVENTS,
  ...APRIL_EVENTS,
  ...MAY_EVENTS,
  ...JUNE_EVENTS,
  ...JULY_EVENTS,
  ...AUGUST_EVENTS,
  ...SEPTEMBER_EVENTS,
  ...OCTOBER_EVENTS,
  ...NOVEMBER_EVENTS,
  ...DECEMBER_EVENTS,
  ...LUNAR_EVENTS,
];
