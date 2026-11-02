export const meta = {
	name: 'dev-build',
	description: 'twoplay: implement an approved OpenSpec change, verify, deslop, CodeGraph impact, review with adversarial checks, docs sync',
	whenToUse: 'Called by /dev:work after plan approval. args: { changeId, groups, risks, base }',
	phases: [
		{ title: 'Implement', detail: 'engineer/designer per task group' },
		{ title: 'Verify', detail: 'verifier, fix loop (max 3)' },
		{ title: 'Conform', detail: 'steward deslop + conventions' },
		{ title: 'Impact', detail: 'CodeGraph impact of changed symbols' },
		{ title: 'Review', detail: 'reviewer/security/designer, skeptic per finding, fix loop (max 2)' },
		{ title: 'Sync', detail: 'steward updates twoplay references' }
	]
}

const a = args || {}
if (!a.changeId || !Array.isArray(a.groups)) throw new Error('dev-build needs args.changeId and args.groups')
const ID = a.changeId
const BASE = a.base || 'HEAD'
const RISKS = a.risks || []

const IMPL = {
	type: 'object',
	properties: {
		tasksDone: { type: 'array', items: { type: 'string' } },
		tasksBlocked: { type: 'array', items: { type: 'string' } },
		filesChanged: { type: 'array', items: { type: 'string' } },
		check: { type: 'string' },
		deviations: { type: 'string' }
	},
	required: ['tasksDone', 'tasksBlocked', 'filesChanged', 'check']
}
const VERIFY = {
	type: 'object',
	properties: {
		result: { type: 'string', enum: ['pass', 'fail'] },
		check: { type: 'string' },
		build: { type: 'string' },
		scenariosProven: { type: 'number' },
		scenariosTotal: { type: 'number' },
		failures: { type: 'string' },
		touchesUi: { type: 'boolean' },
		touchesConvex: { type: 'boolean' }
	},
	required: ['result', 'check', 'failures', 'touchesUi', 'touchesConvex']
}
const CONFORM = {
	type: 'object',
	properties: { changed: { type: 'array', items: { type: 'string' } }, escalate: { type: 'array', items: { type: 'string' } }, check: { type: 'string' }, summary: { type: 'string' } },
	required: ['changed', 'escalate', 'summary']
}
const IMPACT = {
	type: 'object',
	properties: { symbols: { type: 'array', items: { type: 'object', properties: { symbol: { type: 'string' }, outsideDiff: { type: 'array', items: { type: 'string' } } }, required: ['symbol', 'outsideDiff'] } } },
	required: ['symbols']
}
const FINDINGS = {
	type: 'object',
	properties: {
		verdict: { type: 'string' },
		findings: {
			type: 'array',
			items: {
				type: 'object',
				properties: { severity: { type: 'string', enum: ['critical', 'high', 'important', 'medium', 'minor', 'low'] }, location: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } },
				required: ['severity', 'location', 'issue', 'fix']
			}
		}
	},
	required: ['verdict', 'findings']
}
const VERDICT = {
	type: 'object',
	properties: { real: { type: 'boolean' }, reason: { type: 'string' } },
	required: ['real', 'reason']
}

const ownerPrompt = (g) =>
	`Implement OpenSpec change \`${ID}\`, task group ${g.n} "${g.title}": tasks ${g.taskIds.join(', ')}.
Read openspec/changes/${ID}/{proposal.md,design.md,tasks.md,specs/**} first. Do only these tasks, tick them in tasks.md,
follow anti-slop, check blast radius with \`codegraph impact\` before editing shared symbols, run pnpm check.`

async function runGroup(g) {
	const out = []
	for (const owner of g.owners) {
		const r = await agent(ownerPrompt(g), { label: `${owner}:g${g.n}`, phase: 'Implement', agentType: owner, schema: IMPL })
		if (!r) throw new Error(`${owner} failed on group ${g.n}`)
		if (r.tasksBlocked.length) return { blocked: true, group: g.n, owner, tasksBlocked: r.tasksBlocked, deviations: r.deviations }
		out.push(r)
	}
	return { blocked: false, results: out }
}

// Consecutive parallel-safe groups run together; everything else runs in order.
phase('Implement')
const batches = []
for (const g of a.groups) {
	const last = batches[batches.length - 1]
	if (g.parallelSafe && last && last.every((x) => x.parallelSafe)) last.push(g)
	else batches.push([g])
}
for (const batch of batches) {
	const res = await parallel(batch.map((g) => () => runGroup(g)))
	const blocked = res.find((r) => !r || r.blocked)
	if (blocked) return { stage: 'blocked', detail: blocked || 'agent failure' }
}

async function verifyLoop(label) {
	let v = null
	for (let i = 1; i <= 3; i++) {
		v = await agent(`Verify OpenSpec change \`${ID}\` (diff base ${BASE}). Also report whether the diff touches .svelte/CSS (touchesUi) and convex/ or auth/env (touchesConvex).`,
			{ label: `${label}:${i}`, phase: 'Verify', agentType: 'verifier', schema: VERIFY })
		if (!v) throw new Error('verifier failed')
		if (v.result === 'pass') return v
		log(`verify ${i}/3 failed`)
		if (i < 3) await agent(`Verification of \`${ID}\` failed. Fix the root cause (superspec-debugging). Failures:\n${v.failures}`,
			{ label: `engineer:fix${i}`, phase: 'Verify', agentType: 'engineer', schema: IMPL })
	}
	return v
}

phase('Verify')
let ver = await verifyLoop('verifier')
if (ver.result !== 'pass') return { stage: 'verify-failed', verify: ver }

phase('Conform')
const conform = await agent(`Conform mode. Diff base ${BASE}. OpenSpec change \`${ID}\`.`, { label: 'steward:conform', agentType: 'steward', schema: CONFORM })

const reviewers = (v) => [
	['reviewer', `Review the diff against base ${BASE} for OpenSpec change \`${ID}\`.`],
	...(v.touchesConvex || RISKS.some((r) => ['schema', 'auth', 'trust-boundary', 'clocks', 'mmr'].includes(r))
		? [['security', `Security review of the diff against base ${BASE} (change \`${ID}\`).`]] : []),
	...(v.touchesUi ? [['designer', `Review mode only, do not edit. Review the UI in the diff against base ${BASE} (change \`${ID}\`).`]] : [])
]
const blocking = (f) => ['critical', 'high', 'important'].includes(f.severity)

let rounds = 0
let review = []
let accepted = []
let rejected = []
let impact = null
while (true) {
	phase('Impact')
	impact = await agent(
		`Run \`codegraph sync -q\`. From \`git diff ${BASE} --name-only\` and the hunks, list every changed exported symbol.
For each, run \`codegraph impact <symbol>\` and return the affected symbols (path:line) that are OUTSIDE the diff. Do not edit files.`,
		{ label: 'codegraph:impact', phase: 'Impact', agentType: 'triage', schema: IMPACT })
	const impactNote = impact && impact.symbols.length ? `\nCodeGraph impact outside the diff (confirm these callers still hold):\n${JSON.stringify(impact.symbols)}` : ''

	phase('Review')
	const results = await pipeline(
		reviewers(ver),
		([type, prompt]) => agent(prompt + impactNote, { label: type, phase: 'Review', agentType: type, schema: FINDINGS }),
		(r, [type]) => parallel((r ? r.findings.filter(blocking) : []).map((f) => () =>
			agent(`Try to refute this ${type} finding against the actual code. Default to real=false if it does not hold up.\n${JSON.stringify(f)}`,
				{ label: `skeptic:${f.location}`, phase: 'Review', schema: VERDICT }).then((vd) => ({ ...f, from: type, real: !!(vd && vd.real), reason: vd ? vd.reason : 'no verdict' }))
		)).then((checked) => ({ type, verdict: r ? r.verdict : 'failed', checked, minor: r ? r.findings.filter((f) => !blocking(f)) : [] }))
	)
	review = results.filter(Boolean)
	accepted = review.flatMap((r) => r.checked.filter((f) => f.real))
	rejected = rejected.concat(review.flatMap((r) => r.checked.filter((f) => !f.real)))
	if (!accepted.length || rounds === 2) break
	rounds++
	log(`review round ${rounds}: ${accepted.length} accepted finding(s) to fix`)
	await agent(`Fix these confirmed review findings for change \`${ID}\` (root cause, follow anti-slop, run pnpm check):\n${JSON.stringify(accepted)}`,
		{ label: `engineer:review-fix${rounds}`, phase: 'Review', agentType: 'engineer', schema: IMPL })
	ver = await verifyLoop(`reverify${rounds}`)
	if (ver.result !== 'pass') return { stage: 'verify-failed', verify: ver }
}

phase('Sync')
const sync = await agent(`Knowledge-sync mode. Diff base ${BASE}. OpenSpec change \`${ID}\`.`, { label: 'steward:sync', agentType: 'steward', schema: CONFORM })

return {
	stage: accepted.length ? 'review-unresolved' : 'built',
	verify: ver,
	conform,
	impact,
	review: review.map((r) => ({ from: r.type, verdict: r.verdict, minor: r.minor })),
	unresolved: accepted,
	rejected,
	sync
}
