import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, Clock, TrendingUp, Zap, Bot, Link2, BookOpen, BarChart2 } from 'lucide-react';
import Footer from '../components/Footer';
import { blogs } from '../config/blogData';

const categories = [
  { label: "Sales Tips", icon: <TrendingUp size={14} /> },
  { label: "Auto Dialer", icon: <Zap size={14} /> },
  { label: "AI in Sales", icon: <Bot size={14} /> },
  { label: "GHL", icon: <Link2 size={14} /> },
  { label: "Industry Guides", icon: <BookOpen size={14} /> },
  { label: "Comparisons", icon: <BarChart2 size={14} /> },
];

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("Sales Tips");
  const [searchQuery, setSearchQuery] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(window.innerWidth < 768);
    const handleResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const featuredPost = !searchQuery ? blogs.find(b => b.featured && b.category === activeCategory) : null;
  const filteredBlogs = blogs.filter(b => {
    const matchCat = b.category === activeCategory;
    const matchSearch = !searchQuery || b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch && !(featuredPost && b.id === featuredPost.id);
  });

  const activeBlog = blogs.find(b => b.category === activeCategory);
  const accentColor = activeBlog?.color || "#7FCDFF";

  return (
    <div style={{ background: '#020D1A', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; }

        .bc { transition:all .25s ease; }
        .bc:hover { transform:translateY(-8px); box-shadow:0 24px 48px rgba(0,0,0,.4)!important; }
        .bc:hover .bc-title { color:${accentColor}!important; }
        .bc:hover .bc-read  { color:${accentColor}!important; letter-spacing:.02em; }

        .cat-btn { transition:all .2s ease; }
        .cat-btn:hover { background:rgba(255,255,255,.06)!important; }

        .feat-img { transition:transform .4s ease; }
        .feat-img:hover { transform:scale(1.02); }

        .rb:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(0,0,0,.3)!important; }
        .sb:hover { transform:translateY(-1px); box-shadow:0 0 24px rgba(127,205,255,.35)!important; }

        .inp:focus { border-color:rgba(127,205,255,.5)!important; outline:none; box-shadow:0 0 0 3px rgba(127,205,255,.08); }
        .inp::placeholder { color:#1e3a5a; }

        .no-sb::-webkit-scrollbar { display:none; }
        .no-sb { -ms-overflow-style:none; scrollbar-width:none; }

        @media(max-width:768px){
          .feat-g { grid-template-columns:1fr!important; }
          .b-grid  { grid-template-columns:1fr!important; }
          .nl-f    { flex-direction:column!important; }
          .hero-h1 { font-size:2rem!important; }
          .stats-r { grid-template-columns:repeat(2,1fr)!important; }
        }
        @media(min-width:769px) and (max-width:1024px){
          .b-grid { grid-template-columns:repeat(2,1fr)!important; }
        }
      `}</style>

      {/* ══ HERO — dark navy ══ */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg,#020D1A 0%,#0A1628 100%)', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>

        {/* Top gradient fade */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(127,205,255,.06), transparent 70%)', pointerEvents: 'none', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '1240px', width: '100%', margin: '0 auto', padding: '100px clamp(1.5rem,3vw,2.5rem) 0' }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}>

            {/* Stats bar at top */}
            <div className="stats-r" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'rgba(127,205,255,.06)', border: '1px solid rgba(127,205,255,.08)', borderRadius: '16px', marginBottom: '48px', overflow: 'hidden' }}>
              {[['12', 'Articles published'], ['2M+', 'Calls analyzed'], ['6', 'Expert categories'], ['Weekly', 'New content']].map(([n, l], i) => (
                <div key={i} style={{ padding: '18px 20px', background: 'rgba(2,13,26,.6)', backdropFilter: 'blur(8px)', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(127,205,255,.06)' : 'none' }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: '#7FCDFF', letterSpacing: '-.02em' }}>{n}</div>
                  <div style={{ fontSize: '11px', color: '#2D5986', marginTop: '3px', fontWeight: 500 }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 420px', gap: '40px', alignItems: 'flex-end', paddingBottom: '0' }}>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(127,205,255,.08)', border: '1px solid rgba(127,205,255,.15)', borderRadius: '100px', padding: '5px 14px', marginBottom: '18px', color: '#7FCDFF', fontSize: '11px', fontWeight: 700, letterSpacing: '.1em' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 8px #00E5A0', display: 'inline-block' }} />
                  VOXIQ BLOG — LIVE & GROWING
                </span>
                <h1 className="hero-h1" style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(2.4rem,4.5vw,3.8rem)', fontWeight: 800, color: '#fff', letterSpacing: '-.04em', lineHeight: 1.05, margin: '0 0 16px', textShadow: '0 4px 32px rgba(127,205,255,.12)' }}>
                  Sales insights that<br />
                  <span style={{ background: 'linear-gradient(135deg,#7FCDFF,#DFF7FF,#00E5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>actually move the needle.</span>
                </h1>
                <p style={{ color: '#2D5986', fontSize: '1rem', lineHeight: 1.7, maxWidth: '480px', margin: '0 0 28px' }}>
                  Tactics, tools, and data for sales teams who dial for a living. No fluff. No theory. Just what works.
                </p>
              </div>

              {/* Search — right side */}
              <div style={{ paddingBottom: '4px' }}>
                <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(127,205,255,.1)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ color: '#7FCDFF', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Search articles</p>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#2D5986', pointerEvents: 'none' }} />
                    <input className="inp" type="text" placeholder="Power dialer, AI Agent, GHL..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(127,205,255,.12)', borderRadius: '10px', padding: '12px 14px 12px 38px', color: '#DFF7FF', fontSize: '13px', transition: '.2s' }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '14px' }}>
                    {['Auto Dialer', 'AI Agent', 'GHL', 'Cold Calling'].map(t => (
                      <button key={t} onClick={() => setSearchQuery(t)} style={{ background: 'rgba(127,205,255,.06)', border: '1px solid rgba(127,205,255,.1)', borderRadius: '20px', padding: '5px 12px', fontSize: '11px', color: '#6B9AB8', cursor: 'pointer', transition: '.15s', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                        className="cat-btn">{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom fade into category bar */}
        <div style={{ height: 60, background: 'linear-gradient(to bottom, transparent, #0A1628)', position: 'relative', zIndex: 2 }} />
      </section>

      {/* ══ CATEGORY TABS — pill style ══ */}
      <div style={{ background: '#0A1628', borderBottom: '1px solid rgba(127,205,255,.06)', position: 'sticky', top: 64, zIndex: 100 }}>
        <div className="no-sb" style={{ display: 'flex', overflowX: 'auto', maxWidth: '1240px', margin: '0 auto', padding: '14px clamp(1.5rem,3vw,2.5rem)', gap: '8px' }}>
          {categories.map(({ label, icon }) => {
            const active = activeCategory === label;
            const blog = blogs.find(b => b.category === label);
            return (
              <button key={label} className="cat-btn" onClick={() => setActiveCategory(label)} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', border: 'none', whiteSpace: 'nowrap', transition: 'all .2s',
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                background: active ? blog?.color || '#7FCDFF' : 'rgba(255,255,255,.04)',
                color: active ? '#020D1A' : '#6B9AB8',
                boxShadow: active ? `0 4px 16px rgba(127,205,255,.25)` : 'none',
                transform: active ? 'scale(1.03)' : 'scale(1)',
              }}>
                {icon}{label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ FEATURED POST ══ */}
      <AnimatePresence mode="wait">
        {featuredPost && (
          <motion.section key={featuredPost.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .3 }}
            style={{ background: '#0A1628', padding: '40px clamp(1.5rem,calc((100% - 1240px)/2 + 2rem),999px) 0' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: 28, height: 2, borderRadius: 2, background: accentColor }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: accentColor, letterSpacing: '.1em', textTransform: 'uppercase' }}>Featured Article</span>
            </div>

            <div className="feat-g" style={{ display: 'grid', gridTemplateColumns: '1fr 480px', gap: '0', borderRadius: '24px', overflow: 'hidden', border: `1px solid rgba(127,205,255,.08)`, boxShadow: '0 32px 64px rgba(0,0,0,.4)' }}>

              {/* Left — gradient image */}
              <Link to={`/blog/${featuredPost.id}`} style={{ textDecoration: 'none', display: 'block', background: featuredPost.bg, position: 'relative', overflow: 'hidden', minHeight: 340 }} className="feat-img">
                <div style={{ backgroundImage: 'linear-gradient(rgba(127,205,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(127,205,255,.04) 1px,transparent 1px)', backgroundSize: '28px 28px', position: 'absolute', inset: 0 }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '20px', background: `rgba(${accentColor === '#7FCDFF' ? '127,205,255' : '0,229,160'},.12)`, border: `1px solid rgba(${accentColor === '#7FCDFF' ? '127,205,255' : '0,229,160'},.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>📊</div>
                    <span style={{ background: `rgba(127,205,255,.15)`, border: '1px solid rgba(127,205,255,.25)', color: '#7FCDFF', fontSize: '10px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>{featuredPost.category}</span>
                    <div style={{ marginTop: '16px', fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#fff', lineHeight: 1.25, maxWidth: '280px' }}>{featuredPost.title}</div>
                  </div>
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, rgba(0,0,0,.5), transparent)' }} />
              </Link>

              {/* Right — text */}
              <div style={{ background: '#111929', padding: '36px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}44`, color: accentColor, fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '100px', display: 'inline-block', marginBottom: '14px', alignSelf: 'flex-start' }}>{featuredPost.category}</span>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-.025em', lineHeight: 1.2, marginBottom: '14px' }}>{featuredPost.title}</h2>
                <p style={{ fontSize: '.95rem', color: '#64748B', lineHeight: 1.75, marginBottom: '20px' }}>{featuredPost.excerpt}</p>
                <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#334155', marginBottom: '24px', fontWeight: 500 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={12} color="#334155" />{featuredPost.date}</span>
                  <span>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><TrendingUp size={12} color="#334155" />{featuredPost.readTime} read</span>
                </div>
                <Link to={`/blog/${featuredPost.id}`} className="rb" style={{ background: `linear-gradient(135deg,${accentColor},#5BB8F5)`, color: '#020D1A', padding: '13px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start', transition: '.2s' }}>
                  Read Article <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ══ BLOG GRID ══ */}
      <section style={{ background: '#0A1628', padding: '40px clamp(1.5rem,calc((100% - 1240px)/2 + 2rem),999px) 64px' }}>

        {filteredBlogs.length === 0 && searchQuery && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#334155' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#7FCDFF', marginBottom: '8px' }}>No results for "{searchQuery}"</h3>
            <p style={{ fontSize: '.9rem' }}>Try a different keyword or browse by category above.</p>
          </div>
        )}

        {filteredBlogs.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{ width: 28, height: 2, borderRadius: 2, background: accentColor }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: accentColor, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                {searchQuery ? `${filteredBlogs.length} results` : `More in ${activeCategory}`}
              </span>
            </div>

            <div className="b-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {filteredBlogs.map((blog, i) => (
                <motion.div key={blog.id} className="bc" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .4, delay: i * .06 }}
                  style={{ background: '#111929', border: '1px solid rgba(127,205,255,.07)', borderRadius: '18px', overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>
                  <Link to={`/blog/${blog.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>

                    {/* Card image */}
                    <div style={{ height: 170, background: blog.bg, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ backgroundImage: 'linear-gradient(rgba(127,205,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(127,205,255,.04) 1px,transparent 1px)', backgroundSize: '20px 20px', position: 'absolute', inset: 0 }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '14px', background: `${blog.color}22`, border: `1px solid ${blog.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                          {blog.category === 'Sales Tips' ? '📈' : blog.category === 'Auto Dialer' ? '⚡' : blog.category === 'AI in Sales' ? '🤖' : blog.category === 'GHL' ? '🔗' : blog.category === 'Industry Guides' ? '📖' : '⚖️'}
                        </div>
                      </div>
                      <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(8px)', border: `1px solid ${blog.color}44`, color: blog.color, fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', zIndex: 2 }}>{blog.category}</span>
                      <span style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,.7)', fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', zIndex: 2, display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={9} />{blog.readTime}</span>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top,rgba(0,0,0,.5),transparent)' }} />
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 className="bc-title" style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1rem', fontWeight: 700, color: '#E2E8F0', letterSpacing: '-.01em', lineHeight: 1.35, marginBottom: '10px', transition: 'color .2s' }}>{blog.title}</h3>
                        <p style={{ fontSize: '.83rem', color: '#64748B', lineHeight: 1.65, marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{blog.excerpt}</p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(127,205,255,.06)' }}>
                        <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>{blog.date}</span>
                        <span className="bc-read" style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all .15s' }}>
                          Read <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ══ NEWSLETTER ══ */}
      <section style={{ background: '#020D1A', borderTop: '1px solid rgba(127,205,255,.06)', padding: '64px clamp(1.5rem,3vw,2.5rem)' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(127,205,255,.08)', border: '1px solid rgba(127,205,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px' }}>📬</div>
          <span style={{ color: '#7FCDFF', fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', display: 'block', marginBottom: '14px' }}>STAY SHARP</span>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", color: '#F1F5F9', fontSize: 'clamp(1.5rem,3vw,2.1rem)', fontWeight: 700, letterSpacing: '-.03em', margin: '0 0 10px' }}>
            Weekly sales tactics, delivered.
          </h2>
          <p style={{ color: '#64748B', fontSize: '.95rem', marginBottom: '28px', lineHeight: 1.65 }}>
            No fluff. Just tactics that help your team dial more and close more. Join 1,200+ sales leaders.
          </p>

          {!submitted ? (
            <form className="nl-f" onSubmit={e => { e.preventDefault(); if (email.trim()) { setSubmitted(true); setEmail(''); } }} style={{ display: 'flex', gap: '10px', maxWidth: '440px', margin: '0 auto' }}>
              <input className="inp" type="email" required placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
                style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(127,205,255,.12)', borderRadius: '10px', padding: '13px 16px', color: '#DFF7FF', fontSize: '14px', transition: '.2s' }} />
              <button className="sb" type="submit" style={{ background: 'linear-gradient(135deg,#7FCDFF,#5BB8F5)', color: '#020D1A', fontWeight: 700, fontSize: '14px', padding: '13px 22px', borderRadius: '10px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: '.2s' }}>
                Subscribe
              </button>
            </form>
          ) : (
            <motion.p initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ color: '#00E5A0', fontSize: '15px', fontWeight: 700, padding: '12px', background: 'rgba(0,229,160,.08)', border: '1px solid rgba(0,229,160,.2)', borderRadius: '12px', display: 'inline-block' }}>
              ✓ You're in! First issue coming soon.
            </motion.p>
          )}
          <p style={{ color: 'rgba(127,205,255,.25)', fontSize: '12px', marginTop: '12px' }}>Unsubscribe anytime. No spam ever.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}