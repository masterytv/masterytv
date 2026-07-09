import LegacyForm from '@/components/legacy/LegacyForm';

export const metadata = {
    title: 'Legacy Letters | Archive — A Letter From Your Future Self',
    description:
        'Receive a deeply personal letter from your future self — 20 years from now, at the peak of everything you built. Backed by positive psychology.',
    openGraph: {
        title: 'Legacy Letters — Filed Without Origin',
        description:
            "What would the 65-year-old version of you say about today? Answer 6 questions. Meet your future self.",
        url: 'https://masterytv.com/legacy',
    },
};

export default function LegacyPage() {
    return (
        <main className="legacy-page" role="main">

            {/* ── Archive Header ── */}
            <header className="archive-header">
                <div>
                    <div className="archive-breadcrumb">
                        Unindexed Materials / Recovered Entries / Personal Fragment
                    </div>
                    <h1 className="archive-title">
                        Legacy Letters
                    </h1>
                </div>
                <div className="archive-meta">
                    Filed without origin.<br />
                    Referenced frequently,<br />
                    yet seldom cited in full.<br /><br />
                    {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </header>

            {/* ── Blue Folder Workspace ── */}
            <div className="workspace">

                {/* Folder Tabs */}
                <div className="folder-tabs" aria-hidden="true">
                    <div className="folder-tab folder-tab-red">Your Letter</div>
                    <div className="folder-tab folder-tab-blue">The Process</div>
                </div>

                {/* The Paper Document — contains the form */}
                <article className="paper">
                    <div className="punched-holes" aria-hidden="true">
                        <div className="hole" />
                        <div className="hole" />
                        <div className="hole" />
                    </div>

                    <div className="doc-label">Entry #01</div>

                    <h2 className="doc-title">Intake Form</h2>
                    <div className="doc-body">
                        <p style={{ marginBottom: '1.25rem', color: '#555', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Answer 6 questions. Meet your future self.
                        </p>
                        <LegacyForm />
                    </div>

                    {/* Pink Excerpt — floating paper scrap */}
                    <section className="paper-excerpt" aria-hidden="true">
                        <div className="doc-label">Ref #A</div>
                        <h2 className="doc-title">On the Record</h2>
                        <div className="doc-body">
                            <p>Backed by positive psychology research. Your answers generate a deeply personal letter from the version of you that made it.</p>
                        </div>
                    </section>

                    {/* Yellow Receipt */}
                    <section className="receipt" aria-hidden="true">
                        <strong>RECEIPT</strong><br /><br />
                        TO: You, 20 years from now<br />
                        TYPE: Legacy Letter<br />
                        -------------------<br />
                        STATUS: Awaiting entry<br />
                        FORMAT: Premium PDF
                    </section>
                </article>
            </div>

            {/* Footer */}
            <footer className="legacy-footer">
                <p>© {new Date().getFullYear()} MasteryTV. All rights reserved.</p>
            </footer>
        </main>
    );
}
