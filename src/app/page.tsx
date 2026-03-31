import EmailForm from '@/components/EmailForm';

// Deterministic star positions — avoids hydration mismatch vs Math.random()
const STARS = [
    { top: '8%', left: '15%', size: 1.5, duration: '5s', delay: '0s' },
    { top: '12%', left: '72%', size: 2, duration: '4s', delay: '1.2s' },
    { top: '22%', left: '45%', size: 1, duration: '6s', delay: '0.5s' },
    { top: '18%', left: '88%', size: 1.5, duration: '3.5s', delay: '2s' },
    { top: '35%', left: '8%', size: 2, duration: '5.5s', delay: '0.8s' },
    { top: '42%', left: '52%', size: 1, duration: '4.5s', delay: '1.5s' },
    { top: '55%', left: '30%', size: 1.5, duration: '6s', delay: '0.3s' },
    { top: '60%', left: '78%', size: 2, duration: '4s', delay: '2.5s' },
    { top: '68%', left: '20%', size: 1, duration: '5s', delay: '1s' },
    { top: '75%', left: '60%', size: 1.5, duration: '3.8s', delay: '0.7s' },
    { top: '82%', left: '42%', size: 2, duration: '5.2s', delay: '1.8s' },
    { top: '88%', left: '85%', size: 1, duration: '4.2s', delay: '0.2s' },
    { top: '5%', left: '35%', size: 1, duration: '6.5s', delay: '1.3s' },
    { top: '30%', left: '92%', size: 1.5, duration: '4.8s', delay: '0.6s' },
    { top: '48%', left: '5%', size: 2, duration: '5.8s', delay: '2.2s' },
    { top: '90%', left: '12%', size: 1, duration: '4.3s', delay: '1.1s' },
    { top: '15%', left: '55%', size: 1.5, duration: '5.3s', delay: '0.9s' },
    { top: '72%', left: '38%', size: 1, duration: '6.2s', delay: '1.7s' },
    { top: '95%', left: '65%', size: 1.5, duration: '4.6s', delay: '0.4s' },
    { top: '38%', left: '68%', size: 2, duration: '5.7s', delay: '2.8s' },
];

export default function Home() {
    return (
        <main className="page" role="main">
            {/* Background star field */}
            <div className="stars" aria-hidden="true">
                {STARS.map((star, i) => (
                    <span
                        key={i}
                        className="star"
                        style={{
                            top: star.top,
                            left: star.left,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            ['--duration' as string]: star.duration,
                            ['--delay' as string]: star.delay,
                        }}
                    />
                ))}
            </div>

            {/* Main message — above the planet */}
            <div className="content">
                <h1 className="heading">Something Big is Coming</h1>
                <p className="brand">
                    <span className="brand-accent">MasteryTV</span>
                </p>
                <EmailForm />
            </div>

            {/* Glowing orb — the centrepiece */}
            <div className="orb-container" aria-hidden="true">
                <div className="orb-haze" />
                <div className="orb-glow" />
                <div className="orb" />
                <div className="orb-horizon" />
            </div>

            {/* Footer */}
            <footer className="footer">
                <p className="footer-text">
                    © {new Date().getFullYear()} MasteryTV. All rights reserved.
                </p>
            </footer>
        </main>
    );
}
