import type { Constraint, PlanItem } from "@/domain";
import type { TripFixture } from "@/fixtures/types";
import type {
  BudgetCategory,
  BudgetCategorySummary,
  BudgetItem,
  BudgetSummary,
} from "@/domain/budget/types";

export interface CalculateBudgetParams {
  items: PlanItem[];
  fixture: TripFixture;
  selectedTicketId?: string | null;
  constraints?: Constraint[];
}

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  TICKET: "门票与票券",
  TRANSPORT: "交通与打车",
  DINING: "餐饮美馔",
  LODGING: "酒店住宿",
  OTHER: "其他备用",
};

export function calculateTripBudget(params: CalculateBudgetParams): BudgetSummary {
  const { items, fixture, selectedTicketId, constraints = [] } = params;

  const isHongKong = fixture.fixtureId === "hong-kong";
  const currency = isHongKong ? "HKD" : "CNY";

  // Determine party size: default 3 for HK (elderly + user), 2 for BJ (couple/friends)
  const partySize =
    fixture.bookingTasks[0]?.partySize ?? (isHongKong ? 3 : 2);

  const budgetItems: BudgetItem[] = [];

  // 1. Calculate Tickets
  if (isHongKong) {
    // Hong Kong tickets: selected tram ticket
    const chosenTicketId = selectedTicketId || "tram-return";
    const ticketOption =
      fixture.tickets.find((t) => t.id === chosenTicketId) ??
      fixture.tickets[0];

    if (ticketOption && ticketOption.price !== null) {
      budgetItems.push({
        id: `ticket-${ticketOption.id}`,
        category: "TICKET",
        name: ticketOption.name,
        amount: ticketOption.price * partySize,
        unitPrice: ticketOption.price,
        quantity: partySize,
        unitLabel: "人",
        currency,
        isConfirmed: Boolean(selectedTicketId),
        notes: `包含：${ticketOption.includes.join("、")}`,
        source: "MOCK",
      });
    }

    // Check if Museum is in the items
    const hasMuseum = items.some((item) => item.placeId === "hk-history-museum");
    if (hasMuseum) {
      budgetItems.push({
        id: "ticket-hk-museum",
        category: "TICKET",
        name: "香港历史博物馆门票",
        amount: 0,
        unitPrice: 0,
        quantity: partySize,
        unitLabel: "人",
        currency,
        isConfirmed: true,
        notes: "常设展览免费参观（特别展览另计）",
        source: "MOCK",
      });
    }
  } else {
    // Beijing tickets
    const BJ_TICKET_PRICES: Record<string, { name: string; price: number; notes: string }> = {
      "bj-forbidden-city": {
        name: "故宫博物院大门票",
        price: 60,
        notes: "旺季成人门票，需提前实名预约",
      },
      "bj-national-museum": {
        name: "中国国家博物馆入馆预约",
        price: 0,
        notes: "免费参观，需提前实名预约放票",
      },
      "bj-temple-of-heaven": {
        name: "天坛公园联票",
        price: 34,
        notes: "含大门票、祈年殿、回音壁等",
      },
      "bj-badaling": {
        name: "八达岭长城门票＋往返缆车",
        price: 140,
        notes: "含长城门票40元＋往返缆车100元",
      },
      "bj-prince-gong": {
        name: "恭王府门票",
        price: 40,
        notes: "成人全价票，需提前在线预约",
      },
    };

    const visitedPlaces = new Set<string>();
    for (const item of items) {
      if (item.placeId && BJ_TICKET_PRICES[item.placeId] && !visitedPlaces.has(item.placeId)) {
        visitedPlaces.add(item.placeId);
        const info = BJ_TICKET_PRICES[item.placeId];
        budgetItems.push({
          id: `ticket-${item.placeId}`,
          category: "TICKET",
          name: info.name,
          amount: info.price * partySize,
          unitPrice: info.price,
          quantity: partySize,
          unitLabel: "人",
          currency,
          isConfirmed: true,
          notes: info.notes,
          source: "MOCK",
        });
      }
    }
  }

  // 2. Calculate Transport
  let transitCount = 0;
  let taxiCount = 0;

  for (const item of items) {
    if (item.type === "TRANSIT") {
      if (item.transportMode === "TAXI" || item.title.includes("出租车")) {
        taxiCount += 1;
      } else {
        transitCount += 1;
      }
    }
  }

  if (isHongKong) {
    if (taxiCount > 0) {
      const taxiFarePerTrip = 85;
      budgetItems.push({
        id: "transport-hk-taxi",
        category: "TRANSPORT",
        name: "山顶下山出租车（预估）",
        amount: taxiFarePerTrip * taxiCount,
        unitPrice: taxiFarePerTrip,
        quantity: taxiCount,
        unitLabel: "车次",
        currency,
        isConfirmed: false,
        notes: "山顶至中环/金钟出租车标准计价预估",
        source: "ESTIMATED",
      });
    }
    if (transitCount > 0) {
      // Average 18 HKD per person per transit leg (Port line + urban lines)
      const avgTransitFare = 18;
      budgetItems.push({
        id: "transport-hk-transit",
        category: "TRANSPORT",
        name: "港铁及市区公共交通（预估）",
        amount: avgTransitFare * partySize * transitCount,
        unitPrice: avgTransitFare * partySize,
        quantity: transitCount,
        unitLabel: "行程段",
        currency,
        isConfirmed: false,
        notes: `含口岸过境段与市区换乘，人均约 ${avgTransitFare} HKD/段`,
        source: "ESTIMATED",
      });
    }
  } else {
    // Beijing transport
    if (taxiCount > 0) {
      const bjTaxiFare = 110;
      budgetItems.push({
        id: "transport-bj-taxi",
        category: "TRANSPORT",
        name: "送机出租车/网约车（预估）",
        amount: bjTaxiFare * taxiCount,
        unitPrice: bjTaxiFare,
        quantity: taxiCount,
        unitLabel: "车次",
        currency,
        isConfirmed: false,
        notes: "市区至首都机场中长途计价预估",
        source: "ESTIMATED",
      });
    }
    if (transitCount > 0) {
      // Airport express is ~28 RMB/person, ordinary subway ~5 RMB/person
      const avgBjTransitFare = 10;
      budgetItems.push({
        id: "transport-bj-transit",
        category: "TRANSPORT",
        name: "机场快轨及城市地铁（预估）",
        amount: avgBjTransitFare * partySize * transitCount,
        unitPrice: avgBjTransitFare * partySize,
        quantity: transitCount,
        unitLabel: "行程段",
        currency,
        isConfirmed: false,
        notes: `含机场快轨与多日地铁换乘，人均约 ${avgBjTransitFare} 元/段`,
        source: "ESTIMATED",
      });
    }
  }

  // 3. Calculate Dining
  const mealItems = items.filter(
    (item) => item.type === "MEAL" || item.title.includes("餐") || item.title.includes("午餐") || item.title.includes("晚餐"),
  );
  const mealCount = mealItems.length > 0 ? mealItems.length : (isHongKong ? 1 : fixture.days * 2);

  if (isHongKong) {
    const mealAvg = 150;
    budgetItems.push({
      id: "dining-hk",
      category: "DINING",
      name: "中环特色粤菜午餐（预估）",
      amount: mealAvg * partySize * mealCount,
      unitPrice: mealAvg * partySize,
      quantity: mealCount,
      unitLabel: "餐",
      currency,
      isConfirmed: false,
      notes: "中环及尖沙咀地道茶餐厅或粤菜人均约 150 HKD",
      source: "ESTIMATED",
    });
  } else {
    const bjMealAvg = 80;
    budgetItems.push({
      id: "dining-bj",
      category: "DINING",
      name: "正餐与北京风味餐饮（预估）",
      amount: bjMealAvg * partySize * mealCount,
      unitPrice: bjMealAvg * partySize,
      quantity: mealCount,
      unitLabel: "餐",
      currency,
      isConfirmed: false,
      notes: `5日行程共约 ${mealCount} 餐正餐，人均约 ${bjMealAvg} 元/餐`,
      source: "ESTIMATED",
    });
  }

  // 4. Calculate Lodging for multi-day trips
  if (fixture.days > 1) {
    const nights = fixture.days - 1;
    const roomRatePerNight = isHongKong ? 800 : 450;
    budgetItems.push({
      id: "lodging-stay",
      category: "LODGING",
      name: "舒适型酒店住宿（预估）",
      amount: roomRatePerNight * nights,
      unitPrice: roomRatePerNight,
      quantity: nights,
      unitLabel: "晚",
      currency,
      isConfirmed: false,
      notes: `核心商圈标准双人间约 ${roomRatePerNight} ${currency}/晚 × ${nights} 晚`,
      source: "ESTIMATED",
    });
  }

  // Aggregate Category Summaries
  const categoriesMap = new Map<BudgetCategory, BudgetCategorySummary>();
  const allCategories: BudgetCategory[] = ["TICKET", "TRANSPORT", "DINING"];
  if (fixture.days > 1) {
    allCategories.push("LODGING");
  }

  for (const cat of allCategories) {
    categoriesMap.set(cat, {
      category: cat,
      label: CATEGORY_LABELS[cat],
      confirmed: 0,
      estimated: 0,
      total: 0,
      items: [],
    });
  }

  let totalConfirmed = 0;
  let totalEstimated = 0;

  for (const item of budgetItems) {
    let summary = categoriesMap.get(item.category);
    if (!summary) {
      summary = {
        category: item.category,
        label: CATEGORY_LABELS[item.category] ?? "其他",
        confirmed: 0,
        estimated: 0,
        total: 0,
        items: [],
      };
      categoriesMap.set(item.category, summary);
    }
    summary.items.push(item);
    summary.total += item.amount;
    if (item.isConfirmed) {
      summary.confirmed += item.amount;
      totalConfirmed += item.amount;
    } else {
      summary.estimated += item.amount;
      totalEstimated += item.amount;
    }
  }

  const totalAmount = totalConfirmed + totalEstimated;

  // Check budget constraint
  let budgetLimit: number | null = null;
  for (const c of constraints) {
    if (c.category === "BUDGET") {
      const val = c.value as Record<string, unknown> | number | undefined;
      if (typeof val === "number") {
        budgetLimit = val;
      } else if (val && typeof val === "object") {
        if (typeof val.max === "number") budgetLimit = val.max;
        else if (typeof val.amount === "number") budgetLimit = val.amount;
        else if (typeof val.limit === "number") budgetLimit = val.limit;
      }
      if (budgetLimit === null) {
        // Try parsing numbers from summary or sourceQuote
        const match = (c.summary + " " + c.sourceQuote).match(/(\d+[\d,]*)/);
        if (match) {
          const parsed = parseInt(match[1].replace(/,/g, ""), 10);
          if (!Number.isNaN(parsed) && parsed > 50) {
            budgetLimit = parsed;
          }
        }
      }
      if (budgetLimit !== null) break;
    }
  }

  const isOverBudget = budgetLimit !== null && totalAmount > budgetLimit;
  const overBudgetAmount = isOverBudget && budgetLimit !== null ? totalAmount - budgetLimit : 0;

  return {
    currency,
    partySize,
    totalConfirmed,
    totalEstimated,
    totalAmount,
    budgetLimit,
    isOverBudget,
    overBudgetAmount,
    categories: Array.from(categoriesMap.values()),
    items: budgetItems,
  };
}
