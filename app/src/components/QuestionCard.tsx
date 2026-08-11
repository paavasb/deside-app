import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { QuestionWithViewerState } from '@shared/types';
import { useSetFollow } from '@/hooks/useFollow';
import { useReportQuestion } from '@/hooks/useQuestions';
import { useVote } from '@/hooks/useVote';
import { errorMessage } from '@/lib/appError';
import { formatNumber, formatRelativeTime } from '@/lib/format';
import { OptionList } from './OptionList';

interface QuestionCardProps {
  question: QuestionWithViewerState;
  /** Whether the viewer already follows this author, when known. */
  isFollowingAuthor?: boolean;
  /** Extra controls rendered in the footer (used by "Your questions"). */
  actions?: ReactNode;
}

export function QuestionCard({ question, isFollowingAuthor, actions }: QuestionCardProps) {
  const vote = useVote();
  const follow = useSetFollow();
  const report = useReportQuestion();
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);

  const handleVote = (optionId: string) => {
    setVotingOptionId(optionId);
    vote.mutate(
      { questionId: question.id, optionId },
      { onSettled: () => setVotingOptionId(null) },
    );
  };

  const canFollow =
    !question.viewerIsAuthor && question.authorId !== null && isFollowingAuthor === false;

  return (
    <article className="question" aria-labelledby={`question-${question.id}-title`}>
      <div>
        <h3 className="question__title" id={`question-${question.id}-title`}>
          {question.title}
        </h3>
        <p className="question__meta">
          {question.anonymous ? (
            <span className="badge badge--anonymous">Anonymous</span>
          ) : question.authorId ? (
            <Link className="question__author" to={`/u/${question.authorHandle ?? ''}`}>
              @{question.authorHandle}
            </Link>
          ) : (
            <span className="question__author">Unknown</span>
          )}
          {question.visibility === 'followers' && (
            <span className="badge badge--followers">Followers only</span>
          )}
          <span aria-hidden="true">·</span>
          <time dateTime={new Date(question.createdAt).toISOString()}>
            {formatRelativeTime(question.createdAt)}
          </time>
          <span aria-hidden="true">·</span>
          <span className="mono-num">
            {formatNumber(question.totalVotes)} {question.totalVotes === 1 ? 'vote' : 'votes'}
          </span>
        </p>
      </div>

      <OptionList
        question={question}
        onVote={handleVote}
        votingOptionId={votingOptionId}
        disabled={vote.isPending}
      />

      {vote.isError && (
        <p className="alert alert--error" role="alert">
          {errorMessage(vote.error)}
        </p>
      )}

      {question.tags.length > 0 && (
        <ul className="tags" aria-label="Tags">
          {question.tags.map((tag) => (
            <li key={tag} className="tag">
              {tag}
            </li>
          ))}
        </ul>
      )}

      <div className="question__footer">
        <div className="row">
          {canFollow && (
            <button
              type="button"
              className="button button--secondary"
              disabled={follow.isPending}
              onClick={() =>
                follow.mutate({ targetUid: question.authorId as string, follow: true })
              }
            >
              {follow.isPending ? 'Following…' : `Follow @${question.authorHandle}`}
            </button>
          )}
          {!question.viewerIsAuthor && (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setReporting((open) => !open)}
              aria-expanded={reporting}
            >
              Report
            </button>
          )}
        </div>
        {actions && <div className="row">{actions}</div>}
      </div>

      {reporting && (
        <form
          className="stack stack--tight"
          onSubmit={(event) => {
            event.preventDefault();
            report.mutate(
              { questionId: question.id, reason: reportReason.trim() },
              { onSuccess: () => setReporting(false) },
            );
          }}
        >
          <label className="field">
            <span className="field__label">Why are you reporting this?</span>
            <textarea
              className="textarea"
              value={reportReason}
              maxLength={500}
              required
              onChange={(event) => setReportReason(event.target.value)}
            />
          </label>
          {report.isError && (
            <p className="field__error" role="alert">
              {errorMessage(report.error)}
            </p>
          )}
          <div className="row">
            <button type="submit" className="button" disabled={report.isPending}>
              {report.isPending ? 'Sending…' : 'Send report'}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setReporting(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {report.isSuccess && !reporting && (
        <p className="alert alert--success" role="status">
          Thanks — this question has been reported for review.
        </p>
      )}
    </article>
  );
}
