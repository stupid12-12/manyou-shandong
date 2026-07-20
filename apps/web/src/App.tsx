import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Routes, Route, Navigate } from 'react-router-dom';
import {
  ArrowLeft, Bus, CalendarDays, Check, ChevronRight, Clock3, CloudSun, Compass, Droplets,
  ImagePlus, LogIn, MapPin, Mountain, Pencil, Plus, Route as RouteIcon, Save,
  ShieldAlert, Sparkles, Ticket, TrainFront, Trash2, Utensils, WalletCards, Waves, X
} from 'lucide-react';
import { geoMercator, geoPath } from 'd3-geo';
import { tripData, type City, type CityId, type Spot } from '@manyou/shared';
import shandongGeoJson from './assets/shandong.json';
import { Character } from './components/Character';
import { AuthDialog } from './components/AuthDialog';
import { EditDatesDialog } from './components/EditDatesDialog';
import { RouteEditorDialog } from './components/RouteEditorDialog';
import { EditSpotDialog } from './components/EditSpotDialog';
import { cancelCheckin, checkin, getProgress, logout, refreshSession } from './services/api';

// DataV follows RFC 7946 ring winding; d3-geo's spherical renderer expects the
// opposite exterior winding for sub-hemisphere polygons.
const shandongGeometry = {
  ...shandongGeoJson,
  features: shandongGeoJson.features.map((feature) => ({
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: feature.geometry.coordinates.map((polygon) =>
        polygon.map((ring) => [...ring].reverse())
      )
    }
  }))
};

const cityMeta: Partial<Record<Exclude<CityId, 'shandong'>, { coordinates: [number, number]; icon: typeof Waves }>> = {
  jinan: { coordinates: [117.1201, 36.6512], icon: Droplets },
  taian: { coordinates: [117.1291, 36.1949], icon: Mountain },
  qingdao: { coordinates: [120.3826, 36.0671], icon: Waves }
};
const itineraryCityOrder: Exclude<CityId, 'shandong'>[] = ['qingdao', 'taian', 'jinan'];
const primaryNavCityIds: CityId[] = ['shandong', 'qingdao', 'taian', 'jinan'];

type ProvinceCityId = Exclude<CityId, 'shandong'>;
type ProvinceCityInfo = {
  id: ProvinceCityId;
  adcode: number;
  name: string;
  tagline: string;
  highlights: string[];
  itineraryId?: Exclude<CityId, 'shandong'>;
};

const provinceCities: ProvinceCityInfo[] = [
  { id: 'jinan', adcode: 370100, name: '济南', tagline: '泉水老城', highlights: ['趵突泉', '大明湖', '曲水亭街'], itineraryId: 'jinan' },
  { id: 'qingdao', adcode: 370200, name: '青岛', tagline: '山海啤酒', highlights: ['红瓦老城', '海岸线', '鲜啤海鲜'], itineraryId: 'qingdao' },
  { id: 'zibo', adcode: 370300, name: '淄博', tagline: '陶琉与烟火', highlights: ['陶瓷琉璃', '齐文化', '淄博烧烤'] },
  { id: 'zaozhuang', adcode: 370400, name: '枣庄', tagline: '运河古城', highlights: ['台儿庄古城', '微山湖湿地', '辣子鸡'] },
  { id: 'dongying', adcode: 370500, name: '东营', tagline: '黄河入海', highlights: ['黄河口', '湿地观鸟', '盐碱地景观'] },
  { id: 'yantai', adcode: 370600, name: '烟台', tagline: '仙境海岸', highlights: ['蓬莱阁', '长岛', '葡萄酒庄'] },
  { id: 'weifang', adcode: 370700, name: '潍坊', tagline: '风筝之都', highlights: ['风筝博物馆', '青州古城', '杨家埠年画'] },
  { id: 'jining', adcode: 370800, name: '济宁', tagline: '孔孟之乡', highlights: ['曲阜三孔', '微山湖', '运河记忆'] },
  { id: 'taian', adcode: 370900, name: '泰安', tagline: '五岳独尊', highlights: ['泰山', '岱庙', '泰山石刻'], itineraryId: 'taian' },
  { id: 'weihai', adcode: 371000, name: '威海', tagline: '环海慢城', highlights: ['环海路', '刘公岛', '那香海'] },
  { id: 'rizhao', adcode: 371100, name: '日照', tagline: '阳光海岸', highlights: ['万平口', '海滨森林', '赶海园'] },
  { id: 'linyi', adcode: 371300, name: '临沂', tagline: '沂蒙山水', highlights: ['沂蒙山', '地下大峡谷', '琅琊古城'] },
  { id: 'dezhou', adcode: 371400, name: '德州', tagline: '运河古韵', highlights: ['苏禄王墓', '董子园', '德州扒鸡'] },
  { id: 'liaocheng', adcode: 371500, name: '聊城', tagline: '江北水城', highlights: ['东昌湖', '光岳楼', '山陕会馆'] },
  { id: 'binzhou', adcode: 371600, name: '滨州', tagline: '孙子故里', highlights: ['孙子兵法城', '黄河楼', '魏氏庄园'] },
  { id: 'heze', adcode: 371700, name: '菏泽', tagline: '牡丹之都', highlights: ['曹州牡丹园', '水浒文化', '单县羊汤'] }
];
const provinceCityByAdcode = new Map(provinceCities.map((city) => [city.adcode, city]));

const categoryIcon = { sight: MapPin, food: Utensils, transport: TrainFront, experience: Sparkles };

type Budget = { min: number; max: number };
type SpotPhotos = Record<string, string>;
type DayDates = Record<string, Record<string, string>>;
type DayTitles = Record<string, Record<string, string>>;
type RouteCityId = Exclude<CityId, 'shandong'>;
const defaultRouteCityIds: RouteCityId[] = ['qingdao', 'taian', 'jinan'];

const defaultDayDates: DayDates = {
  qingdao: { 1: '07.31', 2: '08.01', 3: '08.02' },
  taian: { 3: '08.02', 4: '08.03' },
  jinan: { 4: '08.03', 5: '08.04' }
};

const defaultDayTitles: DayTitles = {
  qingdao: { 1: '红瓦、海风与老城初见', 2: '赶海、鲜啤与海鲜局', 3: '山海收尾，启程泰安' },
  taian: { 3: '抵达泰安，慢逛岱庙', 4: '沿御道登顶泰山' },
  jinan: { 4: '登山归来，泉城夜泊', 5: '泉水老城与大明湖' }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSpotOrders(spots: Spot[]): Spot[] {
  const sorted = [...spots].sort((a, b) => a.day - b.day || a.order - b.order);
  const dayCounts = new Map<number, number>();
  return sorted.map((spot) => {
    const order = (dayCounts.get(spot.day) ?? 0) + 1;
    dayCounts.set(spot.day, order);
    return spot.order === order ? spot : { ...spot, order };
  });
}

function upsertSpotAtOrder(spots: Spot[], updatedSpot: Spot): Spot[] {
  const remaining = spots.filter((spot) => spot.id !== updatedSpot.id);
  const sameDay = remaining.filter((spot) => spot.day === updatedSpot.day).sort((a, b) => a.order - b.order);
  const insertAt = Math.max(0, Math.min(sameDay.length, Math.round(updatedSpot.order || 1) - 1));
  sameDay.splice(insertAt, 0, updatedSpot);
  return normalizeSpotOrders([...remaining.filter((spot) => spot.day !== updatedSpot.day), ...sameDay]);
}

function readCitiesData(): City[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('manyou-cities') ?? 'null') as unknown;
    if (!Array.isArray(parsed)) return tripData.cities;
    return tripData.cities.map((fallback) => {
      const saved = parsed.find((item) => isRecord(item) && item.id === fallback.id);
      if (!isRecord(saved)) return fallback;
      const days = Array.isArray(saved.days) ? saved.days.filter((day): day is number => Number.isInteger(day) && day > 0) : fallback.days;
      const spots = Array.isArray(saved.spots) ? saved.spots.filter((spot): spot is Spot => isRecord(spot) && typeof spot.id === 'string' && typeof spot.name === 'string' && isRecord(spot.position) && Number.isFinite(spot.position.x) && Number.isFinite(spot.position.y)) : fallback.spots;
      const routes = Array.isArray(saved.routes) ? saved.routes.filter((route) => isRecord(route) && typeof route.id === 'string' && typeof route.path === 'string') as City['routes'] : fallback.routes;
      return {
        ...fallback,
        dates: typeof saved.dates === 'string' ? saved.dates : fallback.dates,
        subtitle: typeof saved.subtitle === 'string' ? saved.subtitle : fallback.subtitle,
        days: days.length > 0 ? days : fallback.days,
        spots: normalizeSpotOrders(spots),
        routes
      };
    });
  } catch { return tripData.cities; }
}

function readVisited(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem('manyou-visited') ?? '[]') as unknown;
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
  } catch { return []; }
}

function readRouteCityIds(): RouteCityId[] {
  try {
    const saved = JSON.parse(localStorage.getItem('manyou-route-cities') ?? '[]') as unknown;
    if (!Array.isArray(saved)) return defaultRouteCityIds;
    const validIds = new Set(tripData.cities.slice(1).map((city) => city.id));
    const result = saved.filter((id): id is RouteCityId => typeof id === 'string' && validIds.has(id as RouteCityId));
    return [...new Set(result)];
  } catch { return defaultRouteCityIds; }
}

function readBudget(): Budget {
  try {
    const saved = JSON.parse(localStorage.getItem('manyou-budget') ?? '') as Budget;
    if (Number.isFinite(saved.min) && Number.isFinite(saved.max) && saved.min >= 0 && saved.max >= saved.min) return saved;
  } catch { /* Use the default budget. */ }
  return { min: 1900, max: 2850 };
}

function readSpotPhotos(): SpotPhotos {
  try {
    const saved = JSON.parse(localStorage.getItem('manyou-spot-photos') ?? '{}') as unknown;
    if (!isRecord(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  }
  catch { return {}; }
}

function readDayDates(): DayDates {
  try {
    const saved = JSON.parse(localStorage.getItem('manyou-day-dates') ?? '{}') as DayDates;
    return Object.fromEntries(tripData.cities.slice(1).map((city) => {
      const fallbackDate = city.dates.split('—')[0] ?? '08.01';
      const generated = Object.fromEntries(city.days.map((day) => [day, fallbackDate]));
      return [city.id, { ...generated, ...(defaultDayDates[city.id] ?? {}), ...(saved[city.id] ?? {}) }];
    }));
  } catch { return defaultDayDates; }
}

function readDayTitles(): DayTitles {
  try {
    const saved = JSON.parse(localStorage.getItem('manyou-day-titles') ?? '{}') as unknown;
    if (!isRecord(saved)) return Object.fromEntries(tripData.cities.slice(1).map((city) => [city.id, { ...(defaultDayTitles[city.id] ?? {}), [city.days[0] ?? 1]: defaultDayTitles[city.id]?.[city.days[0] ?? 1] ?? city.subtitle }]));
    return Object.fromEntries(tripData.cities.slice(1).map((city) => {
      const cityId = city.id;
      const savedTitles = isRecord(saved[cityId]) ? saved[cityId] as Record<string, string> : {};
      const generated = Object.fromEntries(city.days.map((day) => [day, city.subtitle]));
      return [cityId, { ...generated, ...(defaultDayTitles[cityId] ?? {}), ...savedTitles }];
    }));
  } catch { return Object.fromEntries(tripData.cities.slice(1).map((city) => [city.id, { [city.days[0] ?? 1]: city.subtitle }])); }
}

function readCityBackgrounds(): Record<string, string> {
  try {
    const saved = JSON.parse(localStorage.getItem('manyou-city-backgrounds') ?? '{}') as Record<string, string>;
    const migrated = { ...saved };
    for (const city of tripData.cities.slice(1)) {
      const legacy = migrated[city.id];
      const firstDay = city.days[0];
      if (legacy && firstDay !== undefined) {
        migrated[`${city.id}-day-${firstDay}`] ??= legacy;
        delete migrated[city.id];
      }
    }
    return migrated;
  } catch { return {}; }
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('请选择图片文件')); return; }
    if (file.size > 8 * 1024 * 1024) { reject(new Error('图片不能超过 8 MB')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('图片格式无法识别'));
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function App() {
  return <Routes><Route path="/" element={<Navigate to="/city/shandong" replace />} /><Route path="/city/:cityId" element={<TravelApp />} /><Route path="/city/:cityId/spot/:spotId" element={<TravelApp />} /><Route path="*" element={<Navigate to="/city/shandong" replace />} /></Routes>;
}

function TravelApp() {
  const { cityId = 'shandong', spotId } = useParams();
  const navigate = useNavigate();
  const [citiesData, setCitiesData] = useState<City[]>(readCitiesData);
  const city = citiesData.find((item: City) => item.id === cityId) ?? citiesData[0]!;
  const [activeDay, setActiveDay] = useState(city.days[0] ?? 1);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [characterPoint, setCharacterPoint] = useState({ x: 125, y: 550 });
  const [moving, setMoving] = useState(false);
  const [visited, setVisited] = useState<string[]>(readVisited);
  const [budget, setBudget] = useState<Budget>(readBudget);
  const [spotPhotos, setSpotPhotos] = useState<SpotPhotos>(readSpotPhotos);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; username: string; displayName: string } | null>(null);
  const [status, setStatus] = useState('演示模式 · 进度保存在本机');
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreatingSpot, setIsCreatingSpot] = useState(false);
  const [dayDates, setDayDates] = useState<DayDates>(readDayDates);
  const [dayTitles, setDayTitles] = useState<DayTitles>(readDayTitles);
  const [routeCityIds, setRouteCityIds] = useState<RouteCityId[]>(readRouteCityIds);
  const [routeEditorOpen, setRouteEditorOpen] = useState(false);
  const [datesDialogOpen, setDatesDialogOpen] = useState(false);
  const [subtitleEditing, setSubtitleEditing] = useState(false);
  const currentDayTitle = dayTitles[city.id]?.[activeDay] ?? city.subtitle;
  const [subtitleDraft, setSubtitleDraft] = useState(currentDayTitle);
  const [cityBackgrounds, setCityBackgrounds] = useState<Record<string, string>>(readCityBackgrounds);
  const [draggingSpot, setDraggingSpot] = useState<string | null>(null);
  const [editingCityName, setEditingCityName] = useState<CityId | null>(null);
  const [cityNameDraft, setCityNameDraft] = useState('');
  const [tripLabel, setTripLabel] = useState(() => localStorage.getItem('manyou-trip-label') || '2026 夏日路线');
  const [tripLabelEditing, setTripLabelEditing] = useState(false);
  const [tripLabelDraft, setTripLabelDraft] = useState(tripLabel);
  const [mapCaption, setMapCaption] = useState(() => localStorage.getItem('manyou-map-caption') || '暑期炎热，户外路线尽量早出发');
  const [mapCaptionEditing, setMapCaptionEditing] = useState(false);
  const [mapCaptionDraft, setMapCaptionDraft] = useState(mapCaption);
  const [tripDateRange, setTripDateRange] = useState(() => localStorage.getItem('manyou-date-range') || tripData.dateRange);
  const [tripDateRangeEditing, setTripDateRangeEditing] = useState(false);
  const [tripDateRangeDraft, setTripDateRangeDraft] = useState(tripDateRange);
  const [provinceSubtitle, setProvinceSubtitle] = useState(() => localStorage.getItem('manyou-province-subtitle') || '从海岸到山巅，再到泉水边');
  const [provinceSubtitleEditing, setProvinceSubtitleEditing] = useState(false);
  const [provinceSubtitleDraft, setProvinceSubtitleDraft] = useState(provinceSubtitle);
  const timerRef = useRef<number | null>(null);
  const activeBackgroundKey = `${city.id}-day-${activeDay}`;

  useEffect(() => {
    setActiveDay(city.days[0] ?? 1);
    setSelectedSpot(null);
    setSubtitleEditing(false);
    setSubtitleDraft(dayTitles[city.id]?.[city.days[0] ?? 1] ?? city.subtitle);
    setMoving(false);
    const first = city.spots[0];
    if (first) setCharacterPoint(first.position);
  }, [city.id]);

  useEffect(() => {
    setSubtitleEditing(false);
    setSubtitleDraft(dayTitles[city.id]?.[activeDay] ?? city.subtitle);
  }, [activeDay, city.id]);

  useEffect(() => {
    if (!spotId || city.id === 'shandong') return;
    const spot = city.spots.find((item) => item.id === spotId);
    if (spot) { setActiveDay(spot.day); setSelectedSpot(spot); setCharacterPoint(spot.position); }
  }, [spotId, city]);

  useEffect(() => {
    refreshSession().then(async (restored) => {
      if (!restored) return;
      setUser(restored); setStatus('已连接云端旅行册');
      const remote = await getProgress().catch(() => null);
      if (remote) {
        setVisited(remote.visitedSpotIds);
        const savedCity = tripData.cities.find((item) => item.id === remote.activeCityId);
        if (savedCity && remote.activeCityId !== city.id) navigate(`/city/${remote.activeCityId}`, { replace: true });
      }
    });
  }, []);

  useEffect(() => { try { localStorage.setItem('manyou-visited', JSON.stringify(visited)); } catch { setStatus('本机存储空间不足'); } }, [visited]);
  useEffect(() => { try { localStorage.setItem('manyou-budget', JSON.stringify(budget)); } catch { setStatus('本机存储空间不足'); } }, [budget]);
  useEffect(() => { try { localStorage.setItem('manyou-cities', JSON.stringify(citiesData)); } catch { setStatus('本机存储空间不足'); } }, [citiesData]);
  useEffect(() => { try { localStorage.setItem('manyou-day-dates', JSON.stringify(dayDates)); } catch { setStatus('本机存储空间不足'); } }, [dayDates]);
  useEffect(() => { try { localStorage.setItem('manyou-day-titles', JSON.stringify(dayTitles)); } catch { setStatus('本机存储空间不足'); } }, [dayTitles]);
  useEffect(() => { try { localStorage.setItem('manyou-route-cities', JSON.stringify(routeCityIds)); } catch { setStatus('本机存储空间不足'); } }, [routeCityIds]);
  useEffect(() => {
    try { localStorage.setItem('manyou-city-backgrounds', JSON.stringify(cityBackgrounds)); }
    catch { setStatus('背景图片较大，暂时无法保存在本机'); }
  }, [cityBackgrounds]);
  useEffect(() => { try { localStorage.setItem('manyou-trip-label', tripLabel); } catch { /* ignore */ } }, [tripLabel]);
  useEffect(() => { try { localStorage.setItem('manyou-map-caption', mapCaption); } catch { /* ignore */ } }, [mapCaption]);
  useEffect(() => { try { localStorage.setItem('manyou-date-range', tripDateRange); } catch { /* ignore */ } }, [tripDateRange]);
  useEffect(() => { try { localStorage.setItem('manyou-province-subtitle', provinceSubtitle); } catch { /* ignore */ } }, [provinceSubtitle]);
  useEffect(() => {
    try { localStorage.setItem('manyou-spot-photos', JSON.stringify(spotPhotos)); }
    catch { setStatus('图片较大，暂时无法保存在本机'); }
  }, [spotPhotos]);

  const visibleSpots = useMemo(() => city.spots.filter((item) => item.day === activeDay), [city, activeDay]);
  const totalSpots = citiesData.flatMap((item) => item.spots).length;
  const completion = totalSpots === 0 ? 0 : Math.round((visited.filter((id) => citiesData.some((item) => item.spots.some((spot) => spot.id === id))).length / totalSpots) * 100);
  const navCityIds: CityId[] = ['shandong', ...routeCityIds];
  const navCities = navCityIds.map((id) => citiesData.find((c) => c.id === id)!).filter(Boolean);
  if (!navCityIds.includes(city.id)) navCities.push(city);

  function chooseCity(next: CityId) { navigate(`/city/${next}`); }

  function travelToSpot(spot: Spot) {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setSelectedSpot(spot);
    setMoving(true);
    navigate(`/city/${city.id}/spot/${spot.id}`, { replace: true });
    window.setTimeout(() => setCharacterPoint(spot.position), 20);
    timerRef.current = window.setTimeout(() => {
      setMoving(false);
      timerRef.current = null;
    }, 1200);
  }

  async function toggleSpotCheckin(spot: Spot) {
    const isVisited = visited.includes(spot.id);
    setVisited((current) => isVisited ? current.filter((id) => id !== spot.id) : [...current, spot.id]);
    setStatus(isVisited ? '已取消打卡 · 更改保存在本机' : '已打卡 · 更改保存在本机');
    if (!user) return;

    if (isVisited) {
      await cancelCheckin(spot.id).catch(() => setStatus('网络暂时不可用，已保存在本机'));
      return;
    }
    const remote = await checkin(spot.id).catch(() => null);
    if (remote) { setVisited(remote.visitedSpotIds); setStatus('已同步到云端旅行册'); }
    else setStatus('网络暂时不可用，已保存在本机');
  }

  function saveSpotEdit(updatedSpot: Spot) {
    setCitiesData((prev) =>
      prev.map((c) =>
        c.id === city.id
          ? {
              ...c,
              spots: upsertSpotAtOrder(c.spots, updatedSpot)
            }
          : c
      )
    );
    setSelectedSpot(updatedSpot);
    setActiveDay(updatedSpot.day);
    setCharacterPoint(updatedSpot.position);
    navigate(`/city/${city.id}/spot/${updatedSpot.id}`, { replace: true });
    setStatus(isCreatingSpot ? '景点已添加并保存在本机' : '景点信息已保存');
    setIsCreatingSpot(false);
  }

  function deleteSpot(spotId: string) {
    setCitiesData((prev) =>
      prev.map((c) =>
        c.id === city.id
          ? { ...c, spots: normalizeSpotOrders(c.spots.filter((s) => s.id !== spotId)), routes: c.routes.filter((route) => route.from !== spotId && route.to !== spotId) }
          : c
      )
    );
    setVisited((current) => current.filter((id) => id !== spotId));
    setSpotPhotos((current) => {
      const next = { ...current };
      delete next[spotId];
      return next;
    });
    if (selectedSpot?.id === spotId) {
      setSelectedSpot(null);
      navigate(`/city/${city.id}`, { replace: true });
    }
    setStatus('景点已删除并保存在本机');
  }

  function addNewSpot() {
    if (city.id === 'shandong') return;
    const newSpot: Spot = {
      id: `${city.id}-custom-${Date.now()}`,
      cityId: city.id,
      day: activeDay,
      order: visibleSpots.length + 1,
      name: '新景点',
      shortName: '新',
      category: 'sight',
      position: { x: 500, y: 350 },
      recommendedTime: `D${activeDay} · 09:00`,
      duration: '1小时',
      price: '待定',
      transport: '待定',
      description: '请编辑此景点的信息',
      highlights: [],
      foods: [],
      savingTips: [],
      safetyNotices: []
    };
    setIsCreatingSpot(true);
    setEditingSpot(newSpot);
    setIsEditDialogOpen(true);
  }

  function startRenameCity(cityId: CityId) {
    const target = citiesData.find((c) => c.id === cityId);
    if (!target) return;
    setEditingCityName(cityId);
    setCityNameDraft(target.name);
  }

  function saveCityName() {
    const name = cityNameDraft.trim();
    if (!name || !editingCityName) return;
    setCitiesData((prev) => prev.map((c) => c.id === editingCityName ? { ...c, name } : c));
    setEditingCityName(null);
  }

  async function handleBackgroundUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setCityBackgrounds((prev) => ({ ...prev, [activeBackgroundKey]: dataUrl }));
      setStatus(`D${activeDay} 背景图已上传`);
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : '背景图上传失败');
    } finally {
      e.target.value = '';
    }
  }

  function removeBackground() {
    setCityBackgrounds((current) => {
      const next = { ...current };
      delete next[activeBackgroundKey];
      return next;
    });
    setStatus(`D${activeDay} 已恢复默认地图背景`);
  }

  function saveDateSettings(dateRange: string, dates: Record<string, string>, days: number[]) {
    const finalDay = days[days.length - 1]!;
    setCitiesData((current) => current.map((item) => item.id === city.id ? {
      ...item,
      dates: dateRange,
      days,
      spots: normalizeSpotOrders(item.spots.map((spot) => days.includes(spot.day) ? spot : { ...spot, day: finalDay }))
    } : item));
    setDayDates((current) => ({ ...current, [city.id]: dates }));
    setActiveDay((current) => days.includes(current) ? current : days[0]!);
    setStatus('旅行日期已保存');
  }

  function saveSubtitle() {
    const subtitle = subtitleDraft.trim();
    if (!subtitle) return;
    setDayTitles((current) => ({ ...current, [city.id]: { ...(current[city.id] ?? {}), [activeDay]: subtitle } }));
    setSubtitleEditing(false);
    setStatus(`D${activeDay} 行程标题已保存`);
  }

  function handleSpotDragStart(spotId: string) {
    setDraggingSpot(spotId);
  }

  function handleSpotDragMove(e: React.MouseEvent, spotId: string) {
    if (draggingSpot !== spotId) return;
    const mapFrame = (e.currentTarget as HTMLElement).closest('.map-frame') || document.querySelector('.map-frame');
    if (!mapFrame) return;
    const rect = mapFrame.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentX = (x / rect.width) * 1000;
    const percentY = (y / rect.height) * 650;
    
    setCitiesData((prev) =>
      prev.map((c) =>
        c.id === city.id
          ? {
              ...c,
              spots: c.spots.map((s) =>
                s.id === spotId
                  ? { ...s, position: { x: Math.max(0, Math.min(1000, Math.round(percentX))), y: Math.max(0, Math.min(650, Math.round(percentY))) } }
                  : s
              )
            }
          : c
      )
    );
  }

  function handleSpotDragEnd() {
    if (draggingSpot) {
      setStatus('景点位置已更新');
    }
    setDraggingSpot(null);
  }

  // 全局拖拽处理
  useEffect(() => {
    if (!draggingSpot) return;
    const handleMouseMove = (e: MouseEvent) => {
      const mapFrame = document.querySelector('.map-frame') as HTMLElement;
      if (!mapFrame) return;
      const rect = mapFrame.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const percentX = (x / rect.width) * 1000;
      const percentY = (y / rect.height) * 650;
      
      setCitiesData((prev) =>
        prev.map((c) =>
          c.id === city.id
            ? {
                ...c,
                spots: c.spots.map((s) =>
                  s.id === draggingSpot
                    ? { ...s, position: { x: Math.max(0, Math.min(1000, Math.round(percentX))), y: Math.max(0, Math.min(650, Math.round(percentY))) } }
                    : s
                )
              }
            : c
        )
      );
    };
    const handleMouseUp = () => {
      setDraggingSpot(null);
      setStatus('景点位置已更新');
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingSpot, city.id]);

  async function signOut() { await logout(); setUser(null); setStatus('已退出 · 进度保存在本机'); }

  return (
    <div className="app-shell" style={{ '--city-accent': city.accent } as React.CSSProperties}>
      <header className="topbar">
        <button className="brand" onClick={() => chooseCity('shandong')} aria-label="返回山东总览">
          <span className="brand-mark"><Compass /></span>
          <span><strong>漫游山东</strong></span>
        </button>
        <nav className="city-tabs" aria-label="城市切换">
          {navCities.map((item) => editingCityName === item.id ? (
            <form key={item.id} className="city-tab-edit" onSubmit={(e) => { e.preventDefault(); saveCityName(); }}>
              <input autoFocus value={cityNameDraft} onChange={(e) => setCityNameDraft(e.target.value)} maxLength={20} onKeyDown={(e) => { if (e.key === 'Escape') setEditingCityName(null); }} />
              <button type="submit" aria-label="保存名称"><Save size={14} /></button>
              <button type="button" onClick={() => setEditingCityName(null)} aria-label="取消"><X size={14} /></button>
            </form>
          ) : (
            <button key={item.id} className={city.id === item.id ? 'city-tab active' : 'city-tab'} onClick={() => chooseCity(item.id)} onDoubleClick={() => startRenameCity(item.id)}>{item.name}</button>
          ))}
        </nav>
        <div className="account-area">
          <span className="sync-status">{status}</span>
          {user ? <button className="account-button" onClick={signOut}><span>{user.displayName.slice(0, 1)}</span>退出</button> : <button className="account-button" onClick={() => setAuthOpen(true)}><LogIn />登录</button>}
        </div>
      </header>

      <main className="workspace">
        <aside className="trip-rail">
          <div className="rail-heading"><div className="rail-heading-top">{tripLabelEditing ? <form className="eyebrow-edit" onSubmit={(e) => { e.preventDefault(); const v = tripLabelDraft.trim(); if (v) { setTripLabel(v); setTripLabelEditing(false); } }}><input autoFocus value={tripLabelDraft} onChange={(e) => setTripLabelDraft(e.target.value)} maxLength={30} onKeyDown={(e) => { if (e.key === 'Escape') { setTripLabelDraft(tripLabel); setTripLabelEditing(false); } }} /><button type="submit" aria-label="保存"><Save size={12} /></button><button type="button" onClick={() => { setTripLabelDraft(tripLabel); setTripLabelEditing(false); }} aria-label="取消"><X size={12} /></button></form> : <p className="eyebrow clickable" onClick={() => { setTripLabelDraft(tripLabel); setTripLabelEditing(true); }} title="点击编辑">{tripLabel}</p>}<button type="button" onClick={() => setRouteEditorOpen(true)} aria-label="编辑旅行路线" title="编辑旅行路线"><Pencil /></button></div><h1>{city.name}</h1><p>{city.subtitle}</p></div>
          <div className="route-list">
            {routeCityIds.map((cityId, index) => {
              const item = citiesData.find((candidate) => candidate.id === cityId)!;
              const Icon = cityMeta[item.id as Exclude<CityId, 'shandong'>]?.icon ?? MapPin;
              return <button key={item.id} className={city.id === item.id ? 'route-stop active' : 'route-stop'} onClick={() => chooseCity(item.id)}><span className="stop-index">{index + 1}</span><Icon /><span><strong>{item.name}</strong><small>{item.dates}</small></span></button>;
            })}
          </div>
          <BudgetEditor value={budget} onChange={setBudget} />
          <div className="progress-block"><div><span>旅行打卡</span><strong>{completion}%</strong></div><progress max="100" value={completion} /><small>{visited.filter((id) => citiesData.some((item) => item.spots.some((spot) => spot.id === id))).length} / {totalSpots} 个地点</small></div>
        </aside>

        <section className="map-section">
          <div className="map-toolbar">
            <div className="map-heading">{city.id === 'shandong' ? (tripDateRangeEditing ? <form className="eyebrow-edit" onSubmit={(e) => { e.preventDefault(); const v = tripDateRangeDraft.trim(); if (v) { setTripDateRange(v); setTripDateRangeEditing(false); } }}><input autoFocus value={tripDateRangeDraft} onChange={(e) => setTripDateRangeDraft(e.target.value)} maxLength={40} onKeyDown={(e) => { if (e.key === 'Escape') { setTripDateRangeDraft(tripDateRange); setTripDateRangeEditing(false); } }} /><button type="submit" aria-label="保存日期"><Save size={12} /></button><button type="button" onClick={() => { setTripDateRangeDraft(tripDateRange); setTripDateRangeEditing(false); }} aria-label="取消"><X size={12} /></button></form> : <p className="eyebrow clickable" onClick={() => { setTripDateRangeDraft(tripDateRange); setTripDateRangeEditing(true); }} title="点击编辑">{tripDateRange}</p>) : <button className="date-range-button" type="button" onClick={() => setDatesDialogOpen(true)}><CalendarDays />{city.dates}<Pencil /></button>}{city.id === 'shandong' ? (provinceSubtitleEditing ? <form className="subtitle-editor" onSubmit={(e) => { e.preventDefault(); const v = provinceSubtitleDraft.trim(); if (v) { setProvinceSubtitle(v); setProvinceSubtitleEditing(false); } }}><input autoFocus maxLength={60} value={provinceSubtitleDraft} onChange={(e) => setProvinceSubtitleDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setProvinceSubtitleDraft(provinceSubtitle); setProvinceSubtitleEditing(false); } }} /><button type="submit" aria-label="保存标题"><Save /></button><button type="button" onClick={() => { setProvinceSubtitleDraft(provinceSubtitle); setProvinceSubtitleEditing(false); }} aria-label="取消"><X /></button></form> : <h2 className="editable-map-title"><button type="button" onClick={() => { setProvinceSubtitleDraft(provinceSubtitle); setProvinceSubtitleEditing(true); }} title="编辑总览标题"><span>{provinceSubtitle}</span><Pencil /></button></h2>) : subtitleEditing ? <form className="subtitle-editor" onSubmit={(event) => { event.preventDefault(); saveSubtitle(); }}><input autoFocus maxLength={60} value={subtitleDraft} onChange={(event) => setSubtitleDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { setSubtitleDraft(currentDayTitle); setSubtitleEditing(false); } }} aria-label={`D${activeDay}行程标题`} /><button type="submit" aria-label={`保存D${activeDay}行程标题`} title="保存"><Save /></button><button type="button" onClick={() => { setSubtitleDraft(currentDayTitle); setSubtitleEditing(false); }} aria-label={`取消编辑D${activeDay}行程标题`} title="取消"><X /></button></form> : <h2 className="editable-map-title"><button type="button" onClick={() => { setSubtitleDraft(currentDayTitle); setSubtitleEditing(true); }} title={`编辑 D${activeDay} 行程标题`}><span>{currentDayTitle}</span><Pencil /></button></h2>}</div>
            <div className="map-toolbar-actions">
              {city.id !== 'shandong' && <button className="add-spot-button" type="button" onClick={addNewSpot}><Plus />添加景点</button>}
              {city.id !== 'shandong' && <div className="day-switch" aria-label="日期筛选">{city.days.map((day) => <button key={day} className={activeDay === day ? 'active' : ''} onClick={() => setActiveDay(day)}><strong>D{day}</strong><small>{dayDates[city.id]?.[day]}</small></button>)}</div>}
            </div>
          </div>
          <div className="map-frame">
            {city.id === 'shandong' ? <ProvinceMap onOpen={chooseCity} routeCityIds={routeCityIds} /> : <>
              <input type="file" accept="image/*" onChange={handleBackgroundUpload} id={`bg-upload-${city.id}-${activeDay}`} style={{ display: 'none' }} />
              <CityMap 
                city={city} 
                spots={visibleSpots} 
                selected={selectedSpot?.id ?? null} 
                visited={visited} 
                onTravel={travelToSpot} 
                onToggleCheckin={(spot) => { void toggleSpotCheckin(spot); }} 
                onEditSpot={(spot) => { setIsCreatingSpot(false); setEditingSpot(spot); setIsEditDialogOpen(true); }} 
                characterPoint={characterPoint} 
                moving={moving}
                backgroundImage={cityBackgrounds[activeBackgroundKey]}
                backgroundDay={activeDay}
                onBackgroundUpload={() => document.getElementById(`bg-upload-${city.id}-${activeDay}`)?.click()}
                onBackgroundRemove={removeBackground}
                draggingSpot={draggingSpot}
                onSpotDragStart={handleSpotDragStart}
                onSpotDragEnd={handleSpotDragEnd}
              />
            </>}
            {mapCaptionEditing ? <form className="map-caption-edit" onSubmit={(e) => { e.preventDefault(); const v = mapCaptionDraft.trim(); if (v) { setMapCaption(v); setMapCaptionEditing(false); } }}><CloudSun /><input autoFocus value={mapCaptionDraft} onChange={(e) => setMapCaptionDraft(e.target.value)} maxLength={50} onKeyDown={(e) => { if (e.key === 'Escape') { setMapCaptionDraft(mapCaption); setMapCaptionEditing(false); } }} onBlur={() => { const v = mapCaptionDraft.trim(); if (v) { setMapCaption(v); } else { setMapCaptionDraft(mapCaption); } setMapCaptionEditing(false); }} /><button type="submit" aria-label="保存"><Save size={12} /></button></form> : <div className="map-caption" onClick={() => { setMapCaptionDraft(mapCaption); setMapCaptionEditing(true); }}><CloudSun /><span>{mapCaption}</span></div>}
          </div>
        </section>

        {city.id === 'shandong' ? <ProvinceEmptyGuide /> : <GuidePanel
          spot={selectedSpot}
          moving={moving}
          photo={selectedSpot ? spotPhotos[selectedSpot.id] : undefined}
          onPhotoChange={(photo) => {
            if (!selectedSpot) return;
            setSpotPhotos((current) => {
              if (photo) return { ...current, [selectedSpot.id]: photo };
              const next = { ...current };
              delete next[selectedSpot.id];
              return next;
            });
          }}
          onEdit={() => { if (selectedSpot) { setIsCreatingSpot(false); setEditingSpot(selectedSpot); setIsEditDialogOpen(true); } }}
          onDelete={() => { if (selectedSpot) deleteSpot(selectedSpot.id); }}
          onClose={() => { setSelectedSpot(null); navigate(`/city/${city.id}`, { replace: true }); }}
        />}
      </main>
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onAuthenticated={async (next) => { setUser(next); setStatus('已连接云端旅行册'); const remote = await getProgress().catch(() => null); if (remote) setVisited(remote.visitedSpotIds); }} />}
      <EditSpotDialog
        spot={editingSpot}
        isOpen={isEditDialogOpen}
        mode={isCreatingSpot ? 'create' : 'edit'}
        onSave={saveSpotEdit}
        onDelete={deleteSpot}
        onClose={() => {
          setEditingSpot(null);
          setIsEditDialogOpen(false);
          setIsCreatingSpot(false);
        }}
      />
      {city.id !== 'shandong' && <EditDatesDialog city={city} isOpen={datesDialogOpen} onSave={saveDateSettings} onClose={() => setDatesDialogOpen(false)} />}
      <RouteEditorDialog cities={citiesData.filter((item): item is City & { id: RouteCityId } => item.id !== 'shandong')} value={routeCityIds} isOpen={routeEditorOpen} onSave={(next) => { setRouteCityIds(next); setStatus('旅行路线已保存'); }} onClose={() => setRouteEditorOpen(false)} />
    </div>
  );
}

function ProvinceMap({ onOpen, routeCityIds }: { onOpen: (id: CityId) => void; routeCityIds: RouteCityId[] }) {
  const projection = geoMercator().fitExtent([[135, 80], [890, 570]], shandongGeometry as never);
  const makePath = geoPath(projection);

  const mapCities = shandongGeometry.features.map((feature) => {
    const city = provinceCityByAdcode.get(feature.properties.adcode)!;
    const coordinates = (feature.properties.centroid ?? feature.properties.center) as [number, number];
    const [labelX, labelY] = projection(coordinates) ?? [0, 0];
    return { city, feature, labelX, labelY };
  });

  // 直接复用 mapCities 的标签坐标，确保路线标记与城市名完全对齐
  const routePoints = mapCities
    .filter(({ city }) => routeCityIds.includes(city.id as RouteCityId))
    .sort((a, b) => routeCityIds.indexOf(a.city.id as RouteCityId) - routeCityIds.indexOf(b.city.id as RouteCityId))
    .map(({ city, labelX, labelY }) => ({ cityId: city.id as RouteCityId, x: labelX, y: labelY }));

  const routePathD = routePoints.length > 1
    ? `M ${routePoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`
    : '';

  return <div className="map-canvas province-canvas">
    <svg viewBox="0 0 1000 650" role="img" aria-label="山东16地市旅行总览地图，点击任意城市进入详细页面">
      <defs><pattern id="paper-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" /></pattern></defs>
      <g className="province-geography">
        {mapCities.map(({ city, feature, labelX, labelY }, index) => <g
          key={city.adcode}
          className={`province-region${routeCityIds.includes(city.id as RouteCityId) ? ' is-selected' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={`选择${city.name}`}
          onClick={() => onOpen(city.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(city.id); }
          }}
        >
          <path className={`province-city province-city-${index % 3}`} d={makePath(feature as never) ?? undefined} />
          <text x={labelX} y={labelY} className="province-city-label">{city.name}</text>
        </g>)}
      </g>
      {routePathD && <path d={routePathD} className="province-route" />}
      {routePoints.map((pt, i) => (
        <g key={pt.cityId} className="province-route-stop" transform={`translate(${pt.x},${pt.y - 16})`}>
          <circle r="20" fill="rgba(255,255,255,.92)" stroke="var(--coral)" strokeWidth="3" />
          <circle r="9" fill="var(--coral)" />
          <text y="0" fill="#fff" fontFamily="Noto Sans SC, sans-serif" fontSize="10" fontWeight="700" textAnchor="middle" dominantBaseline="central">{i + 1}</text>
        </g>
      ))}
      <g className="sea-sketch"><path d="M720 500 q35-25 70 0 t70 0"/><path d="M745 530 q25-18 50 0 t50 0"/></g>
      <text x="715" y="585" className="sea-label">黄海</text>
      <text x="185" y="105" className="map-watermark">SHANDONG</text>
    </svg>
  </div>;
}

function CityMap({ city, spots, selected, visited, onTravel, onToggleCheckin, onEditSpot, characterPoint, moving, backgroundImage, backgroundDay, onBackgroundUpload, onBackgroundRemove, draggingSpot, onSpotDragStart, onSpotDragEnd }: { city: City; spots: Spot[]; selected: string | null; visited: string[]; onTravel: (spot: Spot) => void; onToggleCheckin: (spot: Spot) => void; onEditSpot: (spot: Spot) => void; characterPoint: { x: number; y: number }; moving: boolean; backgroundImage?: string; backgroundDay: number; onBackgroundUpload?: () => void; onBackgroundRemove?: () => void; draggingSpot: string | null; onSpotDragStart: (spotId: string) => void; onSpotDragEnd: () => void; }) {
  // 生成连接景点的虚线路径
  const sortedSpots = [...spots].sort((a, b) => (a.order || 999) - (b.order || 999));
  const connectionPaths = [];
  for (let i = 0; i < sortedSpots.length - 1; i++) {
    const from = sortedSpots[i]!.position;
    const to = sortedSpots[i + 1]!.position;
    connectionPaths.push(`M ${from.x} ${from.y} L ${to.x} ${to.y}`);
  }
  const connectionPath = connectionPaths.join(' ');

  return <div className={`map-canvas city-canvas scene-${city.id} ${backgroundImage ? 'has-custom-background' : ''}`}>
    {backgroundImage && <img src={backgroundImage} className="map-background" alt="城市背景" />}
    <svg viewBox="0 0 1000 650" role="img" aria-label={`${city.name}动漫地图，共显示${spots.length}个地点`}>
      <SceneBackdrop cityId={city.id} />
      {connectionPath && <path d={connectionPath} className="spot-connection-path" strokeDasharray="5,5" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4" />}
      <svg className="character-svg" viewBox="0 0 1000 650"><Character x={characterPoint.x} y={characterPoint.y - 28} moving={moving} /></svg>
    </svg>
    <div className="map-bg-actions">
      <button className="map-bg-upload-btn" type="button" onClick={onBackgroundUpload} title={backgroundImage ? `更换 D${backgroundDay} 背景图` : `上传 D${backgroundDay} 背景图`}><ImagePlus />{backgroundImage ? `更换 D${backgroundDay} 背景` : `上传 D${backgroundDay} 背景`}</button>
      {backgroundImage && <button className="map-bg-remove-btn" type="button" onClick={onBackgroundRemove} title="删除背景图" aria-label="删除背景图"><Trash2 /></button>}
    </div>
    {spots.map((spot) => {
      const Icon = categoryIcon[spot.category];
      const done = visited.includes(spot.id);
      return <div key={spot.id} className={`spot-marker ${selected === spot.id ? 'selected' : ''} ${done ? 'visited' : ''} ${draggingSpot === spot.id ? 'dragging' : ''}`} style={{ left: `${spot.position.x / 10}%`, top: `${spot.position.y / 6.5}%`, cursor: draggingSpot === spot.id ? 'grabbing' : 'grab' }} onMouseDown={() => onSpotDragStart(spot.id)} onMouseUp={onSpotDragEnd}>
        <button className="spot-travel-button" type="button" onClick={() => onTravel(spot)} aria-label={`第${spot.order}站，前往${spot.name}`} title={`第${spot.order}站 · 前往${spot.name}`}><span className="spot-order-badge">{spot.order}</span><span className="spot-dot"><Icon /></span></button>
        <button className="spot-label spot-checkin-button" type="button" onClick={() => onToggleCheckin(spot)} aria-label={done ? `取消${spot.name}打卡` : `打卡${spot.name}`} aria-pressed={done} title={done ? '取消打卡' : '设为已打卡'}><span><small>{spot.recommendedTime.split(' ')[0]}</small><strong>{spot.shortName}</strong></span><span className="spot-check-indicator">{done && <Check />}</span></button>
        <button className="spot-edit-button" type="button" onClick={() => onEditSpot(spot)} title="编辑景点" aria-label={`编辑${spot.name}`}><Pencil size={14} /></button>
      </div>;
    })}
  </div>;
}

function SceneBackdrop({ cityId }: { cityId: CityId }) {
  if (cityId === 'qingdao') return <><path className="land-mass sea-land" d="M0 70 H1000 V390 Q860 350 730 430 T450 440 Q300 500 0 455Z"/><g className="wave-lines"><path d="M0 470 q60-25 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0"/><path d="M80 540 q50-22 100 0 t100 0 t100 0 t100 0 t100 0 t100 0"/></g><g className="city-doodles"><path d="M170 360 v-100 h65 v100 M185 260 v-45 h35 v45 M245 385 v-145 h80 v145 M262 240 l24-35 23 35"/><circle cx="790" cy="120" r="45"/></g><text x="75" y="120" className="scene-word">SEA / BEER / OLD TOWN</text></>;
  if (cityId === 'taian') return <><path className="land-mass mountain-land" d="M0 650 V500 L170 410 290 475 470 250 600 390 760 105 1000 390 V650Z"/><g className="mountain-lines"><path d="M35 520 L180 370 290 490 470 215 610 410 760 70 960 365"/><path d="M430 270 l40 45 42-45 M720 125 l40 42 40-42"/></g><text x="75" y="120" className="scene-word">CLIMB / STONE / CLOUD</text></>;
  return <><path className="land-mass spring-land" d="M0 90 H1000 V650 H0Z"/><ellipse className="lake" cx="785" cy="210" rx="170" ry="92"/><g className="spring-lines"><path d="M0 430 Q130 365 260 430 T520 430 T780 430 T1040 430"/><path d="M0 475 Q130 410 260 475 T520 475 T780 475 T1040 475"/></g><g className="willow"><path d="M160 130 v230 M130 170 q30 90 0 170 M190 165 q-30 100 0 180"/></g><text x="75" y="120" className="scene-word">SPRING / LAKE / OLD CITY</text></>;
}

function BudgetEditor({ value, onChange }: { value: Budget; onChange: (value: Budget) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');

  function save() {
    if (!Number.isFinite(draft.min) || !Number.isFinite(draft.max) || draft.min < 0 || draft.max < draft.min) {
      setError('最高预算需大于最低预算');
      return;
    }
    onChange(draft);
    setError('');
    setEditing(false);
  }

  return <div className={`budget-strip ${editing ? 'is-editing' : ''}`}>
    <WalletCards />
    <div className="budget-content">
      <div className="budget-heading"><small>预算</small><button type="button" onClick={() => { setDraft(value); setError(''); setEditing((current) => !current); }} aria-label={editing ? '取消编辑预算' : '编辑预算'} title={editing ? '取消' : '编辑预算'}><Pencil /></button></div>
      {editing ? <div className="budget-editor">
        <label><span>最低</span><input type="number" min="0" step="50" value={draft.min} onChange={(event) => setDraft((current) => ({ ...current, min: Number(event.target.value) }))} /></label>
        <span className="budget-dash">—</span>
        <label><span>最高</span><input type="number" min="0" step="50" value={draft.max} onChange={(event) => setDraft((current) => ({ ...current, max: Number(event.target.value) }))} /></label>
        <button className="budget-save" type="button" onClick={save} aria-label="保存预算" title="保存预算"><Save /></button>
      </div> : <strong>¥{value.min.toLocaleString('zh-CN')}—{value.max.toLocaleString('zh-CN')}</strong>}
      {error && <small className="budget-error" role="alert">{error}</small>}
    </div>
  </div>;
}

function TravelPhoto({ spotName, photo, onChange }: { spotName: string; photo?: string; onChange: (photo?: string) => void }) {
  const [error, setError] = useState('');

  async function choosePhoto(file?: File) {
    if (!file) return;
    try {
      onChange(await compressImage(file));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '图片上传失败');
    }
  }

  return <div className={`travel-photo ${photo ? 'has-photo' : ''}`}>
    {photo ? <img src={photo} alt={`${spotName}旅行照片`} /> : <div className="photo-placeholder"><ImagePlus /><strong>添加{spotName}照片</strong><small>每个景点单独保存一张</small></div>}
    <div className="photo-actions">
      <label className="photo-button" title={photo ? '更换照片' : '上传照片'}><ImagePlus /><span>{photo ? '更换' : '上传'}</span><input type="file" accept="image/*" onChange={(event) => { void choosePhoto(event.target.files?.[0]); event.target.value = ''; }} /></label>
      {photo && <button className="photo-button" type="button" onClick={() => onChange(undefined)} title="删除照片"><Trash2 /><span>删除</span></button>}
    </div>
    {error && <small className="photo-error" role="alert">{error}</small>}
  </div>;
}

function ProvinceEmptyGuide() {
  return <aside className="guide-panel empty-guide"><div className="postcard-stack" aria-hidden="true"><span>青岛</span><span>泰山</span><span>济南</span></div><p className="eyebrow">山东十六市</p><h2>选择一座城市</h2><p>查看当地特色与行程状态，已规划的三座城市可以继续进入详细攻略。</p><div className="empty-hint"><RouteIcon />青岛、泰安、济南已串联成固定路线</div></aside>;
}

function ProvinceCityGuide({ city, onOpen, onClose }: { city: ProvinceCityInfo; onOpen?: () => void; onClose: () => void }) {
  return <aside className="guide-panel province-city-guide" aria-live="polite">
    <button className="guide-close" onClick={onClose} aria-label="关闭城市介绍"><X /></button>
    <div className="guide-scroll">
      <p className="eyebrow">山东 · {city.adcode}</p>
      <h2>{city.name}</h2>
      <p className="province-city-tagline">{city.tagline}</p>
      <div className="province-city-stamp" aria-hidden="true"><span>{city.name.slice(0, 1)}</span><small>SHANDONG</small></div>
      <section><h3><Compass />当地特色</h3><div className="city-highlight-list">{city.highlights.map((highlight) => <span key={highlight}>{highlight}</span>)}</div></section>
      <section className="city-route-status"><h3><RouteIcon />行程状态</h3><p>{city.itineraryId ? '已加入 07.31—08.04 山东情侣路线。' : '暂未加入本次固定路线，可作为下一次山东旅行的备选。'}</p></section>
      {onOpen && <button className="open-city-button" type="button" onClick={onOpen}>进入{city.name}详细行程<ChevronRight /></button>}
    </div>
  </aside>;
}

function GuidePanel({ spot, moving, photo, onPhotoChange, onEdit, onDelete, onClose }: { spot: Spot | null; moving: boolean; photo?: string; onPhotoChange: (photo?: string) => void; onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useEffect(() => { setConfirmingDelete(false); }, [spot?.id]);
  if (!spot) return <aside className="guide-panel empty-guide"><div className="postcard-stack" aria-hidden="true"><span>青岛</span><span>泰山</span><span>济南</span></div><p className="eyebrow">下一站，由你决定</p><h2>点击地图上的地点</h2><p>两位旅行角色会跑向目的地，到达后打开门票、交通、美食和避坑攻略。</p><div className="empty-hint"><RouteIcon />已按少折返路线排好顺序</div></aside>;
  return <aside className="guide-panel active-guide" aria-live="polite">
    <button className="guide-close" onClick={onClose} aria-label="关闭攻略"><ArrowLeft /></button>
    <div className="guide-scroll">
      <p className="eyebrow">D{spot.day} · {spot.recommendedTime}</p>
      <h2>{moving ? `正在前往${spot.shortName}…` : spot.name}</h2>
      <div className="spot-management">
        <button type="button" className="spot-manage-button" onClick={onEdit}><Pencil />编辑景点</button>
        {confirmingDelete ? <div className="delete-confirm"><span>确认删除“{spot.shortName}”？</span><button type="button" onClick={onDelete}>确认删除</button><button type="button" onClick={() => setConfirmingDelete(false)}>取消</button></div> : <button type="button" className="spot-manage-button danger" onClick={() => setConfirmingDelete(true)}><Trash2 />删除景点</button>}
      </div>
      <TravelPhoto spotName={spot.shortName} photo={photo} onChange={onPhotoChange} />
      <p className="guide-lead">{spot.description}</p>
      <div className="quick-facts"><span><Clock3 />{spot.duration}</span><span><Ticket />{spot.price}</span><span><Bus />{spot.transport}</span></div>
      <section><h3><Sparkles />到这里怎么玩</h3><ul>{spot.highlights.map((item) => <li key={item}>{item}</li>)}</ul></section>
      {spot.foods.length > 0 && <section><h3><Utensils />这一站吃什么</h3><div className="food-tags">{spot.foods.map((item) => <span key={item}>{item}</span>)}</div></section>}
      <section className="saving-section"><h3><WalletCards />省钱提示</h3><ul>{spot.savingTips.map((item) => <li key={item}>{item}</li>)}</ul></section>
      {spot.safetyNotices.length > 0 && <section className="safety-section"><h3><ShieldAlert />安全提醒</h3><ul>{spot.safetyNotices.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    </div>
  </aside>;
}

export default App;
