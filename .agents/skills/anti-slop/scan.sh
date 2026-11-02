#!/usr/bin/env bash
# Read-only: flags likely slop on lines ADDED in the diff against a base. Leads, not verdicts.
set -uo pipefail
base="${1:-$(git merge-base main HEAD 2>/dev/null || echo HEAD)}"

# Changed lines from the diff, plus every line of untracked files (shown as additions).
added() {
	git diff -U0 "$base" -- 'src' 'convex' ':!convex/_generated'
	git ls-files --others --exclude-standard -- 'src' 'convex' | while read -r f; do
		printf '+++ b/%s\n@@ -0,0 +1 @@\n' "$f"
		sed 's/^/+/' "$f"
	done
}

flag() { # label, extended regex
	added \
		| LABEL="$1" RE="$2" awk '
			BEGIN { label = ENVIRON["LABEL"]; re = ENVIRON["RE"] }
			/^\+\+\+ b\// { file = substr($0, 7); next }
			/^@@/ { split($3, a, ","); line = substr(a[1], 2) - 1; next }
			/^\+/ { line++; if (substr($0, 2) ~ re) printf "%-22s %s:%d: %s\n", label, file, line, substr($0, 2); next }
		'
}

flag "type-escape"       '(as any|: any[^a-zA-Z]|as unknown as|@ts-ignore|@ts-expect-error|v\.any\(\))'
flag "debug-leftover"    '(console\.(log|debug|dir)|debugger;)'
flag "vague-todo"        '(TODO|FIXME|XXX)[: ]*(improve|optimi|clean|refactor|later|fix this)?$'
flag "narration-comment" '//[ ]*(Step [0-9]|First,|Next,|Then,|Finally,|Now (we|let)|Initialize|Increment|Return (the|a) |Loop (over|through)|Check if|Set the|Get the|Call the|Update the|Create a(n)? )'
flag "banner-comment"    '(//|/\*|<!--)[ ]*[=#*-]{4,}'
flag "change-log-comment" '//[ ]*(Updated|Changed|Fixed|Added|Removed|New:|Modified)[ :]'
flag "svelte4-syntax"    '(export let |^\s*\$:|on:[a-z]+=|<slot|createEventDispatcher|\$\$props)'
flag "effect-assign"     '\$effect\(\(\) => \{? *[a-zA-Z_#.]+ = '
flag "class-building"    '(class=\{?`[^`]*\$\{|\.replace\(["'"'"'](text|bg|border)-)'
flag "swallowed-error"   'catch *(\([a-z]*\))? *\{ *\}'
flag "silent-fallback"   '\?\? *(""|0|\[\]|\{\})[ ;),]'
flag "ai-copy"           '(Oops|Whoops|Seamless|Let.s get started|Something went wrong[!.]? *[😅🙈😬]|✨|🚀)'
flag "non-null-assert"   '[a-zA-Z0-9_)\]]![.;,) ]'
exit 0
