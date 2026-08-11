import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { OPTIONS_MAX, OPTIONS_MIN, OPTION_TEXT_MAX, QUESTION_TITLE_MAX } from '@shared/constants';
import { createQuestionInput } from '@shared/schemas';
import type { Visibility } from '@shared/types';
import { ErrorAlert } from '@/components/Feedback';
import { TagEditor } from '@/components/TagEditor';
import { useViewerProfile } from '@/hooks/useProfile';
import { useCreateQuestion } from '@/hooks/useQuestions';

export function AddQuestionPage() {
  const navigate = useNavigate();
  const createQuestion = useCreateQuestion();
  const profile = useViewerProfile();

  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [anonymous, setAnonymous] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const setOption = (index: number, next: string) =>
    setOptions((current) => current.map((option, i) => (i === index ? next : option)));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    const payload = {
      title,
      options: options.map((option) => option.trim()).filter(Boolean),
      tags,
      visibility,
      anonymous,
    };

    // Validated with the *same* schema the Cloud Function uses, so the form can
    // never accept something the server will reject.
    const result = createQuestionInput.safeParse(payload);
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Please check the form.');
      return;
    }

    createQuestion.mutate(payload, {
      onSuccess: () => navigate('/yourquestions'),
    });
  };

  const filledOptions = options.filter((option) => option.trim()).length;

  return (
    <main className="page" id="main">
      <header className="page__header">
        <h1 className="page__title">Ask a question</h1>
        <p className="page__subtitle">
          Two or more options. People vote once, and you see the results as they come in.
        </p>
      </header>

      <form className="card stack" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="question-title">
            Your question
          </label>
          <textarea
            id="question-title"
            className="textarea"
            value={title}
            maxLength={QUESTION_TITLE_MAX}
            required
            placeholder="Should I take the job in Berlin?"
            onChange={(event) => setTitle(event.target.value)}
          />
          <p className="field__hint">
            {title.length}/{QUESTION_TITLE_MAX}
          </p>
        </div>

        <fieldset className="fieldset stack stack--tight">
          <legend className="field__label">Options</legend>
          {options.map((option, index) => (
            <div className="row" key={index}>
              <label className="sr-only" htmlFor={`option-${index}`}>
                Option {index + 1}
              </label>
              <input
                id={`option-${index}`}
                className="input grow"
                value={option}
                maxLength={OPTION_TEXT_MAX}
                placeholder={`Option ${index + 1}`}
                onChange={(event) => setOption(index, event.target.value)}
              />
              {options.length > OPTIONS_MIN && (
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setOptions((current) => current.filter((_, i) => i !== index))}
                  aria-label={`Remove option ${index + 1}`}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <div className="row">
            <button
              type="button"
              className="button button--secondary"
              disabled={options.length >= OPTIONS_MAX}
              onClick={() => setOptions((current) => [...current, ''])}
            >
              Add option
            </button>
            <span className="field__hint">
              {filledOptions} of {OPTIONS_MAX} filled in
            </span>
          </div>
        </fieldset>

        <TagEditor label="Tags (optional)" value={tags} onChange={setTags} />

        <div className="switch-group">
          {/*
            v1 used unlabelled toggle switches whose active side was ambiguous. These
            are radio groups: the current choice is announced, and reachable by keyboard.
          */}
          <fieldset className="fieldset choice">
            <legend className="choice__legend">Post as</legend>
            <div className="choice__options">
              <label className="choice__option">
                <input
                  type="radio"
                  name="anonymous"
                  checked={!anonymous}
                  onChange={() => setAnonymous(false)}
                />
                <span>@{profile.data?.handle ?? 'you'}</span>
              </label>
              <label className="choice__option">
                <input
                  type="radio"
                  name="anonymous"
                  checked={anonymous}
                  onChange={() => setAnonymous(true)}
                />
                <span>Anonymous</span>
              </label>
            </div>
            <p className="field__hint">
              {anonymous
                ? 'Your name is removed before the question is stored — other people cannot look it up.'
                : 'Your handle is shown with the question.'}
            </p>
          </fieldset>

          <fieldset className="fieldset choice">
            <legend className="choice__legend">Who can answer</legend>
            <div className="choice__options">
              <label className="choice__option">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === 'public'}
                  onChange={() => setVisibility('public')}
                />
                <span>Everyone</span>
              </label>
              <label className="choice__option">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === 'followers'}
                  onChange={() => setVisibility('followers')}
                />
                <span>My followers</span>
              </label>
            </div>
            <p className="field__hint">
              {visibility === 'followers'
                ? 'Only your followers can see or answer this. Enforced on the server, not just hidden.'
                : 'Anyone on DeSide can see and answer this.'}
            </p>
          </fieldset>
        </div>

        {validationError && (
          <p className="alert alert--error" role="alert">
            {validationError}
          </p>
        )}
        {createQuestion.isError && <ErrorAlert error={createQuestion.error} />}

        <button
          type="submit"
          className="button button--large button--block"
          disabled={createQuestion.isPending}
        >
          {createQuestion.isPending ? 'Posting…' : 'Post question'}
        </button>
      </form>
    </main>
  );
}
