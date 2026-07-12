import { defineTable } from "convex/server";
import { v } from "convex/values";

export const usersTable = defineTable({
	name: v.string(),
	clerk__userId: v.string()
}).index("byClerkUserId", ["clerk__userId"]);
