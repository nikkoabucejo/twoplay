/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as cursors from "../cursors.js";
import type * as games_checkers_engine from "../games/checkers/engine.js";
import type * as games_checkers_index from "../games/checkers/index.js";
import type * as games_checkers_rules from "../games/checkers/rules.js";
import type * as games_engine from "../games/engine.js";
import type * as games_index from "../games/index.js";
import type * as games_tictactoe_engine from "../games/tictactoe/engine.js";
import type * as games_tictactoe_index from "../games/tictactoe/index.js";
import type * as games_tictactoe_rules from "../games/tictactoe/rules.js";
import type * as rooms from "../rooms.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  cursors: typeof cursors;
  "games/checkers/engine": typeof games_checkers_engine;
  "games/checkers/index": typeof games_checkers_index;
  "games/checkers/rules": typeof games_checkers_rules;
  "games/engine": typeof games_engine;
  "games/index": typeof games_index;
  "games/tictactoe/engine": typeof games_tictactoe_engine;
  "games/tictactoe/index": typeof games_tictactoe_index;
  "games/tictactoe/rules": typeof games_tictactoe_rules;
  rooms: typeof rooms;
  users: typeof users;
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

export declare const components: {};
