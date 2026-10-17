/**
 * MOCK DATA — ILLUSTRATIVE ONLY.
 *
 * This file exists solely for the landing-page report preview and UI
 * prototyping. Production data flows come from the backend, which generates
 * a validated report from real, user-authorized YouTube metadata.
 */
export const IS_MOCK = true

export const mockReport = {
  brainRotScore: 87,
  scoreExplanation:
    'A playful, AI-generated entertainment score based on the sample below — not a validated measurement.',
  personalitySummary:
    'You appear to be a curiosity-driven browser with a soft spot for explanations, a distrust of clickbait, and a suspicious number of "I\'ll watch this later" tabs that never got watched.',
  topInterests: [
    {
      category: 'Technology',
      observation: 'You seem interested in developer content and tooling.',
      evidenceCount: 12,
    },
    {
      category: 'Education',
      observation: 'Long-form explainers show up a lot in your sample.',
      evidenceCount: 8,
    },
    {
      category: 'Entertainment',
      observation: 'You reward creators with a subscribe more than a like.',
      evidenceCount: 5,
    },
    {
      category: 'Music',
      observation: 'A steady background hum of chill and lo-fi picks.',
      evidenceCount: 4,
    },
  ],
  redFlags: [
    {
      title: 'Tutorial collector',
      description:
        'You seem to enjoy collecting coding tutorials far faster than you could possibly finish them.',
    },
    {
      title: 'Subscribe-first, like-later',
      description:
        'Your subscriptions outnumber your likes — you commit broadly and engage narrowly.',
    },
    {
      title: 'One-video deep dives',
      description:
        'When you do like something, it tends to be a single very deep rabbit hole, not a gentle browse.',
    },
  ],
  roast:
    'Based on this sample, you are the human equivalent of a browser with 400 open tabs: subscribed to ambition, engaged with curiosity, and personally victimized by your own watch-later list. You have apparently decided that the best way to learn a skill is to buy ten courses and finish none of them, all while telling yourself "tonight\'s the night."',
  positiveObservations: [
    'You show genuine curiosity about learning new things.',
    'Your mix of education and entertainment suggests you like being challenged, not just soothed.',
    'You seem to support creators directly by subscribing rather than lurking.',
  ],
  disclaimer:
    'This is entertainment, not a scientific personality assessment.',
}
