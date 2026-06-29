import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Float, Stars } from '@react-three/drei';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import Footer from '../components/Footer';
import {
  Phone, CheckCircle2, ArrowRight, Zap,
  Users, Mic, Clock, Shield, BarChart2
} from 'lucide-react';

/* ─────────────────────────────────────────
   COLOR TOKENS — Ocean Breeze Multicolor
───────────────────────────────────────── */
const C = {
  midnight: '#020D1A',
  oceanDeep: '#0A2540',
  oceanMid: '#0D3B6E',
  breeze: '#7FCDFF',
  breezeLight: '#DFF7FF',
  foam: '#F0FBFF',
  cream: '#FFFDF5',
  creamMid: '#FFF8E7',
  white: '#FFFFFF',
  textDark: '#0A2540',
  textMid: '#2D5986',
  textMuted: '#6B9AB8',
  liveGreen: '#00E5A0',
  purple: '#7C6DFA',
  warn: '#F59E0B',
  danger: '#EF4444',
};

/* ─────────────────────────────────────────
   GLOBAL STYLES (injected once)
───────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  @keyframes pulse-glow {
    0%,100% { opacity:1; transform:scale(1); box-shadow:0 0 8px currentColor; }
    50%      { opacity:.6; transform:scale(.85); box-shadow:0 0 18px currentColor; }
  }
  @keyframes marquee-left  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes float-y {
    0%,100% { transform:translateY(0px) }
    50%     { transform:translateY(-10px) }
  }
  @keyframes shimmer {
    0%   { background-position:-600px 0 }
    100% { background-position:600px 0 }
  }
  @keyframes spin-slow {
    from { transform:rotate(0deg) }
    to   { transform:rotate(360deg) }
  }

  .ib-card-hover {
    transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
  }
  .ib-card-hover:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 48px rgba(127,205,255,.15);
    border-color: ${C.breeze} !important;
  }
  .ib-link-hover {
    transition: color .15s, letter-spacing .15s;
  }
  .ib-link-hover:hover {
    color: ${C.breezeLight} !important;
    letter-spacing: -.01em;
  }

  /* reduced-motion: kill all animations */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }
`;

function InjectStyles() {
  useEffect(() => {
    const id = 'voxiq-inbound-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = GLOBAL_CSS;
      document.head.appendChild(s);
    }
  }, []);
  return null;
}

/* ─────────────────────────────────────────
   FRAMER MOTION VARIANTS
───────────────────────────────────────── */
const fadeUp = { hidden: { opacity: 0, y: 36 }, visible: { opacity: 1, y: 0, transition: { duration: .65, ease: [.22, 1, .36, 1] } } };
const fadeLeft = { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0, transition: { duration: .65, ease: [.22, 1, .36, 1] } } };
const fadeRight = { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0, transition: { duration: .65, ease: [.22, 1, .36, 1] } } };
const stagger = { visible: { transition: { staggerChildren: .12 } } };

function Reveal({ children, variant = fadeUp, delay = 0, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variant}
      transition={{ delay }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   3D — ANIMATED SPHERE (Hero)
───────────────────────────────────────── */
function OceanSphere() {
  const mesh = useRef();
  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += .004;
    mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * .3) * .15;
  });
  return (
    <Float speed={1.8} rotationIntensity={.4} floatIntensity={1.2}>
      <mesh ref={mesh} scale={2.4}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color="#0D3B6E"
          distort={0.35}
          speed={2}
          roughness={0.1}
          metalness={0.6}
          envMapIntensity={1}
        />
      </mesh>
      {/* Rim glow ring */}
      <mesh scale={2.52}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#7FCDFF"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>
    </Float>
  );
}

function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      style={{ background: 'transparent', position: 'absolute', inset: 0, pointerEvents: 'none' }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[4, 4, 4]} intensity={1.2} color="#7FCDFF" />
      <pointLight position={[-4, -2, -4]} intensity={.6} color="#0A2540" />
      <Stars radius={60} depth={30} count={400} factor={2} fade speed={.5} />
      <OceanSphere />
    </Canvas>
  );
}

/* ─────────────────────────────────────────
   3D — FLOATING TORUS RINGS (Features section)
───────────────────────────────────────── */
function RingPair() {
  const r1 = useRef(), r2 = useRef();
  useFrame((s) => {
    if (r1.current) { r1.current.rotation.x += .006; r1.current.rotation.y += .003; }
    if (r2.current) { r2.current.rotation.x -= .004; r2.current.rotation.z += .005; }
  });
  return (
    <>
      <mesh ref={r1}>
        <torusGeometry args={[1.6, .025, 16, 120]} />
        <meshStandardMaterial color="#7FCDFF" emissive="#7FCDFF" emissiveIntensity={.5} />
      </mesh>
      <mesh ref={r2}>
        <torusGeometry args={[2.3, .015, 16, 120]} />
        <meshStandardMaterial color="#DFF7FF" emissive="#DFF7FF" emissiveIntensity={.3} transparent opacity={.7} />
      </mesh>
    </>
  );
}

function RingsCanvas({ size = 320 }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      style={{ width: size, height: size, background: 'transparent', pointerEvents: 'none' }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={.2} />
      <pointLight position={[3, 3, 3]} intensity={1} color="#7FCDFF" />
      <RingPair />
    </Canvas>
  );
}

/* ─────────────────────────────────────────
   3D — WAVE GRID (How It Works section)
───────────────────────────────────────── */
function WaveGrid() {
  const mesh = useRef();
  const geo = useRef();

  useFrame((state) => {
    if (!geo.current) return;
    const t = state.clock.elapsedTime;
    const pos = geo.current.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = Math.sin(x * .7 + t * .9) * .25 + Math.sin(y * .5 + t * .7) * .2;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry ref={geo} args={[18, 18, 60, 60]} />
      <meshStandardMaterial
        color="#7FCDFF"
        wireframe
        transparent
        opacity={0.07}
      />
    </mesh>
  );
}

function WaveCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 4, 8], fov: 50 }}
      style={{ position: 'absolute', inset: 0, background: 'transparent', pointerEvents: 'none' }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={.4} />
      <pointLight position={[0, 4, 4]} intensity={1} color="#7FCDFF" />
      <WaveGrid />
    </Canvas>
  );
}

/* ─────────────────────────────────────────
   REUSABLE — SECTION HEADER
───────────────────────────────────────── */
function SectionHeader({ eyebrow, title, subtitle, dark = true, centered = true }) {
  const col = dark ? C.breezeLight : C.textDark;
  const sub = dark ? C.textMuted : C.textMid;
  const eye = dark ? C.breeze : C.oceanMid;
  return (
    <div style={{ textAlign: centered ? 'center' : 'left', marginBottom: '52px' }}>
      {eyebrow && (
        <span style={{
          display: 'inline-block',
          color: eye,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          marginBottom: '14px',
          padding: '5px 14px',
          borderRadius: '100px',
          background: dark ? 'rgba(127,205,255,.08)' : 'rgba(10,37,64,.06)',
          border: `1px solid ${dark ? 'rgba(127,205,255,.15)' : 'rgba(10,37,64,.1)'}`,
          fontFamily: "'Plus Jakarta Sans',sans-serif",
        }}>{eyebrow}</span>
      )}
      <h2 style={{
        fontFamily: "'Space Grotesk',sans-serif",
        fontSize: 'clamp(1.75rem,3vw,2.75rem)',
        fontWeight: 700,
        color: col,
        letterSpacing: '-.03em',
        lineHeight: 1.12,
        margin: '0 0 14px',
      }}>{title}</h2>
      {subtitle && (
        <p style={{
          fontSize: '1.05rem',
          color: sub,
          lineHeight: 1.75,
          maxWidth: '560px',
          margin: centered ? '0 auto' : '0',
          fontFamily: "'Plus Jakarta Sans',sans-serif",
        }}>{subtitle}</p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function InboundCalls() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const container = { maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(1.25rem,4vw,2.5rem)' };

  /* ── BENEFITS DATA ── */
  const benefits = [
    { icon: <Phone size={22} />, title: 'Smart Call Routing', desc: 'Route calls by rep, team, skill set, or time of day — fully automatic. Zero manual forwarding.' },
    { icon: <Users size={22} />, title: 'Call Queue Management', desc: 'Callers hear their position and wait time. No lost leads, no frustrated prospects hanging up.' },
    { icon: <Mic size={22} />, title: 'IVR Menu Builder', desc: 'Build "Press 1 for Sales" menus in minutes with a drag-and-drop builder. No dev required.' },
  ];

  /* ── USE CASES ── */
  const useCases = [
    { emoji: '💼', title: 'Sales teams receiving inbound demo requests', desc: 'Connect warm inbound prospects to the right AE before they lose interest.' },
    { emoji: '🎧', title: 'Support teams handling customer calls', desc: 'Dynamic queue routing preserves CSAT scores even on your busiest days.' },
    { emoji: '🏠', title: 'Real estate agents getting property inquiries', desc: 'Ensure every property enquiry reaches the active field agent instantly.' },
  ];

  /* ── RELATED FEATURES ── */
  const related = [
    { name: 'Outbound Calls', path: '/features/outbound-calls', color: C.breeze },
    { name: 'Call Recording', path: '/features/call-recording', color: C.liveGreen },
    { name: 'Analytics', path: '/features/analytics', color: C.purple },
  ];

  return (
    <>
      <InjectStyles />

      <div style={{ background: C.midnight, minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

        {/* ═══════════════════════════════════════════
            SECTION 1 — HERO  bg: midnight #020D1A
        ═══════════════════════════════════════════ */}
        <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', background: C.midnight }}>

          {/* 3D background — disabled on mobile for perf */}
          {!isMobile && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <HeroCanvas />
            </div>
          )}

          {/* Radial gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: `radial-gradient(ellipse 70% 55% at 65% 50%, rgba(127,205,255,.07), transparent 72%)`,
            pointerEvents: 'none',
          }} />

          {/* Content */}
          <div style={{ ...container, position: 'relative', zIndex: 10, width: '100%', paddingTop: '120px', paddingBottom: '80px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '55% 45%', gap: '48px', alignItems: 'center' }}>

              {/* LEFT */}
              <motion.div initial="hidden" animate="visible" variants={stagger}>

                {/* Live badge */}
                <motion.div variants={fadeUp} style={{ marginBottom: '22px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(127,205,255,.06)',
                    border: '1px solid rgba(127,205,255,.16)',
                    borderRadius: '100px', padding: '6px 16px',
                    color: C.breeze, fontSize: '12px', fontWeight: 600, letterSpacing: '.04em',
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', background: C.liveGreen,
                      boxShadow: `0 0 8px ${C.liveGreen}`,
                      animation: 'pulse-glow 2s infinite', display: 'inline-block',
                    }} />
                    INBOUND CALLS
                  </span>
                </motion.div>

                {/* H1 */}
                <motion.h1 variants={fadeUp} style={{
                  fontFamily: "'Space Grotesk',sans-serif",
                  fontSize: 'clamp(2.4rem,5.5vw,4.4rem)',
                  fontWeight: 700,
                  letterSpacing: '-.04em',
                  lineHeight: 1.0,
                  color: C.white,
                  margin: '0 0 22px',
                }}>
                  Never miss a call.{' '}
                  <span style={{
                    background: `linear-gradient(135deg, ${C.breeze}, ${C.breezeLight})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'inline',
                  }}>
                    Route every lead
                  </span>{' '}
                  to the right rep instantly.
                </motion.h1>

                {/* Subtext */}
                <motion.p variants={fadeUp} style={{
                  fontSize: '1.1rem', color: C.textMuted, lineHeight: 1.78,
                  maxWidth: '480px', margin: '0 0 34px',
                }}>
                  Voxiq's inbound system handles everything from the first ring — IVR menus, smart routing, live queues, and instant rep connection with full contact history.
                </motion.p>

                {/* Buttons */}
                <motion.div variants={fadeUp} style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '40px' }}>
                  <Link to="/signup" style={{
                    textDecoration: 'none',
                    background: `linear-gradient(135deg, ${C.breeze}, #5BB8F5)`,
                    color: C.midnight,
                    fontWeight: 700, fontSize: '15px',
                    padding: '14px 30px', borderRadius: '12px',
                    boxShadow: `0 0 24px rgba(127,205,255,.28), 0 8px 24px rgba(127,205,255,.18)`,
                    display: 'inline-block',
                    transition: 'all .2s',
                  }}>
                    Start Free Trial
                  </Link>
                  <button onClick={() => navigate('/pricing')} style={{
                    background: 'transparent',
                    color: C.textMuted,
                    border: '1px solid rgba(127,205,255,.16)',
                    fontSize: '15px', fontWeight: 500,
                    padding: '14px 28px', borderRadius: '12px',
                    cursor: 'pointer', transition: 'all .2s',
                  }}>
                    See Pricing
                  </button>
                </motion.div>

                {/* Micro stats */}
                <motion.div variants={fadeUp} style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  {[
                    { n: '< 3s', l: 'Avg pickup time' },
                    { n: '99.9%', l: 'Uptime SLA' },
                    { n: 'Unlimited', l: 'Concurrent calls' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{
                        fontFamily: "'Space Grotesk',sans-serif",
                        fontSize: '1.4rem', fontWeight: 800,
                        color: C.breeze, letterSpacing: '-.02em',
                      }}>{s.n}</span>
                      <span style={{ fontSize: '11px', color: C.textMid }}>{s.l}</span>
                    </div>
                  ))}
                </motion.div>

              </motion.div>

              {/* RIGHT — Floating UI Mockup over 3D */}
              {!isMobile && (
                <div style={{ position: 'relative', height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <motion.div
                    animate={{ y: [0, -12, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      background: 'rgba(7,24,40,.88)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(127,205,255,.15)',
                      borderRadius: '22px',
                      padding: '22px',
                      width: '300px',
                      boxShadow: `0 32px 64px rgba(0,0,0,.45), 0 0 0 1px rgba(127,205,255,.05), inset 0 1px 0 rgba(127,205,255,.1)`,
                      position: 'relative', zIndex: 10,
                    }}
                  >
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: C.liveGreen,
                        boxShadow: `0 0 8px ${C.liveGreen}`,
                        animation: 'pulse-glow 1.5s infinite',
                      }} />
                      <span style={{ fontSize: '10px', color: C.breeze, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                        Inbound Queue
                      </span>
                      <span style={{
                        marginLeft: 'auto', fontSize: '10px',
                        background: 'rgba(127,205,255,.1)',
                        border: '1px solid rgba(127,205,255,.18)',
                        color: C.breeze, padding: '2px 10px', borderRadius: '20px',
                      }}>3 waiting</span>
                    </div>

                    {/* Queue rows */}
                    {[
                      { id: '+1(512)***-1901', wait: '0:14', status: 'Connecting...', col: C.liveGreen },
                      { id: '+1(206)***-8822', wait: '0:48', status: 'On hold', col: C.warn },
                      { id: '+1(310)***-4411', wait: '1:02', status: 'On hold', col: C.warn },
                    ].map((row, i) => (
                      <div key={i} style={{
                        background: 'rgba(127,205,255,.04)',
                        border: '1px solid rgba(127,205,255,.08)',
                        borderRadius: '10px', padding: '10px 12px',
                        marginBottom: '8px',
                        display: 'flex', alignItems: 'center', gap: '10px',
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '8px',
                          background: `linear-gradient(135deg, ${C.oceanMid}, ${C.oceanDeep})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, color: C.breeze, flexShrink: 0,
                        }}>
                          <Phone size={13} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: C.breezeLight, marginBottom: '2px' }}>{row.id}</div>
                          <div style={{ fontSize: '10px', color: row.col }}>{row.status}</div>
                        </div>
                        <span style={{
                          fontFamily: "'Space Grotesk',sans-serif",
                          fontSize: '13px', fontWeight: 700,
                          color: row.col,
                        }}>{row.wait}</span>
                      </div>
                    ))}

                    {/* Bottom strip */}
                    <div style={{
                      marginTop: '12px', paddingTop: '10px',
                      borderTop: '1px solid rgba(127,205,255,.07)',
                      display: 'flex', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: '10px', color: C.textMid }}>Avg wait today</span>
                      <span style={{ fontSize: '10px', color: C.liveGreen, fontWeight: 700 }}>↓ 18s</span>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 2 — KEY BENEFITS  bg: #DFF7FF (light ocean)
        ═══════════════════════════════════════════ */}
        <section style={{ background: C.breezeLight, padding: '88px 0' }}>
          <div style={container}>
            <Reveal>
              <SectionHeader
                eyebrow="Key Benefits"
                title="Everything you need for inbound calling."
                subtitle="Voxiq routes, queues, and connects every inbound call — so your team focuses on conversations, not logistics."
                dark={false}
              />
            </Reveal>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '0px 0px -80px 0px' }}
              variants={stagger}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',
                gap: '20px',
              }}
            >
              {benefits.map((b, i) => (
                <motion.div key={i} variants={fadeUp} className="ib-card-hover" style={{
                  background: C.white,
                  border: `1px solid rgba(10,37,64,.1)`,
                  borderRadius: '18px', padding: '30px',
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '12px',
                    background: C.breezeLight,
                    border: `1px solid rgba(127,205,255,.5)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.oceanMid, marginBottom: '18px',
                  }}>
                    {b.icon}
                  </div>
                  <h3 style={{
                    fontFamily: "'Space Grotesk',sans-serif",
                    fontSize: '1.1rem', fontWeight: 700,
                    color: C.textDark, letterSpacing: '-.02em',
                    marginBottom: '10px',
                  }}>{b.title}</h3>
                  <p style={{ fontSize: '.9rem', color: C.textMid, lineHeight: 1.7, margin: 0 }}>{b.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 3 — HOW IT WORKS  bg: cream #FFFDF5
            with animated wave grid behind
        ═══════════════════════════════════════════ */}
        <section style={{ background: C.cream, padding: '88px 0', position: 'relative', overflow: 'hidden' }}>

          {/* Wave 3D — subtle in background */}
          {!isMobile && (
            <div style={{ position: 'absolute', inset: 0, opacity: .55, zIndex: 0 }}>
              <WaveCanvas />
            </div>
          )}

          <div style={{ ...container, position: 'relative', zIndex: 1 }}>
            <Reveal>
              <SectionHeader
                eyebrow="How It Works"
                title="Up and running in under 10 minutes."
                subtitle="No IT team. No complex PBX setup. Voxiq handles every inbound call from the first ring."
                dark={false}
              />
            </Reveal>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',
              gap: '24px',
              position: 'relative',
            }}>
              {/* Connector line on desktop */}
              {!isMobile && (
                <div style={{
                  position: 'absolute', top: '52px', left: '16.5%', right: '16.5%', height: '2px',
                  background: `linear-gradient(90deg, ${C.breeze}, ${C.oceanMid}, ${C.breeze})`,
                  opacity: .3, zIndex: 0,
                }} />
              )}

              {[
                {
                  num: '01', icon: <Phone size={20} />,
                  title: 'Prospect calls your Voxiq number',
                  desc: 'Your branded phone number rings through Voxiq. The caller is instantly in your inbound flow.',
                  badge: '< 1 second',
                },
                {
                  num: '02', icon: <Zap size={20} />,
                  title: 'IVR routes them to the right team',
                  desc: 'Keypress menus, skill-based routing, and round-robin distribution handle the rest automatically.',
                  badge: 'Automatic',
                },
                {
                  num: '03', icon: <BarChart2 size={20} />,
                  title: 'Rep answers — full context loaded',
                  desc: "The rep sees the caller's full CRM history, deal stage, and notes before they even say hello.",
                  badge: 'Immediate',
                },
              ].map((step, i) => (
                <Reveal key={i} delay={i * .12}>
                  <div className="ib-card-hover" style={{
                    background: C.white,
                    border: `1px solid rgba(10,37,64,.08)`,
                    borderRadius: '20px', padding: '28px',
                    position: 'relative', zIndex: 1,
                  }}>
                    <div style={{
                      fontFamily: "'Space Grotesk',sans-serif",
                      fontSize: '3.5rem', fontWeight: 800,
                      color: C.breezeLight, lineHeight: 1,
                      marginBottom: '-10px',
                    }}>{step.num}</div>

                    <div style={{
                      width: 44, height: 44, borderRadius: '12px',
                      background: C.breezeLight,
                      border: `1px solid rgba(127,205,255,.5)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.oceanMid, margin: '12px 0 14px',
                    }}>{step.icon}</div>

                    <h3 style={{
                      fontFamily: "'Space Grotesk',sans-serif",
                      fontSize: '1.05rem', fontWeight: 700,
                      color: C.textDark, letterSpacing: '-.01em',
                      marginBottom: '10px', lineHeight: 1.3,
                    }}>{step.title}</h3>
                    <p style={{ fontSize: '.875rem', color: C.textMid, lineHeight: 1.7, margin: '0 0 16px' }}>{step.desc}</p>

                    <span style={{
                      background: '#DCFCE7', color: '#166534',
                      fontSize: '11px', fontWeight: 700,
                      padding: '4px 12px', borderRadius: '20px',
                      display: 'inline-block',
                    }}>{step.badge}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 4 — FEATURE DEEP DIVE  bg: #0D3B6E (mid ocean)
            with rotating rings 3D decoration
        ═══════════════════════════════════════════ */}
        <section style={{ background: C.oceanMid, padding: '100px 0', position: 'relative', overflow: 'hidden' }}>

          {/* Rings 3D decoration top-right */}
          {!isMobile && (
            <div style={{ position: 'absolute', top: '-80px', right: '-80px', opacity: .2, zIndex: 0, pointerEvents: 'none' }}>
              <RingsCanvas size={400} />
            </div>
          )}

          <div style={{ ...container, position: 'relative', zIndex: 1 }}>
            <Reveal>
              <SectionHeader
                eyebrow="Deep Dive"
                title="Two features that change how your team works."
                dark={true}
              />
            </Reveal>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>

              {/* Block A — text left, mockup right */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '56px', alignItems: 'center',
              }}>
                <motion.div
                  initial="hidden" whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeLeft}
                >
                  <span style={{
                    display: 'inline-block', marginBottom: '12px',
                    background: 'rgba(127,205,255,.1)',
                    border: '1px solid rgba(127,205,255,.2)',
                    color: C.breeze, fontSize: '10px', fontWeight: 700,
                    letterSpacing: '.1em', padding: '4px 12px', borderRadius: '100px',
                  }}>ROUTING RULES</span>

                  <h2 style={{
                    fontFamily: "'Space Grotesk',sans-serif",
                    fontSize: 'clamp(1.5rem,2.8vw,2.2rem)',
                    fontWeight: 700, color: C.breezeLight,
                    letterSpacing: '-.025em', lineHeight: 1.15,
                    margin: '0 0 16px',
                  }}>
                    Set up smart routing rules in minutes
                  </h2>
                  <p style={{ fontSize: '1rem', color: 'rgba(127,205,255,.65)', lineHeight: 1.78, margin: '0 0 24px' }}>
                    Configure multi-layer routing logic visually — no code, no PBX specialist. Time-based rules, round-robin distribution, and agent fallbacks all live in one screen.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                    {[
                      'Time-based routing schedules (business hours, after-hours)',
                      'Round-robin and skill-based distribution',
                      'Overflow fallback to voicemail or backup team',
                      'Instant preview — test your routing before going live',
                    ].map((b, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          background: 'rgba(0,229,160,.1)',
                          border: `1px solid rgba(0,229,160,.25)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <CheckCircle2 size={10} color={C.liveGreen} />
                        </div>
                        <span style={{ fontSize: '.875rem', color: C.breeze, fontWeight: 500 }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial="hidden" whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeRight}
                >
                  <div style={{
                    background: 'rgba(2,13,26,.6)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(127,205,255,.12)',
                    borderRadius: '18px', padding: '24px',
                    boxShadow: '0 24px 48px rgba(0,0,0,.3)',
                  }}>
                    <div style={{
                      fontSize: '10px', color: C.breeze, fontWeight: 700,
                      letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '14px',
                    }}>Routing Rules Builder</div>

                    {[
                      { label: 'Time', val: '9 AM – 6 PM weekdays', color: C.liveGreen },
                      { label: 'Route', val: 'Round-robin → Sales Team', color: C.breeze },
                      { label: 'Fallback', val: 'Support voicemail + SMS notify', color: C.warn },
                    ].map((row, i) => (
                      <div key={i} style={{
                        background: 'rgba(127,205,255,.04)',
                        border: '1px solid rgba(127,205,255,.08)',
                        borderRadius: '10px', padding: '12px 14px',
                        marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'center',
                      }}>
                        <span style={{ fontSize: '10px', color: C.textMid, fontWeight: 700, width: '50px', flexShrink: 0 }}>{row.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: row.color, fontFamily: "'Space Grotesk',sans-serif" }}>{row.val}</span>
                      </div>
                    ))}

                    <div style={{
                      marginTop: '14px', padding: '10px 14px',
                      background: 'rgba(0,229,160,.06)',
                      border: '1px solid rgba(0,229,160,.15)',
                      borderRadius: '10px',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.liveGreen, display: 'inline-block' }} />
                      <span style={{ fontSize: '11px', color: C.liveGreen, fontWeight: 600 }}>Rule active — 847 calls routed today</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Block B — mockup left, text right */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '56px', alignItems: 'center',
              }}>
                <motion.div
                  initial="hidden" whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeLeft}
                  style={{ order: isMobile ? 1 : 0 }}
                >
                  <div style={{
                    background: 'rgba(2,13,26,.6)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(127,205,255,.12)',
                    borderRadius: '18px', padding: '24px',
                    boxShadow: '0 24px 48px rgba(0,0,0,.3)',
                  }}>
                    <div style={{
                      fontSize: '10px', color: C.breeze, fontWeight: 700,
                      letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '14px',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.liveGreen, animation: 'pulse-glow 1.5s infinite', display: 'inline-block' }} />
                      Live Queue Dashboard
                    </div>

                    {/* Queue header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      {[
                        { l: 'Waiting', v: '3', c: C.warn },
                        { l: 'Avg wait', v: '38s', c: C.breeze },
                        { l: 'Handled today', v: '124', c: C.liveGreen },
                      ].map((s, i) => (
                        <div key={i} style={{
                          background: 'rgba(127,205,255,.04)',
                          border: '1px solid rgba(127,205,255,.08)',
                          borderRadius: '10px', padding: '10px', textAlign: 'center',
                        }}>
                          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.2rem', fontWeight: 800, color: s.c }}>{s.v}</div>
                          <div style={{ fontSize: '10px', color: C.textMid, marginTop: '3px' }}>{s.l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Queue rows */}
                    {[
                      { id: '+1(512)***-1901', wait: '0:14', status: 'Connecting', col: C.liveGreen },
                      { id: '+1(206)***-8822', wait: '0:48', status: 'On hold', col: C.warn },
                      { id: '+1(310)***-4411', wait: '1:02', status: 'On hold', col: C.warn },
                    ].map((row, i) => (
                      <div key={i} style={{
                        background: 'rgba(127,205,255,.03)',
                        border: '1px solid rgba(127,205,255,.07)',
                        borderRadius: '8px', padding: '9px 12px',
                        marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px',
                      }}>
                        <Phone size={12} color={C.textMuted} />
                        <span style={{ flex: 1, fontSize: '11px', color: C.breezeLight }}>{row.id}</span>
                        <span style={{ fontSize: '10px', color: row.col, fontWeight: 600 }}>{row.status}</span>
                        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '12px', fontWeight: 700, color: row.col }}>{row.wait}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial="hidden" whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeRight}
                  style={{ order: isMobile ? 0 : 1 }}
                >
                  <span style={{
                    display: 'inline-block', marginBottom: '12px',
                    background: 'rgba(127,205,255,.1)',
                    border: '1px solid rgba(127,205,255,.2)',
                    color: C.breeze, fontSize: '10px', fontWeight: 700,
                    letterSpacing: '.1em', padding: '4px 12px', borderRadius: '100px',
                  }}>QUEUE VISIBILITY</span>

                  <h2 style={{
                    fontFamily: "'Space Grotesk',sans-serif",
                    fontSize: 'clamp(1.5rem,2.8vw,2.2rem)',
                    fontWeight: 700, color: C.breezeLight,
                    letterSpacing: '-.025em', lineHeight: 1.15,
                    margin: '0 0 16px',
                  }}>
                    Real-time queue visibility for every manager
                  </h2>
                  <p style={{ fontSize: '1rem', color: 'rgba(127,205,255,.65)', lineHeight: 1.78, margin: '0 0 24px' }}>
                    See exactly who's waiting, how long they've waited, and which rep is handling each call — all from a live dashboard that updates every second.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                    {[
                      'Live caller count with wait-time thresholds',
                      'Per-rep call status — active, available, on break',
                      'Automatic overflow when wait exceeds your threshold',
                      'Manager alerts when queue depth spikes',
                    ].map((b, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          background: 'rgba(0,229,160,.1)',
                          border: `1px solid rgba(0,229,160,.25)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <CheckCircle2 size={10} color={C.liveGreen} />
                        </div>
                        <span style={{ fontSize: '.875rem', color: C.breeze, fontWeight: 500 }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 5 — USE CASES  bg: #F0FBFF (ocean foam)
        ═══════════════════════════════════════════ */}
        <section style={{ background: C.foam, padding: '88px 0' }}>
          <div style={container}>
            <Reveal>
              <SectionHeader
                eyebrow="Use Cases"
                title="Built for every inbound scenario."
                dark={false}
              />
            </Reveal>

            <motion.div
              initial="hidden" whileInView="visible"
              viewport={{ once: true }} variants={stagger}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',
                gap: '20px',
              }}
            >
              {useCases.map((uc, i) => (
                <motion.div key={i} variants={fadeUp} className="ib-card-hover" style={{
                  background: C.white,
                  border: `1px solid rgba(10,37,64,.08)`,
                  borderRadius: '18px', padding: '28px',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '14px' }}>{uc.emoji}</div>
                  <h3 style={{
                    fontFamily: "'Space Grotesk',sans-serif",
                    fontSize: '1.05rem', fontWeight: 700,
                    color: C.textDark, letterSpacing: '-.01em',
                    marginBottom: '10px', lineHeight: 1.35,
                  }}>{uc.title}</h3>
                  <p style={{ fontSize: '.875rem', color: C.textMid, lineHeight: 1.7, margin: 0 }}>{uc.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 6 — RELATED FEATURES  bg: white #FFFFFF
        ═══════════════════════════════════════════ */}
        <section style={{ background: C.white, padding: '60px 0', borderTop: `1px solid rgba(10,37,64,.07)` }}>
          <div style={container}>
            <Reveal>
              <p style={{
                fontSize: '10px', fontWeight: 700, color: C.textMuted,
                textTransform: 'uppercase', letterSpacing: '.12em',
                marginBottom: '20px',
              }}>Related Features</p>
            </Reveal>
            <motion.div
              initial="hidden" whileInView="visible"
              viewport={{ once: true }} variants={stagger}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',
                gap: '16px',
              }}
            >
              {related.map((rf, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <Link to={rf.path} style={{
                    background: C.white,
                    border: `1.5px solid rgba(10,37,64,.09)`,
                    borderRadius: '14px', padding: '18px 22px',
                    textDecoration: 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'all .2s',
                  }}
                    className="ib-card-hover"
                  >
                    <span style={{
                      fontFamily: "'Space Grotesk',sans-serif",
                      fontSize: '1rem', fontWeight: 700, color: C.textDark,
                    }}>{rf.name}</span>
                    <ArrowRight size={16} color={rf.color} />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 7 — FINAL CTA  bg: gradient ocean deep
        ═══════════════════════════════════════════ */}
        <section style={{
          background: `linear-gradient(135deg, ${C.oceanDeep} 0%, ${C.oceanMid} 50%, ${C.oceanDeep} 100%)`,
          padding: '100px 0', textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          {/* Rings decoration behind CTA */}
          {!isMobile && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: .08, zIndex: 0, pointerEvents: 'none' }}>
              <RingsCanvas size={600} />
            </div>
          )}

          <div style={{ ...container, position: 'relative', zIndex: 1 }}>
            <Reveal>
              <span style={{
                display: 'inline-block', marginBottom: '16px',
                color: 'rgba(127,205,255,.5)',
                fontSize: '10px', fontWeight: 700,
                letterSpacing: '.15em', textTransform: 'uppercase',
              }}>GET STARTED TODAY</span>

              <h2 style={{
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: 'clamp(2rem,4vw,3.5rem)',
                fontWeight: 700, color: C.white,
                letterSpacing: '-.035em', lineHeight: 1.1,
                margin: '0 0 14px',
              }}>
                Scale your inbound team today.
              </h2>
              <p style={{
                fontSize: '1.1rem', color: 'rgba(127,205,255,.5)',
                marginBottom: '36px', maxWidth: '480px', margin: '0 auto 36px',
              }}>
                14-day free trial. No credit card required. Full access from day one.
              </p>

              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '28px' }}>
                <Link to="/signup" style={{
                  textDecoration: 'none',
                  background: `linear-gradient(135deg, ${C.breeze}, #5BB8F5)`,
                  color: C.midnight, fontWeight: 800, fontSize: '15px',
                  padding: '15px 34px', borderRadius: '12px',
                  boxShadow: `0 0 32px rgba(127,205,255,.3), 0 8px 24px rgba(127,205,255,.2)`,
                  display: 'inline-block', transition: 'all .2s',
                }}>
                  Start Free Trial — It's Free
                </Link>
                <button onClick={() => navigate('/how-it-works')} style={{
                  background: 'transparent',
                  border: '1px solid rgba(127,205,255,.2)',
                  color: C.breeze, fontWeight: 500, fontSize: '15px',
                  padding: '15px 28px', borderRadius: '12px',
                  cursor: 'pointer', transition: 'all .2s',
                }}>
                  See How It Works
                </button>
              </div>

              {/* Trust signals */}
              <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {['✓ No credit card', '✓ 14-day free trial', '✓ Cancel anytime'].map((t, i) => (
                  <span key={i} style={{ fontSize: '12px', color: 'rgba(127,205,255,.4)', fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}