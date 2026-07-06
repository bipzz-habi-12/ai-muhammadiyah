import { memo, type ReactNode } from "react";
import { renderInlineMarkdown } from "@/lib/formatting/markdown";

const MarkdownMessage = memo(function MarkdownMessage({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let orderedItems: ReactNode[] = [];

  function flushLists() {
    if (listItems.length) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-3 list-disc space-y-1 pl-5">
          {listItems}
        </ul>,
      );
      listItems = [];
    }

    if (orderedItems.length) {
      elements.push(
        <ol
          key={`ol-${elements.length}`}
          className="my-3 list-decimal space-y-1 pl-5"
        >
          {orderedItems}
        </ol>,
      );
      orderedItems = [];
    }
  }

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushLists();
      return;
    }

    const heading = trimmedLine.match(/^(#{2,4})\s+(.+)$/);
    const bullet = trimmedLine.match(/^[-*]\s+(.+)$/);
    const ordered = trimmedLine.match(/^\d+\.\s+(.+)$/);

    if (heading) {
      flushLists();
      const levelClass =
        heading[1].length === 2
          ? "mt-4 text-lg"
          : "mt-3 text-base";

      elements.push(
        <h3
          key={`h-${index}`}
          className={`${levelClass} font-bold leading-snug text-[#0f3025] first:mt-0`}
        >
          {renderInlineMarkdown(heading[2])}
        </h3>,
      );
      return;
    }

    if (trimmedLine === "---") {
      flushLists();
      elements.push(
        <hr key={`hr-${index}`} className="my-4 border-[#d8eadf]" />,
      );
      return;
    }

    if (bullet) {
      orderedItems = [];
      listItems.push(
        <li key={`li-${index}`} className="pl-1">
          {renderInlineMarkdown(bullet[1])}
        </li>,
      );
      return;
    }

    if (ordered) {
      listItems = [];
      orderedItems.push(
        <li key={`oli-${index}`} className="pl-1">
          {renderInlineMarkdown(ordered[1])}
        </li>,
      );
      return;
    }

    flushLists();
    elements.push(
      <p key={`p-${index}`} className="my-2 first:mt-0 last:mb-0">
        {renderInlineMarkdown(trimmedLine)}
      </p>,
    );
  });

  flushLists();

  return <div className="space-y-1">{elements}</div>;
});

export default MarkdownMessage;
