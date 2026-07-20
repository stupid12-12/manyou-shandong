import type { City, MapPoint, RouteSegment, Spot, TripPayload } from './index.js';

const route = (cityId: City['id'], from: Spot, to: Spot): RouteSegment => {
  const bend = Math.max(18, Math.abs(to.position.x - from.position.x) * 0.12);
  const cx = (from.position.x + to.position.x) / 2;
  const cy = (from.position.y + to.position.y) / 2 - bend;
  return { id: `${from.id}-${to.id}`, cityId, from: from.id, to: to.id, path: `M ${from.position.x} ${from.position.y} Q ${cx} ${cy} ${to.position.x} ${to.position.y}` };
};

const spot = (
  id: string,
  cityId: Spot['cityId'],
  day: number,
  order: number,
  name: string,
  shortName: string,
  category: Spot['category'],
  position: MapPoint,
  recommendedTime: string,
  duration: string,
  price: string,
  transport: string,
  description: string,
  highlights: string[],
  foods: string[],
  savingTips: string[],
  safetyNotices: string[] = []
): Spot => ({ id, cityId, day, order, name, shortName, category, position, recommendedTime, duration, price, transport, description, highlights, foods, savingTips, safetyNotices });

const qingdaoSpots: Spot[] = [
  spot('qingdao-station', 'qingdao', 1, 1, '青岛站', '抵达', 'transport', { x: 105, y: 510 }, '7月31日 15:00', '30分钟', '地铁2元起', '出站后步行或地铁前往老城', '旅程从红瓦车站开始，先寄存行李，再用一个傍晚认识青岛老城。', ['站房合影', '行李寄存', '步行进入老城'], [], ['住宿优先看中山路、台东或青岛北站地铁沿线。']),
  spot('zhanqiao', 'qingdao', 1, 2, '栈桥', '栈桥', 'sight', { x: 205, y: 520 }, '16:30—17:20', '50分钟', '免费', '青岛站步行约10分钟', '从海风、回澜阁和老城天际线开始第一站，傍晚光线更柔和。', ['回澜阁远景', '海边散步', '老城第一张合照'], ['鲅鱼水饺'], ['不购买景区门口高价纪念品。'], ['礁石湿滑，涨潮时不要向外走。']),
  spot('old-town', 'qingdao', 1, 3, '中山路与里院', '老城', 'sight', { x: 325, y: 430 }, '17:30—20:00', '2.5小时', '免费', '从栈桥步行串联天主教堂、银鱼巷和大鲍岛', '沿红瓦街区慢慢走，把晚餐留给老城小店。', ['天主教堂外观', '银鱼巷', '里院建筑'], ['排骨米饭', '锅贴'], ['教堂只看外观即可，付费项目按兴趣选择。']),
  spot('badaguan', 'qingdao', 2, 1, '八大关与第二浴场', '八大关', 'sight', { x: 455, y: 390 }, '8月1日 08:00—10:30', '2.5小时', '免费', '地铁3号线至中山公园后步行', '清晨走林荫道和海岸，不进入收费建筑也能感受青岛最经典的红瓦绿树。', ['临淮关路', '第二海水浴场', '太平角'], ['青岛甜沫早餐'], ['早出发避开周末人流。'], ['正规浴场开放区外不要下水。']),
  spot('silver-beach', 'qingdao', 2, 2, '银沙滩赶海', '赶海', 'experience', { x: 585, y: 535 }, '按低潮前2小时调整', '3小时', '免费；末段交通约20—40元', '地铁1号线进入西海岸，末段公交或打车', '选银沙滩西侧的沙滩和礁石交界，兼顾人少、散步与初次赶海。', ['小螃蟹和海螺观察', '沙滩散步', '西海岸拍照'], [], ['出发前24小时查看青岛官方海洋预报。', '工具现场购买控制在20—30元。'], ['穿包脚溯溪鞋；低潮后立即撤离；雷雨、大浪或警示时取消。']),
  spot('beer-museum', 'qingdao', 2, 3, '青岛啤酒博物馆', '啤酒馆', 'sight', { x: 630, y: 310 }, '15:30—17:00', '1.5小时', '基础票约60元/人', '地铁至利津路或台东后步行', '百年老厂房、酿造工艺和品酒体验是青岛最值得保留的付费项目。', ['德式老厂房', '生产线', '两杯品鉴'], ['原浆啤酒'], ['只买基础双馆票，不购买高价体验套票。'], ['饮酒后不要骑车或下海。']),
  spot('yingkou-market', 'qingdao', 2, 4, '营口路买海鲜与啤酒屋', '海鲜局', 'food', { x: 735, y: 260 }, '17:10—20:00', '2.5小时', '两人约150—230元', '从台东步行前往市场和周边啤酒屋', '自己挑三种海鲜，再交给明码标价的啤酒屋加工，是最有参与感的一顿晚餐。', ['看秤称重', '加工做法自选', '袋装鲜啤'], ['辣炒蛤蜊', '白灼海虾', '清蒸扇贝'], ['海鲜控制在80—130元；先问加工费和最低消费。'], ['倒掉袋中积水后复称；不跟主动拉客人员走；陌生赶海收获不要食用。']),
  spot('xiaoyushan', 'qingdao', 3, 1, '大学路与小鱼山', '小鱼山', 'sight', { x: 390, y: 270 }, '8月2日 08:00—10:00', '2小时', '免费', '地铁人民会堂站步行', '出发去泰安前，用一段轻松的老城高处视角收尾。', ['大学路街角', '龙江路', '红瓦海景'], ['早餐馄饨'], ['小鱼山和信号山二选一。']),
  spot('olympic-center', 'qingdao', 2, 5, '五四广场与奥帆中心', '奥帆', 'sight', { x: 865, y: 355 }, '可选 20:00—21:30', '1.5小时', '免费', '地铁2号线五四广场站', '如果赶海结束较早，可把夜景作为当天的可选收尾。', ['五月的风', '情人坝', '海湾夜景'], [], ['体力不足时直接放弃，不为打卡跨城折返。'])
];

const taianSpots: Spot[] = [
  spot('taian-station', 'taian', 3, 1, '泰安站', '泰安站', 'transport', { x: 115, y: 545 }, '8月2日 下午', '40分钟', '青岛至泰安约150—190元/人', '高铁抵达后前往岱庙—红门附近住宿', '住宿不要选在高铁站周边，第二天从红门早起登山更省时间。', ['行李补给', '确认泰山预约'], ['泰山煎饼'], ['酒店选择红门或岱庙附近。']),
  spot('daimiao', 'taian', 3, 2, '岱庙与泰安老城', '岱庙', 'sight', { x: 270, y: 485 }, '16:30—18:30', '2小时', '按当日票务页面', '市区公交或步行', '下午只做轻量游览，为第二天登山保留体力。', ['宫城格局', '古柏与碑刻', '泰安老街'], ['泰山炒鸡', '豆腐宴'], ['门票关系以购票页为准，不提前购买组合套票。']),
  spot('hongmen', 'taian', 4, 1, '红门登山口', '红门', 'experience', { x: 420, y: 445 }, '8月3日 06:00', '起点', '泰山115元/人；学生57元/人', '酒店寄存行李后步行或短途打车', '走古迹最多、最经典也最省钱的全程徒步路线。', ['红门宫', '御道起点', '清晨出发'], ['水和轻便早餐'], ['提前实名预约；在山下备水但不要背太多。'], ['雷雨、大风或景区关闭时不得登山。']),
  spot('zhongtianmen', 'taian', 4, 2, '中天门', '中天门', 'sight', { x: 565, y: 330 }, '09:00左右', '30分钟', '包含于泰山门票', '红门徒步约3小时', '这里是半程补给点，确认体力后再进入更陡的后半段。', ['阶段休息', '山景平台', '补充能量'], ['煎饼或泡面'], ['山顶价格更高，在此补充必要饮水。']),
  spot('eighteen-bends', 'taian', 4, 3, '十八盘', '十八盘', 'experience', { x: 690, y: 225 }, '10:00—11:30', '1.5小时', '包含于泰山门票', '中天门继续徒步', '泰山最具压迫感和成就感的一段石阶，按自己的节奏走。', ['陡峭石阶', '回望山谷', '南天门仰拍'], [], ['小步慢走，不与人竞速。'], ['不要边走边拍；靠内侧停稳后再拍照。']),
  spot('nantianmen', 'taian', 4, 4, '南天门与天街', '南天门', 'sight', { x: 805, y: 150 }, '11:30—13:00', '1.5小时', '包含于泰山门票', '穿过十八盘抵达', '登顶后先补充体力，再沿天街前往玉皇顶。', ['南天门牌坊', '天街', '云海视野'], ['热汤面'], ['不购买昂贵祈福纪念品。']),
  spot('yuhuangding', 'taian', 4, 5, '玉皇顶', '玉皇顶', 'sight', { x: 900, y: 85 }, '12:30左右', '40分钟', '包含于泰山门票', '天街步行抵达', '全程最高点打卡，之后原路徒步下山，傍晚前往济南。', ['五岳独尊', '峰顶合影', '完成登顶'], [], ['膝盖不适时再现场购买索道和景区车。'], ['下午及时下撤，不在疲劳状态下追赶末班交通。'])
];

const jinanSpots: Spot[] = [
  spot('jinan-station', 'jinan', 4, 1, '抵达济南', '济南', 'transport', { x: 115, y: 445 }, '8月3日 晚间', '40分钟', '泰安至济南约13—25元/人', '入住泉城广场—大明湖—济南站之间', '登山后只安排入住和晚餐，第二天沿泉水老城步行。', ['入住休息', '恢复体力'], ['把子肉'], ['选择地铁或公交方便的位置。']),
  spot('baotu-spring', 'jinan', 5, 1, '趵突泉', '趵突泉', 'sight', { x: 285, y: 430 }, '8月4日 08:00—09:30', '1.5小时', '成人40元；符合政策大学生可免费', '老城区公交或步行', '早晨先看泉水核心景观，避开中午人流。', ['三股水', '李清照纪念堂', '清晨园林'], ['甜沫', '油旋'], ['大学生提前在369出行查看畅游卡政策。']),
  spot('heihu-spring', 'jinan', 5, 2, '泉城广场与黑虎泉', '黑虎泉', 'sight', { x: 455, y: 360 }, '09:40—11:30', '2小时', '免费', '从趵突泉沿护城河步行', '沿泉水和垂柳前进，看本地人取泉水，比商业街更有生活感。', ['泉城广场', '护城河', '解放阁外观'], ['草包包子'], ['自带水杯，是否可直接饮用以现场提示为准。']),
  spot('kuanhouli', 'jinan', 5, 3, '宽厚里与曲水亭街', '曲水亭', 'food', { x: 620, y: 300 }, '11:30—14:00', '2.5小时', '免费；餐饮两人60—100元', '黑虎泉步行前往', '宽厚里适合短逛，把主要时间留给更安静的曲水亭街和百花洲。', ['老城水巷', '百花洲', '居民生活'], ['把子肉', '奶汤蒲菜'], ['商业街只尝一两样，正餐去旁边居民区。']),
  spot('daming-lake', 'jinan', 5, 4, '大明湖', '大明湖', 'sight', { x: 805, y: 190 }, '14:00—17:00', '3小时', '免费', '从曲水亭街向北步行', '用湖岸、荷花和老城天际线结束山东旅程。', ['湖畔漫步', '超然楼外观', '荷花景观'], ['九转大肠可按预算选择'], ['不上收费游船也能完整游览湖岸。'])
];

const withRoutes = (city: Omit<City, 'routes'>): City => ({
  ...city,
  routes: city.spots.slice(0, -1).map((item, index) => route(city.id, item, city.spots[index + 1]!))
});

const emptyCity = (id: Exclude<City['id'], 'shandong'>, name: string, subtitle: string, accent: string): City => ({
  id, name, dates: '08.01—08.01', subtitle, accent, days: [1], spots: [], routes: []
});

export const tripData: TripPayload = {
  title: '漫游山东 · 两个人的山海泉城记',
  dateRange: '2026.07.31 — 08.04',
  budget: '两人约 ¥1,900—2,850',
  cities: [
    { id: 'shandong', name: '山东总览', dates: '5天4晚', subtitle: '从海边出发，翻过泰山，在泉水边收尾', accent: '#e96d55', days: [1, 2, 3, 4, 5], spots: [], routes: [] },
    withRoutes({ id: 'qingdao', name: '青岛', dates: '07.31—08.02', subtitle: '红瓦、海风、赶海与鲜啤', accent: '#27798a', days: [1, 2, 3], spots: qingdaoSpots }),
    withRoutes({ id: 'taian', name: '泰安', dates: '08.02—08.03', subtitle: '沿御道一步步走上五岳之首', accent: '#568457', days: [3, 4], spots: taianSpots }),
    withRoutes({ id: 'jinan', name: '济南', dates: '08.03—08.04', subtitle: '跟着泉水穿过老城与荷风', accent: '#537ca8', days: [4, 5], spots: jinanSpots }),
    emptyCity('zibo', '淄博', '陶琉、齐文化与烟火滋味', '#a6634b'),
    emptyCity('zaozhuang', '枣庄', '运河古城与湖荡风光', '#4f7f72'),
    emptyCity('dongying', '东营', '在黄河入海处看湿地飞鸟', '#9b6f3f'),
    emptyCity('yantai', '烟台', '沿仙境海岸慢游葡萄酒乡', '#477f9c'),
    emptyCity('weifang', '潍坊', '风筝、年画与青州古城', '#6c824c'),
    emptyCity('jining', '济宁', '从孔孟故里走到运河湖区', '#8b6253'),
    emptyCity('weihai', '威海', '沿环海路寻找安静海湾', '#397f91'),
    emptyCity('rizhao', '日照', '阳光海岸、森林与赶海', '#3f8790'),
    emptyCity('linyi', '临沂', '沂蒙山水与琅琊旧梦', '#6f7650'),
    emptyCity('dezhou', '德州', '运河古韵与地道扒鸡', '#9a7044'),
    emptyCity('liaocheng', '聊城', '在江北水城环湖访古', '#537b9b'),
    emptyCity('binzhou', '滨州', '黄河岸边探访孙子故里', '#758557'),
    emptyCity('heze', '菏泽', '牡丹花城与鲁西南滋味', '#a35f72')
  ]
};
