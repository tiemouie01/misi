"use server";

import { revalidatePath } from "next/cache";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createTransactionTemplate,
  updateTransactionTemplate,
  deleteTransactionTemplate,
} from "~/server/db/mutations";
import type {
  TransactionTemplate,
  NewTransaction,
  NewTransactionTemplate,
} from "~/server/db/schema";
import {
  transactionFormSchema,
  templateFormSchema,
  type TransactionFormValues,
  type TemplateFormValues,
} from "~/lib/validations/transactions";

export async function addOrUpdateTransaction(values: TransactionFormValues) {
  const parsed = transactionFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  }

  const v = parsed.data;
  const payload: NewTransaction = {
    id: v.id ?? crypto.randomUUID(),
    userId: v.userId,
    type: v.type,
    amount: v.amount.toString(),
    categoryName: v.categoryName,
    description: v.description,
    date: v.date,
    revenueStream: v.type === "expense" ? (v.revenueStream ?? null) : null,
  };

  const result = v.id
    ? await updateTransaction(v.userId, v.id, payload)
    : await createTransaction(payload);

  if (result.error) {
    return { success: false, error: result.error } as const;
  }

  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true } as const;
}

export async function deleteTransactionAction(id: string, userId: string) {
  const res = await deleteTransaction(userId, id);
  if (res.error) return { success: false, error: res.error } as const;
  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true } as const;
}

export async function addOrUpdateTemplate(values: TemplateFormValues) {
  const parsed = templateFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  }

  const v = parsed.data;
  const payload: NewTransactionTemplate = {
    id: v.id ?? crypto.randomUUID(),
    userId: v.userId,
    type: v.type,
    amount: v.amount.toString(),
    categoryName: v.categoryName,
    description: v.description,
    revenueStream: v.type === "expense" ? (v.revenueStream ?? null) : null,
  };

  const result = v.id
    ? await updateTransactionTemplate(v.userId, v.id, payload)
    : await createTransactionTemplate(payload);

  if (result.error) {
    return { success: false, error: result.error } as const;
  }

  revalidatePath("/transactions");
  return { success: true } as const;
}

export async function deleteTemplateAction(id: string, userId: string) {
  const res = await deleteTransactionTemplate(userId, id);
  if (res.error) return { success: false, error: res.error } as const;
  revalidatePath("/transactions");
  return { success: true } as const;
}

export async function useTemplateAction(
  template: Pick<
    TransactionTemplate,
    | "id"
    | "userId"
    | "type"
    | "amount"
    | "categoryName"
    | "description"
    | "revenueStream"
  >,
) {
  const payload: NewTransaction = {
    id: crypto.randomUUID(),
    userId: template.userId,
    type: template.type,
    amount: template.amount.toString(),
    categoryName: template.categoryName,
    description: template.description,
    date: new Date(),
    revenueStream:
      template.type === "expense" ? (template.revenueStream ?? null) : null,
  };
  const res = await createTransaction(payload);
  if (res.error) return { success: false, error: res.error } as const;
  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true } as const;
}
