import { useId, useState } from 'react';
import { TAGS_MAX } from '@shared/constants';
import { normalizeTag } from '@shared/tags';

interface TagEditorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label: string;
  hint?: string;
  max?: number;
}

/**
 * Tag input, replacing v1's `react-tagsinput`.
 *
 * Tags are normalized on entry with the same function the Cloud Functions use, so what
 * the user sees is exactly what gets stored and queried. That matters because tag
 * filtering uses `array-contains-any`, an exact-match operator — a mismatch in casing
 * or spacing would silently return no results.
 */
export function TagEditor({ value, onChange, label, hint, max = TAGS_MAX }: TagEditorProps) {
  const inputId = useId();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const commit = (raw: string) => {
    const normalized = normalizeTag(raw);
    if (!normalized) {
      setError('Tags can only contain letters, numbers and dashes.');
      return;
    }
    if (value.includes(normalized)) {
      setError(`"${normalized}" is already added.`);
      setDraft('');
      return;
    }
    if (value.length >= max) {
      setError(`You can add at most ${max} tags.`);
      return;
    }
    setError(null);
    setDraft('');
    onChange([...value, normalized]);
  };

  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      {value.length > 0 && (
        <ul className="tags">
          {value.map((tag) => (
            <li key={tag} className="tag">
              {tag}
              <button
                type="button"
                className="tag__remove"
                onClick={() => onChange(value.filter((existing) => existing !== tag))}
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="tag-input">
        <input
          id={inputId}
          className="input"
          value={draft}
          placeholder="e.g. food, travel"
          aria-describedby={`${inputId}-hint`}
          aria-invalid={error ? 'true' : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            // Enter and comma both commit, so the control behaves the way tag inputs
            // usually do. Enter must not submit the surrounding form.
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              if (draft.trim()) commit(draft);
            } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (draft.trim()) commit(draft);
          }}
        />
        <button
          type="button"
          className="button button--secondary"
          onClick={() => commit(draft)}
          disabled={!draft.trim()}
        >
          Add
        </button>
      </div>
      <p className="field__hint" id={`${inputId}-hint`}>
        {hint ?? `Press Enter to add. Up to ${max} tags.`}
      </p>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
