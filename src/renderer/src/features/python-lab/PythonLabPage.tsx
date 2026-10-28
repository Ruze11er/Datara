import { ComingSoon, Page } from '../../components/Page'

export default function PythonLabPage() {
  return (
    <Page title="Python Lab" subtitle="Practise Python and pandas on data-analysis tasks.">
      <ComingSoon
        phase="Phase 2"
        items={[
          'Python chapters 1–3: variables, lists and dictionaries, conditions and loops',
          'Pandas chapters later: filtering, grouping and cleaning DataFrames',
          'Runs offline in a sandbox; the Python engine already works (see Settings → Engine check)'
        ]}
      />
    </Page>
  )
}
