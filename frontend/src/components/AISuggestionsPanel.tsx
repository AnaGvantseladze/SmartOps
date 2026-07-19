import { Sparkles, Check, X } from 'lucide-react';
import type { AISuggestion } from '@/types';

interface AISuggestionsPanelProps {
  suggestions: AISuggestion[];
  title?: string;
}

export function AISuggestionsPanel({ suggestions, title = 'AI Suggestions' }: AISuggestionsPanelProps) {
  if (!suggestions.length) return null;

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Sparkles className="h-4 w-4 text-brand-600" />
        {title}
      </div>
      <div className="space-y-3">
        {suggestions.map((s) => (
          <div key={s.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-slate-900">{s.title}</span>
              <span
                className={`badge shrink-0 border ${
                  s.confidence >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}
              >
                {s.confidence}%
              </span>
            </div>
            <p className="mb-2 text-xs text-slate-600">{s.description}</p>
            <p className="mb-3 text-xs italic text-slate-500">{s.reasoning}</p>
            <div className="flex gap-2">
              <button className="btn-primary text-xs">
                <Check className="h-3 w-3" /> Accept
              </button>
              <button className="btn-secondary text-xs">
                <X className="h-3 w-3" /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">AI suggests — humans decide. All actions require confirmation.</p>
    </div>
  );
}
