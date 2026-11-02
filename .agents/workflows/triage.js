export const meta = {
	name: 'triage',
	description: 'twoplay: CodeGraph map + triage, bug reproduction, and the recommended OpenSpec route',
	whenToUse: 'Called by /dev:work before OpenSpec planning. args: { request, answers? }',
	phases: [
		{ title: 'Map', detail: 'CodeGraph sync, explore, impact + triage' },
		{ title: 'Reproduce', detail: 'qa reproduces bugs in two browsers' }
	]
}

const a = args || {}
if (!a.request) throw new Error('triage needs args.request')

const TRIAGE = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: ['feature', 'bug', 'refactor', 'chore', 'question'] },
		size: { type: 'string', enum: ['trivial', 'small', 'large'] },
		route: { type: 'string', enum: ['none', 'explore', 'new', 'ff', 'propose'] },
		routeWhy: { type: 'string' },
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
	required: ['type', 'size', 'route', 'routeWhy', 'changeId', 'commitType', 'summary', 'areas', 'impact', 'risks', 'blockingQuestions', 'assumptions']
}

phase('Map')
const triage = await agent(
	`Triage this request for twoplay.

Request: ${a.request}
${a.answers ? 'User answers to earlier questions: ' + a.answers : ''}

Use CodeGraph:
1. Run \`codegraph sync -q\`.
2. Locate the code with codegraph_explore (or \`codegraph explore "<question>"\`).
3. For each symbol likely to change, run \`codegraph impact <symbol>\` and list the affected symbols with path:line in \`impact\`.
Also run \`openspec list --json\` for overlaps. Follow your triage rubric, including the route. Do not edit files.`,
	{ label: 'triage', agentType: 'triage', schema: TRIAGE }
)
if (!triage) throw new Error('triage agent failed')
log(`${triage.type} · ${triage.size} · route ${triage.route} · ${triage.changeId} · risks: ${triage.risks.join(', ') || 'none'}`)

let repro = null
if (triage.type === 'bug' && a.reproduce !== false) {
	phase('Reproduce')
	repro = await agent(`Debug mode. Reproduce this bug in the running app and collect evidence:\n${a.request}\n${triage.notes || ''}`,
		{ label: 'qa:reproduce', agentType: 'qa' })
	if (repro) log('bug reproduction attempted (see repro)')
}

return { triage, repro }
