import { expect, test, type Page } from '@playwright/test';

/**
 * The critical flow from the plan's definition of done:
 * a new user signs in, asks a valid question, votes once, sees reliable results,
 * and manages their own question.
 *
 * Runs against the Emulator Suite with no mocking, so this exercises the real rules
 * and the real callable transactions.
 */

const AUTH_EMULATOR = 'http://127.0.0.1:9099';

/**
 * Signs in through the Auth emulator's Google sign-in stand-in.
 *
 * The emulator opens a popup listing test accounts plus an "Add new account" form.
 * Auto-generating the user gives each test run a distinct account, so tests don't
 * inherit each other's questions, votes or follow edges.
 */
async function signInWithGoogle(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'DeSide' })).toBeVisible();

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: /Continue with Google/i }).click();
  const popup = await popupPromise;

  await popup.waitForLoadState('domcontentloaded');
  expect(popup.url()).toContain(AUTH_EMULATOR);

  const addAccount = popup.getByText('Add new account', { exact: false });
  if (await addAccount.isVisible().catch(() => false)) {
    await addAccount.click();
  }

  const autoGenerate = popup.getByText('Auto-generate user information', { exact: false });
  if (await autoGenerate.isVisible().catch(() => false)) {
    await autoGenerate.click();
  }

  await popup.getByText(/Sign in with Google\.com/i).click();
  await popup.waitForEvent('close', { timeout: 30_000 }).catch(() => undefined);

  // Landing on the feed means the session resolved and the profile bootstrap (which
  // atomically claims a handle) completed.
  await expect(page).toHaveURL(/\/questions/, { timeout: 30_000 });
}

function uniqueTitle(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function askQuestion(
  page: Page,
  title: string,
  options: [string, string],
  extras: { anonymous?: boolean; followersOnly?: boolean } = {},
): Promise<void> {
  await page.getByRole('link', { name: 'Ask', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ask a question' })).toBeVisible();

  await page.getByLabel('Your question').fill(title);
  await page.getByLabel('Option 1').fill(options[0]);
  await page.getByLabel('Option 2').fill(options[1]);

  if (extras.anonymous) {
    await page.getByRole('radio', { name: 'Anonymous' }).check();
  }
  if (extras.followersOnly) {
    await page.getByRole('radio', { name: 'My followers' }).check();
  }

  await page.getByRole('button', { name: /Post question/i }).click();
  await expect(page).toHaveURL(/\/yourquestions/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

test.describe('critical flow', () => {
  test('sign in, ask a question, and manage it', async ({ page }) => {
    await signInWithGoogle(page);

    const title = uniqueTitle('Should I learn Rust?');
    await askQuestion(page, title, ['Yes, dive in', 'No, later']);

    const card = page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: title }) });

    // The author sees results immediately and is never offered a vote on their own
    // question — enforced by the server too.
    await expect(card.getByText('0%').first()).toBeVisible();
    await expect(card.getByRole('button', { name: /^Vote$/ })).toHaveCount(0);

    // Visibility is editable by the author.
    await card.getByLabel('Visible to').selectOption('followers');
    await expect(card.getByText('Followers only')).toBeVisible();

    // Anonymity is togglable, and removes the handle from the card.
    await card.getByRole('button', { name: 'Make anonymous' }).click();
    await expect(card.getByText('Anonymous')).toBeVisible();

    // Delete asks for confirmation before destroying anything.
    await card.getByRole('button', { name: 'Delete', exact: true }).click();
    await card.getByRole('button', { name: /Confirm delete/i }).click();
    await expect(page.getByRole('heading', { name: title })).toHaveCount(0);
  });

  test('a second account can vote once, and results are reliable', async ({ browser }) => {
    // Author and voter need separate sessions, so separate browser contexts.
    const authorContext = await browser.newContext();
    const authorPage = await authorContext.newPage();
    await signInWithGoogle(authorPage);

    const title = uniqueTitle('Tea or coffee?');
    await askQuestion(authorPage, title, ['Tea', 'Coffee']);

    const voterContext = await browser.newContext();
    const voterPage = await voterContext.newPage();
    await signInWithGoogle(voterPage);

    // Find the question in the public feed.
    await voterPage.getByRole('link', { name: 'Answer', exact: true }).click();
    await voterPage.getByLabel('Search titles').fill(title);

    const card = voterPage
      .getByRole('article')
      .filter({ has: voterPage.getByRole('heading', { name: title }) });
    await expect(card).toBeVisible({ timeout: 20_000 });

    // Before voting, no tallies are shown.
    await expect(card.getByText('%')).toHaveCount(0);

    await card.getByRole('button', { name: /Tea/ }).click();

    // Optimistic update lands, then the server's committed tally replaces it.
    await expect(card.getByText('100%')).toBeVisible();
    await expect(card.getByText('1 vote')).toBeVisible();

    // One vote per account: the buttons are gone, and a reload confirms the vote
    // persisted rather than only existing in local state.
    await expect(card.getByRole('button', { name: /^Vote$/ })).toHaveCount(0);
    await voterPage.reload();
    await voterPage.getByLabel('Search titles').fill(title);
    const reloaded = voterPage
      .getByRole('article')
      .filter({ has: voterPage.getByRole('heading', { name: title }) });
    await expect(reloaded.getByText('100%')).toBeVisible({ timeout: 20_000 });

    // The author sees the vote too.
    await authorPage.reload();
    await expect(
      authorPage
        .getByRole('article')
        .filter({ has: authorPage.getByRole('heading', { name: title }) })
        .getByText('1 vote'),
    ).toBeVisible({ timeout: 20_000 });

    await authorContext.close();
    await voterContext.close();
  });

  test('a followers-only question is not visible to a stranger', async ({ browser }) => {
    const authorContext = await browser.newContext();
    const authorPage = await authorContext.newPage();
    await signInWithGoogle(authorPage);

    const title = uniqueTitle('Private plans');
    await askQuestion(authorPage, title, ['Option A', 'Option B'], { followersOnly: true });

    const strangerContext = await browser.newContext();
    const strangerPage = await strangerContext.newPage();
    await signInWithGoogle(strangerPage);

    await strangerPage.getByRole('link', { name: 'Answer', exact: true }).click();

    // Absent from every view available to them: the merged default, public-only, and
    // their own following feed (they follow nobody).
    for (const source of ['all', 'public', 'following']) {
      await strangerPage.getByLabel('Show').selectOption(source);
      await strangerPage.getByLabel('Search titles').fill(title);
      await expect(strangerPage.getByRole('heading', { name: title })).toHaveCount(0);
    }

    await authorContext.close();
    await strangerContext.close();
  });

  test('the merged feed shows public and followers-only questions in one ordered list', async ({
    browser,
  }) => {
    const authorContext = await browser.newContext();
    const authorPage = await authorContext.newPage();
    await signInWithGoogle(authorPage);

    const followerContext = await browser.newContext();
    const followerPage = await followerContext.newPage();
    await signInWithGoogle(followerPage);

    // The follower needs to follow the author before the followers-only question is
    // visible to them at all.
    const authorHandle = `merge_${Date.now().toString(36)}`.slice(0, 20);
    await authorPage.getByRole('link', { name: 'Profile', exact: true }).click();
    await authorPage.getByLabel('Handle').fill(authorHandle);
    await authorPage.getByRole('button', { name: /Save handle/i }).click();
    await expect(authorPage.getByText(`@${authorHandle}`).first()).toBeVisible({
      timeout: 15_000,
    });

    await followerPage.getByRole('link', { name: 'Profile', exact: true }).click();
    await followerPage.getByLabel('Search by handle').fill(authorHandle);
    await followerPage
      .getByRole('listitem')
      .filter({ hasText: `@${authorHandle}` })
      .getByRole('button', { name: 'Follow' })
      .click();

    // Created oldest-first, so the expected merged order is the reverse.
    const publicTitle = uniqueTitle('Merged public');
    await askQuestion(authorPage, publicTitle, ['Yes', 'No']);
    const privateTitle = uniqueTitle('Merged private');
    await askQuestion(authorPage, privateTitle, ['Yes', 'No'], { followersOnly: true });

    await followerPage.getByRole('link', { name: 'Answer', exact: true }).click();
    await followerPage.getByLabel('Show').selectOption('all');
    await followerPage.getByLabel('Order by').selectOption('newest');

    // Both halves appear together in the one default list.
    await expect(followerPage.getByRole('heading', { name: privateTitle })).toBeVisible({
      timeout: 20_000,
    });
    await expect(followerPage.getByRole('heading', { name: publicTitle })).toBeVisible();

    // Newest first, across the two sources.
    const headings = await followerPage
      .getByRole('heading', { name: /^Merged (public|private)/ })
      .allTextContents();
    expect(headings.indexOf(privateTitle)).toBeLessThan(headings.indexOf(publicTitle));

    // Each question appears exactly once — the union must not double-count the
    // author's public question.
    const publicCount = await followerPage.getByRole('heading', { name: publicTitle }).count();
    expect(publicCount).toBe(1);

    // The followers-only one is gone from the public-only view.
    await followerPage.getByLabel('Show').selectOption('public');
    await expect(followerPage.getByRole('heading', { name: privateTitle })).toHaveCount(0);
    await expect(followerPage.getByRole('heading', { name: publicTitle })).toBeVisible({
      timeout: 20_000,
    });

    await authorContext.close();
    await followerContext.close();
  });

  test('profile shows the DeSide Score and allows changing the handle', async ({ page }) => {
    await signInWithGoogle(page);

    await askQuestion(page, uniqueTitle('Score check'), ['Yes', 'No']);

    await page.getByRole('link', { name: 'Profile', exact: true }).click();
    await expect(page.getByText('DeSide Score')).toBeVisible();
    // One question posted = 20 points.
    await expect(page.getByText('20', { exact: true }).first()).toBeVisible();

    const handle = `e2e_${Date.now().toString(36)}`.slice(0, 20);
    await page.getByLabel('Handle').fill(handle);
    await expect(page.getByText(`@${handle} is available.`)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Save handle/i }).click();
    await expect(page.getByText(`@${handle}`).first()).toBeVisible({ timeout: 15_000 });
  });

  test('sign out returns to the login screen and protects routes', async ({ page }) => {
    await signInWithGoogle(page);

    await page.getByRole('button', { name: /More options/i }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();

    // A protected deep link must bounce back to the login screen.
    await page.goto('/yourquestions');
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });
});
