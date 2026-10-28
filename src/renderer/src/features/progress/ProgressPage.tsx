import { ComingSoon, Page } from '../../components/Page'

export default function ProgressPage() {
  return (
    <Page title="Progress" subtitle="Your completed lessons, levels and topics to revisit.">
      <ComingSoon
        phase="Phase 1"
        items={[
          'Completed lessons and solved levels, with stars earned',
          'Topics to revisit, based on levels where you needed hints or the solution',
          'Your bookmarked lessons'
        ]}
      />
    </Page>
  )
}
