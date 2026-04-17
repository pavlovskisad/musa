export default function Radar({ large = false }) {
  return (
    <div className={`radar${large ? ' radar-lg' : ''}`}>
      <span className="radar-ring" />
      <span className="radar-ring radar-ring-2" />
      <span className="radar-ring radar-ring-3" />
      <span className="radar-core" />
    </div>
  );
}
