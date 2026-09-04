export type InkSketchType =
  | "peak"
  | "palace"
  | "ferry"
  | "dining"
  | "museum"
  | "tram"
  | "garden"
  | "wall";

export interface DestinationImpression {
  placeId: string;
  name: string;
  subtitle: string;
  coverImage?: string | null;
  sketchType: InkSketchType;
  highlights: string[];
  seniorTips: string;
  bestTime: string;
  suggestedDuration: string;
  accessibilityRating: 1 | 2 | 3 | 4 | 5;
}

/**
 * Pre-curated high-precision benchmark impressions for Hong Kong & Beijing demo scenarios.
 */
const KNOWN_IMPRESSIONS: Record<string, DestinationImpression> = {
  // Hong Kong destinations
  "hk-victoria-peak": {
    placeId: "hk-victoria-peak",
    name: "太平山顶 · 凌霄阁",
    subtitle: "俯瞰维多利亚港天际线的城市制高点与壮阔夜色",
    coverImage: "/images/destinations/hk-victoria-peak.jpg",
    sketchType: "peak",
    highlights: [
      "360° 俯瞰维多利亚港两岸摩天大楼与海湾壮景",
      "凌霄阁商场内全楼层直梯与无障碍观景通道",
      "狮子亭设有长者遮阳休憩石亭，步行坡道平缓",
    ],
    seniorTips:
      "长者出行锦囊：山顶商场各楼层均通无障碍直梯；下午 16:30 后上山人流密集，建议日落前（17:00左右）抵达；下山建议选乘出租车，避免排队久站及走陡坡台阶。",
    bestTime: "傍晚 17:00–19:00（可同赏白昼维港与黄昏日落华灯）",
    suggestedDuration: "约 1.5 – 2 小时",
    accessibilityRating: 5,
  },
  "hk-peak-tram-lower": {
    placeId: "hk-peak-tram-lower",
    name: "中环山顶缆车站",
    subtitle: "百年传奇登山轨道，穿行于苍翠林荫与陡峭坡峰之间",
    coverImage: null,
    sketchType: "tram",
    highlights: [
      "运营超 130 年的历史登山缆车，倾斜角达 27 度",
      "翻新后全面配置无障碍宽闸机与长者轮椅等候区",
      "车厢全景超大车窗，仰望中环摩天楼群的独特视角",
    ],
    seniorTips:
      "长者出行锦囊：持长者八达通或特惠票可走优先通道；上下车月台微斜，请牵扶老人走稳防滑斜坡；如买单程票，下山直接搭乘出租车最省体力。",
    bestTime: "上午 09:30–11:00 或 傍晚 16:30 前",
    suggestedDuration: "约 30 – 45 分钟（含候车与车程）",
    accessibilityRating: 4,
  },
  "hk-central-lunch": {
    placeId: "hk-central-lunch",
    name: "中环老字号茶餐厅",
    subtitle: "香港市井烟火与地道港式点心、丝袜奶茶温润滋味",
    coverImage: null,
    sketchType: "dining",
    highlights: [
      "地道招牌虾饺皇、叉烧包与香滑热奶茶",
      "提供低糖、软糯易咀嚼的传统长者适口茶点",
      "中环地铁站与中环半山扶梯步行范围内，交通便利",
    ],
    seniorTips:
      "长者出行锦囊：茶餐厅饭点常需拼桌排队，建议提前于 11:30 入座；港式冷气普遍偏足，建议为同行老人备一件轻薄防风外套。",
    bestTime: "午间 11:30–13:00",
    suggestedDuration: "约 1 – 1.5 小时",
    accessibilityRating: 4,
  },
  "hk-tst-promenade": {
    placeId: "hk-tst-promenade",
    name: "尖沙咀海滨与星光大道",
    subtitle: "漫步维港水岸微风，仰眺对岸港岛宏丽天际线",
    coverImage: null,
    sketchType: "ferry",
    highlights: [
      "全平坦木质与石材亲水步道，轮椅通行无阻",
      "近距离观赏天星小轮穿梭与维港海浪波光",
      "沿途设有充足遮阳长椅，随时可坐下听海风休憩",
    ],
    seniorTips:
      "长者出行锦囊：海滨步道全程无台阶，极为适合长者漫步；下午 15:30 海风适宜、阳光斜照不刺眼；若疲劳可直接就近至天星码头乘船回中环。",
    bestTime: "午后 15:30–17:30",
    suggestedDuration: "约 1 – 1.5 小时",
    accessibilityRating: 5,
  },
  "hk-history-museum": {
    placeId: "hk-history-museum",
    name: "香港历史博物馆",
    subtitle: "暴雨与酷热天的最佳室内避风港，沉浸探寻香江光阴岁月",
    coverImage: null,
    sketchType: "museum",
    highlights: [
      "全室内中央空调恒温展厅，下雨或酷暑天最佳避险点",
      "服务台免费提供长者轮椅与随行拐杖借用",
      "多媒体声光电实景复原老香港民俗街道与渔舟",
    ],
    seniorTips:
      "长者出行锦囊：逢暴雨恶劣天气优先前往；场馆内休息长椅密集，无障碍直梯贯穿各展厅，安静舒适不费脚力。",
    bestTime: "恶劣天气全天 或 下午 14:00–16:30",
    suggestedDuration: "约 1.5 – 2 小时",
    accessibilityRating: 5,
  },

  // Beijing destinations
  "bj-forbidden-city": {
    placeId: "bj-forbidden-city",
    name: "故宫博物院（紫禁城）",
    subtitle: "红墙金瓦琉璃脊，六百年明清东方皇家殿宇之极",
    coverImage: null,
    sketchType: "palace",
    highlights: [
      "太和殿、中和殿、保和殿三大殿巍峨紫禁中轴",
      "午门与神武门均设有长者无障碍坡道与轮椅通道",
      "故宫文创、冰窖餐厅与珍宝馆长廊遮荫歇脚点",
    ],
    seniorTips:
      "长者出行锦囊：故宫中轴线石板路纵深较长，请尽量避开正午日晒；神武门出宫后单向不走回头路；文华殿与珍宝馆侧院相对幽静，长者可在此坐歇避暑。",
    bestTime: "上午 08:30–11:30（避开午后大客流与烈日）",
    suggestedDuration: "约 2.5 – 3.5 小时",
    accessibilityRating: 4,
  },
  "bj-temple-of-heaven": {
    placeId: "bj-temple-of-heaven",
    name: "天坛公园 · 祈年殿",
    subtitle: "蓝琉璃圆攒尖顶，古代帝王祈谷祭天之圣境与古柏松涛",
    coverImage: null,
    sketchType: "palace",
    highlights: [
      "标志性三重檐圆形祈年殿，精巧榫卯中国古建奇迹",
      "长廊与回音壁平整石板步道，古柏苍翠空气清新",
      "晨间常有北京市民习练太极，极富生活意趣",
    ],
    seniorTips:
      "长者出行锦囊：购买祈年殿联票无需重复排队；东门或南门进出坡道平整；丹陛桥两侧略有台阶，走外侧平缓坡道更省膝盖。",
    bestTime: "清晨 08:00–10:30 或 傍晚 16:00",
    suggestedDuration: "约 1.5 – 2 小时",
    accessibilityRating: 4,
  },
  "bj-badaling": {
    placeId: "bj-badaling",
    name: "八达岭长城",
    subtitle: "雄关漫道巨龙盘踞，居庸之险与长城内外万重苍翠",
    coverImage: null,
    sketchType: "wall",
    highlights: [
      "万里长城保存最完好、气势最壮阔的标志性雄关",
      "配备南北双线地面缆车站与全封闭滑道缆车",
      "好汉坡前设有观景长者休息驿站",
    ],
    seniorTips:
      "长者出行锦囊：切勿全程徒步攀登北八楼！务必提前预约乘坐往返全封闭缆车直达好汉坡下，再步行 50 米即可轻松留影，极大保护长者膝关节。",
    bestTime: "上午 09:00–11:30",
    suggestedDuration: "约 2 – 3 小时",
    accessibilityRating: 3,
  },
  "bj-national-museum": {
    placeId: "bj-national-museum",
    name: "中国国家博物馆",
    subtitle: "中华文明五千年重器宝藏与国家文化礼堂",
    coverImage: null,
    sketchType: "museum",
    highlights: [
      "古代中国展、后母戊鼎、四羊方尊等国之重宝",
      "全无障碍现代化场馆，超宽电梯与随手可借的轮椅",
      "室内舒适恒温，座椅充裕，环境肃穆典雅",
    ],
    seniorTips:
      "长者出行锦囊：安检较严格且展厅宏大，建议进门后直奔负一层「古代中国」核心展厅，其余展厅选择性打卡，避免疲劳。",
    bestTime: "上午 09:00–12:00",
    suggestedDuration: "约 2 – 2.5 小时",
    accessibilityRating: 5,
  },
  "bj-prince-gong": {
    placeId: "bj-prince-gong",
    name: "恭王府",
    subtitle: "一座恭王府，半部清代史；什刹海畔的王府深宅与古典园林",
    coverImage: null,
    sketchType: "garden",
    highlights: [
      "银安殿、嘉乐堂与后罩楼九十九间半的皇家规制",
      "后花园西洋门、蝠池与康熙御笔「福」字碑秘云洞",
      "假山叠石苍松修竹，北方园林融江南雅韵",
    ],
    seniorTips:
      "长者出行锦囊：福字碑所在滴翠岩秘云洞内光线稍暗且有石阶，长者进入需扶牢扶手防滑；园内茶歇亭是体验王府盖碗茶与长者歇脚的绝佳去处。",
    bestTime: "午后 14:00–16:00",
    suggestedDuration: "约 1.5 – 2 小时",
    accessibilityRating: 4,
  },
};

/**
 * Intelligent inferencer: If a place is in the known catalog, returns the hand-tuned benchmark.
 * Otherwise, dynamically infers a culturally matched impression, senior tips, highlights and
 * an ink-sketch motif from its name, category, and context for ANY arbitrary future trip!
 */
export function getOrInferImpression(
  placeId: string | null | undefined,
  name: string,
  category?: string,
  context?: { title?: string; address?: string; notes?: string },
): DestinationImpression {
  if (placeId && KNOWN_IMPRESSIONS[placeId]) {
    return KNOWN_IMPRESSIONS[placeId];
  }

  // Check if any known place name matches (e.g. user input says "太平山顶" or "故宫")
  for (const [key, impression] of Object.entries(KNOWN_IMPRESSIONS)) {
    if (name.includes(impression.name.slice(0, 4)) || impression.name.includes(name)) {
      return { ...impression, placeId: placeId ?? key };
    }
  }

  // Dynamic inference for arbitrary new places
  const lower = (name + " " + (category ?? "") + " " + (context?.title ?? "")).toLowerCase();

  let sketchType: InkSketchType = "palace";
  let subtitle = "值得静心驻足的雅致行程节点";
  let highlights = ["动线顺路安排，游览节奏从容舒适", "环境宜人，适宜出行人细致体验"];
  let seniorTips = "长者出行锦囊：建议随行长辈保持平缓步速，适时在就近阴凉处或长椅坐歇。";
  let bestTime = "上午 09:30–11:30 或 下午 15:00–17:00";
  let suggestedDuration = "约 1 – 1.5 小时";
  let accessibilityRating: 1 | 2 | 3 | 4 | 5 = 4;

  if (lower.includes("山") || lower.includes("峰") || lower.includes("岭") || lower.includes("岩") || lower.includes("高地")) {
    sketchType = "peak";
    subtitle = "极目远眺，山林葱茏与壮丽风光尽收眼底";
    highlights = ["观景视野开阔，空气清新", "备有歇脚观景平台，适合拍照留念"];
    seniorTips = "长者出行锦囊：山路台阶较多时建议尽量选择索道或接驳车；备好登山杖，注意防滑防风。";
    bestTime = "清晨 08:30–10:30 或 傍晚 16:30–18:00";
    suggestedDuration = "约 1.5 – 2.5 小时";
    accessibilityRating = 3;
  } else if (lower.includes("长城") || lower.includes("关") || lower.includes("堡") || lower.includes("隘")) {
    sketchType = "wall";
    subtitle = "雄关万里，感受岁月沧桑与磅礴气魄";
    highlights = ["视野恢弘雄伟，古今交融", "可乘坐缆车直达观景要塞，免去攀登辛劳"];
    seniorTips = "长者出行锦囊：长城台阶高低不一，建议乘索道至主要关隘驻足拍照，避免长距离攀爬。";
    bestTime = "上午 09:00–11:30（避开烈日与人潮）";
    suggestedDuration = "约 2 – 3 小时";
    accessibilityRating = 3;
  } else if (lower.includes("缆车") || lower.includes("索道") || lower.includes("小火车") || lower.includes("观光车")) {
    sketchType = "tram";
    subtitle = "代步观光动线，省力舒适饱览沿途景致";
    highlights = ["避免徒步攀爬劳累，极大节省体力", "车窗观景视野开阔，乘坐平稳"];
    seniorTips = "长者出行锦囊：上下车厢请注意踏空缝隙，听从工作人员指引；长者可走优先乘车通道。";
    bestTime = "上午 09:30–11:00 或 傍晚 16:30 前";
    suggestedDuration = "约 30 – 45 分钟";
    accessibilityRating = 5;
  } else if (lower.includes("海") || lower.includes("港") || lower.includes("码头") || lower.includes("轮") || lower.includes("渡") || lower.includes("湖") || lower.includes("江") || lower.includes("水")) {
    sketchType = "ferry";
    subtitle = "清风拂面，水天一色与亲水漫步悠闲时光";
    highlights = ["临水步行道平整宽敞，视野极佳", "微风轻拂，观赏水域舟船穿梭"];
    seniorTips = "长者出行锦囊：临水护栏旁请提醒老人注意脚下防滑；海风大时及时增添披巾防着凉。";
    bestTime = "午后 15:30–17:30（海风轻拂）";
    suggestedDuration = "约 1 – 1.5 小时";
    accessibilityRating = 5;
  } else if (lower.includes("餐") || lower.includes("茶") || lower.includes("饭") || lower.includes("食") || lower.includes("吃") || lower.includes("酒楼") || lower.includes("菜")) {
    sketchType = "dining";
    subtitle = "市井烟火寻味，品尝地道风味与暖心茶点";
    highlights = ["精选地道特色美食，风味纯正", "就餐环境舒适，提供温和易消化菜品选择"];
    seniorTips = "长者出行锦囊：用餐避开高峰期入座更宽敞；长者饮食建议以少油软糯、温热汤品为主。";
    bestTime = "午间 11:30–13:00 或 傍晚 17:30–19:00";
    suggestedDuration = "约 1 – 1.5 小时";
    accessibilityRating = 5;
  } else if (lower.includes("博物") || lower.includes("馆") || lower.includes("美术") || lower.includes("展") || lower.includes("纪念")) {
    sketchType = "museum";
    subtitle = "文博涵养之所，沉浸品味历史脉络与艺术瑰宝";
    highlights = ["全室内恒温环境，免受户外风雨烈日侵扰", "展陈丰富，馆内无障碍直梯与轮椅配套齐全"];
    seniorTips = "长者出行锦囊：场馆多有免费轮椅出借服务；观展动线较长，建议在重要展厅间隙多次小坐休息。";
    bestTime = "上午 09:00–11:30 或 下午 14:00–16:30";
    suggestedDuration = "约 1.5 – 2 小时";
    accessibilityRating = 5;
  } else if (lower.includes("园") || lower.includes("府") || lower.includes("庄") || lower.includes("堂") || lower.includes("居") || lower.includes("街") || lower.includes("寺") || lower.includes("观")) {
    sketchType = "garden";
    subtitle = "古意深幽，亭台楼阁与花木掩映的传统意韵";
    highlights = ["曲径通幽，古建雕梁画栋极具东方雅韵", "树木遮阴充足，石凳木廊随处可小憩"];
    seniorTips = "长者出行锦囊：古典园林门槛较高、假山路面微凸，行走时多留意脚下；游廊避暑避雨两相宜。";
    bestTime = "上午 08:30–10:30 或 下午 15:30–17:00";
    accessibilityRating = 4;
  }

  return {
    placeId: placeId ?? "custom-place",
    name,
    subtitle,
    coverImage: null,
    sketchType,
    highlights,
    seniorTips,
    bestTime,
    suggestedDuration,
    accessibilityRating,
  };
}
