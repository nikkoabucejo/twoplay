/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as models_clocks_index from "../models/clocks/index.js";
import type * as models_cursors_index from "../models/cursors/index.js";
import type * as models_games_checkers_engine from "../models/games/checkers/engine.js";
import type * as models_games_checkers_index from "../models/games/checkers/index.js";
import type * as models_games_checkers_rules from "../models/games/checkers/rules.js";
import type * as models_games_engine from "../models/games/engine.js";
import type * as models_games_index from "../models/games/index.js";
import type * as models_games_tictactoe_engine from "../models/games/tictactoe/engine.js";
import type * as models_games_tictactoe_index from "../models/games/tictactoe/index.js";
import type * as models_games_tictactoe_rules from "../models/games/tictactoe/rules.js";
import type * as models_players_index from "../models/players/index.js";
import type * as models_rooms_auth from "../models/rooms/auth.js";
import type * as models_rooms_index from "../models/rooms/index.js";
import type * as models_users_index from "../models/users/index.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "models/clocks/index": typeof models_clocks_index;
  "models/cursors/index": typeof models_cursors_index;
  "models/games/checkers/engine": typeof models_games_checkers_engine;
  "models/games/checkers/index": typeof models_games_checkers_index;
  "models/games/checkers/rules": typeof models_games_checkers_rules;
  "models/games/engine": typeof models_games_engine;
  "models/games/index": typeof models_games_index;
  "models/games/tictactoe/engine": typeof models_games_tictactoe_engine;
  "models/games/tictactoe/index": typeof models_games_tictactoe_index;
  "models/games/tictactoe/rules": typeof models_games_tictactoe_rules;
  "models/players/index": typeof models_players_index;
  "models/rooms/auth": typeof models_rooms_auth;
  "models/rooms/index": typeof models_rooms_index;
  "models/users/index": typeof models_users_index;
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
