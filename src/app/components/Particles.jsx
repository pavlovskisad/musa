const TIER_CONFIG = {
  spark: { count: 6,  close: 1, far: 2 },
  flow:  { count: 12, close: 3, far: 4 },
  vein:  { count: 18, close: 6, far: 7 },
};

const POSITIONS = [
  'p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11',
  'p12','p13','p14','p15','p16','p17','p18','p19','p20','p21','p22','p23',
];

function spreadPick(total) {
  const step = POSITIONS.length / total;
  return Array.from({ length: total }, (_, i) =>
    POSITIONS[Math.floor(i * step) % POSITIONS.length]
  );
}

export default function Particles({ large = false, tier = 'flow' }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.flow;
  const total = cfg.count + cfg.close + cfg.far;
  const picks = spreadPick(total);
  const base = large ? 'particle particle-lg' : 'particle';

  return (
    <div className="ambient-particles">
      {picks.map((pos, i) => {
        let cls;
        if (i < cfg.close) {
          cls = `particle ${large ? 'particle-lg' : ''} particle-close ${pos}`;
        } else if (i < cfg.close + cfg.far) {
          cls = `particle ${large ? 'particle-lg' : ''} particle-far ${pos}`;
        } else {
          cls = `${base} ${pos}`;
        }
        return <span key={i} className={cls} />;
      })}
    </div>
  );
}
