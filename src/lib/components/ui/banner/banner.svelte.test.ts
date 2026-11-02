import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, test } from "vitest";
import { Banner } from "./index.js";

const action = createRawSnippet(() => ({ render: () => "<button>Reload</button>" }));

describe("Banner", () => {
	test("alerts with its message", () => {
		render(Banner, { props: { message: "Sign-in is unavailable right now." } });
		expect(screen.getByRole("alert")).toHaveTextContent("Sign-in is unavailable right now.");
	});

	test("overlays the content below its positioned parent instead of joining the flow", () => {
		render(Banner, { props: { message: "Sign-in is unavailable right now." } });
		expect(screen.getByRole("alert")).toHaveClass("absolute", "inset-x-0", "top-full");
	});

	test("renders the action when given", () => {
		render(Banner, { props: { message: "Sign-in is unavailable right now.", action } });
		expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
	});

	test("the error tone uses the destructive color", () => {
		render(Banner, { props: { message: "Sign-in is unavailable right now.", tone: "error" } });
		expect(screen.getByRole("alert")).toHaveClass("text-destructive");
	});
});
