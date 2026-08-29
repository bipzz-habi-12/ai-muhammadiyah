import type { ReactNode } from "react";

// Disabled while math is normalized to plain readable text instead of stacked UI.
export function isSimpleMathToken(value: string) {
  return /^[A-Za-z0-9\s()+\-.,²³⁰¹⁴⁵⁶⁷⁸⁹]+$/.test(value);
}

// Disabled while math is normalized to plain readable text instead of stacked UI.
export function renderMathFragments(text: string, keyPrefix: string): ReactNode[] {
  const fragments: ReactNode[] = [];
  const pattern =
    /(sqrt\(([^()\n]+)\)|(\([^()\n]{1,80}\)|[A-Za-z0-9²³⁰¹⁴⁵⁶⁷⁸⁹][A-Za-z0-9\s()+\-.,²³⁰¹⁴⁵⁶⁷⁸⁹]{0,60})\s+\/\s+([A-Za-z0-9²³⁰¹⁴⁵⁶⁷⁸⁹][A-Za-z0-9\s()+\-.,²³⁰¹⁴⁵⁶⁷⁸⁹]{0,40}))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      fragments.push(text.slice(lastIndex, match.index));
    }

    if (match[1].startsWith("sqrt(")) {
      const radicand = match[2].trim();
      const needsParentheses = /[\s+\-*/]/.test(radicand);
      fragments.push(
        <span key={`${keyPrefix}-sqrt-${match.index}`}>
          √{needsParentheses ? `(${radicand})` : radicand}
        </span>,
      );
    } else {
      const numerator = match[3].trim();
      const denominator = match[4].trim();

      if (isSimpleMathToken(numerator) && isSimpleMathToken(denominator)) {
        fragments.push(
          <span
            key={`${keyPrefix}-frac-${match.index}`}
            className="mx-0.5 inline-flex translate-y-[0.18em] flex-col items-center align-middle leading-none"
          >
            <span className="border-b border-current px-1 pb-0.5">
              {numerator}
            </span>
            <span className="px-1 pt-0.5">{denominator}</span>
          </span>,
        );
      } else {
        fragments.push(match[0]);
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    fragments.push(text.slice(lastIndex));
  }

  return fragments;
}

export function toSuperscript(value: string) {
  const superscripts: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻",
  };

  return value
    .split("")
    .map((character) => superscripts[character] ?? character)
    .join("");
}

export function toSuperscriptV2(value: string) {
  const superscripts: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻",
  };

  return value
    .split("")
    .map((character) => superscripts[character] ?? character)
    .join("");
}

// Simbol unsur satu huruf. "x2" memang enak dibaca sebagai x², tapi "H2" TIDAK:
// notasi kimia yang benar adalah subskrip (H₂), bukan superskrip. Daripada
// menebak-nebak, huruf-huruf ini dikecualikan dari konversi otomatis dan model
// diminta langsung menulis H₂O / CO₂ lewat blok NUMBERS, SCIENCE, AND PRECISION
// di `lib/ai/chat.ts`.
const singleLetterElementSymbols = new Set([
  "H", "B", "C", "N", "O", "F", "P", "S", "K", "V", "Y", "I", "W", "U",
]);

// Penanda sementara untuk "$" mata uang, dipulihkan di akhir rantai.
const currencyDollarSentinel = "\uE010";

export function normalizeMathText(text: string) {
  // Example: "$\\frac{x^2 + 2*x + 1}{3}$" -> "(x² + 2 × x + 1) ÷ 3"
  // Example: "sqrt(x+1)" -> "√(x + 1)"
  return text
    .replace(/`([^`\n]*(?:\\frac|\\sqrt|sqrt\(|\^|\s\/\s|\*)[^`\n]*)`/gi, "$1")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    // "$" yang langsung diikuti ANGKA dan tidak menempel pada "$"/huruf lain
    // adalah mata uang ("harga $10"), bukan pembatas LaTeX. Dulu SEMUA "$"
    // dihapus di sini, jadi setiap harga dolar kehilangan simbolnya di layar.
    // "$$3,14$$" tetap aman: "$" pertama diikuti "$" (bukan angka) dan "$"
    // kedua didahului "$", jadi keduanya tidak lolos penjaga ini.
    .replace(/(?<![\w$])\$(?=\d)/g, currencyDollarSentinel)
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(new RegExp(currencyDollarSentinel, "g"), () => "$")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1) ÷ ($2)")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\bsqrt\(([^()\n]+)\)/gi, (_, radicand: string) => {
      const cleanRadicand = radicand.trim().replace(/\s*([+\-])\s*/g, " $1 ");
      return `√(${cleanRadicand.replace(/\s+/g, " ")})`;
    })
    .replace(/\^([+-]?\d+)/g, (_, power: string) => toSuperscriptV2(power))
    .replace(/(\b[A-Za-z0-9²³⁰¹⁴⁵⁶⁷⁸⁹]+|\))\s*\*\s*(\(?[A-Za-z0-9²³⁰¹⁴⁵⁶⁷⁸⁹]+)/g, "$1 × $2")
    .replace(/(?<!https?:)(\b[A-Za-z0-9²³⁰¹⁴⁵⁶⁷⁸⁹)]+)\s+\/\s+([A-Za-z0-9²³⁰¹⁴⁵⁶⁷⁸⁹(]+)/g, "$1 ÷ $2")
    .replace(/\b([a-zA-Z])2\b/g, (match, letter: string) =>
      singleLetterElementSymbols.has(letter) ? match : `${letter}²`,
    )
    .replace(/\b([a-zA-Z])3\b/g, (match, letter: string) =>
      singleLetterElementSymbols.has(letter) ? match : `${letter}³`,
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}
