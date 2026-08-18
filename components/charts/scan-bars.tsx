import { formatDate } from "@/lib/format";

/**
 * Scans par jour — série unique, magnitude dans le temps.
 *
 * Une seule série : pas de légende, le titre nomme la donnée. Barres fines à
 * extrémité arrondie ancrées sur la ligne de base, écart d'un pixel de surface
 * entre elles, grille discrète. Les valeurs ne sont pas écrites sur chaque
 * barre — seuls le maximum et le dernier jour sont annotés.
 *
 * Rendu en SVG serveur : aucune librairie pour trente points, et le survol
 * natif (`<title>`) donne le détail sans une ligne de JavaScript.
 */

type Point = { day: string; count: number };

export function ScanBars({
  points,
  className,
}: {
  points: Point[];
  className?: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.count));
  const total = points.reduce((sum, p) => sum + p.count, 0);

  if (points.length === 0) {
    return null;
  }

  const width = 100; // repère en pourcentage, le SVG s'étire
  const height = 44;
  const gap = 0.6;
  const slot = width / points.length;
  const barWidth = Math.max(slot - gap, 0.8);

  const maxIndex = points.reduce(
    (best, p, i) => (p.count > points[best].count ? i : best),
    0,
  );

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Scans par jour sur les ${points.length} derniers jours, ${total} au total`}
        className="h-32 w-full sm:h-40"
      >
        {/* Grille : deux repères seulement, volontairement effacés */}
        {[0.5, 1].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            x2={width}
            y1={height - height * ratio * 0.92}
            y2={height - height * ratio * 0.92}
            stroke="var(--color-border)"
            strokeWidth={0.25}
          />
        ))}

        {points.map((point, index) => {
          const barHeight = point.count === 0 ? 0 : (point.count / max) * height * 0.92;
          const x = index * slot + gap / 2;
          const isMax = index === maxIndex && point.count > 0;

          return (
            <g key={point.day}>
              {/* Zone de survol large : la barre peut être minuscule */}
              <rect
                x={index * slot}
                y={0}
                width={slot}
                height={height}
                fill="transparent"
              >
                <title>{`${formatDate(point.day)} — ${point.count} scan${point.count > 1 ? "s" : ""}`}</title>
              </rect>

              {barHeight > 0 && (
                <rect
                  x={x}
                  y={height - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={0.4}
                  fill={isMax ? "var(--color-accent)" : "var(--color-ink)"}
                  opacity={isMax ? 1 : 0.78}
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        {/* Ligne de base */}
        <line
          x1={0}
          x2={width}
          y1={height}
          y2={height}
          stroke="var(--color-border-strong)"
          strokeWidth={0.3}
        />
      </svg>

      <figcaption className="mt-2 flex justify-between text-xs text-ink-muted">
        <span>{formatDate(points[0].day)}</span>
        <span>
          Pic : <span className="font-semibold text-ink">{points[maxIndex].count}</span>{" "}
          le {formatDate(points[maxIndex].day)}
        </span>
        <span>{formatDate(points[points.length - 1].day)}</span>
      </figcaption>
    </figure>
  );
}
