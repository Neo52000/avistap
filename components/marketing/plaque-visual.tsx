/**
 * Visuel héros : le geste, montré plutôt que décrit.
 *
 * Un téléphone approché d'une plaque gravée, ondes NFC à l'appui, et le
 * formulaire d'avis déjà ouvert à l'écran. Tout est en SVG inline : aucune
 * image à charger, net sur tous les écrans, et le LCP reste au texte.
 */
export function PlaqueVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 360"
      fill="none"
      role="img"
      aria-label="Un téléphone approché d'une plaque Avistap ouvre le formulaire d'avis Google"
      className={className}
    >
      {/* Halo */}
      <ellipse cx="210" cy="318" rx="150" ry="18" fill="#17160f" opacity="0.07" />

      {/* --- Plaque gravée --- */}
      <g>
        <rect x="42" y="86" width="176" height="176" rx="18" fill="#17160f" />
        <rect
          x="52"
          y="96"
          width="156"
          height="156"
          rx="12"
          fill="none"
          stroke="#f0b429"
          strokeOpacity="0.35"
        />

        {/* Emplacement du logo client */}
        <rect x="86" y="120" width="88" height="34" rx="6" fill="#faf8f3" opacity="0.92" />
        <rect x="96" y="130" width="26" height="14" rx="3" fill="#17160f" opacity="0.75" />
        <rect x="128" y="132" width="36" height="4" rx="2" fill="#17160f" opacity="0.5" />
        <rect x="128" y="140" width="24" height="4" rx="2" fill="#17160f" opacity="0.3" />

        {/* Cinq étoiles */}
        <g transform="translate(70 176)">
          {[0, 24, 48, 72, 96].map((x) => (
            <path
              key={x}
              transform={`translate(${x} 0)`}
              d="M10 0l2.9 6.1 6.6.9-4.8 4.8 1.2 6.8L10 15.4 4.1 18.6l1.2-6.8L.5 7l6.6-.9L10 0z"
              fill="#f0b429"
            />
          ))}
        </g>

        <text
          x="130"
          y="222"
          textAnchor="middle"
          fill="#faf8f3"
          fontSize="13"
          fontWeight="600"
          letterSpacing="0.08em"
          fontFamily="system-ui, sans-serif"
        >
          VOTRE AVIS
        </text>
        <text
          x="130"
          y="240"
          textAnchor="middle"
          fill="#faf8f3"
          fillOpacity="0.55"
          fontSize="10"
          letterSpacing="0.04em"
          fontFamily="system-ui, sans-serif"
        >
          approchez votre téléphone
        </text>
      </g>

      {/* --- Ondes NFC --- */}
      <g stroke="#b4801a" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M228 152a34 34 0 010 56" className="nfc-wave" style={{ animationDelay: "0s" }} />
        <path d="M244 138a56 56 0 010 84" className="nfc-wave" style={{ animationDelay: "0.5s" }} />
        <path d="M260 124a78 78 0 010 112" className="nfc-wave" style={{ animationDelay: "1s" }} />
      </g>

      {/* --- Téléphone --- */}
      <g>
        <rect x="276" y="42" width="124" height="240" rx="20" fill="#17160f" />
        <rect x="283" y="49" width="110" height="226" rx="15" fill="#ffffff" />
        <rect x="322" y="55" width="32" height="5" rx="2.5" fill="#17160f" opacity="0.28" />

        {/* En-tête de la fiche */}
        <rect x="295" y="74" width="52" height="7" rx="3.5" fill="#17160f" opacity="0.82" />
        <rect x="295" y="88" width="76" height="5" rx="2.5" fill="#17160f" opacity="0.28" />

        {/* Étoiles à remplir */}
        <g transform="translate(295 108)">
          {[0, 19, 38, 57, 76].map((x, index) => (
            <path
              key={x}
              transform={`translate(${x} 0)`}
              d="M8 0l2.3 4.9 5.3.7-3.8 3.9.9 5.5L8 12.3 2.3 15l.9-5.5L-.6 5.6l5.3-.7L8 0z"
              fill={index < 5 ? "#f0b429" : "#e6e2d7"}
            />
          ))}
        </g>

        {/* Zone de commentaire */}
        <rect x="295" y="138" width="86" height="46" rx="8" fill="#faf8f3" />
        <rect x="303" y="148" width="60" height="4" rx="2" fill="#17160f" opacity="0.2" />
        <rect x="303" y="158" width="48" height="4" rx="2" fill="#17160f" opacity="0.14" />
        <rect x="303" y="168" width="54" height="4" rx="2" fill="#17160f" opacity="0.14" />

        {/* Bouton publier */}
        <rect x="295" y="196" width="86" height="26" rx="8" fill="#17160f" />
        <rect x="322" y="206" width="32" height="6" rx="3" fill="#ffffff" opacity="0.92" />

        <rect x="315" y="238" width="46" height="5" rx="2.5" fill="#17160f" opacity="0.14" />
      </g>
    </svg>
  );
}
