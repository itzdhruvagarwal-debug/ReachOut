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
      .max(
        env.MAX_WITHDRAWAL_AMOUNT,
        `Maximum single withdrawal is INR ${env.MAX_WITHDRAWAL_AMOUNT / 100}`,
      ),
  ),
  bankAccountId: z.string().min(1, "bankAccountId is required — use a verified saved bank account"),
});
