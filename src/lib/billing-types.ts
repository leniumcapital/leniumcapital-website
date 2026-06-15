import type { AddonId } from "@/lib/pricing";

export type BillingOrderStatus = "pending" | "paid";
export type BillingPlanType = "challenge" | "reset";

export type BillingOrderDto = {
  id: string;
  orderId: string;
  accountNumber: string | null;
  balance: number;
  price: number;
  status: BillingOrderStatus;
  planType: BillingPlanType;
  tierSize: number;
  addons: AddonId[];
  createdAt: string;
  paidAt: string | null;
};
