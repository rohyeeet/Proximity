"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChevronLeft, X } from "lucide-react";
import { useKnowledge } from "./KnowledgeContext";
import { getKnowledgeTopic, getKnowledgeTopicsByScope } from "@/data";

export function KnowledgeDrawer() {
  const { isOpen, activeTopicId, scope, openTopic, openList, close } = useKnowledge();
  const [query, setQuery] = useState("");

  const topics = useMemo(() => getKnowledgeTopicsByScope(scope), [scope]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((topic) => topic.title.toLowerCase().includes(q) || topic.summary.toLowerCase().includes(q));
  }, [topics, query]);
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filtered>();
    for (const topic of filtered) {
      const key = topic.category ?? "More";
      groups.set(key, [...(groups.get(key) ?? []), topic]);
    }
    return [...groups.entries()];
  }, [filtered]);

  const activeTopic = activeTopicId ? getKnowledgeTopic(activeTopicId) : null;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={close} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-[380px] flex-col border-l border-border bg-paper shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-brand-600" />
            <p className="text-[13.5px] font-semibold text-ink">Guide</p>
          </div>
          <button
            aria-label="Close guide"
            onClick={close}
            className="flex size-7 items-center justify-center rounded text-ink-soft hover:bg-sunken hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        {activeTopic ? (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <button onClick={openList} className="mb-3 flex items-center gap-1 text-[12.5px] text-ink-soft hover:text-ink">
              <ChevronLeft className="size-3.5" /> All topics
            </button>
            <h2 className="mb-1.5 text-[15px] font-semibold text-ink">{activeTopic.title}</h2>
            <p className="mb-3 text-[13px] text-ink-soft">{activeTopic.summary}</p>

            {activeTopic.steps && (
              <ol className="mb-3 flex flex-col gap-2">
                {activeTopic.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-ink">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-medium text-brand-700">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            )}

            {activeTopic.body && (
              <div className="flex flex-col gap-2.5">
                {activeTopic.body.map((paragraph, i) => (
                  <p key={i} className="text-[13px] leading-relaxed text-ink-soft">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {activeTopic.relatedTopicIds && activeTopic.relatedTopicIds.length > 0 && (
              <div className="mt-5 border-t border-border pt-3">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Related</p>
                <div className="flex flex-col gap-1">
                  {activeTopic.relatedTopicIds.map((id) => {
                    const related = getKnowledgeTopic(id);
                    if (!related) return null;
                    return (
                      <button key={id} onClick={() => openTopic(id)} className="text-left text-[13px] text-brand-600 hover:text-brand-700 hover:underline">
                        {related.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the guide…"
              className="mb-3 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink-soft/60"
            />
            <div className="flex flex-col gap-4">
              {grouped.map(([category, categoryTopics]) => (
                <div key={category}>
                  <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">{category}</p>
                  <div className="flex flex-col gap-1">
                    {categoryTopics.map((topic) => (
                      <button key={topic.id} onClick={() => openTopic(topic.id)} className="rounded-md px-2.5 py-2 text-left hover:bg-sunken">
                        <p className="text-[13.5px] font-medium text-ink">{topic.title}</p>
                        <p className="text-[12px] text-ink-soft">{topic.summary}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="px-2.5 py-2 text-[12.5px] text-ink-soft">No topics match.</p>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
