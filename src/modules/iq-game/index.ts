// IQ Game module — the "Getting bored?" quiz mini-game. Fully self-contained: question
// generation happens client-side from a seed, and the only server dependency is recording the
// score via the shared IqGameScore model.

export { generateGame } from './generator'
export type { GeneratedQuestion } from './generator'
export { IqTestClient } from './components/IqTestClient'
