import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion, useInView } from 'framer-motion';
import Footer from '../components/Footer';
import { CheckCircle2, ArrowRight, Gauge, Timer, Users, Zap } from 'lucide-react';

const C = {
  midnight: '#020D1A', oceanDeep: '#0A2540', oceanMid: '#0D3B6E',
  breeze: '#7FCDFF', breezeLight: '#DFF7FF', foam: '#F0FBFF',
  cream: '#FFFDF5', white: '#FFFFFF',
  textDark: '#0A2540', textMid: '#2D5986', textMuted: '#6B9AB8',
  liveGreen: '#00E5A0', warn: '#F59E0B',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  @keyframes pulse-glow { 0%,100%{opacity:1;box-shadow:0 0 8px currentColor}50%{opacity:.5;box-shadow:0 0 18px currentColor} }
  @keyframes spin-ring { from{transform:translateY(-50%) rotate(0deg)} to{transform:translateY(-50%) rotate(360deg)} }
  @keyframes counter-ring { from{transform:translateY(-50%) rotate(0deg)} to{transform:translateY(-50%) rotate(-360deg)} }
  .ad-hover { transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease; }
  .ad-hover:hover { transform:translateY(-5px);box-shadow:0 18px 40px rgba(10,37,64,.1);border-color:#7FCDFF!important; }
`;

const wrap = { maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(1.25rem,4vw,2.5rem)' };
const fadeUp = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: .55, ease: [.22, 1, .36, 1] } } };
const stagger = { visible: { transition: { staggerChildren: .1 } } };

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -50px 0px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} transition={{ delay }}>
      {children}
    </motion.div>
  );
}

function SectionHead({ eye, title, sub, dark = true }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '44px' }}>
      {eye && <span style={{
        display: 'inline-block', marginBottom: '12px', padding: '5px 14px',
        borderRadius: '100px', fontSize: '10px', fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase',
        color: dark ? '#7FCDFF' : '#0D3B6E',
        background: dark ? 'rgba(127,205,255,.08)' : 'rgba(10,37,64,.06)',
        border: dark ? '1px solid rgba(127,205,255,.15)' : '1px solid rgba(10,37,64,.1)',
      }}>{eye}</span>}
      <h2 style={{
        fontFamily: "'Space Grotesk',sans-serif",
        fontSize: 'clamp(1.7rem,3vw,2.5rem)', fontWeight: 700,
        letterSpacing: '-.03em', lineHeight: 1.12,
        color: dark ? '#DFF7FF' : '#0A2540', margin: '0 0 12px',
      }}>{title}</h2>
      {sub && <p style={{ fontSize: '1rem', color: dark ? '#6B9AB8' : '#2D5986', lineHeight: 1.75, maxWidth: '500px', margin: '0 auto' }}>{sub}</p>}
    </div>
  );
}

function Bullet({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <div style={{ width: 17, height: 17, borderRadius: '50%', flexShrink: 0, background: 'rgba(0,229,160,.1)', border: '1px solid rgba(0,229,160,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle2 size={9} color="#00E5A0" />
      </div>
      <span style={{ fontSize: '.875rem', color: '#7FCDFF', fontWeight: 500 }}>{text}</span>
    </div>
  );
}

function SpinTorus() {
  const m = useRef();
  useFrame(() => { if (m.current) { m.current.rotation.x += .006; m.current.rotation.y += .004; } });
  return (
    <mesh ref={m} scale={1.6}>
      <torusGeometry args={[1, .04, 12, 80]} />
      <meshStandardMaterial color="#7FCDFF" wireframe transparent opacity={.4} />
    </mesh>
  );
}

const mockBase = {
  background: 'rgba(2,13,26,.75)', backdropFilter: 'blur(10px)',
  border: '1px solid rgba(127,205,255,.12)', borderRadius: '18px', padding: '22px',
  boxShadow: '0 24px 48px rgba(0,0,0,.3)',
};

export default function AutoDialer() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    fn(); window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    const id = 'ad-css';
    if (!document.getElementById(id)) {
      const s = document.createElement('style'); s.id = id; s.textContent = css;
      document.head.appendChild(s);
    }
  }, []);

  const benefits = [
    { icon: <Gauge size={20} />, title: 'Answering Machine Detection', desc: 'Detects voicemail in under a second. Drops your pre-recorded message and moves on instantly.' },
    { icon: <Timer size={20} />, title: 'Configurable Dial Speed', desc: 'Set wait time between calls. Go aggressive or give reps breathing room — your pace.' },
    { icon: <Users size={20} />, title: 'Pause & Resume Anytime', desc: 'Reps pause mid-session for notes or a break. Pick up exactly where they left off.' },
  ];

  const steps = [
    { n: '01', title: 'Load your list, set dial speed', desc: 'Import CSV or sync from GHL. Set your threshold and go.', badge: 'Under 2 min' },
    { n: '02', title: 'Voxiq dials — you connect on live answers', desc: 'AMD filters voicemails. Reps only hear "hello" — never dead air or machines.', badge: 'Automatic' },
    { n: '03', title: 'Call ends — next dial starts immediately', desc: 'Zero gap. Zero clicking. Already on next call before CRM finishes logging.', badge: '< 1 second' },
  ];

  const grid2 = { display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: '52px', alignItems: 'center' };

  return (
    <div style={{ background: C.midnight, minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

      {/* ══ HERO — CREAM #FFFDF5 ══ */}
      <section style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', overflow: 'hidden', background: '#FFFDF5' }}>

        {!mobile && ['180px', '280px', '380px'].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', top: '50%', right: '8%',
            width: s, height: s, borderRadius: '50%',
            border: `1px solid rgba(10,37,64,${.1 - i * .025})`,
            animation: `${i % 2 === 0 ? 'spin-ring' : 'counter-ring'} ${18 + i * 8}s linear infinite`,
            pointerEvents: 'none', zIndex: 0,
          }} />
        ))}

        {!mobile && (
          <div style={{
            position: 'absolute', top: '50%', right: 'calc(8% + 190px)',
            transform: 'translate(50%,-50%)',
            width: 10, height: 10, borderRadius: '50%',
            background: C.oceanMid, boxShadow: `0 0 20px ${C.oceanMid}`,
            zIndex: 1, pointerEvents: 'none',
          }} />
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 30% 50%, rgba(10,37,64,.04), transparent 70%)', pointerEvents: 'none', zIndex: 1 }} />

        <div style={{ ...wrap, position: 'relative', zIndex: 10, width: '100%', paddingTop: '120px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: mobile ? '100%' : '58%' }}>
            <motion.div initial="hidden" animate="visible" variants={stagger}>

              <motion.div variants={fadeUp} style={{ marginBottom: '20px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(10,37,64,.06)', border: '1px solid rgba(10,37,64,.14)',
                  borderRadius: '100px', padding: '6px 16px', color: C.oceanMid, fontSize: '12px', fontWeight: 700,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.liveGreen, boxShadow: `0 0 8px ${C.liveGreen}`, animation: 'pulse-glow 2s infinite', display: 'inline-block' }} />
                  AUTO DIALER
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} style={{
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: 'clamp(2.6rem,5.5vw,4.5rem)', fontWeight: 700,
                letterSpacing: '-.04em', lineHeight: 1.02, color: C.textDark, margin: '0 0 20px',
              }}>
                Your reps talk.{' '}
                <span style={{ background: `linear-gradient(135deg,${C.oceanMid},${C.breeze})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Voxiq dials.
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} style={{ fontSize: '1.1rem', color: C.textMid, lineHeight: 1.78, maxWidth: '480px', margin: '0 0 32px' }}>
                Let Voxiq handle the dialing completely. Reps get connected the moment someone picks up — no waiting, no clicking, no dead air.
              </motion.p>

              <motion.div variants={fadeUp} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '44px' }}>
                <Link to="/signup" style={{
                  textDecoration: 'none', fontWeight: 700, fontSize: '15px',
                  padding: '13px 28px', borderRadius: '12px', display: 'inline-block',
                  background: `linear-gradient(135deg,${C.oceanMid},${C.oceanDeep})`,
                  color: C.white, boxShadow: '0 8px 24px rgba(10,37,64,.2)',
                }}>Start Free Trial</Link>
                <button onClick={() => navigate('/pricing')} style={{
                  background: 'transparent', color: C.textMid,
                  border: '1px solid rgba(10,37,64,.2)', fontSize: '15px',
                  padding: '13px 26px', borderRadius: '12px', cursor: 'pointer',
                }}>See Pricing</button>
              </motion.div>

              <motion.div variants={fadeUp} style={{ display: 'flex', gap: '0', flexWrap: 'wrap', borderTop: '1px solid rgba(10,37,64,.08)', paddingTop: '28px' }}>
                {[['300', 'calls/day per rep'], ['< 1s', 'skip unanswered'], ['AMD', 'voicemail detection']].map(([n, l], i) => (
                  <div key={i} style={{ paddingRight: '28px', marginRight: '28px', borderRight: i < 2 ? '1px solid rgba(10,37,64,.08)' : 'none' }}>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.5rem', fontWeight: 800, color: C.oceanMid }}>{n}</div>
                    <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '3px' }}>{l}</div>
                  </div>
                ))}
              </motion.div>

            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ BENEFITS — light ocean ══ */}
      <section style={{ background: C.breezeLight, padding: '80px 0' }}>
        <div style={wrap}>
          <Reveal><SectionHead eye="Key Benefits" title="Built for reps who can't afford to slow down." dark={false} /></Reveal>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: '18px' }}>
            {benefits.map((b, i) => (
              <motion.div key={i} variants={fadeUp} className="ad-hover" style={{ background: C.white, border: '1px solid rgba(10,37,64,.09)', borderRadius: '18px', padding: '28px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: C.breezeLight, border: '1px solid rgba(127,205,255,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.oceanMid, marginBottom: '16px' }}>{b.icon}</div>
                <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.05rem', fontWeight: 700, color: C.textDark, marginBottom: '8px' }}>{b.title}</h3>
                <p style={{ fontSize: '.875rem', color: C.textMid, lineHeight: 1.7, margin: 0 }}>{b.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ HOW IT WORKS — cream ══ */}
      <section style={{ background: C.cream, padding: '80px 0' }}>
        <div style={wrap}>
          <Reveal><SectionHead eye="How It Works" title="Zero clicks. Maximum calls." dark={false} /></Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: '18px' }}>
            {steps.map((s, i) => (
              <Reveal key={i} delay={i * .1}>
                <div className="ad-hover" style={{ background: C.white, border: '1px solid rgba(10,37,64,.08)', borderRadius: '20px', padding: '26px' }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '3.2rem', fontWeight: 800, color: C.breezeLight, lineHeight: 1, marginBottom: '-6px' }}>{s.n}</div>
                  <div style={{ width: 40, height: 40, borderRadius: '11px', background: C.breezeLight, border: '1px solid rgba(127,205,255,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.oceanMid, margin: '10px 0 12px' }}><Zap size={18} /></div>
                  <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1rem', fontWeight: 700, color: C.textDark, marginBottom: '8px', lineHeight: 1.3 }}>{s.title}</h3>
                  <p style={{ fontSize: '.85rem', color: C.textMid, lineHeight: 1.7, margin: '0 0 14px' }}>{s.desc}</p>
                  <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>{s.badge}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DEEP DIVE — mid ocean ══ */}
      <section style={{ background: C.oceanMid, padding: '88px 0', position: 'relative', overflow: 'hidden' }}>
        {!mobile && (
          <div style={{ position: 'absolute', top: '50%', right: '-40px', transform: 'translateY(-50%)', opacity: .12, pointerEvents: 'none', zIndex: 0 }}>
            <Canvas camera={{ position: [0, 0, 4], fov: 50 }} style={{ width: 260, height: 260, background: 'transparent' }} gl={{ alpha: true }}>
              <ambientLight intensity={.3} /><pointLight position={[3, 3, 3]} intensity={1} color="#7FCDFF" />
              <SpinTorus />
            </Canvas>
          </div>
        )}

        <div style={{ ...wrap, position: 'relative', zIndex: 1 }}>
          <Reveal><SectionHead eye="Deep Dive" title="AMD + Campaign setup — how it actually works." /></Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '64px' }}>

            <div style={grid2}>
              <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .55 }}>
                <span style={{ display: 'inline-block', marginBottom: '10px', background: 'rgba(127,205,255,.1)', border: '1px solid rgba(127,205,255,.2)', color: C.breeze, fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', padding: '4px 12px', borderRadius: '100px' }}>AMD SYSTEM</span>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(1.5rem,2.8vw,2.1rem)', fontWeight: 700, color: C.breezeLight, letterSpacing: '-.025em', lineHeight: 1.15, margin: '0 0 14px' }}>
                  Answering machine detection — under 1 second
                </h2>
                <p style={{ fontSize: '1rem', color: 'rgba(127,205,255,.6)', lineHeight: 1.78, margin: '0 0 20px' }}>
                  Voxiq's AMD listens for voicemail beeps and recorded greetings. When detected, it instantly drops your pre-recorded message and dials the next contact.
                </p>
                {['Detects live answer vs voicemail in < 1 second', 'Auto-drops pre-recorded VM template instantly', 'Moves to next contact before VM finishes playing', '147 avg VM bypasses per rep per day'].map((t, i) => <Bullet key={i} text={t} />)}
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .55 }}>
                <div style={mockBase}>
                  <div style={{ fontSize: '10px', color: C.warn, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.liveGreen, display: 'inline-block' }} />
                    AMD PANEL — Live
                  </div>
                  {[{ label: 'Status', val: 'Voicemail Detected', c: C.warn }, { label: 'Action', val: 'Dropping VM Template…', c: C.breeze }, { label: 'Next', val: 'Auto-advancing in 1s', c: C.liveGreen }].map(({ label, val, c }, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(127,205,255,.04)', border: '1px solid rgba(127,205,255,.07)', borderRadius: '8px', marginBottom: '7px' }}>
                      <span style={{ fontSize: '11px', color: C.textMid }}>{label}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: c }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(0,229,160,.07)', border: '1px solid rgba(0,229,160,.15)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: C.textMid }}>VMs bypassed today</span>
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 800, color: C.liveGreen }}>147</span>
                  </div>
                </div>
              </motion.div>
            </div>

            <div style={{ ...grid2, direction: mobile ? 'ltr' : 'rtl' }}>
              <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .55 }} style={{ direction: 'ltr' }}>
                <div style={mockBase}>
                  <div style={{ fontSize: '10px', color: C.breeze, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '14px' }}>Campaign Setup</div>
                  {[{ label: 'Dial ratio', val: '2 calls per agent', c: C.liveGreen }, { label: 'Local presence', val: 'Auto-match area code', c: C.liveGreen }, { label: 'AMD action', val: 'Drop "Alex Intro" VM', c: C.breeze }, { label: 'Dial speed', val: '2s between contacts', c: C.breeze }, { label: 'List source', val: 'CRM pipeline sync', c: C.breeze }].map(({ label, val, c }, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'rgba(127,205,255,.04)', border: '1px solid rgba(127,205,255,.07)', borderRadius: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: C.textMid }}>{label}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: c }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: '12px', background: `linear-gradient(135deg,${C.breeze},#5BB8F5)`, borderRadius: '10px', padding: '11px', textAlign: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: C.midnight }}>▶ Campaign Ready — Launch</span>
                  </div>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .55 }} style={{ direction: 'ltr' }}>
                <span style={{ display: 'inline-block', marginBottom: '10px', background: 'rgba(127,205,255,.1)', border: '1px solid rgba(127,205,255,.2)', color: C.breeze, fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', padding: '4px 12px', borderRadius: '100px' }}>CAMPAIGN SETUP</span>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(1.5rem,2.8vw,2.1rem)', fontWeight: 700, color: C.breezeLight, letterSpacing: '-.025em', lineHeight: 1.15, margin: '0 0 14px' }}>
                  First campaign live in under 5 minutes
                </h2>
                <p style={{ fontSize: '1rem', color: 'rgba(127,205,255,.6)', lineHeight: 1.78, margin: '0 0 20px' }}>
                  Configure dial ratio, local presence caller ID pools, AMD drop files, and list source in one screen. No IT required.
                </p>
                {['Set dial ratio and speed per campaign', 'Map local presence caller IDs automatically', 'Choose VM template per campaign segment', 'Go live in one click — pause or stop anytime'].map((t, i) => <Bullet key={i} text={t} />)}
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ RELATED — white ══ */}
      <section style={{ background: C.white, padding: '52px 0', borderTop: '1px solid rgba(10,37,64,.07)' }}>
        <div style={wrap}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '18px' }}>Related Features</p>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: '14px' }}>
            {[['Outbound Calls', '/features/outbound-calls', C.breeze], ['Manual Dialer', '/features/manual-dialer', C.liveGreen], ['Analytics', '/features/analytics', C.oceanMid]].map(([n, p, c], i) => (
              <Link key={i} to={p} className="ad-hover" style={{ background: C.white, border: '1.5px solid rgba(10,37,64,.09)', borderRadius: '14px', padding: '17px 22px', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1rem', fontWeight: 700, color: C.textDark }}>{n}</span>
                <ArrowRight size={15} color={c} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA — ocean gradient ══ */}
      <section style={{ background: `linear-gradient(135deg,${C.oceanDeep},${C.oceanMid},${C.oceanDeep})`, padding: '80px 0', textAlign: 'center' }}>
        <div style={wrap}>
          <Reveal>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(127,205,255,.4)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '14px' }}>GET STARTED</p>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 700, color: C.white, letterSpacing: '-.03em', margin: '0 0 14px' }}>
              300 calls a day. Starting now.
            </h2>
            <p style={{ fontSize: '1rem', color: 'rgba(127,205,255,.4)', maxWidth: '400px', margin: '0 auto 28px' }}>14-day free trial. No credit card. Cancel anytime.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
              <Link to="/signup" style={{ textDecoration: 'none', fontWeight: 800, fontSize: '15px', padding: '13px 30px', borderRadius: '12px', display: 'inline-block', background: `linear-gradient(135deg,${C.breeze},#5BB8F5)`, color: C.midnight, boxShadow: '0 0 28px rgba(127,205,255,.28)' }}>Start Free Trial</Link>
              <button onClick={() => navigate('/how-it-works')} style={{ background: 'transparent', border: '1px solid rgba(127,205,255,.2)', color: C.breeze, fontSize: '15px', padding: '13px 24px', borderRadius: '12px', cursor: 'pointer' }}>See How It Works</button>
            </div>
            <div style={{ display: 'flex', gap: '18px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {['✓ No credit card', '✓ 14-day free trial', '✓ Cancel anytime'].map((t, i) => (
                <span key={i} style={{ fontSize: '12px', color: 'rgba(127,205,255,.35)', fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}