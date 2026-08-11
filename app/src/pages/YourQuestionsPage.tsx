import { useMemo, useState } from 'react';
import type { QuestionWithViewerState, Visibility } from '@shared/types';
import { EmptyState, ErrorAlert, QuestionSkeletons } from '@/components/Feedback';
import { QuestionCard } from '@/components/QuestionCard';
import { useDeleteQuestion, useMyQuestions, useUpdateQuestion } from '@/hooks/useQuestions';
import { errorMessage } from '@/lib/appError';

export function YourQuestionsPage() {
  const myQuestions = useMyQuestions();

  const questions = useMemo<QuestionWithViewerState[]>(
    () => (myQuestions.data ?? []).flatMap((page) => page.items),
    [myQuestions.data],
  );

  return (
    <main className="page" id="main">
      <header className="page__header">
        <h1 className="page__title">Your questions</h1>
        <p className="page__subtitle">
          Everything you’ve asked, including anonymous ones, with live results.
        </p>
      </header>

      {myQuestions.isPending && <QuestionSkeletons count={2} />}
      {myQuestions.isError && (
        <ErrorAlert error={myQuestions.error} onRetry={() => void myQuestions.refetch()} />
      )}

      {myQuestions.isSuccess && questions.length === 0 && (
        <EmptyState
          title="You haven’t asked anything yet"
          actionLabel="Ask your first question"
          actionTo="/add"
        >
          Post a question and let the internet deside.
        </EmptyState>
      )}

      {questions.length > 0 && (
        <ul className="stack">
          {questions.map((question) => (
            <li key={question.id}>
              <QuestionCard
                question={question}
                actions={<QuestionControls question={question} />}
              />
            </li>
          ))}
        </ul>
      )}

      {myQuestions.hasNextPage && (
        <p className="center" style={{ marginTop: 'var(--space-m)' }}>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void myQuestions.fetchNextPage()}
            disabled={myQuestions.isFetchingNextPage}
          >
            {myQuestions.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </p>
      )}
    </main>
  );
}

/**
 * Author-only controls: change visibility, change anonymity, delete.
 *
 * Title and tags are intentionally not editable here once a question has votes — the
 * server rejects it, because rewording a question after people have answered would
 * misrepresent the results they contributed to.
 */
function QuestionControls({ question }: { question: QuestionWithViewerState }) {
  const update = useUpdateQuestion();
  const remove = useDeleteQuestion();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const busy = update.isPending || remove.isPending;

  return (
    <div className="stack stack--tight" style={{ width: '100%' }}>
      <div className="row">
        <label className="field__hint" htmlFor={`visibility-${question.id}`}>
          Visible to
        </label>
        <select
          id={`visibility-${question.id}`}
          className="select"
          style={{ maxWidth: '18rem' }}
          value={question.visibility}
          disabled={busy}
          onChange={(event) =>
            update.mutate({
              questionId: question.id,
              visibility: event.target.value as Visibility,
            })
          }
        >
          <option value="public">Everyone</option>
          <option value="followers">My followers</option>
        </select>

        <button
          type="button"
          className="button button--secondary"
          disabled={busy}
          onClick={() => update.mutate({ questionId: question.id, anonymous: !question.anonymous })}
        >
          {question.anonymous ? 'Show my handle' : 'Make anonymous'}
        </button>

        {confirmingDelete ? (
          <>
            <button
              type="button"
              className="button button--danger"
              disabled={busy}
              onClick={() => remove.mutate({ questionId: question.id })}
            >
              {remove.isPending ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setConfirmingDelete(false)}
            >
              Keep it
            </button>
          </>
        ) : (
          <button
            type="button"
            className="button button--danger"
            disabled={busy}
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </button>
        )}
      </div>

      {question.totalVotes > 0 && (
        <p className="field__hint">
          This question has votes, so its wording and tags are locked. Visibility and anonymity can
          still change.
        </p>
      )}

      {update.isError && (
        <p className="field__error" role="alert">
          {errorMessage(update.error)}
        </p>
      )}
      {remove.isError && (
        <p className="field__error" role="alert">
          {errorMessage(remove.error)}
        </p>
      )}
    </div>
  );
}
