/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as http from "../http.js";
import type * as misi from "../misi.js";
import type * as model_categories from "../model/categories.js";
import type * as model_checkpoints from "../model/checkpoints.js";
import type * as model_core from "../model/core.js";
import type * as model_cycles from "../model/cycles.js";
import type * as model_debts from "../model/debts.js";
import type * as model_onboarding from "../model/onboarding.js";
import type * as model_savings from "../model/savings.js";
import type * as model_transactions from "../model/transactions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  categories: typeof categories;
  http: typeof http;
  misi: typeof misi;
  "model/categories": typeof model_categories;
  "model/checkpoints": typeof model_checkpoints;
  "model/core": typeof model_core;
  "model/cycles": typeof model_cycles;
  "model/debts": typeof model_debts;
  "model/onboarding": typeof model_onboarding;
  "model/savings": typeof model_savings;
  "model/transactions": typeof model_transactions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
