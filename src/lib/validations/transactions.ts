import { z } from "zod";

export const transactionTypeEnum = z.enum(["income", "expense"]);

export const transactionFormSchema = z
  .object({
    id: z.string().optional(),
    userId: z.string().min(1),
    type: transactionTypeEnum,
    amount: z.coerce.number().positive(),
    categoryName: z.string().min(1, "Category is required"),
    description: z.string().min(1, "Description is required"),
    date: z.coerce.date(),
    revenueStream: z.string().optional().nullable(),
  })
  .refine((data) => (data.type === "expense" ? !!data.revenueStream : true), {
    message: "Revenue stream is required for expenses",
    path: ["revenueStream"],
  });

export const templateFormSchema = z
  .object({
    id: z.string().optional(),
    userId: z.string().min(1),
    type: transactionTypeEnum,
    amount: z.coerce.number().positive(),
    categoryName: z.string().min(1, "Category is required"),
    description: z.string().min(1, "Description is required"),
    revenueStream: z.string().optional().nullable(),
  })
  .refine((data) => (data.type === "expense" ? !!data.revenueStream : true), {
    message: "Revenue stream is required for expense templates",
    path: ["revenueStream"],
  });

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
export type TemplateFormValues = z.infer<typeof templateFormSchema>;
