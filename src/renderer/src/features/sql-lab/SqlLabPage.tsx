import { ComingSoon, Page } from '../../components/Page'

export default function SqlLabPage() {
  return (
    <Page title="SQL Lab" subtitle="Answer business questions with SQL on a sample online-store database.">
      <ComingSoon
        phase="Phase 1"
        items={[
          'Chapters 1–3 (30 levels): SELECT, filtering, sorting and aggregates',
          'SQL editor, table browser, Run and Check buttons, and a results table',
          'Answer checking that accepts any correct query, with step-by-step hints',
          'Chapter-based unlocking: finish a chapter to open the next one'
        ]}
      />
    </Page>
  )
}
