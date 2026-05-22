import type { InsertExpense } from "../../../backend/src/db/schema";

export interface ProjectInstallmentsParams {
  description: string;
  totalAmount: number;
  installmentsCount: number;
  status: "BUDGET" | "CONFIRMED";
  category: "TAX" | "PRODUCT" | "SERVICE" | "FURNITURE" | "APPLIANCE" | "RENOVATION";
  priority: "HIGH" | "MEDIUM" | "LOW";
  roomId?: string | null;
  dueDate: string | Date;
}

/**
 * Robustly adds months to a Date in UTC, preserving the day of month
 * and clamping to the maximum days in the target month (e.g. Jan 31 + 1 month -> Feb 28).
 */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const originalDay = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const maxDays = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(originalDay, maxDays));
  return d;
}

/**
 * Projects a base expense into multiple installments.
 *
 * @param params Details of the expense and installment configuration.
 * @returns An array of InsertExpense objects representing each installment.
 */
export function projectInstallments(params: ProjectInstallmentsParams): InsertExpense[] {
  const installments: InsertExpense[] = [];
  const baseDate = typeof params.dueDate === "string" ? new Date(params.dueDate) : params.dueDate;
  const singleAmount = params.totalAmount / params.installmentsCount;

  for (let i = 1; i <= params.installmentsCount; i++) {
    const installmentDate = addMonths(baseDate, i - 1);

    installments.push({
      description: `${params.description} (${i}/${params.installmentsCount})`,
      totalAmount: singleAmount,
      installmentsCount: params.installmentsCount,
      status: params.status,
      category: params.category,
      priority: params.priority,
      roomId: params.roomId ?? null,
      dueDate: installmentDate,
    });
  }

  return installments;
}
