#!/usr/bin/env bash
# Mirrors .agents/{skills,agents,commands,workflows} into .claude/ as relative symlinks.
# Anything Claude-side that is a real file/dir (e.g. a tool wrote it there) is moved into .agents first.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

for kind in skills agents commands workflows; do
	mkdir -p ".agents/$kind" ".claude/$kind"

	for entry in .claude/"$kind"/*; do
		[ -e "$entry" ] || [ -L "$entry" ] || continue
		name="$(basename "$entry")"
		if [ -L "$entry" ]; then
			[ -e "$entry" ] || rm "$entry" # drop dangling links
		elif [ ! -e ".agents/$kind/$name" ]; then
			mv "$entry" ".agents/$kind/$name"
			echo "adopted .claude/$kind/$name -> .agents/$kind/$name"
		else
			echo "conflict: .claude/$kind/$name exists in both places; resolve by hand" >&2
		fi
	done

	for src in .agents/"$kind"/*; do
		[ -e "$src" ] || continue
		name="$(basename "$src")"
		[ "$kind" = agents ] && [[ "$name" != *.md ]] && continue
		[ -e ".claude/$kind/$name" ] || ln -s "../../.agents/$kind/$name" ".claude/$kind/$name"
	done
done
echo "linked: $(find .claude/skills .claude/agents .claude/commands .claude/workflows -maxdepth 1 -type l | wc -l | tr -d ' ') entries"
