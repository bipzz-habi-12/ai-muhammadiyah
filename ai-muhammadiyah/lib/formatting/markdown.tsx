import { normalizeMathText } from "./math";

export function renderInlineMarkdown(text: string) {
  const cleanText = normalizeMathText(text);
  const parts = cleanText.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-[#0f3025]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}
