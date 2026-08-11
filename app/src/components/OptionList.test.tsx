import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { QuestionWithViewerState } from '@shared/types';
import { OptionList } from './OptionList';

function question(overrides: Partial<QuestionWithViewerState> = {}): QuestionWithViewerState {
  return {
    id: 'q1',
    title: 'Tea or coffee?',
    options: [
      { id: 'tea', text: 'Tea' },
      { id: 'coffee', text: 'Coffee' },
    ],
    optionVotes: { tea: 3, coffee: 1 },
    totalVotes: 4,
    tags: [],
    visibility: 'public',
    anonymous: false,
    status: 'active',
    authorId: 'author',
    authorHandle: 'author',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    viewerOptionId: null,
    viewerIsAuthor: false,
    ...overrides,
  };
}

describe('OptionList', () => {
  it('offers votable buttons and hides the tallies before the viewer has voted', async () => {
    const onVote = vi.fn();
    render(<OptionList question={question()} onVote={onVote} />);

    const teaButton = screen.getByRole('button', { name: /Tea/ });
    expect(teaButton).toBeEnabled();
    // Results must not leak before voting, or the vote is no longer independent.
    expect(screen.queryByText('75%')).not.toBeInTheDocument();

    await userEvent.click(teaButton);
    expect(onVote).toHaveBeenCalledWith('tea');
  });

  it('shows results once the viewer has voted, marking their pick', () => {
    render(<OptionList question={question({ viewerOptionId: 'tea' })} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    // No vote buttons remain — one vote per account.
    expect(screen.queryAllByRole('button')).toHaveLength(0);

    // The viewer's own choice is announced, not conveyed by colour alone.
    expect(screen.getByLabelText(/Tea: 3 votes, 75%, your pick/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Coffee: 1 vote, 25%$/)).toBeInTheDocument();
  });

  it('shows results to the author without offering them a vote', () => {
    render(<OptionList question={question({ viewerIsAuthor: true })} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('renders 0% instead of NaN for a question with no votes yet', () => {
    render(
      <OptionList
        question={question({
          totalVotes: 0,
          optionVotes: { tea: 0, coffee: 0 },
          viewerOptionId: 'tea',
        })}
      />,
    );
    expect(screen.getAllByText('0%')).toHaveLength(2);
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('disables every option while a vote is in flight', () => {
    render(<OptionList question={question()} onVote={vi.fn()} votingOptionId="tea" />);
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByText('Casting your vote')).toBeInTheDocument();
  });
});
