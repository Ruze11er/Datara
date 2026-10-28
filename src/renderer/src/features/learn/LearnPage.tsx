import { ComingSoon, Page } from '../../components/Page'

export default function LearnPage() {
  return (
    <Page title="Learn" subtitle="Short, beginner-friendly readings with examples, key takeaways and quizzes.">
      <ComingSoon
        phase="Phase 1"
        items={[
          'Data Analytics Fundamentals and SQL basics (about 12 lessons to start)',
          'Every lesson cites its sources, which open in your web browser',
          '"Practice this" links that jump straight to matching SQL Lab levels'
        ]}
      />
    </Page>
  )
}
