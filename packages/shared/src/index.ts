import { z } from 'zod';

export const cityIds = [
  'shandong', 'jinan', 'qingdao', 'zibo', 'zaozhuang', 'dongying', 'yantai',
  'weifang', 'jining', 'taian', 'weihai', 'rizhao', 'linyi', 'dezhou',
  'liaocheng', 'binzhou', 'heze'
] as const;
export type CityId = (typeof cityIds)[number];

export type SpotCategory = 'sight' | 'food' | 'transport' | 'experience';

export interface MapPoint { x: number; y: number }

export interface Spot {
  id: string;
  cityId: Exclude<CityId, 'shandong'>;
  day: number;
  order: number;
  name: string;
  shortName: string;
  category: SpotCategory;
  position: MapPoint;
  recommendedTime: string;
  duration: string;
  price: string;
  transport: string;
  description: string;
  highlights: string[];
  foods: string[];
  savingTips: string[];
  safetyNotices: string[];
}

export interface RouteSegment {
  id: string;
  cityId: CityId;
  from: string;
  to: string;
  path: string;
}

export interface City {
  id: CityId;
  name: string;
  dates: string;
  subtitle: string;
  accent: string;
  days: number[];
  spots: Spot[];
  routes: RouteSegment[];
}

export interface TripPayload {
  title: string;
  dateRange: string;
  budget: string;
  cities: City[];
}

export interface UserProgress {
  activeCityId: CityId;
  characterSpotId: string | null;
  visitedSpotIds: string[];
  updatedAt: string;
}

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(1).max(50)
});

export const loginSchema = registerSchema.pick({ username: true, password: true });

export const progressSchema = z.object({
  activeCityId: z.enum(cityIds),
  characterSpotId: z.string().nullable(),
  visitedSpotIds: z.array(z.string()).max(100)
});

export const checkinSchema = z.object({ spotId: z.string().min(1).max(80) });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProgressInput = z.infer<typeof progressSchema>;

export { tripData } from './tripData.js';
