import { useState } from "react";

const C = {
  bg: "#F3EDE4",
  surface: "#FFFFFF",
  surfaceAlt: "#FAF7F2",
  border: "#E5DDD2",
  accent: "#D4A574",
  accentDark: "#B8895A",
  text: "#2D2A26",
  textSec: "#6B6560",
  textMut: "#9B9590",
  textDim: "#C5BFB8",
  trunk: "#C9956A",
  branch1: "#6E9ABF",
  branch2: "#7EAD72",
  code: "#8B6DB0",
  codeBg: "#F0EBF5",
  codeBorder: "#D4C8E2",
  syncLine: "#B090D0",
};

// ── Mock data ──────────────────────────────────────────
const NODES = [
  { id: "n1", prompt: "I'm building a real-time dashboard app. What stack would you recommend?", answer: "React + Next.js frontend with WebSocket via Socket.io. Node.js + Express backend, PostgreSQL with Redis pub/sub for real-time updates.", parent: null, branch: "trunk", x: 0, y: 0 },
  { id: "n2", prompt: "How should I structure the component hierarchy?", answer: "DashboardGrid container with CSS Grid or react-grid-layout. Each widget gets a WidgetWrapper for resize, collapse, data subscription. WidgetRegistry pattern for plug-and-play.", parent: "n1", branch: "trunk", x: 0, y: 1 },
  { id: "n3", prompt: "What about state management? Redux or Zustand?", answer: "Zustand with slices. Separate stores for layout, subscriptions, preferences, and WebSocket state. Subscribe API pairs well with WebSocket handlers.", parent: "n2", branch: "trunk", x: 0, y: 2 },
  { id: "n4", prompt: "How do I handle WebSocket reconnection?", answer: "Exponential backoff with jitter, 1s to 30s max. Re-subscribe on reconnect, queue outbound messages during disconnect. Heartbeat ping every 30s.", parent: "n3", branch: "trunk", x: 0, y: 3 },
  { id: "b1_n1", prompt: "How should I set up GitHub repo and CI/CD?", answer: "Monorepo with Turborepo. GitHub Actions: lint/test on PR, preview deploy on develop merge, production on main. Changesets for versioning.", parent: "n2", branch: "branch1", x: 1, y: 2 },
  { id: "b1_n2", prompt: "Should I use Docker for backend deployment?", answer: "Multi-stage Dockerfile with Node 20 alpine. docker-compose for local dev with PostgreSQL and Redis. Production on Railway or ECS Fargate.", parent: "b1_n1", branch: "branch1", x: 1, y: 3 },
  { id: "b2_n1", prompt: "What auth system for the dashboard?", answer: "NextAuth.js with credentials + GitHub/Google OAuth. Sessions in PostgreSQL via Prisma adapter. Middleware route protection. Role-based access.", parent: "n2", branch: "branch2", x: 2, y: 2 },
];

const CODE_NODES = [
  { id: "cc1", title: "Scaffold project structure", status: "done", desc: "Turborepo monorepo with apps/web, apps/api, packages/shared", linkedTo: "b1_n1", x: 3, y: 2 },
  { id: "cc2", title: "Implement WebSocket service", status: "active", desc: "Socket.io server with Redis adapter, reconnection handler, heartbeat", linkedTo: "n4", x: 3, y: 3 },
  { id: "cc3", title: "Widget component system", status: "queued", desc: "WidgetRegistry, DashboardGrid, WidgetWrapper with Zustand stores", linkedTo: "n2", x: 3, y: 1 },
];

const SYNCS = [
  { from: "n4", to: "cc2", label: "Architecture decisions", direction: "to_code", items: ["Backoff strategy", "Heartbeat interval", "Queue pattern"] },
  { from: "cc2", to: "n4", label: "Implementation issues", direction: "to_chat", items: ["Redis adapter config", "Type errors in handler", "Memory leak in queue"] },
  { from: "b1_n1", to: "cc1", label: "Repo structure", direction: "to_code", items: ["Turborepo config", "GitHub Actions workflows"] },
  { from: "n2", to: "cc3", label: "Component spec", direction: "to_code", items: ["Widget hierarchy", "Registry pattern", "Grid layout API"] },
];

const BRANCHES = {
  trunk: { label: "App Architecture", color: C.trunk },
  branch1: { label: "DevOps & Infra", color: C.branch1 },
  branch2: { label: "Auth & Security", color: C.branch2 },
};

function getAncestors(nodeId) {
  const anc = [];
  let cur = NODES.find((n) => n.id === nodeId);
  while (cur) { anc.unshift(cur); cur = cur.parent ? NODES.find((n) => n.id === cur.parent) : null; }
  return anc;
}

const NW = 250, NH = 68, GX = 280, GY = 116, OX = 40, OY = 40;
const CNW = 250, CNH = 80;

function pos(n) { return { x: OX + n.x * GX, y: OY + n.y * GY }; }

function ClaudeLogo({ size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(145deg, ${C.accent}, ${C.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.52, fontWeight: 700, color: "white", lineHeight: 1, marginTop: -1 }}>C</span>
    </div>
  );
}

export default function App() {
  const [selId, setSelId] = useState("n4");
  const [selType, setSelType] = useState("chat"); // "chat" | "code" | "sync"
  const [selSync, setSelSync] = useState(null);
  const [selCode, setSelCode] = useState(null);

  const selNode = NODES.find((n) => n.id === selId);
  const ctxIds = new Set(getAncestors(selId).map((n) => n.id));
  const ancestors = getAncestors(selId);

  const totalSlots = 12;
  const usedSlots = ancestors.length * 2;
  const pct = Math.round((usedSlots / totalSlots) * 100);

  const svgW = OX * 2 + 4 * GX + CNW + 40;
  const svgH = OY * 2 + 4 * GY + NH;

  const branchPoints = NODES.filter((n) => {
    const children = NODES.filter((c) => c.parent === n.id);
    return children.some((c) => c.branch !== n.branch);
  });

  const activeSyncs = SYNCS.filter(s => ctxIds.has(s.from) || s.from === selId || s.to === selId);

  function handleNodeClick(n) { setSelId(n.id); setSelType("chat"); setSelSync(null); setSelCode(null); }
  function handleCodeClick(cn) { setSelCode(cn); setSelType("code"); setSelSync(null); if (cn.linkedTo) setSelId(cn.linkedTo); }
  function handleSyncClick(s) { setSelSync(s); setSelType("sync"); }

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: C.bg, fontFamily: "-apple-system, 'Segoe UI', system-ui, sans-serif", color: C.text, display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ClaudeLogo size={28} />
          <div>
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Branching Conversations</h1>
            <p style={{ margin: 0, fontSize: 11.5, color: C.textMut }}>Branching context + Claude Code bridge</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(BRANCHES).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 100, border: `1px solid ${C.border}`, background: C.surfaceAlt }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: v.color }} />
              <span style={{ fontSize: 11, color: C.textSec }}>{v.label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 100, border: `1px solid ${C.codeBorder}`, background: C.codeBg }}>
            <span style={{ fontSize: 11, fontFamily: "'Source Code Pro', monospace", fontWeight: 600, color: C.code }}>{'>'}_</span>
            <span style={{ fontSize: 11, color: C.code, fontWeight: 500 }}>Claude Code</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Canvas */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <svg width={svgW} height={svgH} style={{ display: "block" }}>
            {/* Separator line between chat and code */}
            <line x1={OX + 2.65 * GX + NW} y1={10} x2={OX + 2.65 * GX + NW} y2={svgH - 10} stroke={C.codeBorder} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
            <text x={OX + 2.65 * GX + NW + 8} y={28} fontSize={10} fill={C.code} fontFamily="'Source Code Pro', monospace" fontWeight={600} opacity={0.6}>CLAUDE CODE</text>
            <text x={OX + 0.5 * GX} y={28} fontSize={10} fill={C.textMut} fontFamily="'Source Code Pro', monospace" fontWeight={600} opacity={0.5}>CLAUDE AI</text>

            {/* Chat edges */}
            {NODES.filter((n) => n.parent).map((n) => {
              const par = NODES.find((p) => p.id === n.parent);
              const fp = pos(par), tp = pos(n);
              const x1 = fp.x + NW / 2, y1 = fp.y + NH;
              const x2 = tp.x + NW / 2, y2 = tp.y;
              const isFork = par.x !== n.x;
              const mid = y1 + (y2 - y1) * 0.5;
              const d = isFork ? `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}` : `M ${x1} ${y1} L ${x2} ${y2}`;
              const color = BRANCHES[n.branch]?.color;
              const dim = !ctxIds.has(n.id) && !ctxIds.has(n.parent);
              return <path key={n.id} d={d} fill="none" stroke={color} strokeWidth={dim ? 1 : 1.5} opacity={dim ? 0.15 : 0.35} strokeDasharray={isFork && par.branch !== n.branch ? "4 3" : "none"} />;
            })}

            {/* Sync lines between chat and code */}
            {SYNCS.map((s, i) => {
              const chatNode = NODES.find(n => n.id === (s.direction === "to_code" ? s.from : s.to));
              const codeNode = CODE_NODES.find(cn => cn.id === (s.direction === "to_code" ? s.to : s.from));
              if (!chatNode || !codeNode) return null;
              const cp = pos(chatNode);
              const ccp = pos(codeNode);
              const x1 = cp.x + NW;
              const y1 = cp.y + NH / 2;
              const x2 = ccp.x;
              const y2 = ccp.y + CNH / 2;
              const midX = x1 + (x2 - x1) * 0.5;
              const isActive = selSync === s || ctxIds.has(chatNode.id);
              const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

              const arrowDir = s.direction === "to_code" ? 1 : -1;
              const arrowX = s.direction === "to_code" ? x2 - 8 : x1 + 8;
              const arrowY = s.direction === "to_code" ? y2 : y1;

              return (
                <g key={`sync-${i}`} onClick={() => handleSyncClick(s)} style={{ cursor: "pointer" }}>
                  <path d={d} fill="none" stroke={C.syncLine} strokeWidth={isActive ? 1.5 : 1} opacity={isActive ? 0.6 : 0.15} strokeDasharray="6 4" />
                  {/* Arrow */}
                  <polygon
                    points={`${arrowX},${arrowY - 4} ${arrowX + 8 * arrowDir},${arrowY} ${arrowX},${arrowY + 4}`}
                    fill={C.syncLine} opacity={isActive ? 0.6 : 0.15}
                  />
                  {/* Sync label on hover area */}
                  {isActive && (
                    <g>
                      <rect x={midX - 50} y={(y1 + y2) / 2 - 11} width={100} height={22} rx={11} fill={C.codeBg} stroke={C.codeBorder} strokeWidth={1} />
                      <text x={midX} y={(y1 + y2) / 2 + 4} fontSize={9.5} fill={C.code} fontFamily="'Source Code Pro', monospace" fontWeight={500} textAnchor="middle">
                        {s.direction === "to_code" ? "→ " : "← "}{s.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Branch points */}
            {branchPoints.map((n) => {
              const p = pos(n); const cx = p.x + NW / 2, cy = p.y + NH;
              return (<g key={`bp-${n.id}`}><circle cx={cx} cy={cy} r={5} fill={C.bg} stroke={BRANCHES[n.branch]?.color} strokeWidth={1.5} /><circle cx={cx} cy={cy} r={2} fill={BRANCHES[n.branch]?.color} /></g>);
            })}

            {/* Chat nodes */}
            {NODES.map((n) => {
              const isSel = n.id === selId && selType === "chat";
              const inCtx = ctxIds.has(n.id);
              const orphan = !inCtx && !isSel;
              const color = BRANCHES[n.branch]?.color;
              const p = pos(n);
              const hasSync = SYNCS.some(s => s.from === n.id || s.to === n.id);
              return (
                <g key={n.id} onClick={() => handleNodeClick(n)} style={{ cursor: "pointer" }} transform={`translate(${p.x}, ${p.y})`}>
                  {isSel && <rect x={-1} y={1} width={NW + 2} height={NH + 2} rx={14} fill="none" stroke={color} strokeWidth={1} opacity={0.2} />}
                  <rect x={0} y={0} width={NW} height={NH} rx={12} fill={isSel ? C.surface : C.surfaceAlt} stroke={isSel ? color : inCtx ? `${color}66` : C.border} strokeWidth={isSel ? 1.5 : 1} opacity={orphan ? 0.35 : 1} />
                  <circle cx={16} cy={17} r={3} fill={color} opacity={orphan ? 0.3 : 0.75} />
                  <text x={24} y={20} fontSize={10} fontWeight={500} fill={orphan ? C.textDim : C.textMut} fontFamily="'Source Code Pro', monospace">{BRANCHES[n.branch]?.label}</text>
                  {hasSync && <circle cx={NW - 14} cy={17} r={3.5} fill={C.syncLine} opacity={orphan ? 0.15 : 0.5} />}
                  <text x={16} y={39} fontSize={12} fontWeight={500} fill={orphan ? C.textDim : C.text} fontFamily="-apple-system, system-ui, sans-serif">{n.prompt.length > 32 ? n.prompt.slice(0, 32) + "…" : n.prompt}</text>
                  <text x={16} y={55} fontSize={10.5} fill={orphan ? C.textDim : C.textMut} fontFamily="-apple-system, system-ui, sans-serif">{n.answer.length > 38 ? n.answer.slice(0, 38) + "…" : n.answer}</text>
                </g>
              );
            })}

            {/* Code nodes */}
            {CODE_NODES.map((cn) => {
              const p = pos(cn);
              const isSel = selCode?.id === cn.id;
              const isLinked = ctxIds.has(cn.linkedTo);
              const statusColors = { done: "#7EAD72", active: C.code, queued: C.textMut };
              const statusLabels = { done: "✓ Done", active: "● Active", queued: "○ Queued" };
              return (
                <g key={cn.id} onClick={() => handleCodeClick(cn)} style={{ cursor: "pointer" }} transform={`translate(${p.x}, ${p.y})`}>
                  {isSel && <rect x={-1} y={1} width={CNW + 2} height={CNH + 2} rx={14} fill="none" stroke={C.code} strokeWidth={1} opacity={0.25} />}
                  <rect x={0} y={0} width={CNW} height={CNH} rx={12} fill={isSel ? C.surface : C.codeBg} stroke={isSel ? C.code : isLinked ? `${C.code}66` : C.codeBorder} strokeWidth={isSel ? 1.5 : 1} opacity={isLinked || isSel ? 1 : 0.45} />
                  {/* Terminal icon */}
                  <text x={16} y={19} fontSize={10} fontFamily="'Source Code Pro', monospace" fontWeight={600} fill={C.code} opacity={0.7}>{'>'}_</text>
                  <text x={38} y={19} fontSize={10} fontWeight={500} fill={statusColors[cn.status]} fontFamily="'Source Code Pro', monospace">{statusLabels[cn.status]}</text>
                  <text x={16} y={40} fontSize={12} fontWeight={500} fill={C.text} fontFamily="-apple-system, system-ui, sans-serif">{cn.title.length > 30 ? cn.title.slice(0, 30) + "…" : cn.title}</text>
                  <text x={16} y={57} fontSize={10.5} fill={C.textMut} fontFamily="-apple-system, system-ui, sans-serif">{cn.desc.length > 36 ? cn.desc.slice(0, 36) + "…" : cn.desc}</text>
                  {/* Linked indicator */}
                  <circle cx={CNW - 14} cy={17} r={3.5} fill={C.syncLine} opacity={isLinked || isSel ? 0.5 : 0.2} />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail Panel */}
        <div style={{ width: 360, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: C.surface, overflow: "hidden" }}>

          {/* Sync detail */}
          {selType === "sync" && selSync && (
            <div style={{ padding: "20px 22px", flex: 1, overflow: "auto" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 100, marginBottom: 16, background: C.codeBg, border: `1px solid ${C.codeBorder}` }}>
                <span style={{ fontSize: 11, color: C.code, fontWeight: 600 }}>
                  {selSync.direction === "to_code" ? "AI → Code" : "Code → AI"}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>{selSync.label}</div>
              <div style={{ fontSize: 12, color: C.textMut, marginBottom: 16 }}>
                Context passed between Claude AI and Claude Code
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>Synced items</div>
              {selSync.items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 4, background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.syncLine }} />
                  <span style={{ fontSize: 12, color: C.text }}>{item}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 12, background: C.codeBg, borderRadius: 10, border: `1px solid ${C.codeBorder}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.code, marginBottom: 6, fontFamily: "'Source Code Pro', monospace" }}>HOW IT WORKS</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: C.textSec }}>
                  {selSync.direction === "to_code"
                    ? "Architectural decisions from the conversation are distilled and passed to Claude Code as implementation context — no copy-pasting needed."
                    : "Implementation issues encountered in Claude Code are surfaced back to the conversation for architectural review and decision-making."}
                </div>
              </div>
            </div>
          )}

          {/* Code detail */}
          {selType === "code" && selCode && (
            <div style={{ padding: "20px 22px", flex: 1, overflow: "auto" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 100, marginBottom: 16, background: C.codeBg, border: `1px solid ${C.codeBorder}` }}>
                <span style={{ fontSize: 11, fontFamily: "'Source Code Pro', monospace", fontWeight: 600, color: C.code }}>{'>'}_</span>
                <span style={{ fontSize: 11, color: C.code, fontWeight: 500 }}>Claude Code</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{selCode.title}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: C.textSec, marginBottom: 16 }}>{selCode.desc}</div>

              {/* Linked conversation */}
              {selCode.linkedTo && selNode && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>Linked conversation</div>
                  <div style={{ padding: 12, background: C.surfaceAlt, borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: BRANCHES[selNode.branch]?.color }} />
                      <span style={{ fontSize: 10.5, fontFamily: "'Source Code Pro', monospace", color: BRANCHES[selNode.branch]?.color }}>{BRANCHES[selNode.branch]?.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.text, marginBottom: 4 }}>{selNode.prompt}</div>
                    <div style={{ fontSize: 11.5, color: C.textMut }}>{selNode.answer.slice(0, 100)}…</div>
                  </div>
                </div>
              )}

              {/* Related syncs */}
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>Data syncs</div>
              {SYNCS.filter(s => s.from === selCode.linkedTo || s.to === selCode.linkedTo || s.from === selCode.id || s.to === selCode.id).map((s, i) => (
                <div key={i} onClick={() => handleSyncClick(s)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 4, background: C.codeBg, borderRadius: 8, border: `1px solid ${C.codeBorder}`, cursor: "pointer" }}>
                  <span style={{ fontSize: 11, color: C.code, fontFamily: "'Source Code Pro', monospace", fontWeight: 500 }}>
                    {s.direction === "to_code" ? "→" : "←"}
                  </span>
                  <span style={{ fontSize: 12, color: C.text }}>{s.label}</span>
                  <span style={{ fontSize: 10, color: C.textMut, marginLeft: "auto" }}>{s.items.length} items</span>
                </div>
              ))}
            </div>
          )}

          {/* Chat detail */}
          {selType === "chat" && selNode && (
            <>
              <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, flex: "0 0 auto" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 100, marginBottom: 14, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: BRANCHES[selNode.branch]?.color }} />
                  <span style={{ fontSize: 11, color: C.textSec, fontWeight: 500 }}>{BRANCHES[selNode.branch]?.label}</span>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.bg, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.textSec }}>H</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 3 }}>Human</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: C.text }}>{selNode.prompt}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <ClaudeLogo size={24} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.accentDark, marginBottom: 3 }}>Claude</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.55, color: C.textSec }}>{selNode.answer}</div>
                  </div>
                </div>

                {/* Connected code tasks */}
                {SYNCS.some(s => s.from === selNode.id || s.to === selNode.id) && (
                  <div style={{ marginTop: 14, padding: 10, background: C.codeBg, borderRadius: 8, border: `1px solid ${C.codeBorder}` }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.code, fontFamily: "'Source Code Pro', monospace", marginBottom: 4 }}>LINKED TO CLAUDE CODE</div>
                    <div style={{ fontSize: 11.5, color: C.textSec }}>
                      {SYNCS.filter(s => s.from === selNode.id || s.to === selNode.id).map(s => s.label).join(" · ")}
                    </div>
                  </div>
                )}
              </div>

              {/* Ancestry */}
              <div style={{ padding: "14px 22px", flex: 1, overflow: "auto" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 10 }}>Context ancestry</div>
                {ancestors.map((n, i, arr) => {
                  const inherited = n.branch !== selNode.branch;
                  const bc = BRANCHES[n.branch]?.color;
                  const isCur = n.id === selId;
                  return (
                    <div key={n.id} style={{ display: "flex", gap: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: isCur ? bc : C.surface, border: `2px solid ${bc}`, opacity: inherited ? 0.35 : 0.85, flexShrink: 0, marginTop: 4 }} />
                        {i < arr.length - 1 && <div style={{ width: 1.5, flex: 1, background: bc, opacity: 0.15, marginTop: 2 }} />}
                      </div>
                      <div style={{ paddingBottom: 10, flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                          <span style={{ fontSize: 10, fontFamily: "'Source Code Pro', monospace", color: bc, fontWeight: 500 }}>{BRANCHES[n.branch]?.label}</span>
                          {inherited && <span style={{ fontSize: 9, color: C.textMut, background: C.surfaceAlt, padding: "1px 5px", borderRadius: 100, border: `1px solid ${C.border}` }}>inherited</span>}
                        </div>
                        <div style={{ fontSize: 11, color: inherited ? C.textMut : C.textSec, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.prompt}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Context bar */}
              <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec }}>Context window</span>
                  <span style={{ fontSize: 10.5, color: C.textMut, fontFamily: "'Source Code Pro', monospace" }}>{usedSlots} msgs · {pct}%</span>
                </div>
                <div style={{ height: 5, background: C.border, borderRadius: 100, overflow: "hidden", display: "flex" }}>
                  {ancestors.map((n) => {
                    const segW = (2 / totalSlots) * 100;
                    const bc = BRANCHES[n.branch]?.color;
                    const inherited = n.branch !== selNode.branch;
                    return <div key={n.id} style={{ width: `${segW}%`, height: "100%", background: bc, opacity: inherited ? 0.25 : 0.6, borderRight: `1px solid ${C.surfaceAlt}` }} />;
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
