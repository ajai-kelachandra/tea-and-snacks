import { format } from "date-fns";
import { Order } from "@/features/ordersSlice";

export interface ProcessedOrderItem {
  itemId: string;
  name: string;
  quantity: number;
  type: string;
  billableQty: number;
}

export interface ProcessedOrderInfo {
  items: ProcessedOrderItem[];
  extraCharge: number;
}

/**
 * Calculates billable quantities and extra charges for snacks and teas.
 * The daily limit is 2 free snacks/teas combined per user per day.
 * Extra snacks/teas above 2 cost Rs 12 each.
 * 
 * @param orders All orders in the system or for a specific user.
 *               To get completely accurate chronological calculations,
 *               pass the entire list of orders.
 */
export function calculateOrderCharges(orders: Order[]): Record<string, ProcessedOrderInfo> {
  // Sort active orders chronologically (oldest first) so that the first 2 snacks/teas of the day are free.
  const activeOrders = [...orders]
    .filter((o) => o.status !== "cancelled")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const userDailyCounts: Record<string, number> = {}; // key: userId_yyyy-MM-dd
  const results: Record<string, ProcessedOrderInfo> = {};

  activeOrders.forEach((order) => {
    const dateKey = format(new Date(order.createdAt), "yyyy-MM-dd");
    const userKey = `${order.userId}_${dateKey}`;

    const processedItems = order.items.map((item) => {
      let billableQty = 0;
      // Only snacks and teas count towards the daily limit
      if (item.type === "tea" || item.type === "snack") {
        for (let i = 0; i < item.quantity; i++) {
          userDailyCounts[userKey] = (userDailyCounts[userKey] || 0) + 1;
          if (userDailyCounts[userKey] > 2) {
            billableQty++;
          }
        }
      }
      return {
        ...item,
        billableQty,
      };
    });

    const totalBillable = processedItems.reduce((sum, item) => sum + item.billableQty, 0);
    const extraCharge = totalBillable * 12;

    results[order.id] = {
      items: processedItems,
      extraCharge,
    };
  });

  // Make sure cancelled orders or any other orders not in activeOrders have 0 charges and 0 billable items
  orders.forEach((order) => {
    if (!results[order.id]) {
      results[order.id] = {
        items: order.items.map((item) => ({ ...item, billableQty: 0 })),
        extraCharge: 0,
      };
    }
  });

  return results;
}
