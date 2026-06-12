export type Platform =
  | "Resy"
  | "Tock"
  | "OpenTable"
  | "SevenRooms"
  | "Phone"
  | "Invitation Only"
  | "Walk-in Only";

export interface WalkInInfo {
  doors?: string; // "5:00 PM"
  lineBy?: string; // "4:15 PM"
  advice: string;
}

export interface Restaurant {
  id: string;
  name: string;
  neighborhood: string;
  cuisine: string;
  difficulty: number; // 1-5
  priceRange: string; // "$$".."$$$$"
  platform: Platform;
  platformUrl: string | null;
  website: string | null;
  instagram: string | null;
  bookingWindow: string; // human label "30 days"
  bookingWindowDays: number | null;
  releaseTime: string; // "10:00 AM ET" or "None"
  releaseSchedule: "daily" | "weekly" | "monthly" | "none";
  releaseDay?: string;
  walkIns: boolean;
  walkIn?: WalkInInfo;
  phoneNumber: string | null;
  tips: string[];
  signatureDish: string;
  lastVerified: string;
}
