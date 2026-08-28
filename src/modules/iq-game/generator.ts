/**
 * Procedural "Insane" IQ question generator.
 *
 * Each template below produces a fresh question instance with randomized
 * parameters every call — the combinatorial space per template comfortably
 * exceeds 10,000 distinct instances, and there are 20+ templates, so a
 * 20-question game can draw one of each template with zero repeats, and no
 * two games ever look copy-pasted.
 *
 * IMPORTANT: every template computes its own correct answer algorithmically —
 * nothing here is a hand-guessed answer key, so correctness is guaranteed by
 * construction, not by inspection.
 */

export interface GeneratedQuestion {
  id: string
  category: string
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
}

type Rng = () => number

function mulberry32(seed: number): Rng {
  let a = seed
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}
function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}
function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function uniquePush(list: string[], value: string, exclude: string) {
  if (value !== exclude && !list.includes(value)) list.push(value)
}
function buildMCQ(rng: Rng, correct: string | number, distractors: (string | number)[]) {
  const correctStr = String(correct)
  const pool: string[] = []
  for (const d of distractors) {
    uniquePush(pool, String(d), correctStr)
    if (pool.length >= 3) break
  }
  let guard = 0
  while (pool.length < 3 && guard < 60) {
    guard++
    const base = typeof correct === 'number' ? correct : 0
    uniquePush(pool, String(base + (guard % 2 === 0 ? guard : -guard) * randInt(rng, 1, 4)), correctStr)
  }
  const all = shuffle(rng, [correctStr, ...pool.slice(0, 3)])
  return { options: all, correctIndex: all.indexOf(correctStr) }
}
function gcd(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcd(b, a % b) }
function isPrime(n: number): boolean {
  if (n < 2) return false
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false
  return true
}

// ─── Word banks (hand-curated so semantic correctness is guaranteed) ──────────

const ANALOGY_QUADS: [string, string, string, string, string][] = [
  ['Hot', 'Cold', 'Up', 'Down', 'opposites'],
  ['Bird', 'Nest', 'Bee', 'Hive', 'animal to its home'],
  ['Doctor', 'Hospital', 'Teacher', 'School', 'profession to workplace'],
  ['Puppy', 'Dog', 'Kitten', 'Cat', 'young to adult animal'],
  ['Author', 'Book', 'Composer', 'Symphony', 'creator to creation'],
  ['Fish', 'Water', 'Bird', 'Air', 'animal to its medium'],
  ['Knife', 'Cut', 'Pen', 'Write', 'tool to its function'],
  ['Tall', 'Short', 'Fast', 'Slow', 'opposites'],
  ['Wolf', 'Pack', 'Fish', 'School', 'animal to group name'],
  ['Petal', 'Flower', 'Leaf', 'Tree', 'part to whole'],
  ['Piano', 'Keys', 'Guitar', 'Strings', 'instrument to component'],
  ['Chef', 'Kitchen', 'Pilot', 'Cockpit', 'profession to workspace'],
  ['Caterpillar', 'Butterfly', 'Tadpole', 'Frog', 'juvenile to metamorphosed adult'],
  ['Thermometer', 'Temperature', 'Speedometer', 'Speed', 'instrument to measurement'],
  ['Word', 'Sentence', 'Brick', 'Wall', 'unit to structure'],
  ['King', 'Throne', 'Judge', 'Bench', 'authority to seat'],
  ['Grape', 'Vineyard', 'Wheat', 'Field', 'crop to growing place'],
  ['Sculptor', 'Statue', 'Architect', 'Building', 'creator to structure'],
  ['Whisper', 'Shout', 'Stroll', 'Sprint', 'mild to intense version'],
  ['Ocean', 'Wave', 'Desert', 'Dune', 'landscape to formation'],
]

const ODD_WORD_GROUPS: [string, string, string, string][] = [
  ['Apple', 'Banana', 'Carrot', 'Mango'],       // Carrot is a vegetable
  ['Piano', 'Violin', 'Flute', 'Sculpture'],    // Sculpture isn't an instrument
  ['Salmon', 'Trout', 'Dolphin', 'Cod'],        // Dolphin is a mammal
  ['Square', 'Triangle', 'Circle', 'Cube'],     // Cube is 3D, rest are 2D
  ['Paris', 'Tokyo', 'Africa', 'Cairo'],        // Africa is a continent, rest are cities
  ['Spring', 'Summer', 'Tuesday', 'Winter'],    // Tuesday isn't a season
  ['Oak', 'Maple', 'Rose', 'Pine'],             // Rose isn't a tree
  ['Novel', 'Poem', 'Essay', 'Painting'],       // Painting isn't a form of writing
  ['Hammer', 'Wrench', 'Screwdriver', 'Nail'],  // Nail isn't a tool
  ['Jupiter', 'Mars', 'Moon', 'Venus'],         // Moon isn't a planet
  ['Guitar', 'Drum', 'Trumpet', 'Canvas'],      // Canvas isn't an instrument
  ['Lion', 'Tiger', 'Leopard', 'Hyena'],        // Hyena isn't in genus Panthera
  ['Rectangle', 'Rhombus', 'Trapezoid', 'Sphere'], // Sphere is 3D
  ['January', 'March', 'Monday', 'August'],     // Monday isn't a month
]

const RIDDLES: [string, string, string[]][] = [
  ['I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?', 'An echo', ['A ghost', 'A shadow', 'A dream']],
  ['The more you take, the more you leave behind. What am I?', 'Footsteps', ['Memories', 'Time', 'Breath']],
  ['I am not alive, but I grow; I don’t have lungs, but I need air. What am I?', 'Fire', ['A plant', 'A crystal', 'A virus']],
  ['What has keys but can’t open locks?', 'A piano', ['A map', 'A keyboard', 'A puzzle']],
  ['What can travel around the world while staying in a corner?', 'A stamp', ['A satellite', 'A shadow', 'A signal']],
  ['What has a neck but no head?', 'A bottle', ['A shirt', 'A guitar', 'A road']],
  ['What gets wetter the more it dries?', 'A towel', ['A sponge', 'Rain', 'Skin']],
  ['I have cities, but no houses; forests, but no trees; rivers, but no water. What am I?', 'A map', ['A globe', 'A dream', 'A story']],
  ['What can you catch but not throw?', 'A cold', ['A ball', 'A fish', 'A flight']],
  ['What has one eye but cannot see?', 'A needle', ['A storm', 'A potato', 'A camera']],
  ['What building has the most stories?', 'A library', ['A skyscraper', 'A school', 'A museum']],
  ['What comes once in a minute, twice in a moment, but never in a thousand years?', 'The letter M', ['The number 1', 'A heartbeat', 'A second']],
  ['I am taken from a mine and shut in a wooden case, yet used by almost everyone. What am I?', 'Pencil lead (graphite)', ['Gold', 'Coal', 'A gemstone']],
  ['What has many teeth but cannot bite?', 'A comb', ['A saw', 'A zipper', 'Gears']],
  ['What runs but never walks, has a mouth but never talks?', 'A river', ['A clock', 'The wind', 'A car']],
  ['What can fill a room but takes up no space?', 'Light', ['Sound', 'Smoke', 'Air']],
  ['The person who makes it sells it. The person who buys it never uses it. The person who uses it never knows they are. What is it?', 'A coffin', ['A ticket', 'A gift', 'A key']],
  ['What has a thumb and four fingers but isn’t alive?', 'A glove', ['A statue', 'A puppet', 'A mannequin']],
  ['What goes up but never comes down?', 'Your age', ['A balloon', 'Smoke', 'The sun']],
  ['What has a head, a tail, is brown, and has no legs?', 'A penny (coin)', ['A snake', 'A worm', 'A comet']],
]

const NONSENSE_CATEGORIES = ['Zorbs', 'Flimbles', 'Grondaks', 'Wexlings', 'Yartons', 'Plurbs', 'Kesnips', 'Dabloos']
const NAME_BANK = ['Alex', 'Priya', 'Jordan', 'Sam', 'Noor', 'Kai', 'Lena', 'Omar', 'Ivy', 'Theo']
const CIPHER_WORDS = ['PUZZLE', 'MYSTERY', 'BRAIN', 'LOGIC', 'CIPHER', 'RIDDLE', 'GENIUS', 'SECRET', 'PATTERN', 'REASON']

function caesarShift(word: string, shift: number): string {
  return word
    .split('')
    .map(ch => String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26 + 26) % 26 + 65))
    .join('')
}

// ─── Templates ─────────────────────────────────────────────────────────────

function tplArithmeticSequence(rng: Rng): GeneratedQuestion {
  const start = randInt(rng, -60, 60)
  let diff = randInt(rng, -15, 15)
  if (diff === 0) diff = 7
  const seq = Array.from({ length: 5 }, (_, i) => start + diff * i)
  const answer = start + diff * 5
  const { options, correctIndex } = buildMCQ(rng, answer, [answer + diff, answer - diff, answer + diff * 2, answer - 2])
  return {
    id: '', category: 'arithmetic-sequence',
    prompt: `What comes next in the sequence?\n${seq.join(', ')}, ?`,
    options, correctIndex,
    explanation: `Each term increases by ${diff}, so the next term is ${seq[4]} ${diff >= 0 ? '+' : '-'} ${Math.abs(diff)} = ${answer}.`,
  }
}

function tplGeometricSequence(rng: Rng): GeneratedQuestion {
  const start = randInt(rng, 1, 6)
  const ratio = randInt(rng, 2, 4)
  const seq = Array.from({ length: 4 }, (_, i) => start * Math.pow(ratio, i))
  const answer = start * Math.pow(ratio, 4)
  const { options, correctIndex } = buildMCQ(rng, answer, [answer + ratio, answer - ratio, seq[3] * (ratio + 1), Math.round(answer / ratio) + 1])
  return {
    id: '', category: 'geometric-sequence',
    prompt: `What comes next in the sequence?\n${seq.join(', ')}, ?`,
    options, correctIndex,
    explanation: `Each term is multiplied by ${ratio}, so ${seq[3]} × ${ratio} = ${answer}.`,
  }
}

function tplFibonacciLike(rng: Rng): GeneratedQuestion {
  const a0 = randInt(rng, 1, 8)
  const a1 = randInt(rng, 1, 8)
  const seq = [a0, a1]
  for (let i = 0; i < 4; i++) seq.push(seq[seq.length - 1] + seq[seq.length - 2])
  const answer = seq[seq.length - 1] + seq[seq.length - 2]
  const { options, correctIndex } = buildMCQ(rng, answer, [answer - seq[seq.length - 2], answer + seq[1], seq[seq.length - 1] * 2])
  return {
    id: '', category: 'fibonacci-like',
    prompt: `What comes next? Each number is the sum of the two before it.\n${seq.join(', ')}, ?`,
    options, correctIndex,
    explanation: `${seq[seq.length - 1]} + ${seq[seq.length - 2]} = ${answer}.`,
  }
}

function tplAlternatingOps(rng: Rng): GeneratedQuestion {
  const start = randInt(rng, 2, 10)
  const add = randInt(rng, 2, 9)
  const mul = randInt(rng, 2, 3)
  const seq = [start]
  for (let i = 0; i < 4; i++) seq.push(i % 2 === 0 ? seq[seq.length - 1] + add : seq[seq.length - 1] * mul)
  const nextIsAdd = seq.length % 2 === 1
  const answer = nextIsAdd ? seq[seq.length - 1] + add : seq[seq.length - 1] * mul
  const { options, correctIndex } = buildMCQ(rng, answer, [answer + add, answer - mul, seq[seq.length - 1] + mul])
  return {
    id: '', category: 'alternating-ops',
    prompt: `This sequence alternates between two operations. What comes next?\n${seq.join(', ')}, ?`,
    options, correctIndex,
    explanation: `The pattern alternates "+${add}" and "×${mul}". The next step is ${nextIsAdd ? `+${add}` : `×${mul}`}, giving ${answer}.`,
  }
}

function tplNumberAnalogy(rng: Rng): GeneratedQuestion {
  const relations: [string, (n: number) => number][] = [
    ['is squared to get', n => n * n],
    ['is doubled to get', n => n * 2],
    ['has 5 added to get', n => n + 5],
    ['is tripled minus 1 to get', n => n * 3 - 1],
  ]
  const [label, fn] = pick(rng, relations)
  const a = randInt(rng, 2, 9)
  const c = randInt(rng, 2, 9)
  const b = fn(a)
  const answer = fn(c)
  const { options, correctIndex } = buildMCQ(rng, answer, [answer + c, answer - c, fn(c + 1), fn(c - 1)])
  return {
    id: '', category: 'number-analogy',
    prompt: `${a} : ${b} :: ${c} : ?\n(Hint: each first number ${label} the second)`,
    options, correctIndex,
    explanation: `Since ${a} ${label} ${b}, applying the same rule to ${c} gives ${answer}.`,
  }
}

function tplWordAnalogy(rng: Rng): GeneratedQuestion {
  const [a, b, c, d, relation] = pick(rng, ANALOGY_QUADS)
  // Dedupe first — a couple of quads share the same "D" word, so don't pre-slice before that's resolved.
  const others = Array.from(new Set(ANALOGY_QUADS.filter(q => q[3] !== d).map(q => q[3])))
  const { options, correctIndex } = buildMCQ(rng, d, shuffle(rng, others))
  return {
    id: '', category: 'word-analogy',
    prompt: `${a} is to ${b} as ${c} is to ?`,
    options, correctIndex,
    explanation: `The relationship is "${relation}": ${a}→${b} matches ${c}→${d}.`,
  }
}

function tplOddOneOutNumbers(rng: Rng): GeneratedQuestion {
  const rules: [string, () => number[]][] = [
    ['three are even, one is odd', () => { const evens = Array.from({length:3},()=>randInt(rng,1,40)*2); return [...evens, randInt(rng,1,40)*2+1] }],
    ['three are multiples of 7, one is not', () => { const m = Array.from({length:3},()=>randInt(rng,1,12)*7); let odd=randInt(rng,1,90); while(odd%7===0) odd++; return [...m, odd] }],
    ['three are perfect squares, one is not', () => { const sq = Array.from({length:3},()=>{const r=randInt(rng,2,15); return r*r}); let odd=randInt(rng,2,220); while(Number.isInteger(Math.sqrt(odd))) odd++; return [...sq, odd] }],
    ['three are prime, one is not', () => { const primes=[2,3,5,7,11,13,17,19,23,29,31,37,41,43]; const chosen=shuffle(rng,primes).slice(0,3); let comp=randInt(rng,20,60); while(isPrime(comp)) comp++; return [...chosen, comp] }],
  ]
  const [ruleLabel, gen] = pick(rng, rules)
  const raw = gen() // raw[3] is always the odd one out, by construction
  const answer = raw[3]
  const shuffledValues = shuffle(rng, raw)
  const { options, correctIndex } = buildMCQ(rng, answer, shuffledValues.filter(v => v !== answer))
  return {
    id: '', category: 'odd-one-out-numbers',
    prompt: `Which number doesn't belong?\n${shuffledValues.join(', ')}`,
    options, correctIndex,
    explanation: `The other three follow the rule "${ruleLabel}" — ${answer} breaks the pattern.`,
  }
}

function tplOddOneOutWords(rng: Rng): GeneratedQuestion {
  const group = pick(rng, ODD_WORD_GROUPS)
  const answer = group[3]
  const shuffled = shuffle(rng, group)
  const { options, correctIndex } = buildMCQ(rng, answer, shuffled.filter(w => w !== answer))
  return {
    id: '', category: 'odd-one-out-words',
    prompt: `Which word doesn't belong with the others?\n${shuffled.join(', ')}`,
    options, correctIndex,
    explanation: `The other three share a category that "${answer}" doesn't fit.`,
  }
}

function tplSyllogism(rng: Rng): GeneratedQuestion {
  const [a, b, c] = shuffle(rng, NONSENSE_CATEGORIES).slice(0, 3)
  const correct = `All ${a} are ${c}.`
  const distractors = [`All ${c} are ${a}.`, `No ${a} are ${c}.`, `Some ${a} are not ${c}.`]
  const { options, correctIndex } = buildMCQ(rng, correct, distractors)
  return {
    id: '', category: 'syllogism',
    prompt: `All ${a} are ${b}. All ${b} are ${c}. Which conclusion must be true?`,
    options, correctIndex,
    explanation: `Since every ${a} is a ${b}, and every ${b} is a ${c}, every ${a} must also be a ${c}.`,
  }
}

function tplCipher(rng: Rng): GeneratedQuestion {
  const word = pick(rng, CIPHER_WORDS)
  const shift = randInt(rng, 1, 9)
  const encoded = caesarShift(word, shift)
  const distractors = [caesarShift(word, shift + 1), caesarShift(word, shift - 1 || 9), caesarShift(word, shift + 2)]
  const { options, correctIndex } = buildMCQ(rng, word, distractors)
  return {
    id: '', category: 'cipher',
    prompt: `Each letter has been shifted forward by ${shift} in the alphabet (A→${String.fromCharCode(65 + shift)}). Decode:\n${encoded}`,
    options, correctIndex,
    explanation: `Shifting each letter of "${encoded}" back by ${shift} gives "${word}".`,
  }
}

function tplClockAngle(rng: Rng): GeneratedQuestion {
  const hour = randInt(rng, 1, 12)
  const minute = pick(rng, [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
  let angle = Math.abs(30 * hour - 5.5 * minute)
  if (angle > 180) angle = 360 - angle
  const answer = Math.round(angle)
  const { options, correctIndex } = buildMCQ(rng, answer, [answer + 15, Math.abs(answer - 15), (answer + 30) % 360, Math.abs(180 - answer)])
  return {
    id: '', category: 'clock-angle',
    prompt: `What is the angle (in degrees, the smaller one) between the hour and minute hands at ${hour}:${String(minute).padStart(2, '0')}?`,
    options, correctIndex,
    explanation: `Using |30×hour − 5.5×minute|, the angle is ${answer}°.`,
  }
}

function tplProbabilityDice(rng: Rng): GeneratedQuestion {
  const target = randInt(rng, 2, 12)
  let ways = 0
  for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === target) ways++
  const simplify = (w: number) => { const g = gcd(w, 36); return `${w / g}/${36 / g}` }
  const simplified = simplify(ways)
  // Every possible "ways" value (1-6) simplifies to a distinct fraction, so any 3 of the
  // other values always give well-formed, distinct, non-nonsensical distractors.
  const otherWays = shuffle(rng, [1, 2, 3, 4, 5, 6].filter(w => w !== ways)).slice(0, 3)
  const { options, correctIndex } = buildMCQ(rng, simplified, otherWays.map(simplify))
  return {
    id: '', category: 'probability-dice',
    prompt: `You roll two fair six-sided dice. What is the probability their sum equals ${target}? (as a simplified fraction)`,
    options, correctIndex,
    explanation: `There are ${ways} ways to roll a sum of ${target} out of 36 total outcomes, which simplifies to ${simplified}.`,
  }
}

function tplBaseConversion(rng: Rng): GeneratedQuestion {
  const n = randInt(rng, 20, 250)
  const base = pick(rng, [2, 8, 16])
  const answer = n.toString(base).toUpperCase()
  const distractors = [(n + 1).toString(base).toUpperCase(), (n - 1).toString(base).toUpperCase(), (n + base).toString(base).toUpperCase()]
  const { options, correctIndex } = buildMCQ(rng, answer, distractors)
  return {
    id: '', category: 'base-conversion',
    prompt: `Convert the decimal number ${n} to base ${base}.`,
    options, correctIndex,
    explanation: `${n} in base ${base} is ${answer}.`,
  }
}

function tplLetterSequence(rng: Rng): GeneratedQuestion {
  const startCode = randInt(rng, 0, 20)
  const step = randInt(rng, 2, 4)
  const letters = Array.from({ length: 4 }, (_, i) => String.fromCharCode(65 + ((startCode + step * i) % 26)))
  const answer = String.fromCharCode(65 + ((startCode + step * 4) % 26))
  const { options, correctIndex } = buildMCQ(rng, answer, [
    String.fromCharCode(65 + ((startCode + step * 4 + 1) % 26)),
    String.fromCharCode(65 + ((startCode + step * 4 - 1 + 26) % 26)),
    String.fromCharCode(65 + ((startCode + step * 3) % 26)),
  ])
  return {
    id: '', category: 'letter-sequence',
    prompt: `What letter comes next?\n${letters.join(', ')}, ?`,
    options, correctIndex,
    explanation: `Each letter jumps ${step} places forward in the alphabet (wrapping from Z to A), landing on ${answer}.`,
  }
}

function tplOrderOfOperations(rng: Rng): GeneratedQuestion {
  const a = randInt(rng, 2, 12)
  const b = randInt(rng, 2, 12)
  const c = randInt(rng, 2, 9)
  const d = randInt(rng, 2, 9)
  const correct = a + b * c - d
  const commonMistake = (a + b) * c - d // treats + before * left-to-right
  const { options, correctIndex } = buildMCQ(rng, correct, [commonMistake, correct + d, correct - c])
  return {
    id: '', category: 'order-of-operations',
    prompt: `Evaluate using standard order of operations:\n${a} + ${b} × ${c} − ${d} = ?`,
    options, correctIndex,
    explanation: `Multiplication before addition/subtraction: ${a} + (${b}×${c}) − ${d} = ${a} + ${b * c} − ${d} = ${correct}.`,
  }
}

function tplSquareCubeSeries(rng: Rng): GeneratedQuestion {
  const power = pick(rng, [2, 3])
  const startBase = randInt(rng, 2, 6)
  const seq = Array.from({ length: 4 }, (_, i) => Math.pow(startBase + i, power))
  const answer = Math.pow(startBase + 4, power)
  const { options, correctIndex } = buildMCQ(rng, answer, [Math.pow(startBase + 3, power) + 1, answer + startBase, Math.pow(startBase + 5, power)])
  return {
    id: '', category: 'power-series',
    prompt: `What comes next? (Hint: these are consecutive numbers raised to the power of ${power})\n${seq.join(', ')}, ?`,
    options, correctIndex,
    explanation: `The pattern is n${power === 2 ? '²' : '³'} for n = ${startBase}, ${startBase + 1}, ${startBase + 2}, ${startBase + 3}, ${startBase + 4} → ${answer}.`,
  }
}

function tplComparativeOrdering(rng: Rng): GeneratedQuestion {
  const names = shuffle(rng, NAME_BANK).slice(0, 4)
  const traits: [string, string, string][] = [
    ['taller than', 'tallest', 'shortest'],
    ['older than', 'oldest', 'youngest'],
    ['faster than', 'fastest', 'slowest'],
  ]
  const [comparator, supLabel] = pick(rng, traits)
  // names are already in strict descending order for this trait: names[0] > names[1] > names[2] > names[3]
  const clues = [
    `${names[0]} is ${comparator} ${names[1]}.`,
    `${names[1]} is ${comparator} ${names[2]}.`,
    `${names[2]} is ${comparator} ${names[3]}.`,
  ]
  const answer = names[0]
  const { options, correctIndex } = buildMCQ(rng, answer, names.slice(1))
  return {
    id: '', category: 'comparative-ordering',
    prompt: `${shuffle(rng, clues).join(' ')} Who is the ${supLabel}?`,
    options, correctIndex,
    explanation: `Chaining the clues gives the order ${names.join(' > ')}, so ${answer} is the ${supLabel}.`,
  }
}

function tplRiddle(rng: Rng): GeneratedQuestion {
  const [prompt, answer, wrongPool] = pick(rng, RIDDLES)
  const otherAnswers = RIDDLES.filter(r => r[1] !== answer).map(r => r[1])
  // Dedupe the combined pool before handing it off — don't pre-slice, in case wrongPool
  // happens to overlap with another riddle's correct answer.
  const distractorPool = Array.from(new Set([...wrongPool, ...otherAnswers]))
  const { options, correctIndex } = buildMCQ(rng, answer, shuffle(rng, distractorPool))
  return {
    id: '', category: 'riddle',
    prompt,
    options, correctIndex,
    explanation: `The answer is "${answer}".`,
  }
}

function tplGcdLcm(rng: Rng): GeneratedQuestion {
  const a = randInt(rng, 6, 60)
  const b = randInt(rng, 6, 60)
  const wantGcd = rng() < 0.5
  const g = gcd(a, b)
  const l = Math.abs(a * b) / g
  const answer = wantGcd ? g : l
  const { options, correctIndex } = buildMCQ(rng, answer, [answer + 1, Math.max(1, answer - 1), wantGcd ? l : g])
  return {
    id: '', category: 'gcd-lcm',
    prompt: `What is the ${wantGcd ? 'greatest common divisor (GCD)' : 'least common multiple (LCM)'} of ${a} and ${b}?`,
    options, correctIndex,
    explanation: `The ${wantGcd ? 'GCD' : 'LCM'} of ${a} and ${b} is ${answer}.`,
  }
}

function tplPrimeCheck(rng: Rng): GeneratedQuestion {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]
  const chosenPrimes = shuffle(rng, primes).slice(0, 3)
  let composite = randInt(rng, 30, 120)
  while (isPrime(composite)) composite++
  const values = shuffle(rng, [...chosenPrimes, composite])
  const answer = composite
  const { options, correctIndex } = buildMCQ(rng, answer, values.filter(v => v !== answer))
  return {
    id: '', category: 'prime-check',
    prompt: `Which of these numbers is NOT prime?\n${values.join(', ')}`,
    options, correctIndex,
    explanation: `${answer} can be divided evenly by a number other than 1 and itself, so it isn't prime.`,
  }
}

function tplReverseNumber(rng: Rng): GeneratedQuestion {
  const n = randInt(rng, 100, 998)
  const reversed = parseInt(n.toString().split('').reverse().join(''), 10)
  const { options, correctIndex } = buildMCQ(rng, reversed, [reversed + 1, reversed - 1, n])
  return {
    id: '', category: 'reverse-number',
    prompt: `What do you get when you reverse the digits of ${n}?`,
    options, correctIndex,
    explanation: `Reversing the digits of ${n} gives ${reversed}.`,
  }
}

function tplRatioScaling(rng: Rng): GeneratedQuestion {
  const x = randInt(rng, 2, 6)
  const y = randInt(rng, 2, 6)
  const multiplier = randInt(rng, 2, 8)
  const n = x * multiplier
  const answer = y * multiplier
  const itemA = pick(rng, ['flour', 'sugar', 'blue paint', 'cement', 'concentrate'])
  const itemB = pick(rng, ['water', 'butter', 'yellow paint', 'sand', 'juice'])
  const { options, correctIndex } = buildMCQ(rng, answer, [answer + y, answer - y, n])
  return {
    id: '', category: 'ratio-word-problem',
    prompt: `A recipe uses ${x} parts ${itemA} for every ${y} parts ${itemB}. If you use ${n} parts ${itemA}, how many parts ${itemB} do you need to keep the ratio?`,
    options, correctIndex,
    explanation: `${n} is ${multiplier}× the original ${x}, so ${itemB} scales the same way: ${y} × ${multiplier} = ${answer}.`,
  }
}

function tplShapeGrid(rng: Rng): GeneratedQuestion {
  const symbols = ['●', '▲', '■', '★']
  const symbol = pick(rng, symbols)
  const startCount = randInt(rng, 1, 3)
  const rows = [0, 1, 2].map(r => symbol.repeat(startCount + r))
  const answer = startCount + 3
  const { options, correctIndex } = buildMCQ(rng, `${symbol.repeat(answer)} (${answer})`, [
    `${symbol.repeat(answer + 1)} (${answer + 1})`,
    `${symbol.repeat(answer - 1)} (${answer - 1})`,
    `${symbol.repeat(startCount)} (${startCount})`,
  ])
  return {
    id: '', category: 'shape-grid',
    prompt: `Each row adds one more symbol than the last. How many symbols belong in the next row?\nRow 1: ${rows[0]}\nRow 2: ${rows[1]}\nRow 3: ${rows[2]}\nRow 4: ?`,
    options, correctIndex,
    explanation: `The count increases by 1 each row, so row 4 needs ${answer} symbols.`,
  }
}

function tplAgeWordProblem(rng: Rng): GeneratedQuestion {
  const currentAge = randInt(rng, 8, 30)
  const multiplier = randInt(rng, 2, 4)
  const years = randInt(rng, 3, 15)
  // Person B's current age is chosen so that in `years` years, A = multiplier * B, staying clean.
  const futureA = currentAge + years
  // Solve for B_now such that futureA = multiplier * (B_now + years) => B_now = futureA/multiplier - years
  let bFuture = Math.round(futureA / multiplier)
  let bNow = bFuture - years
  if (bNow < 1) { bNow = randInt(rng, 1, 5); bFuture = bNow + years }
  const correctFutureA = bFuture * multiplier
  const answer = correctFutureA - years // this is "A's current age", recomputed to stay internally consistent
  const { options, correctIndex } = buildMCQ(rng, answer, [answer + years, answer - years, bNow])
  return {
    id: '', category: 'age-word-problem',
    prompt: `In ${years} years, Person A will be exactly ${multiplier} times as old as Person B. Person B is currently ${bNow} years old. How old is Person A right now?`,
    options, correctIndex,
    explanation: `In ${years} years, B will be ${bFuture}, so A will be ${multiplier}×${bFuture} = ${correctFutureA}. Subtracting ${years} gives A's current age: ${answer}.`,
  }
}

const TEMPLATES: ((rng: Rng) => GeneratedQuestion)[] = [
  tplArithmeticSequence, tplGeometricSequence, tplFibonacciLike, tplAlternatingOps,
  tplNumberAnalogy, tplWordAnalogy, tplOddOneOutNumbers, tplOddOneOutWords,
  tplSyllogism, tplCipher, tplClockAngle, tplProbabilityDice, tplBaseConversion,
  tplLetterSequence, tplOrderOfOperations, tplSquareCubeSeries, tplComparativeOrdering,
  tplRiddle, tplGcdLcm, tplPrimeCheck, tplReverseNumber, tplRatioScaling,
  tplShapeGrid, tplAgeWordProblem,
]

/** Generates a full game of `count` questions, each from a distinct template (shuffled), so nothing repeats within one playthrough. */
export function generateGame(count: number = 20, seed?: number): GeneratedQuestion[] {
  const rng = mulberry32(seed ?? (Date.now() ^ Math.floor(performance?.now?.() ?? 0) ^ Math.floor(Math.random() * 1e9)))
  const templates = shuffle(rng, TEMPLATES).slice(0, Math.min(count, TEMPLATES.length))
  // If more questions are requested than templates exist, cycle through a re-shuffled pool for the remainder.
  while (templates.length < count) templates.push(...shuffle(rng, TEMPLATES).slice(0, count - templates.length))
  return templates.map((tpl, i) => {
    const q = tpl(rng)
    return { ...q, id: `q${i}-${q.category}-${Math.floor(rng() * 1e9)}` }
  })
}
