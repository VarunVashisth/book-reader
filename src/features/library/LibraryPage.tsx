import { BookOpen, ChevronDown, Grid2X2, List, MoreHorizontal, Search, Upload, Wifi } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/storage/database';
import type { Book } from '../../types/domain';
import { useAuthStore } from '../auth/authStore';
import { addBook, deleteBook, renameBook } from './bookStorage';

export function LibraryPage() {
  const [query, setQuery] = useState('');
  const [grid, setGrid] = useState(true);
  const [sort, setSort] = useState<'recent'|'title'|'author'|'progress'>('recent');
  const [status, setStatus] = useState<'all'|'reading'|'completed'>('all');
  const [books, setBooks] = useState<Book[]>([]);
  const [message, setMessage] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { signOut, accountEmail, authMethod } = useAuthStore();
  const accountId = accountEmail ?? authMethod ?? 'local';
  const refresh = async () => setBooks(await db.books.where('accountId').equals(accountId).reverse().sortBy('updatedAt'));

  useEffect(() => { void refresh(); }, [accountId]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (!files.length) return;
    setMessage(`Adding ${files.length} book${files.length === 1 ? '' : 's'}…`);
    try {
      for (const file of files) await addBook(accountId, file);
      await refresh();
      setMessage(`${files.length} book${files.length === 1 ? '' : 's'} added.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The book could not be added.'); }
  };

  const manage = async (book: Book) => {
    const action = window.prompt('Type a new title to rename this book, or DELETE to remove it.', book.metadata.title);
    if (action === null || action === book.metadata.title) return;
    try {
      if (action === 'DELETE') await deleteBook(book); else await renameBook(book, action);
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The change could not be saved.'); }
  };

  const visibleBooks = books.filter((book) => `${book.metadata.title} ${book.metadata.authors.join(' ')}`.toLowerCase().includes(query.toLowerCase())).filter((book) => status === 'all' || (status === 'completed' ? book.progress >= 99.5 : book.progress > 0 && book.progress < 99.5)).sort((a, b) => sort === 'title' ? a.metadata.title.localeCompare(b.metadata.title) : sort === 'author' ? (a.metadata.authors[0] ?? '').localeCompare(b.metadata.authors[0] ?? '') : sort === 'progress' ? b.progress - a.progress : (b.lastOpenedAt ?? b.createdAt).localeCompare(a.lastOpenedAt ?? a.createdAt));
  const currentBook = [...books].filter((book) => book.progress > 0 && book.progress < 99.5).sort((a,b)=>(b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''))[0];
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/"><span className="brand-mark"><BookOpen size={21} /></span> Leaf</a>
      <nav aria-label="Library navigation"><a className="nav-item active" href="#library"><BookOpen size={18} /> Library <span>{books.length}</span></a></nav>
      <div className="sidebar-spacer" /><div className="sync-pill"><Wifi size={14}/> Saved on this device</div>
      <button className="profile" onClick={() => void signOut()}><span>{(accountEmail ?? 'L').slice(0, 2).toUpperCase()}</span><span><strong>{accountEmail ?? 'Your library'}</strong><small>Sign out</small></span><ChevronDown size={15}/></button>
    </aside>
    <main className="library-main" id="library">
      <header className="library-header"><div><p className="eyebrow">Local-first reading</p><h1>Your library</h1><p>Add your own PDF or EPUB books to begin.</p></div><div className="header-actions"><button className="primary-button" onClick={() => inputRef.current?.click()}><Upload size={18}/> Add books</button><input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" multiple onChange={(event) => void upload(event)} /></div></header>
      {message && <p className="library-message" role="status">{message}</p>}
      {currentBook && <section className="continue-section"><div className="section-title"><div><p className="eyebrow">Continue reading</p><h2>{currentBook.metadata.title}</h2><p>{Math.round(currentBook.progress)}% complete</p></div><button className="read-button" onClick={() => navigate(`/reader/${currentBook.id}`)}>Continue reading <span>→</span></button></div></section>}
      <section className="books-section"><div className="books-toolbar"><div><h2>{status === 'all' ? 'All books' : status === 'reading' ? 'Currently reading' : 'Completed'}</h2><span>{visibleBooks.length} {visibleBooks.length === 1 ? 'book' : 'books'}</span></div><div className="toolbar-controls"><label className="search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your library" /></label><select className="filter-select" aria-label="Filter books" value={status} onChange={(event)=>setStatus(event.target.value as typeof status)}><option value="all">All books</option><option value="reading">Reading</option><option value="completed">Completed</option></select><select className="filter-select" aria-label="Sort books" value={sort} onChange={(event)=>setSort(event.target.value as typeof sort)}><option value="recent">Recent</option><option value="title">Title</option><option value="author">Author</option><option value="progress">Progress</option></select><div className="view-toggle"><button className={grid ? 'selected' : ''} onClick={() => setGrid(true)} aria-label="Grid view"><Grid2X2 size={16}/></button><button className={!grid ? 'selected' : ''} onClick={() => setGrid(false)} aria-label="List view"><List size={17}/></button></div></div></div>
        {!books.length ? <div className="empty-library"><BookOpen size={38}/><h3>Your library is empty</h3><p>No demo books are included. Add a PDF or EPUB from your device.</p><button className="primary-button" onClick={() => inputRef.current?.click()}><Upload size={17}/> Choose books</button></div> : !visibleBooks.length ? <div className="empty-library compact"><Search size={30}/><h3>No matching books</h3><p>Try another search or filter.</p></div> : <div className={grid ? 'book-grid' : 'book-list'}>{visibleBooks.map((book) => <article className="book-card" key={book.id}><button className="book-open" aria-label={`Open ${book.metadata.title}`} onClick={() => navigate(`/reader/${book.id}`)}><div className={`book-cover real-book ${book.format} ${book.metadata.coverBlobId ? 'has-cover' : ''}`} style={book.metadata.coverBlobId ? { backgroundImage: `url(${book.metadata.coverBlobId})` } : undefined}><span>{book.format.toUpperCase()}</span>{!book.metadata.coverBlobId && <><strong>{book.metadata.title}</strong><small>{book.metadata.authors.join(', ') || 'Unknown author'}</small></>}</div></button><div className="book-meta"><h3>{book.metadata.title}</h3><p>{book.metadata.authors.join(', ') || book.format.toUpperCase()}</p><button className="manage-book" onClick={() => void manage(book)} aria-label={`Manage ${book.metadata.title}`}><MoreHorizontal size={17}/></button><div className="book-progress"><i style={{width: `${book.progress}%`}}/><span>{book.progress >= 99.5 ? 'Completed' : book.progress ? `${Math.round(book.progress)}%` : 'Not started'}</span></div></div></article>)}</div>}
      </section>
    </main>
  </div>;
}
