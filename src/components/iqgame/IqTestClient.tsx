'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import { Brain, Trophy, Clock, RotateCcw, Sparkles, ArrowLeft } from 'lucide-react'
import { generateGame, type GeneratedQuestion } from '@/lib/iqGame/generator'
import { cn, avatarColor } from '@/lib/utils'

const QUESTION_COUNT = 20
const TIME_PER_QUESTION = 40 // seconds

type Phase = 'landing' | 'playing' | 'results'
type Mood = 'idle' | 'thinking' | 'happy' | 'sad'

interface LeaderboardRow { id: string; name: string; bestScore: number; bestTimeMs: number }
interface Props {
  leaderboard: LeaderboardRow[]
  myBest: { bestScore: number; bestTimeMs: number } | null
  currentUserId: string
}

const MASCOT_INTROS = [
  "Hi, I'm Hamdan! Ready to put your brain through 20 rounds of pain?",
  "Welcome to the lab. I've prepared some fiendishly hard questions for you.",
  "Think you're a genius? Let's find out — I don't go easy on anyone.",
]
const MASCOT_CORRECT = ['Impressive!', 'Correct! Your brain is warming up.', 'Nice one!', 'You got it!', 'Sharp thinking!']
const MASCOT_WRONG = ['Not quite...', 'Ooh, so close! Or not.', 'The lab disagrees.', 'Hmm, stay focused!', 'That one gets everyone.']
const MASCOT_TIMEOUT = ["Time's up! Speed matters too.", 'Tick tock — gone!', 'The clock beat you there.']

function formatMs(ms: number) {
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fakeIqScore(correct: number) {
  return Math.round(70 + (correct / QUESTION_COUNT) * 90)
}

export function IqTestClient({ leaderboard: initialLeaderboard, myBest, currentUserId }: Props) {
  const [phase, setPhase] = useState<Phase>('landing')
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)
  const [mood, setMood] = useState<Mood>('idle')
  const [speech, setSpeech] = useState(MASCOT_INTROS[Math.floor(Math.random() * MASCOT_INTROS.length)])
  const [finalResult, setFinalResult] = useState<{ correct: number; totalTimeMs: number; isNewBest: boolean } | null>(null)

  const statsRef = useRef({ correct: 0, totalTimeMs: 0 })
  const questionStartRef = useRef<number>(0)
  const mascotRef = useRef<HTMLDivElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!mascotRef.current) return
    const tween = gsap.to(mascotRef.current, { y: -8, duration: 1.6, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    return () => { tween.kill() }
  }, [])

  useEffect(() => {
    if (bubbleRef.current) gsap.fromTo(bubbleRef.current, { opacity: 0, scale: 0.92, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(2)' })
  }, [speech])

  useEffect(() => () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
  }, [])

  function reactMood(next: Mood) {
    setMood(next)
    if (!mascotRef.current) return
    if (next === 'happy') {
      gsap.fromTo(mascotRef.current, { scale: 1, rotation: 0 }, { scale: 1.25, rotation: 8, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' })
    } else if (next === 'sad') {
      gsap.fromTo(mascotRef.current, { x: -6 }, { x: 6, duration: 0.08, yoyo: true, repeat: 5, ease: 'power1.inOut', onComplete: () => gsap.set(mascotRef.current, { x: 0 }) })
    }
  }

  function startGame() {
    statsRef.current = { correct: 0, totalTimeMs: 0 }
    const game = generateGame(QUESTION_COUNT)
    setQuestions(game)
    setIndex(0)
    setSelected(null)
    setCorrectCount(0)
    setFinalResult(null)
    setMood('thinking')
    setSpeech(`Question 1 of ${QUESTION_COUNT}. Focus...`)
    setPhase('playing')
    questionStartRef.current = Date.now()
    setTimeLeft(TIME_PER_QUESTION)
  }

  useEffect(() => {
    if (phase !== 'playing' || selected !== null) return
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
          handleTimeout()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, selected])

  function handleTimeout() {
    setSelected(sel => {
      if (sel !== null) return sel
      const elapsed = Date.now() - questionStartRef.current
      statsRef.current.totalTimeMs += elapsed
      reactMood('sad')
      setSpeech(MASCOT_TIMEOUT[Math.floor(Math.random() * MASCOT_TIMEOUT.length)])
      queueAdvance()
      return -1
    })
  }

  function handleAnswer(i: number) {
    if (selected !== null) return
    setSelected(i)
    const q = questions[index]
    const elapsed = Date.now() - questionStartRef.current
    statsRef.current.totalTimeMs += elapsed
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    if (i === q.correctIndex) {
      statsRef.current.correct += 1
      setCorrectCount(statsRef.current.correct)
      reactMood('happy')
      setSpeech(`${MASCOT_CORRECT[Math.floor(Math.random() * MASCOT_CORRECT.length)]} ${q.explanation}`)
    } else {
      reactMood('sad')
      setSpeech(`${MASCOT_WRONG[Math.floor(Math.random() * MASCOT_WRONG.length)]} ${q.explanation}`)
    }
    queueAdvance()
  }

  function queueAdvance() {
    const currentIndex = index
    advanceTimeoutRef.current = setTimeout(() => {
      const next = currentIndex + 1
      if (next >= questions.length) { finishGame(); return }
      setIndex(next)
      setSelected(null)
      setMood('thinking')
      setSpeech(`Question ${next + 1} of ${questions.length}. Stay sharp!`)
      questionStartRef.current = Date.now()
      setTimeLeft(TIME_PER_QUESTION)
    }, 2400)
  }

  async function finishGame() {
    const finalCorrect = statsRef.current.correct
    const finalTime = statsRef.current.totalTimeMs
    setPhase('results')
    setFinalResult({ correct: finalCorrect, totalTimeMs: finalTime, isNewBest: false })
    setSpeech(
      finalCorrect >= 16 ? "Outstanding. You've earned my respect." :
      finalCorrect >= 10 ? "Solid effort. The lab is satisfied... mostly." :
      "Well, everyone has to start somewhere."
    )
    reactMood(finalCorrect >= 10 ? 'happy' : 'sad')

    const res = await fetch('/api/iq-game/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctCount: finalCorrect, totalTimeMs: finalTime }),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.leaderboard)) setLeaderboard(data.leaderboard)
      setFinalResult({ correct: finalCorrect, totalTimeMs: finalTime, isNewBest: !!data.isNewBest })
      if (data.isNewBest) toast.success('New personal best! 🎉')
    }
  }

  const currentQuestion = questions[index]
  const timerPct = (timeLeft / TIME_PER_QUESTION) * 100

  function Mascot({ size = 'text-7xl' }: { size?: string }) {
    return (
      <div ref={mascotRef} className="flex flex-col items-center select-none">
        <div className={size}>🧑‍🔬</div>
        <p className="font-bold text-sm mt-1" style={{ color: 'var(--text-primary)' }}>Hamdan</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Chief Puzzle Scientist</p>
      </div>
    )
  }

  function SpeechBubble() {
    return (
      <div ref={bubbleRef} className="relative flex-1 rounded-2xl p-4 border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{speech}</p>
      </div>
    )
  }

  if (phase === 'landing') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Brain className="w-6 h-6" style={{ color: 'var(--brand-text)' }} /> Getting Bored?
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Take on Hamdan's Insane IQ Challenge — 20 questions, unlimited replays, zero mercy.</p>
        </div>

        <div className="card flex flex-col sm:flex-row items-center gap-6">
          <Mascot />
          <div className="flex-1 space-y-4">
            <SpeechBubble />
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={startGame} className="btn-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Start the Challenge
              </button>
              {myBest && (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Your best: <strong style={{ color: 'var(--text-primary)' }}>{myBest.bestScore}/{QUESTION_COUNT}</strong> ({formatMs(myBest.bestTimeMs)})
                </p>
              )}
            </div>
          </div>
        </div>

        <Leaderboard rows={leaderboard} currentUserId={currentUserId} />
      </div>
    )
  }

  if (phase === 'playing') {
    return (
      <div
        className="space-y-6 animate-fade-in select-none"
        onCopy={e => e.preventDefault()}
        onContextMenu={e => e.preventDefault()}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Question {index + 1} of {questions.length}</p>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Score: {correctCount}</p>
        </div>

        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${timerPct}%`, backgroundColor: timeLeft <= 10 ? '#ef4444' : 'var(--brand)' }}
          />
        </div>

        <div className="card flex flex-col sm:flex-row items-center gap-6">
          <Mascot size="text-6xl" />
          <SpeechBubble />
        </div>

        {currentQuestion && (
          <div className="card">
            <p className="text-lg font-semibold whitespace-pre-line mb-6" style={{ color: 'var(--text-primary)' }}>
              {currentQuestion.prompt}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options.map((opt, i) => {
                const isCorrect = i === currentQuestion.correctIndex
                const isChosen = i === selected
                const showState = selected !== null
                return (
                  <button
                    key={i}
                    disabled={selected !== null}
                    onClick={() => handleAnswer(i)}
                    className={cn(
                      'p-4 rounded-xl border text-left font-medium transition-all duration-200',
                      !showState && 'hover:opacity-80 active:scale-95',
                      showState && isCorrect && 'bg-emerald-100 border-emerald-400 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
                      showState && isChosen && !isCorrect && 'bg-red-100 border-red-400 text-red-800 dark:bg-red-500/20 dark:text-red-300',
                    )}
                    style={!showState || (!isCorrect && !isChosen) ? { backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' } : undefined}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // results
  const iqScore = finalResult ? fakeIqScore(finalResult.correct) : 0
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card flex flex-col items-center text-center gap-4 py-10">
        <Mascot />
        <SpeechBubble />
        <div className="mt-2">
          <p className="text-5xl font-bold" style={{ color: 'var(--brand-text)' }}>{iqScore}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your Hamdan Insane IQ Score</p>
        </div>
        <div className="flex items-center gap-6 text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          <span>{finalResult?.correct ?? 0}/{QUESTION_COUNT} correct</span>
          <span>Total time: {formatMs(finalResult?.totalTimeMs ?? 0)}</span>
          {finalResult?.isNewBest && <span className="badge-approved">New Best!</span>}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={startGame} className="btn-primary flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Play Again
          </button>
          <button onClick={() => setPhase('landing')} className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </div>

      <Leaderboard rows={leaderboard} currentUserId={currentUserId} />
    </div>
  )
}

function Leaderboard({ rows, currentUserId }: { rows: LeaderboardRow[]; currentUserId: string }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="card">
      <h2 className="font-semibold flex items-center gap-2 mb-5" style={{ color: 'var(--text-primary)' }}>
        <Trophy className="w-5 h-5 text-amber-400" /> Insane IQ Leaderboard
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No one has taken the challenge yet. Be the first!</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.id} className={cn('flex items-center gap-3 p-2.5 rounded-xl transition-colors', r.id === currentUserId && 'my-row')}>
              <span className="text-lg w-7 text-center">{medals[i] ?? `#${i + 1}`}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0', avatarColor(r.name))}>
                {r.name.charAt(0)}
              </div>
              <p className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}{r.id === currentUserId && ' (You)'}</p>
              <p className="text-sm font-bold" style={{ color: 'var(--brand-text)' }}>{r.bestScore}/{QUESTION_COUNT}</p>
              <p className="text-xs w-16 text-right" style={{ color: 'var(--text-muted)' }}>{formatMs(r.bestTimeMs)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
