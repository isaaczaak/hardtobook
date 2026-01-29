export interface Restaurant {
  id: string;
  name: string;
  neighborhood: string;
  cuisine: string;
  platform: "Resy" | "Tock" | "OpenTable" | "SevenRooms" | "Phone" | "Invitation Only";
  platformUrl: string | null;
  website: string | null;
  instagram: string | null;
  bookingWindow: string;
  releaseTime: string;
  releaseSchedule: "daily" | "monthly" | "weekly" | "none";
  releaseDay?: string;
  walkIns: boolean;
  walkInTips?: string;
  phoneNumber: string | null;
  tips: string[];
  signatureDish: string;
}
