import { STATIONS } from "../data/stations";

const STAT_META = [
  {
    key: "strength",
    abbr: "STR",
    name: "STRENGTH",
    icon: "💪",
    color: "#FF4444",
    description: "Raw power for heavy movements",
    tip: "High STR wins bag pushes, pulls, carries, and moon shots.",
  },
  {
    key: "speed",
    abbr: "SPD",
    name: "SPEED",
    icon: "⚡",
    color: "#FFD700",
    description: "Explosive quickness and fast transitions",
    tip: "High SPD dominates FOMO Jumps and fast finishes.",
  },
  {
    key: "endurance",
    abbr: "END",
    name: "ENDURANCE",
    icon: "🔥",
    color: "#44FF44",
    description: "Stamina for long cardio efforts",
    tip: "High END crushes Mining Rig and Liquidity Rowing.",
  },
  {
    key: "technique",
    abbr: "TEC",
    name: "TECHNIQUE",
    icon: "🎯",
    color: "#4488FF",
    description: "Efficient form on complex movements",
    tip: "High TEC stabilizes Rug Pulls and Lunges.",
  },
  {
    key: "mental",
    abbr: "MNT",
    name: "MENTAL",
    icon: "🧠",
    color: "#AA44FF",
    description: "Clutch performance under pressure",
    tip: "High MNT keeps you steady when the gap tightens.",
  },
];

const STAT_COLORS: Record<string, string> = {
  strength: "#FF4444",
  speed: "#FFD700",
  endurance: "#44FF44",
  technique: "#4488FF",
  mental: "#AA44FF",
};

const STAT_LABELS: Record<string, string> = {
  strength: "STR",
  speed: "SPD",
  endurance: "END",
  technique: "TEC",
  mental: "MNT",
};

export function StatsExplainer() {
  const stationRows = STATIONS.map((station) => ({
    id: station.id,
    icon: station.icon,
    name: station.name,
    primary: STAT_LABELS[station.primaryStat],
    secondary: STAT_LABELS[station.secondaryStat],
    primaryColor: STAT_COLORS[station.primaryStat],
    secondaryColor: STAT_COLORS[station.secondaryStat],
  }));

  return (
    <div className="stats-explainer">
      <div className="stats-explainer-title">Stat Guide</div>

      <div className="stats-explainer-grid">
        {STAT_META.map((stat) => {
          const stations = STATIONS.filter(
            (station) => station.primaryStat === stat.key || station.secondaryStat === stat.key
          ).map((station) => station.name);
          return (
            <div key={stat.key} className="stats-explainer-card" style={{ borderColor: stat.color }}>
              <div className="stats-explainer-header">
                <span className="stats-explainer-icon">{stat.icon}</span>
                <span className="stats-explainer-key" style={{ color: stat.color }}>{stat.abbr}</span>
                <span className="stats-explainer-name">{stat.name}</span>
              </div>
              <p className="stats-explainer-desc">{stat.description}</p>
              <div className="stats-explainer-stations">
                <span className="stats-explainer-label">Tested at:</span>
                <div className="stats-explainer-list">
                  {stations.map((station) => (
                    <span key={station} className="stats-explainer-tag">{station}</span>
                  ))}
                </div>
              </div>
              <p className="stats-explainer-tip">Tip: {stat.tip}</p>
            </div>
          );
        })}
      </div>

      <details className="stats-explainer-reference">
        <summary>Station → Stat Matchups</summary>
        <table>
          <thead>
            <tr>
              <th>Station</th>
              <th>Primary</th>
              <th>Secondary</th>
            </tr>
          </thead>
          <tbody>
            {stationRows.map((station) => (
              <tr key={station.id}>
                <td>
                  <span className="stats-explainer-station-icon">{station.icon}</span>
                  {station.name}
                </td>
                <td style={{ color: station.primaryColor }}>{station.primary}</td>
                <td style={{ color: station.secondaryColor }}>{station.secondary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
