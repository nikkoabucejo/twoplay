export const meta = {
	name: 'dev-plan',
	description: 'twoplay: CodeGraph map + triage, then an OpenSpec change (proposal, specs, design, tasks)',
	whenToUse: 'Called by /dev:work. args: { request, answers?, decisions?, changeId? }',
	phases: [
		{ title: 'Map', detail: 'CodeGraph sync, explore, impact + triage' },
		{ title: 'Spec', detail: 'architect writes and validates the OpenSpec change' }
	]
}

const a = args || {}
if (!a.request && !a.changeId) throw new Error('dev-plan needs args.request or args.changeId')

const TRIAGE = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: ['feature', 'bug', 'refactor', 'chore', 'question'] },
		size: { type: 'string', enum: ['trivial', 'small', 'large'] },
		changeId: { type: 'string' },
		commitType: { type: 'string', enum: ['feature', 'bug', 'refactor', 'chore', 'docs'] },
		summary: { type: 'string' },
		areas: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, why: { type: 'string' } }, required: ['path', 'why'] } },
		impact: { type: 'array', items: { type: 'object', properties: { symbol: { type: 'string' }, affected: { type: 'array', items: { type: 'string' } } }, required: ['symbol', 'affected'] } },
		risks: { type: 'array', items: { type: 'string' } },
		overlaps: { type: 'array', items: { type: 'string' } },
		blockingQuestions: { type: 'array', items: { type: 'string' } },
		assumptions: { type: 'array', items: { type: 'string' } },
		notes: { type: 'string' }
	},
	required: ['type', 'size', 'changeId', 'commitType', 'summary', 'areas', 'impact', 'risks', 'blockingQuestions', 'assumptions']
}

const SPEC = {
	type: 'object',
	properties: {
		changeId: { type: 'string' },
		validate: { type: 'string', enum: ['pass', 'fail'] },
		validateErrors: { type: 'string' },
		proposal: { type: 'string' },
		requirementCount: { type: 'number' },
		groups: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					n: { type: 'number' },
					title: { type: 'string' },
					owners: { type: 'array', items: { type: 'string', enum: ['engineer', 'designer'] } },
					parallelSafe: { type: 'boolean' },
					taskIds: { type: 'array', items: { type: 'string' } }
				},
				required: ['n', 'title', 'owners', 'parallelSafe', 'taskIds']
			}
		},
		openQuestions: { type: 'array', items: { type: 'string' } }
	},
	required: ['changeId', 'validate', 'proposal', 'groups', 'openQuestions']
}

phase('Map')
const triage = await agent(
	`Triage this request for twoplay.

Request: ${a.request || '(continue change ' + a.changeId + ')'}
${a.answers ? 'User answers to earlier questions: ' + a.answers : ''}

Use CodeGraph:
1. Run \`codegraph sync -q\`.
2. Locate the code with codegraph_explore (or \`codegraph explore "<question>"\`).
3. For each symbol likely to change, run \`codegraph impact <symbol>\` and list the affected symbols with path:line in \`impact\`.
Also run \`openspec list --json\` for overlaps. Follow your triage rubric. Do not edit files.`,
	{ label: 'triage', agentType: 'triage', schema: TRIAGE }
)
if (!triage) throw new Error('triage agent failed')
log(`${triage.type} · ${triage.size} · ${triage.changeId} · risks: ${triage.risks.join(', ') || 'none'}`)

if (triage.type === 'question' || triage.size === 'trivial') return { stage: 'triaged', triage }
if (triage.blockingQuestions.length && !a.answers) return { stage: 'needs-input', triage, questions: triage.blockingQuestions }
if (triage.size === 'large' && !a.decisions) return { stage: 'needs-brainstorm', triage }

phase('Spec')
const brief = JSON.stringify({ triage, answers: a.answers || null, decisions: a.decisions || null }, null, 1)
let spec = await agent(
	`Create the OpenSpec change \`${a.changeId || triage.changeId}\` for twoplay from this brief:

${brief}

Use the \`impact\` list: every affected caller needs a task or an explicit "unaffected because" in design.md.
Follow your architect process. Write only under openspec/. Run \`openspec validate <id> --strict\` until it passes.
Also create openspec/changes/<id>/worklog.md with "- MAP done" and "- SPEC done" lines.`,
	{ label: 'architect', agentType: 'architect', schema: SPEC }
)
if (spec && spec.validate === 'fail') {
	spec = await agent(
		`\`openspec validate ${spec.changeId} --strict\` fails:\n${spec.validateErrors}\nFix the change artifacts until it passes. Write only under openspec/.`,
		{ label: 'architect:fix', agentType: 'architect', schema: SPEC }
	)
}
if (!spec) throw new Error('architect agent failed')
return { stage: 'planned', triage, spec }
