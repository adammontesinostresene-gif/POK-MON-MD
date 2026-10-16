import React, { useState } from 'react';
import { getPmdPortraitUrl, getPokemonSprite } from '../data/pokemonData';

interface PmdSpriteProps {
  pokedexId: number;
  direction?: 'right' | 'left' | 'down';
  animType?: 'Walk' | 'Idle' | 'Attack';
  scale?: number;
  className?: string;
  isAttacking?: boolean;
  isHit?: boolean;
}

/**
 * PmdSprite: Standardized on PMD Repository Portraits as requested.
 * Includes directional facing, attack lunge animations, and hit shake.
 */
export const PmdSprite: React.FC<PmdSpriteProps> = ({
  pokedexId,
  direction = 'down',
  scale = 2,
  className = '',
  isAttacking = false,
  isHit = false,
}) => {
  const [loadError, setLoadError] = useState<boolean>(false);
  const emotion = isHit ? 'Pain' : isAttacking ? 'Angry' : 'Normal';
  const portraitUrl = getPmdPortraitUrl(pokedexId, emotion);

  // Approximate pixel size from scale
  const pixelSize = Math.round(36 * scale);

  return (
    <div
      className={`inline-flex items-center justify-center transition-all duration-200 select-none ${
        isAttacking
          ? direction === 'right'
            ? 'translate-x-5 scale-110'
            : '-translate-x-5 scale-110'
          : ''
      } ${isHit ? 'animate-bounce brightness-150 filter' : ''} ${
        direction === 'left' ? '-scale-x-100' : ''
      } ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <img
        src={loadError ? getPokemonSprite(pokedexId) : portraitUrl}
        alt={`Pokemon ${pokedexId}`}
        referrerPolicy="no-referrer"
        onError={() => setLoadError(true)}
        style={{ imageRendering: 'pixelated' }}
        className="max-h-full max-w-full object-contain filter drop-shadow-md transition-transform"
      />
    </div>
  );
};

interface PmdPortraitProps {
  pokedexId: number;
  emotion?: 'Normal' | 'Happy' | 'Pain' | 'Angry' | 'Joyous';
  size?: number;
  className?: string;
  showFrame?: boolean;
}

export const PmdPortrait: React.FC<PmdPortraitProps> = ({
  pokedexId,
  emotion = 'Normal',
  size = 40,
  className = '',
  showFrame = false,
}) => {
  const [loadError, setLoadError] = useState<boolean>(false);
  const portraitUrl = getPmdPortraitUrl(pokedexId, emotion);
  const isFluid = className.includes('w-full') || className.includes('h-full');

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${
        showFrame
          ? 'p-1 rounded-lg bg-slate-900 border-2 border-amber-400 shadow-md'
          : ''
      } ${className}`}
      style={isFluid ? undefined : { width: showFrame ? size + 8 : size, height: showFrame ? size + 8 : size }}
    >
      <img
        src={loadError ? getPokemonSprite(pokedexId) : portraitUrl}
        alt={`Portrait ${pokedexId}`}
        referrerPolicy="no-referrer"
        onError={() => setLoadError(true)}
        style={{ imageRendering: 'pixelated' }}
        className="w-full h-full object-contain filter drop-shadow-sm select-none"
      />
    </div>
  );
};
