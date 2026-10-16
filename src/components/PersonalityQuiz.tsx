import React, { useState } from 'react';
import { STARTERS } from '../data/pokemonData';
import { soundManager } from '../utils/audio';
import { PmdPortrait } from './PmdSprite';

type Trait = 'valiente' | 'alegre' | 'tranquilo' | 'timido' | 'travieso' | 'listo' | 'independiente' | 'amable';

const TRAITS: Record<Trait, { nature: string; description: string }> = {
  valiente: { nature: 'Valiente', description: 'Te lanzas de cabeza ante el peligro y nunca das la espalda a quien necesita ayuda.' },
  alegre: { nature: 'Alegre', description: 'Tu buen humor es contagioso: donde vas, llevas risas y energía.' },
  tranquilo: { nature: 'Sereno', description: 'Mantienes la calma incluso en los peores momentos. Los demás confían en tu paciencia.' },
  timido: { nature: 'Tímido', description: 'Eres prudente y sensible. Cuando reúnes valor, sorprendes a todos.' },
  travieso: { nature: 'Pícaro', description: 'Te encantan las bromas y las travesuras, pero tienes un gran corazón.' },
  listo: { nature: 'Astuto', description: 'Piensas antes de actuar y siempre encuentras la solución más ingeniosa.' },
  independiente: { nature: 'Independiente', description: 'Sigues tu propio camino y no te asusta ir por libre.' },
  amable: { nature: 'Amable', description: 'Te preocupas por los demás y siempre tienes una palabra de ánimo.' },
};

// Each starter's personality: [main trait, secondary trait]
const STARTER_TRAITS: Record<number, [Trait, Trait]> = {
  1: ['tranquilo', 'amable'],
  4: ['valiente', 'amable'],
  7: ['travieso', 'valiente'],
  25: ['alegre', 'valiente'],
  133: ['alegre', 'listo'],
  152: ['amable', 'alegre'],
  155: ['timido', 'valiente'],
  158: ['travieso', 'alegre'],
  252: ['tranquilo', 'listo'],
  255: ['amable', 'valiente'],
  258: ['tranquilo', 'timido'],
  387: ['tranquilo', 'valiente'],
  390: ['travieso', 'listo'],
  393: ['independiente', 'valiente'],
  495: ['listo', 'independiente'],
  498: ['amable', 'travieso'],
  501: ['valiente', 'travieso'],
  650: ['alegre', 'travieso'],
  653: ['listo', 'tranquilo'],
  656: ['independiente', 'tranquilo'],
  722: ['tranquilo', 'alegre'],
  725: ['independiente', 'timido'],
  728: ['alegre', 'amable'],
  810: ['travieso', 'amable'],
  813: ['valiente', 'alegre'],
  816: ['timido', 'amable'],
  906: ['independiente', 'travieso'],
  909: ['alegre', 'tranquilo'],
  912: ['listo', 'valiente'],
};

const QUESTIONS: { text: string; answers: { text: string; traits: [Trait, Trait] }[] }[] = [
  {
    text: '¡Hay un incendio en una casa cercana! ¿Qué haces?',
    answers: [
      { text: 'Entro corriendo a ayudar.', traits: ['valiente', 'amable'] },
      { text: 'Pido ayuda y mantengo la calma.', traits: ['tranquilo', 'listo'] },
      { text: 'Me quedo paralizado del miedo.', traits: ['timido', 'amable'] },
      { text: 'Busco la forma más ingeniosa de apagarlo.', traits: ['listo', 'independiente'] },
    ],
  },
  {
    text: 'Por fin tienes un día libre. ¿Cómo lo pasas?',
    answers: [
      { text: 'Quedo con mis amigos para divertirnos.', traits: ['alegre', 'amable'] },
      { text: 'Me echo una buena siesta.', traits: ['tranquilo', 'alegre'] },
      { text: 'Exploro yo solo un lugar nuevo.', traits: ['independiente', 'valiente'] },
      { text: 'Le gasto bromas a mi familia.', traits: ['travieso', 'alegre'] },
    ],
  },
  {
    text: 'Un amigo está muy triste. ¿Qué haces?',
    answers: [
      { text: 'Lo escucho y lo consuelo.', traits: ['amable', 'tranquilo'] },
      { text: 'Le cuento chistes hasta que se ría.', traits: ['alegre', 'travieso'] },
      { text: 'Le doy un consejo práctico.', traits: ['listo', 'amable'] },
      { text: 'No sé qué decir... pero me quedo a su lado.', traits: ['timido', 'tranquilo'] },
    ],
  },
  {
    text: 'Encuentras un cofre misterioso en una cueva oscura. ¿Lo abres?',
    answers: [
      { text: '¡Claro, sin pensarlo!', traits: ['valiente', 'travieso'] },
      { text: 'Primero lo examino con cuidado.', traits: ['listo', 'tranquilo'] },
      { text: 'Mejor no... podría ser una trampa.', traits: ['timido', 'listo'] },
      { text: 'Lo abro y me quedo el tesoro para mí.', traits: ['independiente', 'travieso'] },
    ],
  },
  {
    text: '¿Qué es lo más importante en un equipo de rescate?',
    answers: [
      { text: 'La amistad.', traits: ['amable', 'alegre'] },
      { text: 'El valor.', traits: ['valiente', 'independiente'] },
      { text: 'La estrategia.', traits: ['listo', 'independiente'] },
      { text: '¡Pasarlo bien!', traits: ['alegre', 'travieso'] },
    ],
  },
];

const computeResult = (scores: Record<Trait, number>) => {
  const ranked = STARTERS.map((s) => {
    const [main, second] = STARTER_TRAITS[s.pokedexId];
    return { starter: s, score: 3 * scores[main] + 2 * scores[second] };
  });
  const best = Math.max(...ranked.map((r) => r.score));
  const top = ranked.filter((r) => r.score === best);
  const starter = top[Math.floor(Math.random() * top.length)].starter;
  return { starter, trait: STARTER_TRAITS[starter.pokedexId][0] };
};

const emptyScores = (): Record<Trait, number> => ({
  valiente: 0, alegre: 0, tranquilo: 0, timido: 0, travieso: 0, listo: 0, independiente: 0, amable: 0,
});

interface PersonalityQuizProps {
  onComplete: (pokedexId: number) => void;
}

export const PersonalityQuiz: React.FC<PersonalityQuizProps> = ({ onComplete }) => {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<Trait, number>>(emptyScores);
  const [result, setResult] = useState<ReturnType<typeof computeResult> | null>(null);

  const handleAnswer = (traits: [Trait, Trait]) => {
    soundManager.playSelect();
    const next = { ...scores, [traits[0]]: scores[traits[0]] + 2 };
    next[traits[1]] += 1;
    setScores(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      soundManager.playLevelUp();
      setResult(computeResult(next));
    }
  };

  const restart = () => {
    soundManager.playSelect();
    setStep(0);
    setScores(emptyScores());
    setResult(null);
  };

  const question = QUESTIONS[step];

  return (
    <div className="relative w-full h-full overflow-hidden bg-black text-white select-none">
      <div className="pmd-dream-back absolute inset-0" />
      <div className="pmd-dream-front absolute inset-0 opacity-50" />

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 gap-4 overflow-y-auto">
        {!started ? (
          <>
            <div className="pmd-window w-full max-w-2xl px-4 py-4 sm:px-6 sm:py-5 text-center flex flex-col gap-3">
              <p className="text-xl sm:text-3xl text-amber-300">¡Bienvenido al mundo de los Pokémon!</p>
              <p className="text-base sm:text-xl leading-snug">
                Estás a punto de comenzar una aventura en un mundo habitado únicamente por Pokémon.
              </p>
              <p className="text-base sm:text-xl leading-snug">
                Pero antes, responde a unas preguntas. Contesta con sinceridad y descubriremos qué tipo de
                persona eres... y en qué Pokémon te convertirás.
              </p>
              <p className="text-sm sm:text-lg text-sky-200">¿Estás preparado?</p>
            </div>
            <button
              onClick={() => {
                soundManager.playSelect();
                setStarted(true);
              }}
              className="pmd-window pmd-gold pmd-window-btn px-8 py-2 text-base sm:text-xl font-bold cursor-pointer"
            >
              ¡Listo!
            </button>
          </>
        ) : !result ? (
          <>
            <span className="text-xs sm:text-sm text-sky-200 tracking-widest uppercase">
              Test de personalidad · Pregunta {step + 1}/{QUESTIONS.length}
            </span>
            <div className="pmd-window w-full max-w-2xl px-4 py-3 sm:px-6 sm:py-4 text-center">
              <p className="text-lg sm:text-2xl leading-snug">{question.text}</p>
            </div>
            <div className="w-full max-w-md flex flex-col gap-2">
              {question.answers.map((a) => (
                <button
                  key={a.text}
                  onClick={() => handleAnswer(a.traits)}
                  className="pmd-window pmd-window-btn px-4 py-2 text-left text-base sm:text-lg cursor-pointer"
                >
                  ▸ {a.text}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="pmd-window w-full max-w-2xl px-4 py-3 sm:px-6 sm:py-4 text-center flex flex-col gap-2">
              <p className="text-base sm:text-xl">
                Pareces ser de naturaleza... <strong className="text-amber-300">{TRAITS[result.trait].nature}</strong>.
              </p>
              <p className="text-sm sm:text-lg">{TRAITS[result.trait].description}</p>
            </div>
            <div className="w-28 h-28 sm:w-36 sm:h-36 short:w-20 short:h-20">
              <PmdPortrait pokedexId={result.starter.pokedexId} emotion="Happy" className="w-full h-full" showFrame={true} />
            </div>
            <div className="pmd-window pmd-gold w-full max-w-2xl px-4 py-3 text-center">
              <p className="text-lg sm:text-2xl">
                ¡Alguien como tú debería ser un <strong className="text-amber-300">{result.starter.name}</strong>!
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">{result.starter.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={restart}
                className="pmd-window pmd-window-btn px-4 py-2 text-sm sm:text-base cursor-pointer"
              >
                Repetir test
              </button>
              <button
                onClick={() => {
                  soundManager.playSelect();
                  onComplete(result.starter.pokedexId);
                }}
                className="pmd-window pmd-gold pmd-window-btn px-5 py-2 text-sm sm:text-base font-bold cursor-pointer"
              >
                ¡Comenzar la aventura!
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
