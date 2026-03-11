export function analyzeArticle(text: string) {
  const emotional = Math.min(1, (text.match(/!/g) || []).length * 0.1)

  const exaggeration =
    /shocking|unbelievable|incredible/i.test(text) ? 0.9 : 0.3

  const moralLanguage =
    /justice|rights|duty|moral|ethics/i.test(text) ? 0.8 : 0.4

  return {
    emotional,
    exaggeration,
    moralLanguage
  }
}
