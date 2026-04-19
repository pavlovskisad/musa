const TIER_CONFIG = {
  spark: { count: 6, close: 0, far: 2 },
  flow:  { count: 11, close: 1, far: 3 },
  vein:  { count: 16, close: 3, far: 4 },
};

const POSITIONS = [
  'p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11',
  'p12','p13','p14','p15','p16','p17','p18','p19','p20','p21','p22','p23',
];

export default function Particles({ large = false, tier = 'flow' }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.flow;
  const base = large ? 'particle particle-lg' : 'particle';

  const els = [];
  for (let i = 0; i < cfg.count + cfg.close + cfg.far; i++) {
    const pos = POSITIONS[i % POSITIONS.length];
    let cls;
    if (i < cfg.close) {
      cls = `particle ${large ? 'particle-lg' : ''} particle-close ${pos}`;
    } else if (i < cfg.close + cfg.far) {
      cls = `particle ${large ? 'particle-lg' : ''} particle-far ${pos}`;
    } else {
      cls = `${base} ${pos}`;
    }
    els.push(<span key={i} className={cls} />);
  }

  return <div className="ambient-particles">{els}</div>;
}
