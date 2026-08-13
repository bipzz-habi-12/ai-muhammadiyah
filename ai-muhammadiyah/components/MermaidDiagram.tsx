"use client";

import { useEffect, useId, useState } from "react";

// Mermaid is a ~1MB parser+renderer. It is imported dynamically so it only
// reaches the browser when a diagram artifact is actually opened, never in the
// initial bundle. The promise is module-level so a session loads it once even
// if several diagrams are viewed.
let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((module) => module.default);
  }

  return mermaidPromise;
}

interface MermaidDiagramProps {
  code: string;
}

/**
 * Renders Mermaid source as a real diagram.
 *
 * The source is AI-generated text stored in our DB, so it is treated as
 * untrusted: `securityLevel: "strict"` keeps HTML labels off and runs Mermaid's
 * own sanitizer over the output, which is what makes the resulting SVG safe to
 * inject. Anything that fails to parse falls back to showing the source — a
 * broken diagram must never swallow content the user can still read.
 */
export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const reactId = useId();
  const [svg, setSvg] = useState("");
  const [hasFailed, setHasFailed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Mermaid bakes colors into the SVG at render time, so following the app
  // theme means re-rendering on change — a CSS swap cannot reach inside.
  useEffect(() => {
    const html = document.documentElement;
    const readTheme = () =>
      setTheme(html.dataset.theme === "dark" ? "dark" : "light");

    readTheme();

    const observer = new MutationObserver(readTheme);
    observer.observe(html, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    // useId() contains colons, which are not valid in the CSS selectors
    // Mermaid builds from this id.
    const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;

    void (async () => {
      try {
        const mermaid = await loadMermaid();

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: theme === "dark" ? "dark" : "default",
        });

        // parse() first: render() appends its own error node to the document
        // when the source is invalid, which would leak a stray element into the
        // page even though we catch the throw.
        const isValid = await mermaid.parse(code, { suppressErrors: true });

        if (!isValid) {
          throw new Error("Mermaid source tidak valid.");
        }

        const { svg: rendered } = await mermaid.render(renderId, code);

        if (!isCancelled) {
          setSvg(rendered);
          setHasFailed(false);
        }
      } catch {
        if (!isCancelled) {
          setSvg("");
          setHasFailed(true);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [code, reactId, theme]);

  if (hasFailed) {
    return (
      <div className="p-4">
        <p className="mb-2 text-xs font-semibold text-[var(--muted-3)]">
          Diagram ini belum bisa digambar — sumbernya ditampilkan apa adanya.
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-[16px] bg-[var(--surface-alt)] p-4 text-xs leading-relaxed text-[var(--ink)]">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <p className="p-4 text-sm text-[var(--muted-3)]">Menggambar diagram...</p>
    );
  }

  return (
    <div
      className="mermaid-artifact overflow-x-auto p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      // Safe by construction: Mermaid renders with securityLevel "strict",
      // which sanitizes the SVG it returns (see the component doc above).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
