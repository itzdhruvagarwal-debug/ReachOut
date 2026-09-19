import { z } from "zod";
import { env } from "@/env";

export const withdrawalSchema = z.object({
  amount: z.preprocess(
    Number,
    z
      .number()
      .int()
      .positive()
      .min(
        env.MIN_WITHDRAWAL_AMOUNT,
        `Minimum withdrawal is INR ${env.MIN_WITHDRAWAL_AMOUNT / 100}`,
      )
      .max(50_000_000, "Maximum single withdrawal is INR 5,00,000"),
  ),
  bankAccountId: z.string().min(1, "bankAccountId is required — use a verified saved bank account"),
});
