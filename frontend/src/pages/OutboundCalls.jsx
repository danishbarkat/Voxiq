/**
 * OutboundCalls.jsx — Voxiq Feature Page
 * Ocean Breeze Multicolor Theme + 3D Animations
 * Requires: three @react-three/fiber @react-three/drei framer-motion
 * Reuses 3D components from InboundCalls pattern
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, MeshDistortMaterial } from '@react-three/drei';
import { motion, useInView } from 'framer-motion';
import * as THREE from 'three';
import Footer from '../components/Footer';
import { PhoneOutgoing, CheckCircle2, ArrowRight, Zap, MapPin, Mic, BarChart2 } from 'lucide-react';

/* ── TOKENS ── */
const C = {
  midnight: '#020D1A', oceanDeep: '#0A2540', oceanMid: '#0D3B6E',
  breeze: '#7FCDFF', breezeLight: '#DFF7FF', foam: '#F0FBFF',
  cream: '#FFFDF5', white: '#FFFFFF',
  textDark: '#0A2540', textMid: '#2D5986', textMuted: '#6B9AB8',
  liveGreen: '#00E5A0', warn: '#F59E0B',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  @keyframes pulse-glow { 0%,100%{opacity:1;box-shadow:0 0 8px currentColor} 50%{opacity:.5;box-shadow:0 0 18px currentColor} }
  .ob-hover { transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease; }
  .ob-hover:hover { transform:translateY(-6px); box-shadow:0 20px 40px rgba(127,205,255,.14); border-color:${C.breeze} !important; }
`;

/* ── SHARED HELPERS ── */
const wrap = { maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(1.25rem,4vw,2.5rem)' };
const fadeUp = { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: .6, ease: [.22, 1, .36, 1] } } };
const stagger = { visible: { transition: { staggerChildren: .11 } } };

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'}
      variants={fadeUp} transition={{ delay }}>
      {children}
    </motion.div>
  );
}

function SectionHead({ eye, title, sub, dark = true }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '48px' }}>
      {eye && <span style={{
        display: 'inline-block', marginBottom: '12px', padding: '5px 14px',
        borderRadius: '100px', fontSize: '10px', fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase',
        color: dark ? C.breeze : C.oceanMid,
        background: dark ? 'rgba(127,205,255,.08)' : 'rgba(10,37,64,.06)',
        border: `1px solid ${dark ? 'rgba(127,205,255,.15)' : 'rgba(10,37,64,.1)'}`,
      }}>{eye}</span>}
      <h2 style={{
        fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(1.7rem,3vw,2.6rem)',
        fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.12,
        color: dark ? C.breezeLight : C.textDark, margin: '0 0 12px',
      }}>{title}</h2>
      {sub && <p style={{ fontSize: '1rem', color: dark ? C.textMuted : C.textMid, lineHeight: 1.75, maxWidth: '520px', margin: '0 auto' }}>{sub}</p>}
    </div>
  );
}

/* ── 3D: OUTBOUND SPHERE (orange-tinted for differentiation) ── */
function OutboundSphere() {
  const mesh = useRef();
  useFrame(s => {
    if (!mesh.current) return;
    mesh.current.rotation.y += .005;
    mesh.current.rotation.z = Math.sin(s.clock.elapsedTime * .4) * .1;
  });
  return (
    <Float speed={2} floatIntensity={1.4} rotationIntensity={.3}>
      <mesh ref={mesh} scale={2.2}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial color="#0A2540" distort={.4} speed={2.5} roughness={.1} metalness={.7} />
      </mesh>
      {/* outer glow shell */}
      <mesh scale={2.34}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#7FCDFF" transparent opacity={.05} side={THREE.BackSide} />
      </mesh>
    </Float>
  );
}

/* ── 3D: SPINNING DIAMOND (feature section decoration) ── */
function SpinDiamond() {
  const mesh = useRef();
  useFrame(() => { if (mesh.current) { mesh.current.rotation.y += .008; mesh.current.rotation.x += .003; } });
  return (
    <mesh ref={mesh} scale={1.4}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#7FCDFF" wireframe transparent opacity={.35} />
    </mesh>
  );
}

/* ── BULLET ROW ── */
function Bullet({ text, dark = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(0,229,160,.1)', border: '1px solid rgba(0,229,160,.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CheckCircle2 size={10} color={C.liveGreen} />
      </div>
      <span style={{ fontSize: '.875rem', color: dark ? C.breeze : C.textMid, fontWeight: 500 }}>{text}</span>
    </div>
  );
}

/* ── MAIN ── */
export default function OutboundCalls() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    fn(); window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    const id = 'ob-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style'); s.id = id; s.textContent = css;
      document.head.appendChild(s);
    }
  }, []);

  const benefits = [
    { icon: <Zap size={20} />, title: 'Power Auto Dialer', desc: 'Auto-advances the moment a call ends. Zero dead time between conversations.' },
    { icon: <MapPin size={20} />, title: 'Local Presence Dialing', desc: 'Match the area code of every prospect — dramatically higher pickup rates.' },
    { icon: <Mic size={20} />, title: 'One-Click Voicemail Drop', desc: 'Pre-record it once. Drop in 2 seconds. Move to the next call immediately.' },
  ];

  const steps = [
    { n: '01', title: 'Load your list or sync from CRM', desc: 'Import CSV or pull directly from GHL in seconds.' },
    { n: '02', title: 'Hit Start — Voxiq dials for you', desc: 'Auto-dialer works through your list. You stay focused, Voxiq handles the clicks.' },
    { n: '03', title: 'You connect the moment they answer', desc: 'No ringing gaps. No missed picks. You hear "hello" and you\'re in the conversation.' },
  ];

  const useCases = [
    { e: '🎯', title: 'SDR outbound prospecting', desc: 'Hit 190+ dials per day. Auto-log every outcome.' },
    { e: '🏠', title: 'Real estate lead follow-up', desc: 'Call your entire farm list before noon. Voicemail drop on every no-answer.' },
    { e: '🛡️', title: 'Insurance renewal outreach', desc: 'Work through renewal lists 5x faster with TCPA-compliant dialing.' },
  ];

  const grid2 = { display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: '52px', alignItems: 'center' };
  const mockBase = {
    background: 'rgba(2,13,26,.7)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(127,205,255,.12)', borderRadius: '18px', padding: '22px',
    boxShadow: '0 24px 48px rgba(0,0,0,.35)',
  };

  return (
    <div style={{ background: C.midnight, minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

      {/* ══ HERO ══ */}
      <section style={{ 
        padding: '180px 0 80px', 
        position: 'relative', 
        overflow: 'hidden', 
        background: C.midnight, 
        display: 'flex', 
        alignItems: 'center' 
      }}>

        {/* Background Image */}
        <img 
          src="/Outbound call..png" 
          alt="Background" 
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 12%',
            zIndex: 1,
            top: 0,
            left: 0,
            pointerEvents: 'none'
          }}
        />

        {/* Gradient Overlay */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(rgba(2, 13, 26, 0.4), rgba(2, 13, 26, 0.4)), radial-gradient(ellipse 70% 60% at 60% 50%, rgba(127,205,255,0.06), transparent 70%)', 
          zIndex: 2, 
          pointerEvents: 'none' 
        }} />

        <div style={{ ...wrap, position: 'relative', zIndex: 10, width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '55% 45%', gap: '48px', alignItems: 'center' }}>

            {/* LEFT */}
            <motion.div initial="hidden" animate="visible" variants={stagger}>

              <motion.div variants={fadeUp} style={{ marginBottom: '20px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(127,205,255,.06)', border: '1px solid rgba(127,205,255,.16)',
                  borderRadius: '100px', padding: '6px 16px', color: C.breeze, fontSize: '12px', fontWeight: 600,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.liveGreen, animation: 'pulse-glow 2s infinite', display: 'inline-block' }} />
                  OUTBOUND CALLS
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} style={{
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: 'clamp(2.4rem,5.5vw,4.2rem)', fontWeight: 700,
                letterSpacing: '-.04em', lineHeight: 1.02, color: C.white, margin: '0 0 20px',
              }}>
                Dial more prospects.{' '}
                <span style={{ background: `linear-gradient(135deg,${C.breeze},${C.breezeLight})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Book more meetings.
                </span>{' '}
                Less effort.
              </motion.h1>

              <motion.p variants={fadeUp} style={{ fontSize: '1.05rem', color: C.textMuted, lineHeight: 1.78, maxWidth: '460px', margin: '0 0 32px' }}>
                Voxiq's outbound dialer auto-advances through your list so every rep spends time in conversations — not clicking, not waiting.
              </motion.p>

              <motion.div variants={fadeUp} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
                <Link to="/signup" style={{
                  textDecoration: 'none', fontWeight: 700, fontSize: '15px',
                  padding: '13px 28px', borderRadius: '12px', display: 'inline-block',
                  background: `linear-gradient(135deg,${C.breeze},#5BB8F5)`, color: C.midnight,
                  boxShadow: `0 0 24px rgba(127,205,255,.28), 0 8px 24px rgba(127,205,255,.18)`,
                }}>Start Free Trial</Link>
                <button onClick={() => navigate('/pricing')} style={{
                  background: 'transparent', color: C.textMuted,
                  border: '1px solid rgba(127,205,255,.16)', fontSize: '15px',
                  padding: '13px 26px', borderRadius: '12px', cursor: 'pointer',
                }}>See Pricing</button>
              </motion.div>

              {/* Stats */}
              <motion.div variants={fadeUp} style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {[['3x', 'More calls/rep'], ['300', 'Calls/day'], ['< 2s', 'Voicemail drop']].map(([n, l], i) => (
                  <div key={i}>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: C.breeze }}>{n}</div>
                    <div style={{ fontSize: '11px', color: C.textMid, marginTop: '3px' }}>{l}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* RIGHT — Empty right column so text stays on the left */}
            {!mobile && <div />}
          </div>

          {/* RIGHT CARD - ABSOLUTELY POSITIONED AT BOTTOM RIGHT */}
          {!mobile && (
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(10,37,64,0.1)',
                borderRadius: '22px',
                padding: '22px',
                width: '300px',
                boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
                position: 'absolute',
                bottom: '20px',
                right: '40px',
                zIndex: 10
              }}
            >
              {/* header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', animation: 'pulse-glow 1.8s infinite', display: 'inline-block' }} />
                <span style={{ fontSize: '10px', color: '#0D3B6E', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>Auto Dialing...</span>
                <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'rgba(13,59,110,0.08)', border: '1px solid rgba(13,59,110,0.15)', color: '#0D3B6E', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>14 left</span>
              </div>

              {/* Contact card */}
              <div style={{ background: '#F8FAFC', border: '1px solid rgba(10,37,64,0.05)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #7FCDFF, #0D3B6E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', color: '#FFFFFF', flexShrink: 0 }}>SJ</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0A2540' }}>Sarah Jenkins</div>
                    <div style={{ fontSize: '10px', color: '#64748B' }}>VP Sales · NovaCRM</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['+1(555)923-4412', 'San Francisco, CA'].map((t, i) => (
                    <span key={i} style={{ fontSize: '10px', background: 'rgba(13,59,110,0.06)', border: '1px solid rgba(13,59,110,0.1)', color: '#64748B', padding: '3px 8px', borderRadius: '20px' }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Timer */}
              <div style={{ background: '#F8FAFC', border: '1px solid rgba(10,37,64,0.05)', borderRadius: '10px', padding: '12px', textAlign: 'center', marginBottom: '12px' }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '28px', fontWeight: 800, color: '#10B981', letterSpacing: '-.03em' }}>0:42</div>
                <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>Connected</div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '7px' }}>
                {[
                  { l: '🔇 Mute', s: { background: 'rgba(13,59,110,0.06)', border: '1px solid rgba(13,59,110,0.12)', color: '#0D3B6E' } },
                  { l: '💬 Whisper', s: { background: 'rgba(13,59,110,0.06)', border: '1px solid rgba(13,59,110,0.12)', color: '#0D3B6E' } },
                  { l: '✕ End', s: { background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#EF4444' } },
                ].map((b, i) => (
                  <div key={i} style={{ ...b.s, borderRadius: '8px', padding: '8px', fontSize: '10px', fontWeight: 600, textAlign: 'center', cursor: 'pointer' }}>{b.l}</div>
                ))}
              </div>

              {/* VM drop strip */}
              <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#64748B' }}>Voicemail drop ready</span>
                <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 700 }}>Drop ↓</span>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ══ BENEFITS — light ocean #DFF7FF ══ */}
      <section style={{ background: C.breezeLight, padding: '80px 0' }}>
        <div style={wrap}>
          <Reveal><SectionHead eye="Key Benefits" title="Everything your reps need to dial at scale." dark={false} /></Reveal>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: '18px' }}>
            {benefits.map((b, i) => (
              <motion.div key={i} variants={fadeUp} className="ob-hover" style={{
                background: C.white, border: '1px solid rgba(10,37,64,.09)', borderRadius: '18px', padding: '28px',
              }}>
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: C.breezeLight, border: '1px solid rgba(127,205,255,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.oceanMid, marginBottom: '16px' }}>{b.icon}</div>
                <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.05rem', fontWeight: 700, color: C.textDark, marginBottom: '8px' }}>{b.title}</h3>
                <p style={{ fontSize: '.875rem', color: C.textMid, lineHeight: 1.7, margin: 0 }}>{b.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ HOW IT WORKS — cream #FFFDF5 ══ */}
      <section style={{ background: C.cream, padding: '80px 0' }}>
        <div style={wrap}>
          <Reveal><SectionHead eye="How It Works" title="From list to connected call in seconds." dark={false} /></Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: '20px' }}>
            {steps.map((s, i) => (
              <Reveal key={i} delay={i * .1}>
                <div className="ob-hover" style={{ background: C.white, border: '1px solid rgba(10,37,64,.08)', borderRadius: '20px', padding: '26px' }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '3.2rem', fontWeight: 800, color: C.breezeLight, lineHeight: 1, marginBottom: '-8px' }}>{s.n}</div>
                  <div style={{ width: 40, height: 40, borderRadius: '11px', background: C.breezeLight, border: '1px solid rgba(127,205,255,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.oceanMid, margin: '10px 0 12px' }}>
                    <PhoneOutgoing size={18} />
                  </div>
                  <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1rem', fontWeight: 700, color: C.textDark, marginBottom: '8px', lineHeight: 1.3 }}>{s.title}</h3>
                  <p style={{ fontSize: '.85rem', color: C.textMid, lineHeight: 1.7, margin: '0 0 14px' }}>{s.desc}</p>
                  <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>
                    {['Instant sync', 'Auto-start', '< 1 second'][i]}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DEEP DIVE — mid ocean #0D3B6E ══ */}
      <section style={{ background: C.oceanMid, padding: '88px 0', position: 'relative', overflow: 'hidden' }}>

        {/* 3D decoration */}
        {!mobile && (
          <div style={{ position: 'absolute', top: '50%', right: '-60px', transform: 'translateY(-50%)', opacity: .12, pointerEvents: 'none', zIndex: 0 }}>
            <Canvas camera={{ position: [0, 0, 4], fov: 50 }} style={{ width: 280, height: 280, background: 'transparent' }} gl={{ alpha: true }}>
              <ambientLight intensity={.3} /><pointLight position={[3, 3, 3]} intensity={1} color="#7FCDFF" />
              <SpinDiamond />
            </Canvas>
          </div>
        )}

        <div style={{ ...wrap, position: 'relative', zIndex: 1 }}>
          <Reveal><SectionHead eye="Deep Dive" title="Two features that change the game." /></Reveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '72px' }}>

            {/* Block A */}
            <div style={grid2}>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: { opacity: 0, x: -36 }, visible: { opacity: 1, x: 0, transition: { duration: .6 } } }}>
                <span style={{ display: 'inline-block', marginBottom: '10px', background: 'rgba(127,205,255,.1)', border: '1px solid rgba(127,205,255,.2)', color: C.breeze, fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', padding: '4px 12px', borderRadius: '100px' }}>DIALER MODES</span>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(1.5rem,2.8vw,2.1rem)', fontWeight: 700, color: C.breezeLight, letterSpacing: '-.025em', lineHeight: 1.15, margin: '0 0 14px' }}>
                  Auto or manual — switch any time
                </h2>
                <p style={{ fontSize: '1rem', color: 'rgba(127,205,255,.6)', lineHeight: 1.78, margin: '0 0 20px' }}>
                  Auto mode works through your list hands-free. Manual mode gives reps time to research before dialing. Switch between them mid-session without losing your place.
                </p>
                {['Auto-advance with zero gaps between calls', 'Manual click-to-dial with full contact preview', 'Switch modes mid-session — no restart required', 'Configurable dial speed and wait thresholds'].map((t, i) => <Bullet key={i} text={t} />)}
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: { opacity: 0, x: 36 }, visible: { opacity: 1, x: 0, transition: { duration: .6 } } }}>
                <div style={mockBase}>
                  <div style={{ fontSize: '10px', color: C.breeze, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '14px' }}>Dialer Mode Selector</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                    {[
                      { label: 'Auto Mode', active: true, sub: '300 calls/day' },
                      { label: 'Manual Mode', active: false, sub: 'Full context' },
                    ].map((m, i) => (
                      <div key={i} style={{
                        padding: '14px 12px', borderRadius: '10px', textAlign: 'center',
                        background: m.active ? `linear-gradient(135deg,${C.breeze},#5BB8F5)` : 'rgba(127,205,255,.04)',
                        border: m.active ? 'none' : '1px solid rgba(127,205,255,.1)',
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: m.active ? C.midnight : C.breeze }}>{m.label}</div>
                        <div style={{ fontSize: '10px', color: m.active ? C.oceanDeep : C.textMid, marginTop: '4px' }}>{m.sub}</div>
                      </div>
                    ))}
                  </div>
                  {[['Dial speed', '2s between calls'], ['Local presence', 'ON — matching area codes'], ['VM detection', 'Auto-drop enabled']].map(([k, v], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: 'rgba(127,205,255,.04)', border: '1px solid rgba(127,205,255,.07)', borderRadius: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: C.textMid }}>{k}</span>
                      <span style={{ fontSize: '11px', color: C.liveGreen, fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Block B */}
            <div style={{ ...grid2, direction: mobile ? 'ltr' : 'rtl' }}>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: { opacity: 0, x: 36 }, visible: { opacity: 1, x: 0, transition: { duration: .6 } } }} style={{ direction: 'ltr' }}>
                <div style={mockBase}>
                  <div style={{ fontSize: '10px', color: C.warn, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.warn, display: 'inline-block' }} />
                    Answering Machine Detected
                  </div>
                  <div style={{ background: 'rgba(127,205,255,.04)', border: '1px solid rgba(127,205,255,.08)', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: C.textMid, marginBottom: '8px' }}>VM Template Selected:</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.breezeLight, marginBottom: '4px' }}>"Hey it's Alex from Voxiq..."</div>
                    <div style={{ fontSize: '10px', color: C.textMid }}>Duration: 0:18s · Recorded 3 days ago</div>
                  </div>
                  <div style={{ background: `linear-gradient(135deg,${C.liveGreen},#00C488)`, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.midnight }}>✓ Voicemail Dropped</div>
                    <div style={{ fontSize: '10px', color: 'rgba(2,13,26,.6)', marginTop: '3px' }}>Auto-advancing in 1s...</div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: { opacity: 0, x: -36 }, visible: { opacity: 1, x: 0, transition: { duration: .6 } } }} style={{ direction: 'ltr' }}>
                <span style={{ display: 'inline-block', marginBottom: '10px', background: 'rgba(127,205,255,.1)', border: '1px solid rgba(127,205,255,.2)', color: C.breeze, fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', padding: '4px 12px', borderRadius: '100px' }}>VOICEMAIL DROP</span>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(1.5rem,2.8vw,2.1rem)', fontWeight: 700, color: C.breezeLight, letterSpacing: '-.025em', lineHeight: 1.15, margin: '0 0 14px' }}>
                  Voicemail drop saves 4 hours per rep per day
                </h2>
                <p style={{ fontSize: '1rem', color: 'rgba(127,205,255,.6)', lineHeight: 1.78, margin: '0 0 20px' }}>
                  Record once. Drop in 2 seconds. Voxiq detects answering machines automatically and drops your pre-recorded message — then auto-advances before the beep even finishes.
                </p>
                {['Answering machine detection built-in', 'One-click drop in under 2 seconds', 'Multiple VM templates per campaign', 'Auto-advance immediately after drop'].map((t, i) => <Bullet key={i} text={t} />)}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ USE CASES — ocean foam #F0FBFF ══ */}
      <section style={{ background: C.foam, padding: '80px 0' }}>
        <div style={wrap}>
          <Reveal><SectionHead eye="Use Cases" title="Who dials more with Voxiq." dark={false} /></Reveal>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: '18px' }}>
            {useCases.map((u, i) => (
              <motion.div key={i} variants={fadeUp} className="ob-hover" style={{ background: C.white, border: '1px solid rgba(10,37,64,.08)', borderRadius: '18px', padding: '26px' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>{u.e}</div>
                <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1rem', fontWeight: 700, color: C.textDark, marginBottom: '8px', lineHeight: 1.35 }}>{u.title}</h3>
                <p style={{ fontSize: '.85rem', color: C.textMid, lineHeight: 1.7, margin: 0 }}>{u.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ RELATED — white ══ */}
      <section style={{ background: C.white, padding: '56px 0', borderTop: '1px solid rgba(10,37,64,.07)' }}>
        <div style={wrap}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '18px' }}>Related Features</p>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: '14px' }}>
            {[['Auto Dialer', '/features/auto-dialer', C.breeze], ['Manual Dialer', '/features/manual-dialer', C.liveGreen], ['Analytics', '/features/analytics', C.oceanMid]].map(([n, p, c], i) => (
              <Link key={i} to={p} className="ob-hover" style={{
                background: C.white, border: '1.5px solid rgba(10,37,64,.09)', borderRadius: '14px',
                padding: '17px 22px', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1rem', fontWeight: 700, color: C.textDark }}>{n}</span>
                <ArrowRight size={15} color={c} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA — ocean gradient ══ */}
      <section style={{ background: `linear-gradient(135deg,${C.oceanDeep},${C.oceanMid},${C.oceanDeep})`, padding: '88px 0', textAlign: 'center' }}>
        <div style={wrap}>
          <Reveal>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(127,205,255,.45)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '14px' }}>GET STARTED TODAY</p>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 700, color: C.white, letterSpacing: '-.035em', lineHeight: 1.1, margin: '0 0 14px' }}>
              Scale your outbound team today.
            </h2>
            <p style={{ fontSize: '1rem', color: 'rgba(127,205,255,.45)', maxWidth: '440px', margin: '0 auto 32px' }}>
              14-day free trial. No credit card. Full access from day one.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
              <Link to="/signup" style={{
                textDecoration: 'none', fontWeight: 800, fontSize: '15px',
                padding: '14px 32px', borderRadius: '12px', display: 'inline-block',
                background: `linear-gradient(135deg,${C.breeze},#5BB8F5)`, color: C.midnight,
                boxShadow: `0 0 32px rgba(127,205,255,.3)`,
              }}>Start Free Trial — It's Free</Link>
              <button onClick={() => navigate('/how-it-works')} style={{
                background: 'transparent', border: '1px solid rgba(127,205,255,.2)',
                color: C.breeze, fontSize: '15px', padding: '14px 26px',
                borderRadius: '12px', cursor: 'pointer',
              }}>See How It Works</button>
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {['✓ No credit card', '✓ 14-day free trial', '✓ Cancel anytime'].map((t, i) => (
                <span key={i} style={{ fontSize: '12px', color: 'rgba(127,205,255,.38)', fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}