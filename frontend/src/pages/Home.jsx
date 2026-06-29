import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, MessageSquare, Bot, BarChart2, Link as LinkIcon,
  Check, ChevronRight, ArrowRight, Play
} from 'lucide-react';

// ─── Lazy-load 3D components (disabled on mobile) ───────────────────────────
const FloatingOrb = lazy(() => import('../components/3d/FloatingOrb'));
const WaveBackground = lazy(() => import('../components/3d/WaveBackground'));
const FloatingCards = lazy(() => import('../components/3d/FloatingCards'));
const RotatingRing = lazy(() => import('../components/3d/RotatingRing'));
const ParticleField = lazy(() => import('../components/3d/ParticleField'));

// ─── Hooks ───────────────────────────────────────────────────────────────────
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 768 : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

function useSectionReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useCountUp(target, duration = 2000, isVisible = false) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!isVisible || started.current) return;
    started.current = true;
    const isFloat = String(target).includes('.');
    const numericTarget = parseFloat(String(target).replace(/[^0-9.]/g, ''));
    const suffix = String(target).replace(/[0-9.]/g, '');
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = numericTarget * ease;
      setCount(isFloat ? current.toFixed(1) : Math.floor(current));
      if (progress < 1) requestAnimationFrame(tick);
      else setCount(String(target));
    };
    requestAnimationFrame(tick);
  }, [isVisible, target, duration]);
  return count;
}

// ─── Reusable section reveal wrapper ─────────────────────────────────────────
function Reveal({ children, delay = 0, direction = 'up' }) {
  const [ref, visible] = useSectionReveal();
  const initial = direction === 'left' ? { opacity: 0, x: -40, y: 0 }
    : direction === 'right' ? { opacity: 0, x: 40, y: 0 }
    : { opacity: 0, x: 0, y: 32 };
  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={visible ? { opacity: 1, x: 0, y: 0 } : initial}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ number, label, sublabel, color, delay }) {
  const [ref, visible] = useSectionReveal(0.3);
  const count = useCountUp(number, 2000, visible);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay }}
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(10,37,64,0.08)',
        borderRadius: '16px',
        padding: '28px 24px',
        textAlign: 'center',
        transition: 'all 0.2s',
        cursor: 'default',
      }}
      whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(10,37,64,0.1)', borderColor: 'rgba(127,205,255,0.4)' }}
    >
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '48px',
        fontWeight: 800,
        letterSpacing: '-0.04em',
        color,
        lineHeight: 1,
      }}>{count}</div>
      <div style={{ fontSize: '14px', color: '#6B9AB8', marginTop: '6px', fontWeight: 500 }}>{label}</div>
      <div style={{
        background: '#DFF7FF',
        color: '#0A2540',
        fontSize: '10px',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '20px',
        marginTop: '8px',
        display: 'inline-block',
      }}>{sublabel}</div>
    </motion.div>
  );
}

// ─── MARQUEE ROW ─────────────────────────────────────────────────────────────
function MarqueeRow({ items, direction = 'left', speed = '35s' }) {
  const doubled = [...items, ...items];
  const [paused, setPaused] = useState(false);
  return (
    <div style={{ overflow: 'hidden', width: '100%', maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)' }}>
      <div
        className={`marquee-track ${direction}${paused ? ' marquee-track-paused' : ''}`}
        style={{ animationDuration: speed }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {doubled.map((name, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(127,205,255,0.04)',
              border: '1px solid rgba(127,205,255,0.1)',
              borderRadius: '10px',
              padding: '10px 24px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#2D5986',
              letterSpacing: '-0.2px',
              minWidth: '130px',
              textAlign: 'center',
              margin: '0 8px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(127,205,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(127,205,255,0.2)';
              e.currentTarget.style.color = '#7FCDFF';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(127,205,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(127,205,255,0.1)';
              e.currentTarget.style.color = '#2D5986';
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TESTIMONIAL CARD ─────────────────────────────────────────────────────────
function TestimonialCard({ quote, badge, name, role, initials, delay }) {
  return (
    <Reveal delay={delay}>
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(127,205,255,0.2)',
          borderRadius: '20px',
          padding: '28px',
          transition: 'all 0.2s',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#7FCDFF';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(127,205,255,0.12)';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(127,205,255,0.2)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ fontSize: '48px', color: '#DFF7FF', lineHeight: 1, marginBottom: '12px', fontFamily: 'Georgia, serif' }}>❝</div>
        <p style={{ fontSize: '15px', color: '#0A2540', lineHeight: 1.75, fontStyle: 'italic', marginBottom: '16px', flex: 1 }}>{quote}</p>
        <div style={{ background: '#DFF7FF', color: '#0A2540', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', display: 'inline-block', marginBottom: '16px' }}>{badge}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #7FCDFF, #0A2540)', color: 'white', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
          <div>
            <div style={{ fontWeight: 600, color: '#0A2540', fontSize: 14 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#6B9AB8' }}>{role}</div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

// ─── BULLET ITEM ─────────────────────────────────────────────────────────────
function Bullet({ text, dark = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: dark ? 'rgba(0,229,160,0.1)' : '#DFF7FF',
        border: dark ? '1px solid rgba(0,229,160,0.2)' : '1px solid #7FCDFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: dark ? '#00E5A0' : '#0A2540', fontSize: 11,
      }}>✓</div>
      <span style={{ fontSize: 14, color: dark ? '#7FCDFF' : '#2D5986', fontWeight: 500, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

// ─── PRODUCT TABS DATA ────────────────────────────────────────────────────────
const TABS = [
  {
    id: 'calling', label: 'Calling', icon: <Phone size={14} />,
    tag: 'CALLING', tagBg: '#DFF7FF', tagColor: '#0A2540',
    title: 'Inbound. Outbound. Auto. Manual. All in one.',
    desc: 'Whether running inbound support or high-volume outbound, Voxiq handles every call scenario your team faces.',
    bullets: ['Inbound call routing with IVR and smart queues', 'Outbound power dialer — auto or manual mode', 'Local presence dialing — match area codes', 'Voicemail drop in one click', 'Call recording with searchable transcripts'],
    mockup: (
      <div style={{ padding: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(127,205,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E5A0', display: 'inline-block', boxShadow: '0 0 8px #00E5A0' }} />
            <span style={{ color: '#7FCDFF', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em' }}>LIVE CALL FLOOR</span>
          </div>
          <span style={{ background: 'rgba(127,205,255,0.08)', border: '1px solid rgba(127,205,255,0.15)', color: '#7FCDFF', fontSize: 10, padding: '2px 10px', borderRadius: 20 }}>8 Active</span>
        </div>
        {[
          { name: 'Sarah Jenkins', company: 'VP Sales · NovaCRM', time: '2:34', color: '#00E5A0' },
          { name: 'Marcus Cole', company: 'Head of Sales · TechFlow', time: '0:47', color: '#7FCDFF' },
          { name: 'Priya Nair', company: 'Account Exec · DialerHQ', time: '5:12', color: '#7C6DFA' },
        ].map((rep, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: 10, background: 'rgba(127,205,255,0.03)', border: '1px solid rgba(127,205,255,0.06)', marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7FCDFF, #0A2540)', color: 'white', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{rep.name.split(' ').map(n => n[0]).join('')}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#DFF7FF', fontSize: 12, fontWeight: 600 }}>{rep.name}</div>
              <div style={{ color: '#2D5986', fontSize: 10 }}>{rep.company}</div>
            </div>
            <div style={{ color: rep.color, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 800 }}>{rep.time}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'messaging', label: 'Messaging', icon: <MessageSquare size={14} />,
    tag: 'MESSAGING', tagBg: '#FFF8E7', tagColor: '#92400E',
    title: 'SMS + WhatsApp. One unified inbox.',
    desc: 'Follow up on every call with a text or WhatsApp message — automatically or manually triggered.',
    bullets: ['Two-way SMS with full conversation history', 'WhatsApp Business API integration', 'Auto follow-up sequences after missed calls', 'Shared team inbox with assignment rules', 'Canned reply templates for fast responses'],
    mockup: (
      <div style={{ padding: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(127,205,255,0.1)' }}>
          <span style={{ color: '#7FCDFF', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em' }}>UNIFIED INBOX</span>
          <span style={{ background: 'rgba(127,205,255,0.08)', border: '1px solid rgba(127,205,255,0.15)', color: '#7FCDFF', fontSize: 10, padding: '2px 10px', borderRadius: 20 }}>12 unread</span>
        </div>
        {[
          { name: 'James R.', msg: 'Hey, still interested in the demo you mentioned...', time: '2m', channel: 'SMS' },
          { name: 'Emily T.', msg: 'Can we reschedule to Thursday afternoon?', time: '15m', channel: 'WA' },
          { name: 'David K.', msg: 'Loved the product overview! Sending it to my CEO', time: '1h', channel: 'SMS' },
        ].map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '10px', borderRadius: 10, background: i === 0 ? 'rgba(127,205,255,0.06)' : 'transparent', border: i === 0 ? '1px solid rgba(127,205,255,0.1)' : '1px solid transparent', marginBottom: 6, cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7FCDFF, #0A2540)', color: 'white', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{msg.name[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: '#DFF7FF', fontSize: 12, fontWeight: 600 }}>{msg.name}</span>
                <span style={{ color: '#2D5986', fontSize: 10 }}>{msg.time}</span>
              </div>
              <div style={{ color: '#6B9AB8', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.msg}</div>
            </div>
            <span style={{ background: msg.channel === 'WA' ? 'rgba(0,229,160,0.1)' : 'rgba(127,205,255,0.1)', color: msg.channel === 'WA' ? '#00E5A0' : '#7FCDFF', fontSize: 9, padding: '2px 6px', borderRadius: 10, flexShrink: 0, alignSelf: 'flex-start' }}>{msg.channel}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'ai-agent', label: 'AI Agent', icon: <Bot size={14} />, badge: 'NEW',
    tag: 'AI AGENT', tagBg: '#DCFCE7', tagColor: '#166534',
    title: 'An AI rep that calls leads 24/7.',
    desc: 'New lead? AI Agent calls them in 60 seconds, qualifies their needs, asks the right questions, and books the meeting.',
    bullets: ['Calls new leads within 60 seconds of form fill', 'Natural voice — sounds human, not robotic', 'Asks qualifying questions from your script', 'Auto-books meetings via Calendly or GHL', 'Hands off to human rep when qualified'],
    mockup: (
      <div style={{ padding: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(127,205,255,0.1)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E5A0', display: 'inline-block', animation: 'pulse-dot 1.5s infinite' }} />
          <span style={{ color: '#00E5A0', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em' }}>AI AGENT LIVE</span>
          <span style={{ marginLeft: 'auto', color: '#2D5986', fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700 }}>0:47</span>
        </div>
        {[
          { role: 'AI', msg: "Hi, this is Voxiq AI calling on behalf of Acme Corp. Is this David Kim?" },
          { role: 'Lead', msg: "Yes, speaking. Who is this?" },
          { role: 'AI', msg: "Great! You just filled out our form — I wanted to reach out right away. Are you looking to increase your team's call volume?" },
          { role: 'Lead', msg: "Yeah actually, we've been struggling with that..." },
        ].map((line, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: line.role === 'AI' ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
            <div style={{ background: line.role === 'AI' ? 'rgba(127,205,255,0.08)' : 'rgba(10,37,64,0.6)', border: `1px solid ${line.role === 'AI' ? 'rgba(127,205,255,0.15)' : 'rgba(127,205,255,0.06)'}`, borderRadius: 10, padding: '8px 12px', maxWidth: '80%' }}>
              <div style={{ fontSize: 9, color: line.role === 'AI' ? '#00E5A0' : '#2D5986', marginBottom: 3, fontWeight: 600 }}>{line.role === 'AI' ? '🤖 AI Agent' : '👤 Lead'}</div>
              <div style={{ fontSize: 11, color: '#DFF7FF', lineHeight: 1.5 }}>{line.msg}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'analytics', label: 'Analytics', icon: <BarChart2 size={14} />,
    tag: 'ANALYTICS', tagBg: '#EDE9FE', tagColor: '#5B21B6',
    title: 'Real-time data on every rep and call.',
    desc: 'See exactly who is calling, how long they talk, connect rates, and which scripts convert best — updated live.',
    bullets: ['Real-time rep leaderboard and performance', 'Call outcome tracking — answered, voicemail, DNC', 'Connect rate trends by time of day', 'Script performance comparison A/B testing', 'Exportable reports for management reviews'],
    mockup: (
      <div style={{ padding: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(127,205,255,0.1)' }}>
          <span style={{ color: '#7FCDFF', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em' }}>TEAM PERFORMANCE</span>
          <span style={{ color: '#00E5A0', fontSize: 10, fontWeight: 600 }}>↑ 34% this week</span>
        </div>
        {[
          { name: 'Sarah J.', calls: 187, connect: '42%', bar: 0.9 },
          { name: 'Marcus C.', calls: 154, connect: '38%', bar: 0.74 },
          { name: 'Priya N.', calls: 143, connect: '35%', bar: 0.69 },
          { name: 'David K.', calls: 98, connect: '29%', bar: 0.47 },
        ].map((rep, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#DFF7FF', fontSize: 12, fontWeight: 500 }}>{rep.name}</span>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ color: '#6B9AB8', fontSize: 11 }}>{rep.calls} calls</span>
                <span style={{ color: '#00E5A0', fontSize: 11, fontWeight: 600 }}>{rep.connect}</span>
              </div>
            </div>
            <div style={{ height: 5, background: 'rgba(127,205,255,0.08)', borderRadius: 10 }}>
              <div style={{ height: '100%', width: `${rep.bar * 100}%`, background: i === 0 ? '#00E5A0' : '#7FCDFF', borderRadius: 10, transition: 'width 1s ease' }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'integrations', label: 'Integrations', icon: <LinkIcon size={14} />,
    tag: 'INTEGRATIONS', tagBg: '#DFF7FF', tagColor: '#0A2540',
    title: 'GHL native. Plus Zapier, Pipedrive.',
    desc: 'Voxiq connects directly to your existing stack in minutes. No developers, no complex setup.',
    bullets: ['GoHighLevel — 2-way native sync', 'Pipedrive — automatic call logging', 'Zapier — 5000+ app connections', 'REST API for custom integration workflows'],
    mockup: (
      <div style={{ padding: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(127,205,255,0.1)' }}>
          <span style={{ color: '#7FCDFF', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em' }}>CONNECTED APPS</span>
        </div>
        {[
          { name: 'GoHighLevel', status: 'Native sync', connected: true, icon: '⚡' },
          { name: 'Zapier', status: '5,000+ apps', connected: true, icon: '⚡' },
          { name: 'Pipedrive', status: 'Connect', connected: false, icon: '📊' },
        ].map((app, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 10, background: app.connected ? 'rgba(0,229,160,0.03)' : 'transparent', border: `1px solid ${app.connected ? 'rgba(0,229,160,0.1)' : 'rgba(127,205,255,0.06)'}`, marginBottom: 6 }}>
            <span style={{ fontSize: 18, width: 32, textAlign: 'center' }}>{app.icon}</span>
            <span style={{ flex: 1, color: '#DFF7FF', fontSize: 12, fontWeight: 600 }}>{app.name}</span>
            <span style={{ fontSize: 11, color: app.connected ? '#00E5A0' : '#2D5986', fontWeight: 600 }}>{app.status}</span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: app.connected ? '#00E5A0' : '#1A3A5C' }} />
          </div>
        ))}
      </div>
    ),
  },
];

// ─── FEATURE BLOCKS DATA ──────────────────────────────────────────────────────
const FEATURES = [
  {
    num: '01', tag: 'AUTO DIALER',
    title: 'Dial 300 contacts before lunch.',
    desc: 'Auto-advance to the next contact the moment a call ends. Your reps stay in conversations, not clicking.',
    bullets: ['Skip busy signals automatically', 'Voicemail drop with one click', 'Call pacing controls for compliance', 'Local presence dialing per area code', 'Real-time CRM data shown on each call'],
    mockup: (
      <div style={{ background: 'rgba(2,13,26,0.6)', border: '1px solid rgba(127,205,255,0.1)', borderRadius: 16, padding: 20, backdropFilter: 'blur(8px)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(127,205,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 8px #00E5A0', display: 'inline-block' }} />
            <span style={{ color: '#7FCDFF', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em' }}>AUTO DIALER RUNNING</span>
          </div>
          <span style={{ color: '#00E5A0', fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800 }}>247 / 300</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 10, background: 'rgba(127,205,255,0.04)', border: '1px solid rgba(127,205,255,0.08)', marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7FCDFF, #0A2540)', color: 'white', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>SJ</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#DFF7FF', fontSize: 13, fontWeight: 600 }}>Sarah Jenkins</div>
            <div style={{ color: '#2D5986', fontSize: 11 }}>VP Sales · NovaCRM</div>
          </div>
          <div style={{ color: '#00E5A0', fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>2:34</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {['Listen', 'Whisper', 'Hang Up'].map((btn, i) => (
            <div key={i} style={{ background: i === 2 ? 'rgba(239,68,68,0.08)' : 'rgba(127,205,255,0.06)', border: `1px solid ${i === 2 ? 'rgba(239,68,68,0.2)' : 'rgba(127,205,255,0.12)'}`, color: i === 2 ? '#EF4444' : '#7FCDFF', borderRadius: 8, padding: 7, fontSize: 11, fontWeight: 500, textAlign: 'center' }}>{btn}</div>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: '02', tag: 'LIVE COACHING',
    title: "Your best rep's skills, cloned to every rep.",
    desc: "Listen, whisper, barge on any live call. Real-time coaching that ramps new reps in weeks, not months.",
    bullets: ['Listen-in without the rep knowing', 'Whisper coaching only the rep hears', 'Barge — join the call as a third party', 'Flag calls for review and training', 'AI call summaries highlight coaching moments'],
    mockup: (
      <div style={{ background: 'rgba(2,13,26,0.6)', border: '1px solid rgba(127,205,255,0.1)', borderRadius: 16, padding: 20, backdropFilter: 'blur(8px)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ color: '#7FCDFF', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(127,205,255,0.08)' }}>MANAGER VIEW — COACHING</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[{ rep: 'Sarah J.', status: 'On call', duration: '4:12', badge: 'Listening', badgeColor: '#7FCDFF' }, { rep: 'Marcus C.', status: 'On call', duration: '1:03', badge: 'Whispering', badgeColor: '#00E5A0' }, { rep: 'Priya N.', status: 'On call', duration: '7:45', badge: 'Monitor', badgeColor: '#7C6DFA' }].map((rep, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 10, background: 'rgba(127,205,255,0.04)', border: '1px solid rgba(127,205,255,0.06)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7FCDFF, #0A2540)', color: 'white', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{rep.rep.split(' ').map(n => n[0]).join('')}</div>
              <div style={{ flex: 1 }}><div style={{ color: '#DFF7FF', fontSize: 12, fontWeight: 600 }}>{rep.rep}</div><div style={{ color: '#2D5986', fontSize: 10 }}>{rep.status}</div></div>
              <span style={{ color: '#2D5986', fontSize: 12 }}>{rep.duration}</span>
              <span style={{ background: `${rep.badgeColor}18`, border: `1px solid ${rep.badgeColor}30`, color: rep.badgeColor, fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{rep.badge}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: '03', tag: 'AI AGENT CALLER — NEW',
    title: 'An AI that never sleeps, never misses a lead.',
    desc: "New lead comes in at 2am? AI Agent calls them within 60 seconds, qualifies them, books the meeting — while you sleep.",
    bullets: ['Sub-60-second response to every new lead', 'Natural-sounding AI voice conversations', 'Follows your qualification script exactly', 'Auto-books to Calendly or GHL calendar', 'Seamless handoff to human rep when ready'],
    mockup: (
      <div style={{ background: 'rgba(2,13,26,0.6)', border: '1px solid rgba(127,205,255,0.1)', borderRadius: 16, padding: 20, backdropFilter: 'blur(8px)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(127,205,255,0.08)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E5A0', display: 'inline-block', animation: 'pulse-dot 1.5s infinite', boxShadow: '0 0 8px #00E5A0' }} />
          <span style={{ color: '#00E5A0', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em' }}>AI AGENT ACTIVE — 2:17 AM</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: 'rgba(127,205,255,0.06)', border: '1px solid rgba(127,205,255,0.12)', borderRadius: '12px 12px 12px 4px', padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: '#00E5A0', fontWeight: 600, marginBottom: 4 }}>🤖 AI Agent</div>
            <div style={{ fontSize: 11, color: '#DFF7FF', lineHeight: 1.5 }}>Hi David! I see you just signed up — I'm calling to make sure you get started right away. Can I ask a quick question about your team's current call volume?</div>
          </div>
          <div style={{ background: 'rgba(10,37,64,0.6)', border: '1px solid rgba(127,205,255,0.06)', borderRadius: '12px 12px 4px 12px', padding: '10px 12px', alignSelf: 'flex-end' }}>
            <div style={{ fontSize: 9, color: '#2D5986', fontWeight: 600, marginBottom: 4 }}>👤 Lead</div>
            <div style={{ fontSize: 11, color: '#DFF7FF', lineHeight: 1.5 }}>Sure, we have about 15 reps doing maybe 40 calls a day each...</div>
          </div>
          <div style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '12px 12px 12px 4px', padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: '#00E5A0', fontWeight: 600, marginBottom: 4 }}>🤖 AI Agent — Qualifying</div>
            <div style={{ fontSize: 11, color: '#DFF7FF', lineHeight: 1.5 }}>Perfect — Voxiq can get each rep to 200+ calls/day. I'm going to book you a demo for tomorrow morning. Does 10am work?</div>
          </div>
        </div>
      </div>
    ),
  },
];

// ─── MAIN HOME COMPONENT ──────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [activeTab, setActiveTab] = useState('calling');
  const [marqueeHovered, setMarqueeHovered] = useState(false);
  const [pricingAnnual, setPricingAnnual] = useState(false);

  const activeTabData = TABS.find(t => t.id === activeTab);

  const ROW1 = ['Acme Corp', 'Vertex Sales', 'NovaCRM', 'SalesBridge', 'QuickClose', 'PipeForce', 'DealStack', 'Outbound Pro'];
  const ROW2 = ['TechFlow', 'CloudSales', 'RepMax', 'DialerHQ', 'ConnectIQ', 'LeadPilot', 'CloserHQ', 'GrowthDesk'];

  return (
    <div style={{ background: '#020D1A', minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ================================================================
          SECTION 1 — HERO (background: #020D1A)
          ================================================================ */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', alignItems: 'center', background: '#020D1A' }}>

        {/* Layer 1: Wave background (desktop only) */}
        {isDesktop && (
          <Suspense fallback={null}>
            <WaveBackground />
          </Suspense>
        )}

        {/* Layer 2: Particles (desktop only) */}
        {isDesktop && (
          <Suspense fallback={null}>
            <ParticleField />
          </Suspense>
        )}

        {/* Layer 3: Radial gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 60% 50%, rgba(127,205,255,0.06), transparent 70%)', zIndex: 2, pointerEvents: 'none' }} />

        {/* Layer 4: Content */}
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1280px', margin: '0 auto', padding: isDesktop ? '120px 80px 80px' : '100px 24px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '55% 45%' : '1fr', alignItems: 'center', gap: isDesktop ? '48px' : '48px' }}>

            {/* ─── LEFT: Hero Text ─── */}
            <div>

              {/* H1 */}
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 'clamp(42px, 5.5vw, 76px)',
                  fontWeight: 700,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.0,
                  color: '#FFFFFF',
                  marginBottom: 24,
                }}
              >
                Your reps made<br />
                50 calls yesterday.<br />
                With Voxiq, they'll<br />
                make{' '}
                <span style={{ background: 'linear-gradient(135deg, #7FCDFF, #DFF7FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', display: 'inline-block' }}>200.</span>
              </motion.h1>

              {/* Subtext */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                style={{ fontSize: 18, fontWeight: 400, lineHeight: 1.75, color: '#4A7A9B', maxWidth: 460, marginBottom: 36 }}
              >
                Power dialer + AI Agent + SMS + WhatsApp + Analytics. One platform for sales teams who can't afford to lose a lead.
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}
              >
                <button
                  onClick={() => navigate('/signup')}
                  style={{ background: 'linear-gradient(135deg, #7FCDFF 0%, #5BB8F5 100%)', color: '#020D1A', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 12, border: 'none', boxShadow: '0 0 24px rgba(127,205,255,0.3), 0 8px 24px rgba(127,205,255,0.2)', cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(127,205,255,0.5), 0 8px 32px rgba(127,205,255,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(127,205,255,0.3), 0 8px 24px rgba(127,205,255,0.2)'; }}
                >
                  Start Free Trial
                </button>
                <button
                  onClick={() => navigate('/demo')}
                  style={{ background: 'transparent', color: '#6B9AB8', border: '1px solid rgba(127,205,255,0.15)', fontSize: 15, padding: '14px 28px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(127,205,255,0.35)'; e.currentTarget.style.color = '#DFF7FF'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(127,205,255,0.15)'; e.currentTarget.style.color = '#6B9AB8'; }}
                >
                  Watch Demo
                </button>
              </motion.div>

              {/* Social proof micro-stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                style={{ display: 'flex', gap: 24, marginTop: 36, alignItems: 'center' }}
              >
                {[{ num: '500+', label: 'Sales teams' }, { num: '3x', label: 'More calls/day' }, { num: '24/7', label: 'AI Agent' }].map((stat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: '#7FCDFF' }}>{stat.num}</div>
                      <div style={{ fontSize: 11, color: '#2D5986', marginTop: 2 }}>{stat.label}</div>
                    </div>
                    {i < 2 && <div style={{ width: 1, height: 32, background: 'rgba(127,205,255,0.08)' }} />}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ─── RIGHT: 3D Orb + UI Card ─── */}
            {isDesktop && (
              <div style={{ position: 'relative', height: 480 }}>
                {/* Orb */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, height: 500, zIndex: 0, opacity: 0.7 }}>
                  <Suspense fallback={null}><FloatingOrb /></Suspense>
                </div>
                {/* Ring */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}>
                  <Suspense fallback={null}><RotatingRing size={300} /></Suspense>
                </div>
                {/* UI Mockup Card */}
                <motion.div
                  style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, width: 320 }}
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div style={{ background: 'rgba(7,24,40,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(127,205,255,0.15)', borderRadius: 20, padding: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(127,205,255,0.05), inset 0 1px 0 rgba(127,205,255,0.1)' }}>
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 8px #00E5A0', animation: 'pulse-dot 1.5s infinite', display: 'inline-block' }} />
                      <span style={{ color: '#7FCDFF', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em' }}>LIVE CALL FLOOR</span>
                      <span style={{ marginLeft: 'auto', background: 'rgba(127,205,255,0.08)', border: '1px solid rgba(127,205,255,0.15)', color: '#7FCDFF', fontSize: 10, padding: '2px 10px', borderRadius: 20 }}>8 Active</span>
                    </div>
                    {/* Contact card */}
                    <div style={{ background: 'rgba(127,205,255,0.04)', border: '1px solid rgba(127,205,255,0.08)', borderRadius: 12, padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7FCDFF, #0A2540)', color: 'white', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>SJ</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#DFF7FF', fontWeight: 600, fontSize: 13 }}>Sarah Jenkins</div>
                        <div style={{ color: '#2D5986', fontSize: 11, marginTop: 2 }}>VP Sales · NovaCRM</div>
                      </div>
                      <div style={{ color: '#00E5A0', fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>2:34</div>
                    </div>
                    {/* Action buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
                      {[['Listen', false], ['Whisper', false], ['Hang Up', true]].map(([label, danger], i) => (
                        <div key={i} style={{ background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(127,205,255,0.06)', border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'rgba(127,205,255,0.12)'}`, color: danger ? '#EF4444' : '#7FCDFF', borderRadius: 8, padding: 7, fontSize: 11, fontWeight: 500, textAlign: 'center' }}>{label}</div>
                      ))}
                    </div>
                    {/* Stats strip */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(127,205,255,0.06)' }}>
                      <span style={{ color: '#2D5986', fontSize: 10 }}>847 calls today</span>
                      <span style={{ color: '#00E5A0', fontSize: 10, fontWeight: 600 }}>↑ 34% connect rate</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 2 — LOGO MARQUEE (background: #0A2540)
          ================================================================ */}
      <section style={{ background: '#0A2540', borderTop: '1px solid rgba(127,205,255,0.06)', borderBottom: '1px solid rgba(127,205,255,0.06)', padding: '40px 0' }}>
        <p style={{ textAlign: 'center', color: '#2D5986', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 28 }}>
          TRUSTED BY SALES TEAMS WORLDWIDE
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <MarqueeRow items={ROW1} direction="left" speed="35s" />
          <MarqueeRow items={ROW2} direction="right" speed="42s" />
        </div>
      </section>

      {/* ================================================================
          SECTION 3 — STATS (background: #DFF7FF)
          ================================================================ */}
      <section style={{ background: '#DFF7FF', padding: '64px 80px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', color: '#2D5986', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>BY THE NUMBERS</p>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: '#0A2540', textAlign: 'center', letterSpacing: '-0.03em', marginBottom: 48 }}>
            The numbers speak for themselves
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 20 }}>
            <StatCard number="3x" label="More calls per rep" sublabel="vs manual dialing" color="#0A2540" delay={0} />
            <StatCard number="47%" label="Higher connect rate" sublabel="average across teams" color="#0D3B6E" delay={0.1} />
            <StatCard number="200+" label="Calls per rep daily" sublabel="with auto dialer" color="#7FCDFF" delay={0.2} />
            <StatCard number="60s" label="Lead response time" sublabel="with AI Agent" color="#7C6DFA" delay={0.3} />
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 4 — PRODUCT TABS (background: #FFFFFF)
          ================================================================ */}
      <section style={{ background: '#FFFFFF', padding: isDesktop ? '80px' : '48px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', color: '#6B9AB8', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>PLATFORM OVERVIEW</p>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 700, color: '#0A2540', textAlign: 'center', letterSpacing: '-0.03em', marginBottom: 8 }}>
            Everything your sales team needs
          </h2>
          <p style={{ color: '#6B9AB8', textAlign: 'center', marginBottom: 40, fontSize: 16 }}>
            One platform. Every channel. Zero dropped leads.
          </p>

          {/* Tab bar */}
          <div style={{ display: 'flex', justifyContent: 'center', borderBottom: '1px solid #E8F4FF', marginBottom: 48, overflowX: 'auto' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 24px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: activeTab === tab.id ? '#0A2540' : '#6B9AB8',
                  cursor: 'pointer',
                  background: activeTab === tab.id ? 'rgba(127,205,255,0.04)' : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.id ? '#7FCDFF' : 'transparent'}`,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.badge && (
                  <span style={{ background: '#DCFCE7', color: '#166534', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20 }}>NEW</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: isDesktop ? 64 : 32, alignItems: 'center' }}
            >
              {/* Left: text */}
              <div>
                <span style={{ background: activeTabData.tagBg, color: activeTabData.tagColor, fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 20, display: 'inline-block', marginBottom: 14, letterSpacing: '0.06em' }}>{activeTabData.tag}</span>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, color: '#0A2540', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 12 }}>{activeTabData.title}</h3>
                <p style={{ fontSize: 15, color: '#6B9AB8', lineHeight: 1.75, marginBottom: 20 }}>{activeTabData.desc}</p>
                <div style={{ marginBottom: 20 }}>
                  {activeTabData.bullets.map((b, i) => <Bullet key={i} text={b} />)}
                </div>
                <Link to="/features" style={{ color: '#0D3B6E', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}>
                  Learn more <ArrowRight size={14} />
                </Link>
              </div>
              {/* Right: mockup */}
              <div style={{ background: '#020D1A', border: '1px solid rgba(127,205,255,0.1)', borderRadius: 20, boxShadow: '0 32px 64px rgba(10,37,64,0.15), inset 0 1px 0 rgba(127,205,255,0.08)', overflow: 'hidden', minHeight: 280 }}>
                {activeTabData.mockup}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ================================================================
          SECTION 5 — FEATURES (background: #0D3B6E)
          ================================================================ */}
      <section id="features" style={{ background: '#0D3B6E', padding: isDesktop ? '80px' : '48px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* FloatingCards 3D accent */}
        {isDesktop && (
          <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', zIndex: 0, opacity: 0.15, pointerEvents: 'none' }}>
            <Suspense fallback={null}><FloatingCards /></Suspense>
          </div>
        )}
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: 'rgba(127,205,255,0.5)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>WHY VOXIQ</p>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 700, color: '#DFF7FF', letterSpacing: '-0.03em' }}>
              Built for sales floors that mean business
            </h2>
          </div>

          {FEATURES.map((feat, i) => (
            <div key={i} style={{ padding: '48px 0', borderBottom: i < FEATURES.length - 1 ? '1px solid rgba(127,205,255,0.08)' : 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: isDesktop ? 64 : 32, alignItems: 'center', direction: isDesktop && i % 2 === 1 ? 'rtl' : 'ltr' }}>
                <Reveal direction={i % 2 === 0 ? 'left' : 'right'}>
                  <div style={{ direction: 'ltr' }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: 'rgba(127,205,255,0.3)', letterSpacing: '0.1em', marginBottom: 12 }}>{feat.num}</div>
                    <span style={{ background: 'rgba(127,205,255,0.1)', border: '1px solid rgba(127,205,255,0.2)', color: '#7FCDFF', fontSize: 10, fontWeight: 600, padding: '3px 12px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>{feat.tag}</span>
                    <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: '#DFF7FF', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 14 }}>{feat.title}</h3>
                    <p style={{ fontSize: 15, color: 'rgba(127,205,255,0.6)', lineHeight: 1.75, marginBottom: 20 }}>{feat.desc}</p>
                    <div style={{ marginBottom: 20 }}>{feat.bullets.map((b, j) => <Bullet key={j} text={b} dark />)}</div>
                    <a href="/features" style={{ color: '#DFF7FF', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
                      onMouseLeave={e => e.currentTarget.style.color = '#DFF7FF'}
                    >Learn more <ArrowRight size={14} /></a>
                  </div>
                </Reveal>
                <Reveal direction={i % 2 === 0 ? 'right' : 'left'}>
                  <div style={{ direction: 'ltr' }}>{feat.mockup}</div>
                </Reveal>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          SECTION 6 — HOW IT WORKS (background: #FFFDF5)
          ================================================================ */}
      <section style={{ background: '#FFFDF5', padding: isDesktop ? '80px' : '48px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ color: '#6B9AB8', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>HOW IT WORKS</p>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 700, color: '#0A2540', letterSpacing: '-0.03em', marginBottom: 12 }}>
              Up and running in under 10 minutes.
            </h2>
            <p style={{ color: '#6B9AB8', fontSize: 16 }}>No training. No setup fees. Just connect and go.</p>
          </div>

          <div style={{ position: 'relative' }}>
            {isDesktop && (
              <div style={{ position: 'absolute', top: '44px', left: 'calc(16.67% + 36px)', right: 'calc(16.67% + 36px)', height: 1, background: 'linear-gradient(to right, #7FCDFF, #0A2540, #7FCDFF)', opacity: 0.3, zIndex: 0 }} />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr', gap: 24, position: 'relative', zIndex: 1 }}>
              {[
                { step: '01', icon: '🔗', title: 'Connect your CRM', desc: 'Link Voxiq to your existing CRM in under 2 minutes. GHL and Pipedrive are supported natively.', time: 'Takes 2 minutes' },
                { step: '02', icon: '📋', title: 'Load your call list', desc: 'Import contacts via CSV or sync directly from your CRM pipeline. Smart filtering included.', time: 'Takes 3 minutes' },
                { step: '03', icon: '🚀', title: 'Hit start — Voxiq dials', desc: 'Your team starts dialing immediately. Auto-advance, voicemail drop, live coaching — all ready to go.', time: 'Immediate' },
              ].map((step, i) => (
                <Reveal key={i} delay={i * 0.15}>
                  <div
                    style={{ background: '#FFFFFF', border: '1px solid rgba(10,37,64,0.08)', borderRadius: 20, padding: 28, transition: 'all 0.25s', cursor: 'default' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 48px rgba(10,37,64,0.1)'; e.currentTarget.style.borderColor = '#7FCDFF'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(10,37,64,0.08)'; }}
                  >
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 52, fontWeight: 800, color: '#DFF7FF', lineHeight: 1, marginBottom: 12 }}>{step.step}</div>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#DFF7FF', border: '1px solid rgba(127,205,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>{step.icon}</div>
                    <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#0A2540', marginBottom: 8 }}>{step.title}</h3>
                    <p style={{ fontSize: 14, color: '#6B9AB8', lineHeight: 1.7 }}>{step.desc}</p>
                    <span style={{ background: '#DCFCE7', color: '#166534', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, marginTop: 16, display: 'inline-block' }}>{step.time}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 7 — TESTIMONIALS (background: #F0FBFF)
          ================================================================ */}
      <section style={{ background: '#F0FBFF', padding: isDesktop ? '80px' : '48px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ color: '#2D5986', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>LOVED BY SALES LEADERS</p>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 700, color: '#0A2540', letterSpacing: '-0.03em' }}>
              Teams that switched to Voxiq never went back.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr', gap: 24 }}>
            <TestimonialCard
              quote="We went from 52 dials a day to 190 in week one. Pipeline doubled in 30 days. Voxiq paid for itself before the trial ended."
              badge="190 dials/day in week 1"
              name="Ryan K."
              role="VP Sales, B2B SaaS"
              initials="RK"
              delay={0}
            />
            <TestimonialCard
              quote="The AI Agent called our new leads within 60 seconds — even at 11pm. Our inbound conversion rate went up 44% in the first month."
              badge="44% more inbound conversions"
              name="Sarah M."
              role="Head of Growth, PropTech"
              initials="SM"
              delay={0.1}
            />
            <TestimonialCard
              quote="GHL + Voxiq is the combination every agency needs. Our clients get way more out of their GHL investment now. We resell it at 3x margin."
              badge="3x margin on resale"
              name="Ahmed R."
              role="GHL Agency Owner"
              initials="AR"
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 8 — PRICING STRIP (background: #020D1A)
          ================================================================ */}
      <section style={{ background: '#020D1A', padding: isDesktop ? '64px 80px' : '48px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 48, alignItems: 'center' }}>
          {/* Left */}
          <Reveal>
            <div>
              <p style={{ color: '#2D5986', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>PRICING</p>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#FFFFFF', fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 12, lineHeight: 1.1 }}>
                Start free. Scale as you grow.
              </h2>
              <p style={{ color: '#2D5986', marginBottom: 24 }}>14-day free trial on all plans. No credit card required.</p>
              {/* Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <span style={{ color: '#4A7A9B', fontSize: 13 }}>Monthly</span>
                <div
                  onClick={() => setPricingAnnual(!pricingAnnual)}
                  style={{ width: 44, height: 24, borderRadius: 12, background: '#0A2540', border: '1px solid rgba(127,205,255,0.15)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: pricingAnnual ? '#7FCDFF' : '#1A3A5C', position: 'absolute', top: 3, left: pricingAnnual ? 23 : 3, transition: 'all 0.2s' }} />
                </div>
                <span style={{ color: '#4A7A9B', fontSize: 13 }}>Annual <span style={{ color: '#00E5A0', fontSize: 11 }}>Save 20%</span></span>
              </div>
              <Link to="/pricing" style={{ color: '#7FCDFF', borderBottom: '1px solid rgba(127,205,255,0.3)', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                See full pricing →
              </Link>
            </div>
          </Reveal>
          {/* Right: compact pricing cards */}
          <Reveal delay={0.15}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { plan: 'Starter', price: pricingAnnual ? '$39' : '$49', desc: 'Basic features', popular: false },
                { plan: 'Growth', price: pricingAnnual ? '$79' : '$99', desc: 'Everything in Starter + AI Agent', popular: true },
                { plan: 'Enterprise', price: 'Custom', desc: 'Unlimited reps + white-label', popular: false },
              ].map((tier, i) => (
                <div key={i} style={{ background: tier.popular ? 'rgba(127,205,255,0.06)' : '#071828', border: `1px solid ${tier.popular ? 'rgba(127,205,255,0.2)' : 'rgba(127,205,255,0.08)'}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: '#7FCDFF', fontWeight: 600, fontSize: 14 }}>{tier.plan}</span>
                      {tier.popular && <span style={{ background: 'rgba(127,205,255,0.15)', color: '#7FCDFF', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>MOST POPULAR</span>}
                    </div>
                    <div style={{ color: '#2D5986', fontSize: 12 }}>{tier.desc}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 20, color: tier.popular ? '#7FCDFF' : '#DFF7FF' }}>{tier.price}</div>
                    {tier.price !== 'Custom' && <div style={{ color: '#2D5986', fontSize: 10 }}>/seat/mo</div>}
                  </div>
                  <button onClick={() => navigate('/pricing')} style={{ background: tier.popular ? 'linear-gradient(135deg, #7FCDFF, #5BB8F5)' : 'transparent', color: tier.popular ? '#020D1A' : '#7FCDFF', border: `1px solid ${tier.popular ? 'none' : 'rgba(127,205,255,0.2)'}`, borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {tier.price === 'Custom' ? 'Contact us' : 'Get started'}
                  </button>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          SECTION 9 — FINAL CTA
          ================================================================ */}
      <section style={{ background: 'linear-gradient(135deg, #0A2540 0%, #0D3B6E 50%, #0A2540 100%)', padding: isDesktop ? '100px 80px' : '64px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background ParticleField */}
        {isDesktop && (
          <div style={{ position: 'absolute', inset: 0, opacity: 0.4, zIndex: 0, pointerEvents: 'none' }}>
            <Suspense fallback={null}><ParticleField /></Suspense>
          </div>
        )}
        {/* Rotating ring behind text */}
        {isDesktop && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.08, zIndex: 0, pointerEvents: 'none' }}>
            <Suspense fallback={null}><RotatingRing size={600} /></Suspense>
          </div>
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <p style={{ color: 'rgba(127,205,255,0.5)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>GET STARTED TODAY</p>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.03em', marginBottom: 16 }}>
              Ready to transform your sales floor?
            </h2>
            <p style={{ color: 'rgba(127,205,255,0.5)', fontSize: 18, marginBottom: 36 }}>
              Join 500+ sales teams using Voxiq to close more deals.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
              <button
                onClick={() => navigate('/signup')}
                style={{ background: 'linear-gradient(135deg, #7FCDFF, #5BB8F5)', color: '#020D1A', fontWeight: 800, fontSize: 16, padding: '16px 36px', borderRadius: 14, border: 'none', boxShadow: '0 0 40px rgba(127,205,255,0.3)', cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 60px rgba(127,205,255,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(127,205,255,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Start Free Trial — It's Free
              </button>
              <button
                onClick={() => navigate('/demo')}
                style={{ background: 'transparent', border: '1px solid rgba(127,205,255,0.2)', color: '#7FCDFF', fontSize: 16, padding: '16px 36px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(127,205,255,0.5)'; e.currentTarget.style.color = '#DFF7FF'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(127,205,255,0.2)'; e.currentTarget.style.color = '#7FCDFF'; }}
              >
                Book a Demo
              </button>
            </div>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['✓ No credit card', '✓ 14-day free trial', '✓ Cancel anytime'].map((t, i) => (
                <span key={i} style={{ color: 'rgba(127,205,255,0.4)', fontSize: 13 }}>{t}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          SECTION 10 — FOOTER (background: #020D1A)
          ================================================================ */}
      <footer style={{ background: '#020D1A', borderTop: '1px solid rgba(127,205,255,0.06)', padding: isDesktop ? '64px 80px 32px' : '48px 24px 24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '2fr 1fr 1fr 1fr 1fr' : '1fr 1fr', gap: isDesktop ? 48 : 32, marginBottom: 48 }}>
            {/* Brand col */}
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#FFFFFF', marginBottom: 12 }}>
                Vox<span style={{ color: '#7FCDFF' }}>iq</span>
              </div>
              <p style={{ color: '#2D5986', fontSize: 13, lineHeight: 1.7, maxWidth: 200, marginBottom: 20 }}>The all-in-one dialer for serious sales teams.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {['𝕏', 'in', '▶'].map((icon, i) => (
                  <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(127,205,255,0.06)', border: '1px solid rgba(127,205,255,0.1)', color: '#2D5986', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#7FCDFF'; e.currentTarget.style.background = 'rgba(127,205,255,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#2D5986'; e.currentTarget.style.background = 'rgba(127,205,255,0.06)'; }}
                  >{icon}</div>
                ))}
              </div>
            </div>
            {/* Link cols */}
            {[
              { header: 'PRODUCT', links: ['Auto Dialer', 'AI Agent', 'SMS & WhatsApp', 'Analytics', 'Integrations'] },
              { header: 'INTEGRATIONS', links: ['GoHighLevel', 'Zapier', 'Pipedrive'] },
              { header: 'SOLUTIONS', links: ['Sales Teams', 'SDR / BDR', 'Small Business', 'Enterprise', 'GHL Agencies'] },
              { header: 'COMPANY', links: ['About', 'Blog', 'Careers', 'Press', 'Contact'] },
            ].map((col, i) => (
              <div key={i}>
                <p style={{ color: '#2D5986', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>{col.header}</p>
                {col.links.map((link, j) => (
                  <div key={j} style={{ marginBottom: 2 }}>
                    <a href="#" style={{ color: '#1A3A5C', fontSize: 13, lineHeight: 2.4, textDecoration: 'none', display: 'block', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#7FCDFF'}
                      onMouseLeave={e => e.currentTarget.style.color = '#1A3A5C'}
                    >{link}</a>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Bottom strip */}
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(127,205,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ color: '#1A3A5C', fontSize: 12 }}>© 2025 Voxiq. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Privacy Policy', 'Terms of Service', 'GDPR'].map((item, i) => (
                <a key={i} href="#" style={{ color: '#1A3A5C', fontSize: 12, textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#7FCDFF'}
                  onMouseLeave={e => e.currentTarget.style.color = '#1A3A5C'}
                >{item}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
