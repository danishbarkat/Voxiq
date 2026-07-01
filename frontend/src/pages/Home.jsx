import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollStack, { ScrollStackItem } from '../components/ScrollStack';
import Footer from '../components/Footer';
import {
  Phone, MessageSquare, Bot, BarChart2, Link as LinkIcon,
  Check, ChevronRight, ArrowRight, Play,
  Layers, Target, Activity, GitBranch, Zap, HardDrive, PhoneOutgoing, Cpu, Globe, Award, Network, Compass, ShieldCheck,
  ChevronLeft
} from 'lucide-react';

// 3D components disabled

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

// ─── LOGO MARQUEE DATA ───────────────────────────────────────────────────────
const ALL_COMPANIES = [
  { name: 'Acme Corp', icon: <Layers size={18} style={{ color: '#0F172A' }} />, text: <span style={{ fontSize: '15px', color: '#0F172A', fontFamily: "'Space Grotesk', sans-serif" }}><strong>Acme</strong>Corp</span> },
  { name: 'Vertex Sales', icon: <Target size={18} style={{ color: '#2563EB' }} />, text: <span style={{ fontSize: '15px', color: '#1E3A8A', fontFamily: "'Space Grotesk', sans-serif" }}><strong>Vertex</strong>Sales</span> },
  { name: 'NovaCRM', icon: <Activity size={18} style={{ color: '#10B981' }} />, text: <span style={{ fontSize: '15px', color: '#065F46', fontFamily: "'Space Grotesk', sans-serif" }}><strong>Nova</strong>CRM</span> },
  { name: 'SalesBridge', icon: <GitBranch size={18} style={{ color: '#6366F1' }} />, text: <span style={{ fontSize: '15px', color: '#3730A3', fontFamily: "'Space Grotesk', sans-serif" }}>Sales<strong>Bridge</strong></span> },
  { name: 'QuickClose', icon: <Zap size={18} style={{ color: '#F59E0B' }} />, text: <span style={{ fontSize: '15px', color: '#78350F', fontFamily: "'Space Grotesk', sans-serif" }}><strong>Quick</strong>Close</span> },
  { name: 'PipeForce', icon: <HardDrive size={18} style={{ color: '#EC4899' }} />, text: <span style={{ fontSize: '15px', color: '#9D174D', fontFamily: "'Space Grotesk', sans-serif" }}>Pipe<strong>Force</strong></span> },
  { name: 'DealStack', icon: <Layers size={18} style={{ color: '#8B5CF6' }} />, text: <span style={{ fontSize: '15px', color: '#5B21B6', fontFamily: "'Space Grotesk', sans-serif" }}><strong>Deal</strong>Stack</span> },
  { name: 'Outbound Pro', icon: <PhoneOutgoing size={18} style={{ color: '#06B6D4' }} />, text: <span style={{ fontSize: '15px', color: '#0891B2', fontFamily: "'Space Grotesk', sans-serif" }}><strong>Outbound</strong>Pro</span> },
  { name: 'TechFlow', icon: <Cpu size={18} style={{ color: '#3B82F6' }} />, text: <span style={{ fontSize: '15px', color: '#1D4ED8', fontFamily: "'Space Grotesk', sans-serif" }}>Tech<strong>Flow</strong></span> },
  { name: 'CloudSales', icon: <Globe size={18} style={{ color: '#2563EB' }} />, text: <span style={{ fontSize: '15px', color: '#1E40AF', fontFamily: "'Space Grotesk', sans-serif" }}><strong>Cloud</strong>Sales</span> },
  { name: 'RepMax', icon: <Award size={18} style={{ color: '#10B981' }} />, text: <span style={{ fontSize: '15px', color: '#065F46', fontFamily: "'Space Grotesk', sans-serif" }}>Rep<strong>Max</strong></span> },
  { name: 'DialerHQ', icon: <Phone size={18} style={{ color: '#059669' }} />, text: <span style={{ fontSize: '15px', color: '#047857', fontFamily: "'Space Grotesk', sans-serif" }}><strong>Dialer</strong>HQ</span> },
  { name: 'ConnectIQ', icon: <Network size={18} style={{ color: '#8B5CF6' }} />, text: <span style={{ fontSize: '15px', color: '#6D28D9', fontFamily: "'Space Grotesk', sans-serif" }}><strong>Connect</strong>IQ</span> },
  { name: 'LeadPilot', icon: <Compass size={18} style={{ color: '#EF4444' }} />, text: <span style={{ fontSize: '15px', color: '#B91C1C', fontFamily: "'Space Grotesk', sans-serif" }}>Lead<strong>Pilot</strong></span> },
  { name: 'CloserHQ', icon: <ShieldCheck size={18} style={{ color: '#10B981' }} />, text: <span style={{ fontSize: '15px', color: '#065F46', fontFamily: "'Space Grotesk', sans-serif" }}><strong>Closer</strong>HQ</span> },
  { name: 'GrowthDesk', icon: <BarChart2 size={18} style={{ color: '#3B82F6' }} />, text: <span style={{ fontSize: '15px', color: '#1D4ED8', fontFamily: "'Space Grotesk', sans-serif" }}><strong>Growth</strong>Desk</span> },
];

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
        {doubled.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 24px',
              margin: '0 24px',
              transition: 'opacity 0.2s',
              whiteSpace: 'nowrap',
              opacity: 0.65,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.65}
          >
            {item.icon}
            {item.text}
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
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '28px',
          transition: 'all 0.2s',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#0D3B6E';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(10,37,64,0.06)';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#E2E8F0';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ fontSize: '48px', color: '#DFF7FF', lineHeight: 1, marginBottom: '12px', fontFamily: 'Georgia, serif' }}>❝</div>
        <p style={{ fontSize: '15px', color: '#0A2540', lineHeight: 1.75, fontStyle: 'italic', marginBottom: '16px', flex: 1 }}>{quote}</p>
        <div style={{ background: '#DFF7FF', color: '#0D3B6E', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', display: 'inline-block', marginBottom: '16px', alignSelf: 'flex-start' }}>{badge}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #7FCDFF, #0A2540)', color: 'white', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0A2540' }}>{name}</div>
            <div style={{ fontSize: '12px', color: '#6B9AB8', marginTop: '1px' }}>{role}</div>
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
    title: 'GHL native. Plus Zapier.',
    desc: 'Voxiq connects directly to your existing stack in minutes. No developers, no complex setup.',
    bullets: ['GoHighLevel — 2-way native sync', 'Zapier — 5000+ app connections', 'REST API for custom integration workflows'],
    mockup: (
      <div style={{ padding: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(127,205,255,0.1)' }}>
          <span style={{ color: '#7FCDFF', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em' }}>CONNECTED APPS</span>
        </div>
        {[
          { name: 'GoHighLevel', status: 'Native sync', connected: true, icon: '⚡' },
          { name: 'Zapier', status: '5,000+ apps', connected: true, icon: '⚡' },
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
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(10,37,64,0.1)', borderRadius: 16, padding: 20, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
            <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>Sarah Jenkins</div>
            <div style={{ color: '#7FCDFF', fontSize: 11, opacity: 0.7 }}>VP Sales · NovaCRM</div>
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
              <div style={{ flex: 1 }}><div style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600 }}>{rep.rep}</div><div style={{ color: '#7FCDFF', fontSize: 10, opacity: 0.7 }}>{rep.status}</div></div>
              <span style={{ color: '#FFFFFF', fontSize: 12, opacity: 0.7 }}>{rep.duration}</span>
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

// ─── CAROUSEL TRANSITIONS ──────────────────────────────────────────────────
const slideVariants = {
  enter: (dir) => ({
    x: dir > 0 ? 100 : -100,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (dir) => ({
    zIndex: 0,
    x: dir < 0 ? 100 : -100,
    opacity: 0
  })
};

// ─── MAIN HOME COMPONENT ──────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const [currentFeat, setCurrentFeat] = useState(0);
  const [featDirection, setFeatDirection] = useState(1);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const videoRef = useRef(null);

  const handleNext = () => {
    setFeatDirection(1);
    setCurrentFeat((prev) => (prev + 1) % FEATURES.length);
  };

  const handlePrev = () => {
    setFeatDirection(-1);
    setCurrentFeat((prev) => (prev - 1 + FEATURES.length) % FEATURES.length);
  };

  useEffect(() => {
    if (isAutoplayPaused) return;
    const timer = setInterval(handleNext, 6000);
    return () => clearInterval(timer);
  }, [isAutoplayPaused]);
  const isDesktop = useIsDesktop();
  const [marqueeHovered, setMarqueeHovered] = useState(false);
  const [pricingAnnual, setPricingAnnual] = useState(false);

  return (
    <div style={{ background: '#020D1A', minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ================================================================
          SECTION 1 — HERO (background: #020D1A)
          ================================================================ */}
      <section 
        onClick={() => { 
          if (videoRef.current) { 
            videoRef.current.muted = false; 
            if (videoRef.current.paused) {
              videoRef.current.play();
            } else {
              videoRef.current.pause();
            }
          } 
        }}
        style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#020D1A'
      }}>

        <video 
          ref={videoRef}
          playsInline 
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
            top: 0,
            left: 0
          }}
        >
          <source src="/home%20hero%20section%203.mp4" type="video/mp4" />
        </video>

        {/* 3D background components removed */}

        {/* Layer 3: Radial gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(2, 13, 26, 0.4), rgba(2, 13, 26, 0.4)), radial-gradient(ellipse 70% 60% at 60% 50%, rgba(127,205,255,0.06), transparent 70%)', zIndex: 2, pointerEvents: 'none' }} />

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
                  style={{ background: 'rgb(223, 247, 255)', color: '#0A2540', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  Start Free Trial
                </button>
                <button
                  onClick={() => navigate('/demo')}
                  style={{ background: 'transparent', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.25)', fontSize: 15, padding: '14px 28px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'transparent'; }}
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

            {/* ─── RIGHT: UI Card ─── */}
            {isDesktop && (
              <div style={{ position: 'relative', height: 480 }}>
                {/* UI Mockup Card */}
                <motion.div
                  style={{ position: 'absolute', bottom: '-40px', right: '-40px', zIndex: 10, width: 320 }}
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div style={{ background: '#F6F4F0', border: '1px solid rgba(10,37,64,0.1)', borderRadius: 20, padding: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.15)' }}>
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                      <span style={{ color: '#0D3B6E', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>LIVE CALL FLOOR</span>
                      <span style={{ marginLeft: 'auto', background: 'rgba(13,59,110,0.08)', border: '1px solid rgba(13,59,110,0.15)', color: '#0D3B6E', fontSize: 10, padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>8 Active</span>
                    </div>
                    {/* Contact card */}
                    <div style={{ background: '#FFFFFF', border: '1px solid rgba(10,37,64,0.08)', borderRadius: 12, padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7FCDFF, #0A2540)', color: 'white', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>SJ</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#0A2540', fontWeight: 600, fontSize: 13 }}>Sarah Jenkins</div>
                        <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>VP Sales · NovaCRM</div>
                      </div>
                      <div style={{ color: '#10B981', fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>2:34</div>
                    </div>
                    {/* Action buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
                      {[['Listen', false], ['Whisper', false], ['Hang Up', true]].map(([label, danger], i) => (
                        <div key={i} style={{ background: danger ? 'rgba(239,68,68,0.06)' : 'rgba(13,59,110,0.06)', border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'rgba(13,59,110,0.12)'}`, color: danger ? '#EF4444' : '#0D3B6E', borderRadius: 8, padding: 7, fontSize: 11, fontWeight: 600, textAlign: 'center' }}>{label}</div>
                      ))}
                    </div>
                    {/* Stats strip */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(10,37,64,0.08)' }}>
                      <span style={{ color: '#64748B', fontSize: 10 }}>847 calls today</span>
                      <span style={{ color: '#10B981', fontSize: 10, fontWeight: 600 }}>↑ 34% connect rate</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 2 — LOGO MARQUEE (background: #FFFFFF)
          ================================================================ */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '32px 0' }}>
        <p style={{ textAlign: 'center', color: '#64748B', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
          TRUSTED BY SALES TEAMS WORLDWIDE
        </p>
        <div>
          <MarqueeRow items={ALL_COMPANIES} direction="left" speed="45s" />
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
          SECTION 4 — PRODUCT SCROLL STACK (background: #FFFFFF)
          ================================================================ */}
      <section style={{ background: '#FFFFFF', padding: isDesktop ? '60px 0' : '40px 0' }}>
        <div style={{ maxWidth: '90vw', margin: '0 auto', padding: '0' }}>
          <p style={{ textAlign: 'center', color: '#6B9AB8', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>PLATFORM OVERVIEW</p>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 700, color: '#0A2540', textAlign: 'center', letterSpacing: '-0.03em', marginBottom: 8 }}>
            Everything your sales team needs
          </h2>
          <p style={{ color: '#6B9AB8', textAlign: 'center', marginBottom: 40, fontSize: 16 }}>
            One platform. Every channel. Zero dropped leads. Scroll to explore.
          </p>

          <ScrollStack
            itemDistance={isDesktop ? 80 : 40}
            itemScale={0.015}
            itemStackDistance={isDesktop ? 30 : 20}
            stackPosition={160}
            scaleEndPosition={100}
            baseScale={0.94}
            useWindowScroll={true}
          >
            {TABS.map((tab) => (
              <ScrollStackItem key={tab.id}>
                <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: isDesktop ? 64 : 32, alignItems: 'center' }}>
                  {/* Left: text */}
                  <div>
                    <span style={{ background: tab.tagBg, color: tab.tagColor, fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 20, display: 'inline-block', marginBottom: 14, letterSpacing: '0.06em' }}>
                      {tab.tag}
                    </span>
                    <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 'clamp(22px, 2.5vw, 32px)', color: '#0A2540', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 12 }}>
                      {tab.title}
                    </h3>
                    <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.75, marginBottom: 20 }}>
                      {tab.desc}
                    </p>
                    <div style={{ marginBottom: 20 }}>
                      {tab.bullets.map((b, idx) => <Bullet key={idx} text={b} dark={false} />)}
                    </div>
                    <Link to="/features" style={{ color: '#0D3B6E', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#0A2540'}
                      onMouseLeave={e => e.currentTarget.style.color = '#0D3B6E'}
                    >
                      Learn more <ArrowRight size={14} />
                    </Link>
                  </div>
                  {/* Right: mockup */}
                  <div style={{ background: '#020D1A', border: '1px solid rgba(127,205,255,0.1)', borderRadius: 20, boxShadow: '0 32px 64px rgba(2,13,26,0.5), inset 0 1px 0 rgba(127,205,255,0.08)', overflow: 'hidden', minHeight: 280 }}>
                    {tab.mockup}
                  </div>
                </div>
              </ScrollStackItem>
            ))}
          </ScrollStack>
        </div>
      </section>

      {/* ================================================================
          SECTION 5 — FEATURES (background: #0D3B6E)
          ================================================================ */}
      <section id="features" style={{ background: '#0D3B6E', padding: isDesktop ? '80px' : '48px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* 3D accent removed */}
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: 'rgba(127,205,255,0.5)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>WHY VOXIQ</p>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 700, color: '#DFF7FF', letterSpacing: '-0.03em' }}>
              Built for sales floors that mean business
            </h2>
          </div>

          {/* Carousel container */}
          <div
            style={{ position: 'relative', width: '100%', minHeight: isDesktop ? '500px' : '720px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            onMouseEnter={() => setIsAutoplayPaused(true)}
            onMouseLeave={() => setIsAutoplayPaused(false)}
          >
            {/* Slide */}
            <AnimatePresence mode="wait" initial={false} custom={featDirection}>
              <motion.div
                key={currentFeat}
                custom={featDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                style={{ width: '100%' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: isDesktop ? 64 : 32, alignItems: 'center' }}>
                  {/* Left: Text */}
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: 'rgba(127,205,255,0.3)', letterSpacing: '0.1em', marginBottom: 12 }}>
                      {FEATURES[currentFeat].num}
                    </div>
                    <span style={{ background: 'rgba(127,205,255,0.1)', border: '1px solid rgba(127,205,255,0.2)', color: '#7FCDFF', fontSize: 10, fontWeight: 600, padding: '3px 12px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>
                      {FEATURES[currentFeat].tag}
                    </span>
                    <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(24px, 2.5vw, 36px)', fontWeight: 700, color: '#DFF7FF', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 14 }}>
                      {FEATURES[currentFeat].title}
                    </h3>
                    <p style={{ fontSize: 15, color: 'rgba(127,205,255,0.6)', lineHeight: 1.75, marginBottom: 20 }}>
                      {FEATURES[currentFeat].desc}
                    </p>
                    <div style={{ marginBottom: 20 }}>
                      {FEATURES[currentFeat].bullets.map((b, j) => <Bullet key={j} text={b} dark />)}
                    </div>
                    <a href="/features" style={{ color: '#DFF7FF', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
                      onMouseLeave={e => e.currentTarget.style.color = '#DFF7FF'}
                    >
                      Learn more <ArrowRight size={14} />
                    </a>
                  </div>
                  {/* Right: Mockup */}
                  <div>
                    {FEATURES[currentFeat].mockup}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation arrows */}
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'absolute', top: '50%', left: isDesktop ? '-64px' : '-16px', right: isDesktop ? '-64px' : '-16px', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 10 }}>
              {/* Prev Button */}
              <button
                onClick={handlePrev}
                aria-label="Previous Feature"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#DFF7FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(4px)'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                <ChevronLeft size={20} />
              </button>
              {/* Next Button */}
              <button
                onClick={handleNext}
                aria-label="Next Feature"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#DFF7FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(4px)'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Dots Indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 40, position: 'relative', zIndex: 1 }}>
            {FEATURES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setFeatDirection(idx > currentFeat ? 1 : -1);
                  setCurrentFeat(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: idx === currentFeat ? '#7FCDFF' : 'rgba(127,205,255,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.25s'
                }}
              />
            ))}
          </div>
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
                { step: '01', title: 'Connect your CRM', desc: 'Link Voxiq to your existing CRM in under 2 minutes. GHL is supported natively.', time: 'Takes 2 minutes' },
                { step: '02', title: 'Load your call list', desc: 'Import contacts via CSV or sync directly from your CRM pipeline. Smart filtering included.', time: 'Takes 3 minutes' },
                { step: '03', title: 'Hit start — Voxiq dials', desc: 'Your team starts dialing immediately. Auto-advance, voicemail drop, live coaching — all ready to go.', time: 'Immediate' },
              ].map((step, i) => (
                <Reveal key={i} delay={i * 0.15}>
                  <div
                    style={{ background: '#FFFFFF', border: '1px solid rgba(10,37,64,0.08)', borderRadius: 20, padding: 28, transition: 'all 0.25s', cursor: 'default' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 48px rgba(10,37,64,0.1)'; e.currentTarget.style.borderColor = '#7FCDFF'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(10,37,64,0.08)'; }}
                  >
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 52, fontWeight: 800, color: '#DFF7FF', lineHeight: 1, marginBottom: 12 }}>{step.step}</div>
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
          SECTION 7 — PRICING CARDS (background: rgb(223, 247, 255))
          ================================================================ */}
      <section id="pricing" style={{ background: 'rgb(223, 247, 255)', borderTop: '1px solid rgba(10,37,64,0.06)', borderBottom: '1px solid rgba(10,37,64,0.06)', padding: isDesktop ? '100px 80px' : '64px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          {/* Header */}
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <p style={{ color: '#0D3B6E', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>PRICING PLANS</p>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 700, color: '#0A2540', letterSpacing: '-0.03em', marginBottom: 16 }}>
                Start free. Scale as you grow.
              </h2>
              <p style={{ color: '#475569', fontSize: 16, marginBottom: 28 }}>
                14-day free trial on all plans. No credit card required.
              </p>

              {/* Billing Toggle */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
                <span style={{ color: pricingAnnual ? '#475569' : '#0A2540', fontWeight: pricingAnnual ? 500 : 700, fontSize: 14, cursor: 'pointer' }} onClick={() => setPricingAnnual(false)}>Monthly</span>
                <div
                  onClick={() => setPricingAnnual(!pricingAnnual)}
                  style={{ width: 48, height: 26, borderRadius: 13, background: '#FFFFFF', border: '1px solid rgba(10,37,64,0.15)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                >
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0D3B6E', position: 'absolute', top: 2, left: pricingAnnual ? 24 : 2, transition: 'all 0.2s' }} />
                </div>
                <span style={{ color: pricingAnnual ? '#0A2540' : '#475569', fontWeight: pricingAnnual ? 700 : 500, fontSize: 14, cursor: 'pointer' }} onClick={() => setPricingAnnual(true)}>
                  Annual <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginLeft: 4 }}>Save 20%</span>
                </span>
              </div>
            </div>
          </Reveal>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr', gap: 32, alignItems: 'stretch' }}>
            {/* Card 1: Starter */}
            <Reveal delay={0.1}>
              <div style={{
                background: '#FFFFFF',
                border: '1px solid rgba(10, 37, 64, 0.08)',
                borderRadius: '20px',
                padding: '40px 32px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                boxShadow: '0 10px 30px rgba(10, 37, 64, 0.04)',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(10, 37, 64, 0.08)';
                  e.currentTarget.style.borderColor = '#0D3B6E';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(10, 37, 64, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(10, 37, 64, 0.08)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0D3B6E', display: 'inline-block' }} />
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0A2540', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Starter</h3>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>For small teams getting started</p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '3rem', fontWeight: 700, color: '#0A2540', letterSpacing: '-0.02em', fontFamily: "'Space Grotesk', sans-serif" }}>
                      {pricingAnnual ? '$269.89' : '$24.99'}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>/seat/month</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#0D3B6E', fontWeight: 600, marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    14-day free trial · cancel anytime
                  </div>

                  <div style={{ borderTop: '1px solid rgba(10,37,64,0.08)', paddingTop: '20px', marginBottom: '32px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {[
                        { inc: true, text: 'Up to 5 seats' },
                        { inc: true, text: 'Power dialer (100 calls/day per seat)' },
                        { inc: true, text: 'CRM sync (GHL, HubSpot, etc.)' },
                        { inc: true, text: 'Call recording (30-day storage)' },
                        { inc: true, text: 'Email support' },
                        { inc: false, text: 'SMS messaging' },
                        { inc: false, text: 'Live call coaching' },
                        { inc: false, text: 'AI call insights' }
                      ].map((feat, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: feat.inc ? '#334155' : '#94A3B8', fontWeight: feat.inc ? 500 : 400, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          <span style={{ color: feat.inc ? '#10B981' : '#EF4444', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                            {feat.inc ? '✓' : '✗'}
                          </span>
                          {feat.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/signup?plan=starter')}
                  style={{
                    width: '100%',
                    background: 'rgb(223, 247, 255)',
                    color: '#0A2540',
                    border: '1.5px solid rgba(10, 37, 64, 0.15)',
                    padding: '14px 24px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#0A2540';
                    e.currentTarget.style.color = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#0A2540';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgb(223, 247, 255)';
                    e.currentTarget.style.color = '#0A2540';
                    e.currentTarget.style.borderColor = 'rgba(10, 37, 64, 0.15)';
                  }}
                >
                  Start Free Trial
                </button>
              </div>
            </Reveal>

            {/* Card 2: Growth (MOST POPULAR) */}
            <Reveal delay={0.2}>
              <div style={{
                background: 'linear-gradient(135deg, rgb(13, 59, 110) 0%, rgb(26, 79, 160) 50%, rgb(15, 76, 138) 100%)',
                border: '2px solid rgba(127, 205, 255, 0.2)',
                borderRadius: '20px',
                padding: '44px 32px 40px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'all 0.3s ease',
                boxShadow: '0 15px 35px rgba(13, 59, 110, 0.35)',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 25px 50px rgba(13, 59, 110, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 15px 35px rgba(13, 59, 110, 0.35)';
                }}
              >
                {/* Popular Badge */}
                <div style={{
                  position: 'absolute',
                  top: '-16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, rgb(13, 59, 110) 0%, rgb(26, 79, 160) 50%, rgb(15, 76, 138) 100%)',
                  color: '#DFF7FF',
                  border: '1px solid rgba(127,205,255,0.3)',
                  padding: '6px 18px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  whiteSpace: 'nowrap'
                }}>
                  Most Popular
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7FCDFF', display: 'inline-block' }} />
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Growth</h3>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(223,247,255,0.7)', marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>For growing sales teams</p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '3rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', fontFamily: "'Space Grotesk', sans-serif" }}>
                      {pricingAnnual ? '$431.89' : '$39.99'}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'rgba(223,247,255,0.7)', fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>/seat/month</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#7FCDFF', fontWeight: 600, marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    14-day free trial · cancel anytime
                  </div>

                  <div style={{ borderTop: '1px solid rgba(127,205,255,0.15)', paddingTop: '20px', marginBottom: '32px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {[
                        'Everything in Starter',
                        'Unlimited seats',
                        'Unlimited calls per day',
                        'CRM & Zapier sync',
                        'Live call coaching (whisper, barge, listen)',
                        'Voicemail drop',
                        'SMS messaging',
                        'Advanced analytics dashboard',
                        'AI call insights',
                        'Priority chat support'
                      ].map((feat, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(223,247,255,0.9)', fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          <span style={{ color: '#00E5A0', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                            ✓
                          </span>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/signup?plan=growth')}
                  style={{
                    width: '100%',
                    background: 'rgb(223, 247, 255)',
                    color: '#0A2540',
                    border: 'none',
                    padding: '15px 24px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxShadow: '0 4px 15px rgba(223,247,255,0.15)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(223,247,255,0.3)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgb(223, 247, 255)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(223,247,255,0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Start Free Trial
                </button>
              </div>
            </Reveal>

            {/* Card 3: Enterprise */}
            <Reveal delay={0.3}>
              <div style={{
                background: '#FFFFFF',
                border: '1px solid rgba(10, 37, 64, 0.08)',
                borderRadius: '20px',
                padding: '40px 32px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                boxShadow: '0 10px 30px rgba(10, 37, 64, 0.04)',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(10, 37, 64, 0.08)';
                  e.currentTarget.style.borderColor = '#0D3B6E';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(10, 37, 64, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(10, 37, 64, 0.08)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748B', display: 'inline-block' }} />
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0A2540', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Enterprise</h3>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>For large teams with custom needs</p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px', minHeight: '62px' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 700, color: '#0A2540', letterSpacing: '-0.02em', fontFamily: "'Space Grotesk', sans-serif" }}>
                      Custom pricing
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500, marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Talk to our team for a quote
                  </div>

                  <div style={{ borderTop: '1px solid rgba(10, 37, 64, 0.08)', paddingTop: '20px', marginBottom: '32px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {[
                        'Everything in Growth',
                        'Unlimited seats',
                        'Dedicated account manager',
                        'Custom CRM integrations & API access',
                        'SSO & advanced security (SAML, SCIM)',
                        'SLA guarantee (99.9% uptime)',
                        'Custom onboarding & training',
                        '24/7 phone & email support'
                      ].map((feat, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#334155', fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          <span style={{ color: '#10B981', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                            ✓
                          </span>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/demo')}
                  style={{
                    width: '100%',
                    background: 'rgb(223, 247, 255)',
                    color: '#0A2540',
                    border: '1.5px solid rgba(10, 37, 64, 0.15)',
                    padding: '14px 24px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#0A2540';
                    e.currentTarget.style.color = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#0A2540';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgb(223, 247, 255)';
                    e.currentTarget.style.color = '#0A2540';
                    e.currentTarget.style.borderColor = 'rgba(10, 37, 64, 0.15)';
                  }}
                >
                  Contact Sales
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 8 — TESTIMONIALS (background: rgb(223,247,255))
          ================================================================ */}
      <section style={{ background: 'linear-gradient(135deg, rgb(13, 59, 110) 0%, rgb(26, 79, 160) 50%, rgb(15, 76, 138) 100%)', padding: isDesktop ? '100px 80px 140px' : '64px 24px 120px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ color: 'rgba(127,205,255,0.7)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>LOVED BY SALES LEADERS</p>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 700, color: '#DFF7FF', letterSpacing: '-0.03em' }}>
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
          SECTION 10 — FOOTER
          ================================================================ */}
      <Footer />

    </div>
  );
}
