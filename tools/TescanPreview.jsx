import React, { useState, useEffect, useRef } from "react";

/* ── Design tokens (matches rn/src/theme.ts) ── */
const T = {
  ink:     "#0E1218",
  panel:   "#161C25",
  panelHi: "rgba(255,255,255,0.045)",
  border:  "rgba(255,255,255,0.07)",
  borderHi:"rgba(255,255,255,0.14)",
  hi:      "#ECF1F7",
  mid:     "#93A0B2",
  lo:      "#586273",
  cyan:    "#58C7F2",
  amber:   "#FFB257",
  green:   "#5FD0A0",
  red:     "#FF6B6B",
};
const RATED_MILES  = 247;
const FULL_PACK_KWH = 77.8;
const mono = "'JetBrains Mono', ui-monospace, monospace";
const disp = "'Space Grotesk', ui-sans-serif, system-ui";

const FontInjector = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
    *{ box-sizing:border-box; margin:0; padding:0; }
    .vl-scroll::-webkit-scrollbar{ width:0; }
    @keyframes pulse{ 0%,100%{opacity:.55} 50%{opacity:1} }
    @keyframes blink{ 0%,100%{opacity:1} 50%{opacity:0.3} }
    button{ background:none; border:none; cursor:pointer; }
  `}</style>
);

/* ── Gauge (SVG) ── */
function Gauge270({ level, limit, charging, low, showMiles, predictiveMiles }) {
  const size=248, r=100, cx=124, cy=124;
  const C=2*Math.PI*r, sweep=0.75;
  const arcColor = charging ? T.amber : low ? T.red : T.cyan;
  const trackDash = `${sweep*C} ${(1-sweep)*C}`;
  const fillDash  = `${(level/100)*sweep*C} ${C}`;
  const tickDeg   = 135 + (limit/100)*270;
  const ta = (tickDeg*Math.PI)/180;
  const t1x=cx+(r-16)*Math.cos(ta), t1y=cy+(r-16)*Math.sin(ta);
  const t2x=cx+(r+16)*Math.cos(ta), t2y=cy+(r+16)*Math.sin(ta);

  const hasPredicted = predictiveMiles !== null;
  const ratedMiles   = Math.round((level/100)*RATED_MILES);
  const milesVal     = hasPredicted ? Math.round(predictiveMiles) : ratedMiles;
  const milesColor   = hasPredicted ? T.green : arcColor;
  const topLabel     = showMiles ? (hasPredicted ? "PREDICTED RANGE" : "RATED RANGE") : "STATE OF CHARGE";
  const topColor     = showMiles ? milesColor : T.mid;
  const bigText      = showMiles ? `${milesVal}` : `${Math.round(level)}`;
  const bigColor     = showMiles ? milesColor : T.hi;
  const unitText     = showMiles ? "miles" : "%";
  const subText      = showMiles ? `${Math.round(level)}% · tap for %` : `${ratedMiles} mi · tap for miles`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ animation: charging ? "pulse 1.6s ease-in-out infinite" : "none" }}>
      <g transform={`rotate(135 ${cx} ${cy})`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.border} strokeWidth={12}
          strokeLinecap="round" strokeDasharray={trackDash} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={arcColor} strokeWidth={12}
          strokeLinecap="round" strokeDasharray={fillDash}
          style={{ transition:"stroke-dasharray .6s ease, stroke .3s ease" }} />
      </g>
      <line x1={t1x} y1={t1y} x2={t2x} y2={t2y}
        stroke={T.hi} strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
      {/* top label */}
      <text x={cx} y={cy-46} textAnchor="middle"
        style={{ fontFamily:mono, fontSize:11, letterSpacing:2, fill:topColor }}>{topLabel}</text>
      {/* big number */}
      <text x={cx} y={cy+8} textAnchor="middle"
        style={{ fontFamily:mono, fontSize:52, fontWeight:700, fill:bigColor }}>{bigText}</text>
      {/* unit */}
      <text x={cx} y={cy+30} textAnchor="middle"
        style={{ fontFamily:mono, fontSize:13, fontWeight:500, fill:bigColor }}>{unitText}</text>
      {/* hint */}
      <text x={cx} y={cy+52} textAnchor="middle"
        style={{ fontFamily:disp, fontSize:10, letterSpacing:1, fill:T.lo }}>{subText}</text>
      {charging && (
        <text x={cx} y={cy+70} textAnchor="middle"
          style={{ fontFamily:disp, fontSize:11, letterSpacing:2, fill:T.amber }}>⚡ CHARGING</text>
      )}
    </svg>
  );
}

/* ── Efficiency delta bar ── */
function EfficiencyDeltaBar({ predictiveMiles, ratedMiles }) {
  const delta    = predictiveMiles - ratedMiles;
  const isGain   = delta >= 0;
  const pct      = Math.min(1, Math.abs(delta) / 40) * 50; // % of one half
  const color    = isGain ? T.green : T.amber;
  const sign     = isGain ? "+" : "−";
  const verb     = isGain ? "habits adding range" : "habits costing range";
  return (
    <div style={{ width:"85%", margin:"2px auto 8px", display:"flex", flexDirection:"column", gap:6 }}>
      {/* bar track */}
      <div style={{ display:"flex", height:6, borderRadius:3, overflow:"hidden" }}>
        {/* left half */}
        <div style={{ flex:1, background:T.border, display:"flex", justifyContent:"flex-end", overflow:"hidden" }}>
          {!isGain && <div style={{ width:`${pct}%`, background:color, borderRadius:"3px 0 0 3px", transition:"width .5s ease" }} />}
        </div>
        {/* center divider */}
        <div style={{ width:2, background:T.mid, flexShrink:0 }} />
        {/* right half */}
        <div style={{ flex:1, background:T.border, display:"flex", overflow:"hidden" }}>
          {isGain && <div style={{ width:`${pct}%`, background:color, borderRadius:"0 3px 3px 0", transition:"width .5s ease" }} />}
        </div>
      </div>
      {/* label */}
      <div style={{ textAlign:"center" }}>
        <span style={{ fontFamily:mono, fontSize:12, fontWeight:700, color }}>{sign}{Math.abs(delta)} mi</span>
        <span style={{ fontFamily:disp, fontSize:11, color:T.lo }}> · {verb}</span>
      </div>
    </div>
  );
}

/* ── Toggle control button ── */
function ToggleCtl({ icon, label, active, activeColor=T.cyan, onClick }) {
  return (
    <button onClick={onClick} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <span style={{
        width:58, height:58, borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center",
        background: active ? `${activeColor}1f` : T.panel,
        border: `1px solid ${active ? activeColor : T.border}`,
        color: active ? activeColor : T.mid,
        boxShadow: active ? `0 0 18px ${activeColor}33` : "none",
        transition:"all .2s",
        fontSize:22,
      }}>{icon}</span>
      <span style={{ fontFamily:disp, fontSize:11, color: active ? T.hi : T.lo }}>{label}</span>
    </button>
  );
}

/* ── Module card ── */
function Module({ icon, label, value, sub, accent=T.mid, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:T.panel, border:`1px solid ${T.border}`, borderRadius:18,
      padding:16, minHeight:118, cursor: onClick ? "pointer" : "default",
      transition:"opacity .15s",
    }}
      onMouseEnter={e => onClick && (e.currentTarget.style.opacity=".85")}
      onMouseLeave={e => (e.currentTarget.style.opacity="1")}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ color:accent }}>{icon}</span>
        {onClick && <span style={{ color:T.lo, fontSize:14 }}>↗</span>}
      </div>
      <div style={{ marginTop:16 }}>
        <div style={{ fontFamily:mono, fontSize:19, fontWeight:700, color:T.hi }}>{value}</div>
        <div style={{ fontFamily:disp, fontSize:12, color:T.mid, marginTop:2 }}>
          {label}{sub ? ` · ${sub}` : ""}
        </div>
      </div>
    </div>
  );
}

/* ── Stat row ── */
function Stat({ icon, label, value, accent=T.mid }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <span style={{
        width:44, height:44, borderRadius:12, background:T.panel,
        border:`1px solid ${T.border}`, color:accent,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
      }}>{icon}</span>
      <div>
        <div style={{ fontFamily:disp, fontSize:11, letterSpacing:1, color:T.lo }}>{label}</div>
        <div style={{ fontFamily:mono, fontSize:17, fontWeight:700, color:T.hi }}>{value}</div>
      </div>
    </div>
  );
}

/* ── Battery Health screen ── */
function BatteryHealthScreen({ snap }) {
  const fullPack = snap.full_pack_kwh;
  const healthPct = fullPack ? Math.min(100,(fullPack/FULL_PACK_KWH)*100) : null;
  const degraded  = fullPack ? FULL_PACK_KWH - fullPack : null;
  const color = !healthPct ? T.mid : healthPct>90 ? T.green : healthPct>80 ? T.amber : T.red;
  const label = !healthPct ? "Unknown" : healthPct>95 ? "Excellent" : healthPct>90 ? "Good" : healthPct>85 ? "Fair" : "Degraded";
  const avgWh = snap.avg_wh_per_mile;

  function CapBar({ lbl, val, color: c }) {
    const pct = Math.min(100,(val/FULL_PACK_KWH)*100);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        <div style={{ fontFamily:disp, fontSize:12, color:T.mid }}>{lbl}</div>
        <div style={{ height:8, borderRadius:4, background:T.border, overflow:"hidden" }}>
          <div style={{ height:8, width:`${pct}%`, background:c, borderRadius:4, transition:"width .5s" }} />
        </div>
        <div style={{ fontFamily:mono, fontSize:12, color:c, textAlign:"right" }}>{val.toFixed(1)} kWh</div>
      </div>
    );
  }

  return (
    <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:16, overflowY:"auto", height:"100%" }} className="vl-scroll">
      {/* Hero */}
      <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:18,
        padding:24, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
        <div style={{ fontFamily:mono, fontSize:64, fontWeight:700, color }}>{healthPct ? `${healthPct.toFixed(1)}%` : "—"}</div>
        <div style={{ fontFamily:disp, fontSize:18, fontWeight:600, color }}>{label}</div>
        <div style={{ fontFamily:disp, fontSize:13, color:T.mid, textAlign:"center" }}>
          {fullPack ? `${fullPack.toFixed(2)} kWh of ${FULL_PACK_KWH} kWh original` : "Waiting for frame 0x352…"}
        </div>
        {degraded > 0 && (
          <div style={{ fontFamily:mono, fontSize:12, color:T.amber }}>
            −{degraded.toFixed(2)} kWh lost ({((degraded/FULL_PACK_KWH)*100).toFixed(1)}% degradation)
          </div>
        )}
      </div>

      {/* Capacity bars */}
      {fullPack && (
        <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:18, padding:20, display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontFamily:disp, fontSize:11, letterSpacing:2, color:T.lo }}>PACK CAPACITY</div>
          <CapBar lbl="New (2018)"     val={FULL_PACK_KWH}   color={T.mid} />
          <CapBar lbl="Community avg @ 52k mi" val={72.4}    color={T.amber} />
          <CapBar lbl="Your car now"   val={fullPack}         color={color} />
          {snap.energy_remaining_kwh && <CapBar lbl="Remaining now" val={snap.energy_remaining_kwh} color={T.cyan} />}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        <Stat icon="🛡" label="HEALTH"            value={healthPct ? `${healthPct.toFixed(1)}%` : "—"} accent={color} />
        <Stat icon="🔋" label="FULL PACK NOW"     value={fullPack ? `${fullPack.toFixed(2)} kWh` : "—"} />
        <Stat icon="⚡" label="ENERGY REMAINING"  value={snap.energy_remaining_kwh ? `${snap.energy_remaining_kwh.toFixed(2)} kWh` : "—"} accent={T.cyan} />
        <Stat icon="📉" label="DEGRADATION"       value={degraded>0 ? `−${degraded.toFixed(2)} kWh` : "None yet"} accent={T.amber} />
        <Stat icon="📊" label="EFFICIENCY (30 mi)" value={avgWh ? `${Math.round(avgWh)} Wh/mi` : "—"} />
        <Stat icon="🌡" label="BATTERY TEMP"      value={snap.battTempStr} />
      </div>

      <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:18, padding:20 }}>
        <div style={{ fontFamily:disp, fontSize:11, letterSpacing:2, color:T.lo, marginBottom:10 }}>REFERENCE</div>
        <div style={{ fontFamily:disp, fontSize:13, color:T.mid, lineHeight:"20px" }}>
          Baseline is 77.8 kWh — BMS-reported capacity when new for 2018 Model 3 Long Range,
          per ScanMyTesla community data. Typical degradation: 3–5% by 10k mi, 5–8% by 50k mi.
        </div>
        <div style={{ fontFamily:disp, fontSize:12, color:T.amber, marginTop:8, lineHeight:"18px" }}>
          Requires frame 0x352 from CAN bus. Validate bit positions against your firmware.
        </div>
      </div>
    </div>
  );
}

/* ── Home screen ── */
function HomeScreen({ snap, settings, setSettings, navigation }) {
  const [showMiles,  setShowMiles]  = useState(true);
  const [locked,     setLocked]     = useState(true);
  const [climateOn,  setClimate]    = useState(false);
  const [portOpen,   setPort]       = useState(false);

  const soc      = snap.soc;
  const charging = snap.charging_state !== "idle";
  const low      = soc < 15;
  const ratedMi  = Math.round((soc/100)*RATED_MILES);
  const energyStr= snap.energy_remaining_kwh ? `${snap.energy_remaining_kwh.toFixed(1)} kWh` : null;

  const healthColor = !snap.battery_health_pct ? T.mid
    : snap.battery_health_pct>90 ? T.green
    : snap.battery_health_pct>80 ? T.amber : T.red;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflowY:"auto" }} className="vl-scroll">
      {/* Gauge — click to toggle */}
      <div onClick={() => setShowMiles(m=>!m)}
        style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:8, cursor:"pointer" }}>
        <Gauge270 level={soc} limit={settings.chargeLimit} charging={charging} low={low}
          showMiles={showMiles} predictiveMiles={snap.predictive_range_miles} />
      </div>

      {/* Efficiency delta bar */}
      {snap.predictive_range_miles !== null && (
        <EfficiencyDeltaBar
          predictiveMiles={Math.round(snap.predictive_range_miles)}
          ratedMiles={ratedMi} />
      )}

      {/* Mini stats */}
      <div style={{ display:"flex", justifyContent:"center", gap:20, marginBottom:10,
        fontFamily:mono, fontSize:12, color:T.mid }}>
        <span>{snap.power_kw !== null ? `${snap.power_kw.toFixed(1)} kW` : "—"}</span>
        <span>{snap.avg_wh_per_mile ? `${Math.round(snap.avg_wh_per_mile)} Wh/mi` : "—"}</span>
        <span>{snap.battTempStr}</span>
        {energyStr && <span>{energyStr}</span>}
      </div>

      {/* Quick controls */}
      <div style={{ display:"flex", gap:8, padding:"0 20px", marginBottom:16 }}>
        <ToggleCtl icon={locked?"🔒":"🔓"} label={locked?"Locked":"Unlocked"} active={locked} onClick={()=>setLocked(l=>!l)} />
        <ToggleCtl icon="💨" label="Climate" active={climateOn} onClick={()=>setClimate(c=>!c)} />
        <ToggleCtl icon={charging?"⊘":"⚡"} label={charging?"Stop":"Charge"} active={charging}
          activeColor={T.amber} onClick={()=>{}} />
        <ToggleCtl icon={portOpen?"◉":"◎"} label="Port" active={portOpen}
          activeColor={T.amber} onClick={()=>setPort(p=>!p)} />
      </div>

      {/* Address strip */}
      <div style={{ display:"flex", alignItems:"center", gap:12, margin:"0 20px 12px",
        padding:"12px 16px", background:T.panel, border:`1px solid ${T.border}`, borderRadius:14 }}>
        <span style={{ color:T.cyan }}>📍</span>
        <span style={{ fontFamily:disp, fontSize:15, color:T.hi, flex:1 }}>421 Addison Rd</span>
        <span style={{ fontFamily:disp, fontSize:12, color:T.lo }}>Parked</span>
      </div>

      {/* Module grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, padding:"0 20px 16px" }}>
        <Module icon="🌡" label="Climate" value={`${climateOn?72:74}°F`} sub={climateOn?"On":"Off"}
          accent={climateOn?T.cyan:T.mid} onClick={()=>navigation("climate")} />
        <Module icon="🔋" label="Battery" value={`${Math.round(soc)}%`}
          sub={energyStr ?? `${ratedMi} mi`} accent={charging?T.amber:T.cyan}
          onClick={()=>navigation("battery")} />
        <Module icon="🛡" label="Batt. Health"
          value={snap.battery_health_pct ? `${snap.battery_health_pct.toFixed(1)}%` : "—"}
          accent={healthColor} onClick={()=>navigation("health")} />
        <Module icon="🛣" label="Drives" value="5h ago" onClick={()=>navigation("log")} />
        <Module icon="⚡" label="Charges" value={charging?"AC":"17h ago"} accent={charging?T.amber:T.mid}
          onClick={()=>navigation("battery")} />
        <Module icon="🔢" label="Odometer" value={snap.odometer_km ? `${Math.round(snap.odometer_km/1.60934).toLocaleString()} mi` : "—"} />
      </div>
    </div>
  );
}

/* ── Battery screen ── */
function BatteryScreen({ snap, settings, setSettings }) {
  const soc = snap.soc;
  const charging = snap.charging_state !== "idle";
  const low = soc < 15;
  const limitMi = Math.round((settings.chargeLimit/100)*RATED_MILES);
  const rangeMi = Math.round((soc/100)*RATED_MILES);

  return (
    <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:20, overflowY:"auto" }} className="vl-scroll">
      <div style={{ display:"flex", justifyContent:"center" }}>
        <Gauge270 level={soc} limit={settings.chargeLimit} charging={charging} low={low}
          showMiles={false} predictiveMiles={snap.predictive_range_miles} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px 12px" }}>
        <Stat icon="🔋" label="LEVEL"       value={`${Math.round(soc)}%`}   accent={T.cyan} />
        <Stat icon="🛣"  label="RANGE"       value={`${rangeMi} mi`} />
        <Stat icon="⚡"  label="POWER"       value={snap.power_kw!==null?`${snap.power_kw.toFixed(1)} kW`:"—"} accent={charging?T.amber:T.mid} />
        <Stat icon="🌡"  label="TEMPERATURE" value={snap.battTempStr} />
        <Stat icon="🔩"  label="TORQUE"      value={snap.torque_nm!==null?`${Math.round(snap.torque_nm)} Nm`:"—"} />
        <Stat icon="📊"  label="EFFICIENCY"  value={snap.avg_wh_per_mile?`${Math.round(snap.avg_wh_per_mile)} Wh/mi`:"—"} />
        <Stat icon="📏"  label="ODOMETER"    value={snap.odometer_km?`${Math.round(snap.odometer_km/1.60934).toLocaleString()} mi`:"—"} />
        <Stat icon="⚡"  label="ENERGY LEFT"  value={snap.energy_remaining_kwh?`${snap.energy_remaining_kwh.toFixed(1)} kWh`:"—"} accent={T.cyan} />
      </div>

      {/* Charge limit slider */}
      <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:18, padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ fontFamily:disp, fontSize:13, color:T.mid }}>CHARGE LIMIT</span>
          <span style={{ fontFamily:mono, color:T.hi }}>{limitMi} mi · {settings.chargeLimit}%</span>
        </div>
        <input type="range" min={50} max={100} value={settings.chargeLimit}
          onChange={e=>setSettings(s=>({...s,chargeLimit:+e.target.value}))}
          style={{ width:"100%", accentColor:T.cyan }} />
      </div>

      <button style={{
        borderRadius:16, padding:"16px 0", display:"flex", alignItems:"center",
        justifyContent:"center", gap:8, fontFamily:disp, fontWeight:600, fontSize:16, cursor:"pointer",
        background: charging?`${T.amber}1f`:T.cyan,
        color: charging?T.amber:T.ink,
        border: `1px solid ${charging?T.amber:"transparent"}`,
      }}>
        {charging ? "⊘ Stop charging" : "⚡ Start charging"}
      </button>
    </div>
  );
}

/* ── Nav tabs ── */
const TABS = [
  { id:"home",    label:"Home",    icon:"⌂" },
  { id:"battery", label:"Battery", icon:"🔋" },
  { id:"climate", label:"Climate", icon:"💨" },
  { id:"health",  label:"Health",  icon:"🛡" },
  { id:"log",     label:"Log",     icon:"📋" },
];

/* ── Simulation ── */
function useMockData(charging) {
  const [soc,        setSoc]        = useState(66);
  const [avgWh,      setAvgWh]      = useState(null);
  const [odomKm,     setOdomKm]     = useState(84623);
  const [torque,     setTorque]     = useState(0);
  const [speedMph,   setSpeedMph]   = useState(0);
  const [powerKw,    setPowerKw]    = useState(null);
  const [fullPack,   setFullPack]   = useState(71.4);
  const [energyRem,  setEnergyRem]  = useState(null);
  const [tempMin,    setTempMin]    = useState(22);
  const [tempMax,    setTempMax]    = useState(26);
  const [isMoving,   setIsMoving]   = useState(false);

  // Simulate a short drive after 3s
  useEffect(() => {
    const t = setTimeout(() => {
      setIsMoving(true);
      setSpeedMph(62);
      setTorque(80);
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  // Tick
  useEffect(() => {
    const id = setInterval(() => {
      if (charging) {
        setSoc(s => Math.min(80, +(s+0.2).toFixed(1)));
        setPowerKw(-7.2);
        setAvgWh(null);
        return;
      }
      if (isMoving) {
        const spd = 62 + (Math.random()-0.5)*4;
        const tq  = 80 + (Math.random()-0.5)*20;
        const pw  = (tq * spd * 0.44704 * 9.034) / 0.334 / 1000;
        setSpeedMph(spd);
        setTorque(tq);
        setPowerKw(pw);
        setSoc(s => Math.max(0, +(s-0.05).toFixed(2)));
        setOdomKm(k => k+0.02);
        // Simulate rolling efficiency building up
        setAvgWh(a => {
          const sample = (pw*1000)/spd;
          return a === null ? sample : a*0.95 + sample*0.05;
        });
      } else {
        setPowerKw(null);
        setAvgWh(null);
      }
    }, 500);
    return () => clearInterval(id);
  }, [charging, isMoving]);

  const energyRemaining = (soc/100)*fullPack;
  const predictive = avgWh && avgWh>0
    ? (energyRemaining*1000/avgWh) * (tempMax>20?1:0.9)
    : null;

  return {
    soc,
    charging_state: charging ? "ac" : "idle",
    speed_mph: speedMph,
    power_kw: powerKw,
    torque_nm: torque,
    battery_temp_min: tempMin,
    battery_temp_max: tempMax,
    battery_health_pct: Math.min(100,(fullPack/FULL_PACK_KWH)*100),
    full_pack_kwh: fullPack,
    energy_remaining_kwh: energyRemaining,
    avg_wh_per_mile: avgWh,
    predictive_range_miles: predictive,
    odometer_km: odomKm,
    battTempStr: `${Math.round(tempMin*9/5+32)}–${Math.round(tempMax*9/5+32)}°F`,
  };
}

/* ── App shell ── */
export default function TescanPreview() {
  const [tab,      setTab]      = useState("home");
  const [charging, setCharging] = useState(false);
  const [settings, setSettings] = useState({ chargeLimit:80, unitsMph:true });
  const snap = useMockData(charging);

  const statusColor = snap.charging_state==="ac" ? T.amber : T.lo;
  const statusLabel = snap.charging_state==="ac" ? "Charging" : snap.speed_mph>1 ? "Driving" : "Sleeping";

  function navigate(to) {
    if (to==="climate") setTab("climate");
    else if (to==="battery") setTab("battery");
    else if (to==="health") setTab("health");
    else if (to==="log") setTab("log");
  }

  return (
    <div style={{ width:"100%", minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", padding:16, background:"#06080B" }}>
      <FontInjector />
      <div style={{ width:"100%", maxWidth:430, height:900, background:T.ink, borderRadius:38,
        border:`1px solid ${T.border}`, boxShadow:"0 40px 120px rgba(0,0,0,0.6)",
        display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"20px 20px 12px", flexShrink:0 }}>
          <span style={{ fontFamily:disp, fontSize:19, fontWeight:600, color:T.hi }}>
            {tab==="home"?"Josh": tab==="battery"?"Battery": tab==="climate"?"Climate":
             tab==="health"?"Battery Health": tab==="log"?"Activity":"Settings"}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {/* BLE mock indicator */}
            <span style={{ width:7, height:7, borderRadius:99, background:T.green,
              boxShadow:`0 0 8px ${T.green}`, display:"inline-block",
              animation:"blink 2s ease-in-out infinite" }} />
            <span style={{ fontFamily:disp, fontSize:12, color:T.mid }}>Connected</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
          {tab==="home" && <HomeScreen snap={snap} settings={settings} setSettings={setSettings} navigation={navigate} />}
          {tab==="battery" && <BatteryScreen snap={snap} settings={settings} setSettings={setSettings} />}
          {tab==="health" && <BatteryHealthScreen snap={snap} />}
          {tab==="climate" && (
            <div style={{ padding:20, color:T.mid, fontFamily:disp, fontSize:14 }}>
              Climate screen — seat heat, defrost, wheel heat controls coming soon.
            </div>
          )}
          {tab==="log" && (
            <div style={{ padding:20, display:"flex", flexDirection:"column", gap:0 }}>
              {[
                { icon:"📊", label:"Driving · 62 mph", time:"now",    c:T.cyan },
                { icon:"🅿",  label:"Parked at 421 Addison Rd", time:"4h ago", c:T.cyan },
                { icon:"🛣",  label:"Drove 12.4 mi · 24 min",   time:"5h ago", c:T.cyan },
                { icon:"⚡",  label:"Charged to 80% · +14.2 kWh",time:"17h ago",c:T.amber },
                { icon:"🔒",  label:"Locked",                   time:"18h ago",c:T.mid },
              ].map((e,i,arr) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0",
                  borderBottom: i<arr.length-1?`1px solid ${T.border}`:"none" }}>
                  <span style={{ width:40, height:40, borderRadius:11, background:T.panel,
                    border:`1px solid ${T.border}`, color:e.c, display:"flex",
                    alignItems:"center", justifyContent:"center", fontSize:18 }}>{e.icon}</span>
                  <span style={{ fontFamily:disp, fontSize:14, color:T.hi, flex:1 }}>{e.label}</span>
                  <span style={{ fontFamily:mono, fontSize:12, color:T.lo }}>{e.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ flexShrink:0, borderTop:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 20px 4px",
            fontFamily:mono, fontSize:10, color:T.lo }}>
            <span>Tesla Model 3 · 2018 · Vehicle bus</span>
            <span>Tescan</span>
          </div>
          <div style={{ display:"flex", padding:"4px 8px 12px" }}>
            {TABS.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                  gap:4, paddingTop:4, paddingBottom:2, cursor:"pointer" }}>
                <span style={{ fontSize:20 }}>{n.icon}</span>
                <span style={{ fontFamily:disp, fontSize:10,
                  color: tab===n.id ? T.cyan : T.lo }}>{n.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating charge toggle for demo */}
      <div style={{ position:"fixed", bottom:24, right:24 }}>
        <button onClick={()=>setCharging(c=>!c)} style={{
          background: charging?T.amber:T.panel, color: charging?T.ink:T.mid,
          border:`1px solid ${charging?T.amber:T.border}`, borderRadius:12,
          padding:"10px 16px", fontFamily:disp, fontSize:13, fontWeight:600, cursor:"pointer",
          boxShadow:`0 4px 20px rgba(0,0,0,0.4)`,
        }}>
          {charging ? "⊘ Stop charge" : "⚡ Start charge"}
        </button>
      </div>
    </div>
  );
}
