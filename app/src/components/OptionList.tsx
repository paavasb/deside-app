import type { QuestionWithViewerState } from '@shared/types';
import { formatNumber, votePercent } from '@/lib/format';

interface OptionListProps {
  question: QuestionWithViewerState;
  /** Omitted when the viewer cannot vote (already voted, own question, pending). */
  onVote?: (optionId: string) => void;
  votingOptionId?: string | null;
  disabled?: boolean;
}

/**
 * The options of a question, in either voting or results mode.
 *
 * Voting mode renders each option as a button. Results mode renders static rows with
 * a bar, a percentage and a count. Which mode applies is derived from the viewer's
 * own state (`viewerOptionId` / `viewerIsAuthor`) rather than a separate flag, so a
 * result view can never be shown to someone who still has a vote to cast.
 */
export function OptionList({ question, onVote, votingOptionId, disabled }: OptionListProps) {
  const showResults = question.viewerOptionId !== null || question.viewerIsAuthor;
  const total = question.totalVotes;

  if (showResults) {
    return (
      <ul className="options">
        {question.options.map((option) => {
          const votes = question.optionVotes[option.id] ?? 0;
          const percent = votePercent(votes, total);
          const chosen = question.viewerOptionId === option.id;

          return (
            <li
              key={option.id}
              className={`option${chosen ? ' option--chosen' : ''}`}
              aria-label={`${option.text}: ${formatNumber(votes)} ${
                votes === 1 ? 'vote' : 'votes'
              }, ${percent}%${chosen ? ', your pick' : ''}`}
            >
              <span className="option__bar" style={{ width: `${percent}%` }} aria-hidden="true" />
              <span className="option__body">
                <span className="option__text">
                  {option.text}
                  {chosen && (
                    <>
                      {' '}
                      <span className="option__check" aria-hidden="true">
                        ✓
                      </span>
                    </>
                  )}
                </span>
                <span className="option__stats" aria-hidden="true">
                  <span className="option__percent">{percent}%</span>
                  <span className="mono-num">{formatNumber(votes)}</span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="options">
      {question.options.map((option) => {
        const pending = votingOptionId === option.id;
        return (
          <li key={option.id}>
            <button
              type="button"
              className="option"
              onClick={() => onVote?.(option.id)}
              disabled={disabled || Boolean(votingOptionId)}
            >
              <span className="option__body">
                <span className="option__text">{option.text}</span>
                <span className="option__stats">
                  {pending ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      <span className="sr-only">Casting your vote</span>
                    </>
                  ) : (
                    <span aria-hidden="true">Vote</span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
