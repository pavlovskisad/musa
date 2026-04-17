export default function Particles({ large = false }) {
  const cls = `particle${large ? ' particle-lg' : ''}`;
  return (
    <div className="ambient-particles">
      <span className={`${cls} p1`} />
      <span className={`${cls} p2`} />
      <span className={`${cls} p3`} />
      <span className={`${cls} p4`} />
      <span className={`${cls} p5`} />
      <span className={`${cls} p6`} />
      <span className={`${cls} p7`} />
      <span className={`${cls} p8`} />
      <span className={`${cls} p9`} />
      <span className={`${cls} p10`} />
      <span className={`${cls} p11`} />
    </div>
  );
}
