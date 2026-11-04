import { BookOpen, ChevronDown, Grid2X2, List, MoreHorizontal, Plus, Search, Settings, SlidersHorizontal, Upload, Wifi } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../auth/authStore';
import { sampleBooks } from './sampleBooks';

export function LibraryPage() {
  const [query, setQuery] = useState('');
  const [grid, setGrid] = useState(true);
  const signOut = useAuthStore((state) => state.signOut);
  const books = sampleBooks.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/"><span className="brand-mark"><BookOpen size={21} /></span> Leaf</a>
        <nav aria-label="Library navigation">
          <a className="nav-item active" href="#library"><BookOpen size={18} /> Library <span>4</span></a>
          <a className="nav-item" href="#highlights"><span className="nav-glyph">✦</span> Highlights <span>27</span></a>
          <a className="nav-item" href="#collections"><span className="nav-glyph">▣</span> Collections</a>
        </nav>
        <div className="sidebar-label">Collections <button aria-label="Add collection"><Plus size={15}/></button></div>
        <nav>
          <a className="nav-item sub" href="#reading"><i className="dot terra"/>Currently reading</a>
          <a className="nav-item sub" href="#favorites"><i className="dot gold"/>Favorites</a>
          <a className="nav-item sub" href="#research"><i className="dot sage"/>Research</a>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sync-pill"><Wifi size={14}/> All changes saved</div>
        <button className="profile" onClick={() => void signOut()}><span>VV</span><span><strong>Your library</strong><small>Sign out</small></span><ChevronDown size={15}/></button>
      </aside>
      <main className="library-main" id="library">
        <header className="library-header">
          <div><p className="eyebrow">Wednesday, November 4</p><h1>Your library</h1><p>Pick up where you left off, or find something new.</p></div>
          <div className="header-actions"><button className="icon-button" aria-label="Settings"><Settings size={19}/></button><button className="primary-button"><Upload size={18}/> Add books</button></div>
        </header>
        <section className="continue-section">
          <div className="section-title"><div><p className="eyebrow">Continue reading</p><h2>The Art of Stillness</h2><p>Pico Iyer · 68% complete</p></div><button className="read-button">Continue reading <span>→</span></button></div>
          <div className="reading-card"><div className="reading-cover"><span>THE ART OF</span><strong>STILLNESS</strong><small>PICO IYER</small></div><blockquote>“In an age of acceleration, nothing can be more exhilarating than going slow.”<footer>Chapter 4 · The Joy of Quiet</footer></blockquote><div className="progress-ring"><strong>68%</strong><span>2h 14m left</span></div></div>
        </section>
        <section className="books-section">
          <div className="books-toolbar"><div><h2>All books</h2><span>{books.length} books</span></div><div className="toolbar-controls"><label className="search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your library" /></label><button className="filter-button"><SlidersHorizontal size={17}/> Filter</button><div className="view-toggle"><button className={grid ? 'selected' : ''} onClick={() => setGrid(true)} aria-label="Grid view"><Grid2X2 size={16}/></button><button className={!grid ? 'selected' : ''} onClick={() => setGrid(false)} aria-label="List view"><List size={17}/></button></div></div></div>
          <div className={grid ? 'book-grid' : 'book-list'}>{books.map((book) => <article className="book-card" key={book.id}><div className="book-cover" style={{'--cover': book.color} as React.CSSProperties}><span>{book.kind}</span><strong>{book.title}</strong><small>{book.author}</small><button aria-label={`More options for ${book.title}`}><MoreHorizontal size={17}/></button></div><div className="book-meta"><h3>{book.title}</h3><p>{book.author}</p><div className="book-progress"><i style={{width: `${book.progress}%`}}/><span>{book.progress ? `${book.progress}%` : 'Not started'}</span></div></div></article>)}</div>
        </section>
      </main>
    </div>
  );
}
