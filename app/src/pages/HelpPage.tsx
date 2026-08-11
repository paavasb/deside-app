import { Link } from 'react-router-dom';
import { SCORE_WEIGHTS } from '@shared/constants';

export function HelpPage() {
  return (
    <main className="page" id="main">
      <header className="page__header">
        <h1 className="page__title">Welcome to DeSide</h1>
        <p className="page__subtitle">Let the internet deside.</p>
      </header>

      <div className="prose">
        <section>
          <h2>What is DeSide?</h2>
          <p>
            DeSide is a question-and-answer social app. Too nervous, too unsure, or too lazy to make
            a decision? Ask a question, see what people think, and let the internet deside.
          </p>
        </section>

        <section>
          <h2>What can you do here?</h2>
          <ul>
            <li>
              <strong>Ask a question</strong> with two or more options — publicly, to your followers
              only, or anonymously. <Link to="/add">Ask a question →</Link>
            </li>
            <li>
              <strong>Answer questions</strong> from everyone, or just from people you follow. You
              get one vote per question. <Link to="/questions">Answer questions →</Link>
            </li>
            <li>
              <strong>Track your questions</strong> and their live results, including the anonymous
              ones. <Link to="/yourquestions">Your questions →</Link>
            </li>
            <li>
              <strong>Find people</strong>, follow them, and check your DeSide Score.{' '}
              <Link to="/user">Your profile →</Link>
            </li>
            <li>
              <strong>Find the easter egg.</strong> It’s still in here somewhere.
            </li>
          </ul>
        </section>

        <section>
          <h2>What does “followers only” actually mean?</h2>
          <p>
            A followers-only question is delivered only to accounts that follow you. It isn’t hidden
            in the page — the server never sends it to anyone else in the first place, and it can’t
            be voted on by anyone outside your followers.
          </p>
          <p>
            An anonymous question goes further: your identity is stripped before the question is
            stored. Nobody can look up who asked it. It stays linked to your account privately, so
            it still appears under <Link to="/yourquestions">Your questions</Link> and can be
            moderated if reported.
          </p>
        </section>

        <section>
          <h2>What is the DeSide Score?</h2>
          <p>Every account gets a score from how it uses DeSide:</p>
          <ul>
            <li>{SCORE_WEIGHTS.questions} points per question you ask</li>
            <li>{SCORE_WEIGHTS.answers} point per question you answer</li>
            <li>{SCORE_WEIGHTS.followers} points per follower</li>
            <li>{SCORE_WEIGHTS.following} points per account you follow</li>
          </ul>
          <p>
            Screenshot it and share it with your friends for bragging rights.{' '}
            <Link to="/user">Check your score →</Link>
          </p>
        </section>

        <section>
          <h2>Something wrong with a question?</h2>
          <p>
            Every question has a <strong>Report</strong> button. Reports go to a private moderation
            queue — other people can’t see that you reported something.
          </p>
        </section>
      </div>
    </main>
  );
}
