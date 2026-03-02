"use client";

import { useEffect, useMemo, useState } from "react";

const RPC = "https://node1.turion.network";

type Color = "cyan" | "green" | "purple" | "yellow";

type Metric = {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  color: Color;
  sublabel?: string;
  decimals?: number;
};

const colorMap: Record<Color, {
  border: string; bg: string; hoverBorder: string; hoverBg: string;
  text: string; label: string; sub: string; glow: string; dot: string;
}> = {
  cyan: {
    border: "border-cyan-500/20", bg: "bg-cyan-500/[0.03]",
    hoverBorder: "hover:border-cyan-500/40", hoverBg: "hover:bg-cyan-500/[0.06]",
    text: "text-cyan-300", label: "text-cyan-500/60", sub: "text-cyan-500/40",
    glow: "hover:shadow-[0_0_25px_rgba(0,212,255,0.08)]", dot: "bg-cyan-400",
  },
  green: {
    border: "border-green-500/20", bg: "bg-green-500/[0.03]",
    hoverBorder: "hover:border-green-500/40", hoverBg: "hover:bg-green-500/[0.06]",
    text: "text-green-300", label: "text-green-500/60", sub: "text-green-500/40",
    glow: "hover:shadow-[0_0_25px_rgba(0,255,157,0.08)]", dot: "bg-green-400",
  },
  purple: {
    border: "border-purple-500/20", bg: "bg-purple-500/[0.03]",
    hoverBorder: "hover:border-purple-500/40", hoverBg: "hover:bg-purple-500/[0.06]",
    text: "text-purple-300", label: "text-purple-500/60", sub: "text-purple-500/40",
    glow: "hover:shadow-[0_0_25px_rgba(157,78,221,0.08)]", dot: "bg-purple-400",
  },
  yellow: {
    border: "border-yellow-500/20", bg: "bg-yellow-500/[0.03]",
    hoverBorder: "hover:border-yellow-500/40", hoverBg: "hover:bg-yellow-500/[0.06]",
    text: "text-yellow-300", label: "text-yellow-500/60", sub: "text-yellow-500/40",
    glow: "hover:shadow-[0_0_25px_rgba(251,191,36,0.08)]", dot: "bg-yellow-400",
  },
};

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    const step = 16;
    const totalSteps = Math.max(1, Math.floor(duration / step));
    const increment = (target - value) / totalSteps;
    if (Math.abs(target - value) < 0.001) { setValue(target); return; }
    let current = value;
    const timer = setInterval(() => {
      current += increment;
      const done = increment > 0 ? current >= target : current <= target;
      if (done) { setValue(target); clearInterval(timer); }
      else setValue(current);
    }, step);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

function MetricCard({ metric, live }: { metric: Metric; live?: boolean }) {
  const raw = useCountUp(metric.value);
  const display = useMemo(() => {
    const dec = metric.decimals ?? (metric.value < 10 ? 1 : 0);
    if (dec > 0) return raw.toFixed(dec);
    if (metric.value >= 1000) return Math.round(raw).toLocaleString("en-US");
    return Math.round(raw).toString();
  }, [raw, metric.value, metric.decimals]);

  const c = colorMap[metric.color];

  return (
    <div className={`group relative overflow-hidden rounded-xl border ${c.border} ${c.bg} ${c.hoverBorder} ${c.hoverBg} ${c.glow} p-5 transition`}>
      <div className="flex items-center justify-between">
        <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${c.label}`}>{metric.label}</p>
        {live && (
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${c.dot} animate-pulse`} />
            <span className={`font-mono text-[9px] uppercase ${c.sub}`}>live</span>
          </span>
        )}
      </div>

      <p className={`mt-3 font-mono text-2xl font-bold ${c.text}`}>
        <span className="text-base font-normal opacity-60">{metric.prefix ?? ""}</span>
        {display}
        <span className="text-sm font-normal opacity-60">{metric.suffix ?? ""}</span>
      </p>

      {metric.sublabel && (
        <p className={`mt-1.5 font-mono text-[10px] ${c.sub}`}>{metric.sublabel}</p>
      )}
    </div>
  );
}

async function rpc(method: string, params: unknown[] = []) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  const json = await res.json();
  return json.result;
}

export default function AnimatedMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: "Chain ID",    value: 210866, prefix: "#", color: "cyan",   sublabel: "0x337b2" },
    { label: "Block Time",  value: 5,      suffix: "s", color: "green",  sublabel: "avg confirmation", decimals: 1 },
    { label: "Gas Price",   value: 1,      suffix: " Gwei", color: "yellow", sublabel: "network fee", decimals: 4 },
    { label: "Block",       value: 0,      prefix: "#", color: "purple", sublabel: "latest block" },
  ]);

  useEffect(() => {
    let prevBlock: number | null = null;
    let prevTimestamp: number | null = null;

    async function fetchData() {
      try {
        const [blockHex, gasPriceHex] = await Promise.all([
          rpc("eth_blockNumber"),
          rpc("eth_gasPrice"),
        ]);

        const blockNum = parseInt(blockHex, 16);
        const gasGwei = parseInt(gasPriceHex, 16) / 1e9;

        // Calcular block time com dois blocos
        let blockTimeSec = 5;
        if (prevBlock !== null && prevTimestamp !== null && blockNum > prevBlock) {
          const latest = await rpc("eth_getBlockByNumber", [blockHex, false]);
          const latestTs = parseInt(latest.timestamp, 16);
          const blockDiff = blockNum - prevBlock;
          const timeDiff = latestTs - prevTimestamp;
          if (timeDiff > 0 && blockDiff > 0) {
            blockTimeSec = timeDiff / blockDiff;
            prevTimestamp = latestTs;
          }
        } else if (prevBlock === null) {
          const latest = await rpc("eth_getBlockByNumber", [blockHex, false]);
          prevTimestamp = parseInt(latest.timestamp, 16);
        }

        prevBlock = blockNum;

        setMetrics([
          { label: "Chain ID",   value: 210866,      prefix: "#", color: "cyan",   sublabel: "0x337b2" },
          { label: "Block Time", value: blockTimeSec, suffix: "s", color: "green",  sublabel: "avg confirmation", decimals: 1 },
          { label: "Gas Price",  value: gasGwei,      suffix: " Gwei", color: "yellow", sublabel: "network fee", decimals: 4 },
          { label: "Block",      value: blockNum,     prefix: "#", color: "purple", sublabel: "latest block" },
        ]);
      } catch {
        // silently ignore fetch errors
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m, i) => (
        <MetricCard key={m.label} metric={m} live={i > 0} />
      ))}
    </div>
  );
}
