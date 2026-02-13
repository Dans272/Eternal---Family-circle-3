import React, { useState, useRef, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, BookOpen, Users, Settings, Trash2,
  MessageCircle, Paperclip, X, Check, Calendar, User as UserIcon,
  Star, Send, Image as ImageIcon, Volume2, Video, FileText, Plus
} from 'lucide-react';
import {
  Circle, CirclePost, CircleComment, CircleAttachment,
  CirclePostWhen, FaceTag, Profile, Memory
} from '../types';

// ─── palette ─────────────────────────────────────────────────────────────────
const p = {
  bg:     '#f5f2eb',
  card:   '#ffffff',
  border: 'rgba(0,0,0,0.08)',
  text:   '#1c1917',
  muted:  '#78716c',
  faint:  '#a8a29e',
  amber:  '#b45309',
  amberL: '#fef3c7',
  dark:   '#1c1917',
  event:  '#f0f4ff',   // blue-tinted bg for auto-generated event posts
  eventB: '#c7d2fe',
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function sid(prefix: string) {
  return `${prefix}_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}
function hSize(b: number) {
  if (!b) return '';
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}
function inferKind(mime: string, name: string): CircleAttachment['kind'] {
  const t = mime.toLowerCase();
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  if (t === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'document';
  return 'file';
}
function whenLabel(w: CirclePostWhen): string {
  if (w.kind === 'exact' && w.exactDate) {
    const d = new Date(w.exactDate);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  }
  if (w.kind === 'year')      return `Circa ${(w as any).year}`;
  if (w.kind === 'yearMonth') return `Circa ${(w as any).year}-${String((w as any).month).padStart(2,'0')}`;
  if (w.kind === 'range')     return `Between ${(w as any).startDate} and ${(w as any).endDate}`;
  return '';
}
function whenSort(w: CirclePostWhen): number {
  if (w.kind==='exact')     { const d=new Date((w as any).exactDate); return isNaN(d.getTime())?9999:d.getFullYear()+d.getMonth()/12+d.getDate()/365; }
  if (w.kind==='year')      return parseInt((w as any).year)||9999;
  if (w.kind==='yearMonth') return (parseInt((w as any).year)||9999)+(parseInt((w as any).month)||0)/12;
  return 9999;
}
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── WhenPicker ───────────────────────────────────────────────────────────────
const WhenPicker: React.FC<{ value: CirclePostWhen; onChange:(w:CirclePostWhen)=>void }> = ({ value, onChange }) => {
  const k = value.kind;
  const sel = (style?: React.CSSProperties) => ({
    padding:'8px 10px', borderRadius:10, border:`1px solid ${p.border}`,
    fontSize:13, background:p.bg, width:'100%', boxSizing:'border-box' as const, ...style
  });
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <select value={k} onChange={e => {
        const nk = e.target.value as CirclePostWhen['kind'];
        if (nk==='exact')     onChange({ kind:'exact', exactDate:'' });
        if (nk==='year')      onChange({ kind:'year', year:'' });
        if (nk==='yearMonth') onChange({ kind:'yearMonth', year:'', month:'1' });
        if (nk==='range')     onChange({ kind:'range', startDate:'', endDate:'' });
        if (nk==='unknown')   onChange({ kind:'unknown' });
      }} style={sel()}>
        <option value="exact">Exact date</option>
        <option value="yearMonth">Approximate month + year</option>
        <option value="year">Approximate year only</option>
        <option value="range">Date range</option>
        <option value="unknown">Unknown</option>
      </select>
      {k==='exact' && <input type="date" value={(value as any).exactDate||''} onChange={e=>onChange({kind:'exact',exactDate:e.target.value})} style={sel()} />}
      {k==='year'  && <input type="number" placeholder="Year e.g. 1944" value={(value as any).year||''} onChange={e=>onChange({kind:'year',year:e.target.value})} style={sel()} />}
      {k==='yearMonth' && <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <input type="number" placeholder="Year" value={(value as any).year||''} onChange={e=>onChange({...(value as any), kind:'yearMonth', year:e.target.value})} style={sel()} />
        <select value={(value as any).month||'1'} onChange={e=>onChange({...(value as any), kind:'yearMonth', month:e.target.value})} style={sel()}>
          {MONTHS_SHORT.map((m,i) => <option key={m} value={String(i+1)}>{m}</option>)}
        </select>
      </div>}
      {k==='range' && <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <input type="date" value={(value as any).startDate||''} onChange={e=>onChange({...(value as any), kind:'range', startDate:e.target.value})} style={sel()} />
        <input type="date" value={(value as any).endDate||''} onChange={e=>onChange({...(value as any), kind:'range', endDate:e.target.value})} style={sel()} />
      </div>}
      {k !== 'unknown' && whenLabel(value) && (
        <div style={{ fontSize:11, color:p.amber, fontWeight:700 }}>📅 {whenLabel(value)}</div>
      )}
    </div>
  );
};

// ─── FaceTagOverlay — hover on image to place a tag ───────────────────────────
const FaceTagOverlay: React.FC<{
  attachment: CircleAttachment;
  profiles: Profile[];
  onUpdate: (updated: CircleAttachment) => void;
}> = ({ attachment, profiles, onUpdate }) => {
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<{ x:number; y:number } | null>(null);
  const [search, setSearch] = useState('');
  const [editingTagId, setEditingTagId] = useState<string|null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const results = search.trim().length >= 1
    ? profiles.filter(pr => pr.name.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : [];

  const handleImgClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!placing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDraft({ x, y });
    setSearch('');
    setEditingTagId(null);
  };

  const commitTag = (profile: Profile) => {
    if (!draft) return;
    const tag: FaceTag = { id: sid('ft'), profileId: profile.id, label: profile.name, x: draft.x, y: draft.y, w: 0.12, h: 0.12 };
    onUpdate({ ...attachment, faceTags: [...(attachment.faceTags||[]), tag] });
    setDraft(null); setSearch(''); setPlacing(false);
  };

  const removeTag = (tagId: string) => {
    onUpdate({ ...attachment, faceTags: (attachment.faceTags||[]).filter(t => t.id !== tagId) });
  };

  if (!attachment.dataUrl) return null;

  return (
    <div style={{ position:'relative', display:'inline-block', width:'100%' }}>
      <img
        ref={imgRef}
        src={attachment.dataUrl}
        onClick={handleImgClick}
        style={{ width:'100%', borderRadius:12, display:'block', cursor: placing ? 'crosshair' : 'default' }}
      />

      {/* Existing face tags */}
      {(attachment.faceTags||[]).map(tag => (
        <div key={tag.id} style={{
          position:'absolute', left:`${tag.x*100}%`, top:`${tag.y*100}%`,
          width:`${tag.w*100}%`, height:`${tag.h*100}%`,
          border:`2px solid ${p.amber}`, borderRadius:4,
          transform:'translate(-50%,-50%)',
        }}>
          <div style={{
            position:'absolute', bottom:-22, left:'50%', transform:'translateX(-50%)',
            background:p.dark, color:'#fff', fontSize:10, fontWeight:700,
            padding:'2px 6px', borderRadius:6, whiteSpace:'nowrap',
            display:'flex', alignItems:'center', gap:4,
          }}>
            {tag.label}
            <button onClick={() => removeTag(tag.id)} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', padding:0, lineHeight:1 }}>×</button>
          </div>
        </div>
      ))}

      {/* Draft tag position */}
      {draft && (
        <div style={{
          position:'absolute', left:`${draft.x*100}%`, top:`${draft.y*100}%`,
          width:48, height:48, border:`2px dashed ${p.amber}`,
          transform:'translate(-50%,-50%)', borderRadius:4,
        }} />
      )}

      {/* Tag / search panel */}
      <div style={{ marginTop:6, display:'flex', gap:8, alignItems:'flex-start' }}>
        <button onClick={() => { setPlacing(!placing); setDraft(null); }} style={{
          padding:'5px 12px', borderRadius:10, fontSize:11, fontWeight:700,
          border:`1px solid ${placing ? p.amber : p.border}`,
          background: placing ? p.amberL : p.bg, color: placing ? p.amber : p.muted,
          cursor:'pointer', flexShrink:0,
        }}>
          {placing ? '× Cancel tag' : '+ Tag person'}
        </button>

        {(placing || draft) && (
          <div style={{ flex:1, position:'relative' }}>
            <input
              autoFocus
              placeholder={draft ? 'Type a name to tag…' : 'Click image first, then type name'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width:'100%', padding:'6px 10px', borderRadius:10, border:`1px solid ${p.border}`, fontSize:13, boxSizing:'border-box', background:p.bg }}
            />
            {results.length > 0 && (
              <div style={{
                position:'absolute', top:'100%', left:0, right:0, zIndex:100,
                background:p.card, border:`1px solid ${p.border}`, borderRadius:10,
                boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden', marginTop:2,
              }}>
                {results.map(pr => (
                  <button key={pr.id} onClick={() => commitTag(pr)} style={{
                    width:'100%', display:'flex', alignItems:'center', gap:10,
                    padding:'8px 12px', background:'none', border:'none', cursor:'pointer',
                    textAlign:'left', borderBottom:`1px solid ${p.border}`,
                  }}>
                    <img src={pr.imageUrl} style={{ width:28, height:28, borderRadius:8, objectFit:'cover', filter:'grayscale(40%)', flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:p.text }}>{pr.name}</div>
                      <div style={{ fontSize:10, color:p.faint }}>{pr.birthYear}{pr.deathYear ? ` — ${pr.deathYear}` : ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MediaAttachmentCard ──────────────────────────────────────────────────────
const MediaAttachmentCard: React.FC<{
  att: CircleAttachment;
  profiles: Profile[];
  editable?: boolean;
  onUpdate?: (a: CircleAttachment) => void;
  onRemove?: () => void;
}> = ({ att, profiles, editable=false, onUpdate, onRemove }) => {
  const [preview, setPreview] = useState(false);
  const KindIcon = att.kind==='image' ? ImageIcon : att.kind==='video' ? Video : att.kind==='audio' ? Volume2 : FileText;

  return (
    <div style={{ border:`1px solid ${p.border}`, borderRadius:12, overflow:'hidden', background:p.bg }}>
      {/* Image with face tag overlay */}
      {att.kind==='image' && att.dataUrl && (
        <div style={{ padding: editable ? 8 : 0 }}>
          {editable && onUpdate
            ? <FaceTagOverlay attachment={att} profiles={profiles} onUpdate={onUpdate} />
            : (
              <div style={{ position:'relative' }}>
                <img src={att.dataUrl} onClick={()=>setPreview(true)} style={{ width:'100%', borderRadius:editable?8:0, display:'block', cursor:'pointer' }} />
                {/* Show existing tags on view mode */}
                {(att.faceTags||[]).map(tag => (
                  <div key={tag.id} style={{
                    position:'absolute', left:`${tag.x*100}%`, top:`${tag.y*100}%`,
                    border:`2px solid ${p.amber}`, borderRadius:4,
                    width:`${tag.w*100}%`, height:`${tag.h*100}%`,
                    transform:'translate(-50%,-50%)',
                    pointerEvents:'none',
                  }}>
                    <div style={{ position:'absolute', bottom:-20, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.75)', color:'#fff', fontSize:10, padding:'2px 5px', borderRadius:4, whiteSpace:'nowrap' }}>
                      {tag.label}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}
      {/* Audio player */}
      {att.kind==='audio' && att.dataUrl && (
        <div style={{ padding:'10px 12px' }}>
          <audio controls src={att.dataUrl} style={{ width:'100%' }} />
        </div>
      )}
      {/* Video player */}
      {att.kind==='video' && att.dataUrl && (
        <div>
          <video controls src={att.dataUrl} style={{ width:'100%', display:'block', maxHeight:300 }} />
        </div>
      )}
      {/* File row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <KindIcon size={14} style={{ color:p.faint, flexShrink:0 }} />
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:p.text }}>{att.name}</div>
            <div style={{ fontSize:10, color:p.faint }}>{hSize(att.sizeBytes)}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {att.dataUrl && att.kind!=='image' && att.kind!=='video' && att.kind!=='audio' && (
            <button onClick={()=>setPreview(true)} style={{ fontSize:11, fontWeight:700, color:p.amber, background:'none', border:'none', cursor:'pointer' }}>Preview</button>
          )}
          {editable && onRemove && (
            <button onClick={onRemove} style={{ background:'none', border:'none', cursor:'pointer', color:p.faint }}><X size={14} /></button>
          )}
        </div>
      </div>

      {/* Full-screen preview */}
      {preview && (
        <div onClick={()=>setPreview(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:24 }}>
          <div style={{ maxWidth:700, width:'100%', background:'#fff', borderRadius:20, overflow:'hidden' }} onClick={e=>e.stopPropagation()}>
            {att.kind==='image' && <img src={att.dataUrl!} style={{ width:'100%', display:'block' }} />}
            <div style={{ padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, color:p.muted }}>{att.name}</span>
              <button onClick={()=>setPreview(false)} style={{ background:p.dark, color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:700 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PostComposer ─────────────────────────────────────────────────────────────
const PostComposer: React.FC<{
  profiles: Profile[];
  userId: string;
  userName: string;
  circleId: string;
  onSubmit: (post: CirclePost) => void;
}> = ({ profiles, userId, userName, circleId, onSubmit }) => {
  const [title,  setTitle]  = useState('');
  const [body,   setBody]   = useState('');
  const [when,   setWhen]   = useState<CirclePostWhen>({ kind:'unknown' });
  const [tagged, setTagged] = useState<Set<string>>(new Set());
  const [atts,   setAtts]   = useState<CircleAttachment[]>([]);
  const [showWhen, setShowWhen] = useState(false);
  const [showTag,  setShowTag]  = useState(false);
  const fileRef  = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string|null>(null);
  const showT = (m:string) => { setToast(m); setTimeout(()=>setToast(null),2000); };

  const handleFiles = async (files: FileList) => {
    const next: CircleAttachment[] = [];
    for (const f of Array.from(files)) {
      const kind = inferKind(f.type||'', f.name);
      let dataUrl: string|null = null;
      if (kind==='image'||kind==='audio'||kind==='video') {
        dataUrl = await new Promise(res => { const r=new FileReader(); r.onload=e=>res(e.target?.result as string); r.readAsDataURL(f); });
      }
      next.push({ id:sid('att'), name:f.name, kind, mimeType:f.type||'', sizeBytes:f.size, dataUrl, faceTags:[] });
    }
    setAtts(prev => [...prev, ...next]);
  };

  const updateAtt = (id: string, updated: CircleAttachment) => {
    setAtts(prev => prev.map(a => a.id===id ? updated : a));
  };

  const submit = () => {
    if (!title.trim() && !body.trim() && atts.length===0) { showT('Add a title, story, or file'); return; }
    if (tagged.size===0) { showT('Tag at least one person'); return; }
    const post: CirclePost = {
      id: sid('post'), circleId, authorId: userId, authorName: userName,
      createdAt: new Date().toISOString(),
      title: title.trim(), body: body.trim(),
      peopleIds: Array.from(tagged),
      when, attachments: atts, comments: [], postKind: 'memory',
    };
    onSubmit(post);
    setTitle(''); setBody(''); setWhen({ kind:'unknown' }); setTagged(new Set()); setAtts([]);
    setShowWhen(false); setShowTag(false);
  };

  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    width:'100%', padding:'10px 12px', borderRadius:12, border:`1px solid ${p.border}`,
    fontSize:14, background:p.bg, boxSizing:'border-box', ...extra
  });

  return (
    <div style={{ background:p.card, borderRadius:24, border:`1px solid ${p.border}`, overflow:'hidden' }}>
      <div style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${p.border}` }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:p.dark, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <UserIcon size={18} style={{ color:'#fff' }} />
        </div>
        <input placeholder={`Share a memory, ${userName.split(' ')[0]}…`} value={title}
          onChange={e=>setTitle(e.target.value)}
          style={{ flex:1, background:'none', border:'none', fontSize:15, color:p.text, outline:'none' }}
          onFocus={()=>setShowTag(true)}
        />
      </div>

      {(showTag || title || body) && (
        <div style={{ padding:'0 18px 16px' }}>
          <textarea placeholder="Tell the story behind this memory…" value={body} onChange={e=>setBody(e.target.value)}
            style={{ ...inp({ minHeight:80, resize:'vertical', marginTop:12, lineHeight:1.55 }) }} />

          {/* Attachments preview */}
          {atts.length > 0 && (
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
              {atts.map(a => (
                <MediaAttachmentCard key={a.id} att={a} profiles={profiles} editable
                  onUpdate={updated => updateAtt(a.id, updated)}
                  onRemove={() => setAtts(prev => prev.filter(x=>x.id!==a.id))}
                />
              ))}
            </div>
          )}

          {/* Tag people */}
          <div style={{ marginTop:12 }}>
            <p style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:p.faint, margin:'0 0 8px' }}>Tag people in this memory</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {profiles.map(pr => {
                const on = tagged.has(pr.id);
                return (
                  <button key={pr.id} onClick={()=>setTagged(prev => { const n=new Set(prev); on?n.delete(pr.id):n.add(pr.id); return n; })}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px 4px 4px', borderRadius:20, border:`1px solid ${on?p.amber:p.border}`, background:on?p.amberL:p.bg, cursor:'pointer' }}>
                    <img src={pr.imageUrl} style={{ width:22, height:22, borderRadius:6, objectFit:'cover', filter:'grayscale(30%)' }} />
                    <span style={{ fontSize:12, fontWeight: on?700:400, color:on?p.amber:p.text }}>{pr.name}</span>
                    {on && <Check size={11} style={{ color:p.amber }} />}
                  </button>
                );
              })}
              {profiles.length===0 && <p style={{ fontSize:12, color:p.faint, fontStyle:'italic', margin:0 }}>Import a GEDCOM to tag family members.</p>}
            </div>
          </div>

          {/* When did it happen */}
          <div style={{ marginTop:12 }}>
            <button onClick={()=>setShowWhen(!showWhen)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:showWhen?p.amber:p.muted }}>
              <Calendar size={13} /> When did it happen? {whenLabel(when) ? `· ${whenLabel(when)}` : ''}
            </button>
            {showWhen && <div style={{ marginTop:8 }}><WhenPicker value={when} onChange={setWhen} /></div>}
          </div>

          {/* Action bar */}
          <div style={{ marginTop:14, display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={()=>fileRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:10, border:`1px solid ${p.border}`, background:p.bg, cursor:'pointer', fontSize:12, fontWeight:700, color:p.muted }}>
              <Paperclip size={14} /> Add Media
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*,application/pdf" style={{ display:'none' }}
              onChange={e=>{ if(e.target.files) handleFiles(e.target.files); e.target.value=''; }}
            />
            <button onClick={submit} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'8px 18px', borderRadius:10, background:p.dark, border:'none', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
              <Send size={14} /> Post
            </button>
          </div>
        </div>
      )}
      {toast && <Toast msg={toast} />}
    </div>
  );
};

// ─── PostCard ─────────────────────────────────────────────────────────────────
const PostCard: React.FC<{
  post: CirclePost;
  profiles: Profile[];
  userId: string;
  onDelete: ()=>void;
  onAddComment: (postId:string, body:string)=>void;
}> = ({ post, profiles, userId, onDelete, onAddComment }) => {
  const [open,    setOpen]    = useState(false);
  const [comment, setComment] = useState('');
  const isEvent = post.postKind === 'event';
  const tagged = post.peopleIds.map(id=>profiles.find(pr=>pr.id===id)).filter(Boolean) as Profile[];

  // Find all face-tagged people across attachments
  const faceTaggedProfiles = post.attachments.flatMap(a =>
    (a.faceTags||[]).map(t => profiles.find(pr=>pr.id===t.profileId)).filter(Boolean)
  ) as Profile[];
  const allTagged = [...new Map([...tagged, ...faceTaggedProfiles].map(pr=>[pr.id,pr])).values()];

  return (
    <div style={{ background: isEvent ? p.event : p.card, borderRadius:24, border:`1px solid ${isEvent?p.eventB:p.border}`, overflow:'hidden' }}>
      <div style={{ padding:'16px 18px' }}>
        {/* Author + type */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:isEvent?p.eventB:p.dark, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {isEvent ? <Star size={15} style={{ color:'#4f46e5' }} /> : <UserIcon size={15} style={{ color:'#fff' }} />}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:p.text }}>{post.authorName}</div>
              <div style={{ fontSize:10, color:p.faint }}>{new Date(post.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
            </div>
          </div>
          {post.authorId === userId && !isEvent && (
            <button onClick={onDelete} style={{ background:'none', border:'none', cursor:'pointer', color:p.faint }}><Trash2 size={14} /></button>
          )}
        </div>

        {/* Date of event */}
        {whenLabel(post.when) && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, background:isEvent?p.eventB:p.amberL, marginBottom:8 }}>
            <Calendar size={11} style={{ color: isEvent?'#4f46e5':p.amber }} />
            <span style={{ fontSize:11, fontWeight:800, color:isEvent?'#4f46e5':p.amber }}>{whenLabel(post.when)}</span>
          </div>
        )}

        {/* Title */}
        {post.title && (
          <div style={{ fontFamily:'Crimson Text, Georgia, serif', fontSize:isEvent?16:20, fontWeight:600, color:p.text, lineHeight:1.25, marginBottom:6 }}>
            {post.title}
          </div>
        )}

        {/* Body */}
        {post.body && (
          <p style={{ fontSize:14, color:p.muted, lineHeight:1.6, margin:'0 0 10px', fontStyle:isEvent?'italic':'normal' }}>{post.body}</p>
        )}

        {/* Attachments */}
        {post.attachments.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:10 }}>
            {post.attachments.map(a => (
              <MediaAttachmentCard key={a.id} att={a} profiles={profiles} />
            ))}
          </div>
        )}

        {/* Tagged people chips */}
        {allTagged.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
            {allTagged.map(pr => (
              <div key={pr.id} style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px 2px 2px', borderRadius:20, background:p.bg, border:`1px solid ${p.border}` }}>
                <img src={pr.imageUrl} style={{ width:18, height:18, borderRadius:5, objectFit:'cover', filter:'grayscale(30%)' }} />
                <span style={{ fontSize:11, fontWeight:700, color:p.text }}>{pr.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Comment toggle */}
        <button onClick={()=>setOpen(!open)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:p.muted, padding:0 }}>
          <MessageCircle size={14} />
          {post.comments.length > 0 ? `${post.comments.length} comment${post.comments.length>1?'s':''}` : 'Comment'}
        </button>
      </div>

      {/* Comments */}
      {open && (
        <div style={{ borderTop:`1px solid ${p.border}`, padding:'12px 18px', display:'flex', flexDirection:'column', gap:8 }}>
          {post.comments.map(cm => (
            <div key={cm.id} style={{ display:'flex', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:p.bg, border:`1px solid ${p.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <UserIcon size={12} style={{ color:p.faint }} />
              </div>
              <div style={{ background:p.bg, borderRadius:12, padding:'8px 12px', flex:1 }}>
                <div style={{ fontSize:11, fontWeight:800, color:p.text, marginBottom:2 }}>{cm.authorName}</div>
                <div style={{ fontSize:13, color:p.muted, lineHeight:1.45 }}>{cm.body}</div>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:8 }}>
            <input value={comment} onChange={e=>setComment(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&comment.trim()){ onAddComment(post.id, comment.trim()); setComment(''); }}}
              placeholder="Write a comment…"
              style={{ flex:1, padding:'8px 12px', borderRadius:20, border:`1px solid ${p.border}`, fontSize:13, background:p.bg, outline:'none' }}
            />
            <button onClick={()=>{ if(comment.trim()){ onAddComment(post.id, comment.trim()); setComment(''); }}}
              style={{ width:34, height:34, borderRadius:'50%', background:p.dark, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <Send size={14} style={{ color:'#fff' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PersonTimeline ───────────────────────────────────────────────────────────
const PersonTimeline: React.FC<{
  person: Profile;
  posts: CirclePost[];
  onBack: ()=>void;
}> = ({ person, posts, onBack }) => {
  const sorted = [...posts].sort((a,b)=>whenSort(a.when)-whenSort(b.when));
  return (
    <div>
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:p.faint, marginBottom:16 }}>
        <ChevronLeft size={16} />
        <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase' }}>All people</span>
      </button>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20, padding:'14px 16px', background:p.card, borderRadius:20, border:`1px solid ${p.border}` }}>
        <img src={person.imageUrl} style={{ width:52, height:52, borderRadius:16, objectFit:'cover', filter:'grayscale(40%)', flexShrink:0 }} />
        <div>
          <div style={{ fontFamily:'Crimson Text, Georgia, serif', fontSize:22, fontWeight:600, color:p.text }}>{person.name}</div>
          <div style={{ fontSize:10, fontWeight:700, color:p.faint, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>
            {person.birthYear}{person.deathYear ? ` — ${person.deathYear}` : ''} · {sorted.length} circle memor{sorted.length===1?'y':'ies'}
          </div>
        </div>
      </div>
      {sorted.length===0 ? (
        <p style={{ fontStyle:'italic', color:p.faint, fontSize:14 }}>No circle posts yet for this person.</p>
      ) : sorted.map(post => (
        <div key={post.id} style={{ padding:'14px 16px', background:post.postKind==='event'?p.event:p.card, borderRadius:20, border:`1px solid ${post.postKind==='event'?p.eventB:p.border}`, marginBottom:10 }}>
          {whenLabel(post.when) && <div style={{ fontSize:10, fontWeight:800, color:post.postKind==='event'?'#4f46e5':p.amber, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{whenLabel(post.when)}</div>}
          {post.title && <div style={{ fontFamily:'Crimson Text, Georgia, serif', fontSize:17, fontWeight:600, color:p.text, marginBottom:4 }}>{post.title}</div>}
          {post.body  && <p style={{ fontSize:13, color:p.muted, lineHeight:1.5, margin:0, fontStyle:post.postKind==='event'?'italic':'normal' }}>{post.body}</p>}
          {post.attachments.length>0 && <div style={{ marginTop:6, fontSize:11, color:p.faint }}>{post.attachments.length} attachment{post.attachments.length>1?'s':''}</div>}
        </div>
      ))}
    </div>
  );
};

// ─── SettingsPanel ────────────────────────────────────────────────────────────
const SettingsPanel: React.FC<{
  circle: Circle;
  onUpdate: (c:Circle)=>void;
  onToast: (s:string)=>void;
}> = ({ circle, onUpdate, onToast }) => {
  const [name, setName] = useState(circle.name);
  const [desc, setDesc] = useState(circle.description);
  const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:12, border:`1px solid ${p.border}`, fontSize:14, background:p.bg, boxSizing:'border-box' };
  return (
    <div style={{ background:p.card, borderRadius:24, padding:20, border:`1px solid ${p.border}` }}>
      <p style={{ fontSize:10, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:p.faint, marginBottom:14, marginTop:0 }}>Circle settings</p>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:p.muted, display:'block', marginBottom:4 }}>Circle name</label>
          <input value={name} onChange={e=>setName(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:p.muted, display:'block', marginBottom:4 }}>Description</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} style={{ ...inp, minHeight:70, resize:'vertical' }} />
        </div>
        <button onClick={()=>{ onUpdate({...circle, name:name.trim()||circle.name, description:desc.trim()}); onToast('Saved'); }}
          style={{ padding:'10px 20px', borderRadius:12, background:p.dark, border:'none', color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer', alignSelf:'flex-start', letterSpacing:'0.08em', textTransform:'uppercase' }}>
          Save changes
        </button>
      </div>
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast: React.FC<{ msg:string }> = ({ msg }) => (
  <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:p.dark, color:'#fff', padding:'10px 18px', borderRadius:14, fontSize:13, fontWeight:700, boxShadow:'0 8px 24px rgba(0,0,0,0.3)', zIndex:9999, whiteSpace:'nowrap' }}>{msg}</div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
type Tab = 'feed' | 'people' | 'settings';

interface Props {
  onBack: ()=>void;
  profiles: Profile[];
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  circles: Circle[];
  setCircles: React.Dispatch<React.SetStateAction<Circle[]>>;
  userId: string;
  userName: string;
}

const FamilyCircleView: React.FC<Props> = ({ onBack, profiles, setProfiles, circles, setCircles, userId, userName }) => {
  const [tab, setTab]           = useState<Tab>('feed');
  const [activeId, setActiveId] = useState<string|null>(circles[0]?.id||null);
  const [selPerson, setSelPerson] = useState<string|null>(null);
  const [toast, setToast]       = useState<string|null>(null);
  const [newName, setNewName]   = useState('');
  const [newDesc, setNewDesc]   = useState('');
  const showT = (m:string) => { setToast(m); setTimeout(()=>setToast(null),2200); };

  // Auto-select the newest circle if activeId points to nothing (e.g. after GEDCOM import)
  React.useEffect(() => {
    if (!activeId && circles.length > 0) {
      setActiveId(circles[0].id);
    } else if (activeId && !circles.find(c => c.id === activeId) && circles.length > 0) {
      setActiveId(circles[0].id);
    }
  }, [circles, activeId]);

  const circle = circles.find(c=>c.id===activeId)||null;

  const updateCircle = useCallback((updated: Circle) => {
    setCircles(prev => prev.map(c => c.id===updated.id ? updated : c));
  }, [setCircles]);

  // When a memory post is submitted, also write back to profile.memories[]
  const handleNewPost = (post: CirclePost) => {
    if (!circle) return;
    updateCircle({ ...circle, posts: [post, ...circle.posts] });

    // Collect all people: explicitly tagged + face-tagged in attachments
    const faceTaggedIds = post.attachments.flatMap(a =>
      (a.faceTags || []).map(ft => ft.profileId).filter((id): id is string => !!id)
    );
    const allPeopleIds = [...new Set([...post.peopleIds, ...faceTaggedIds])];

    // Write the post body as a Memory on each tagged profile
    if (post.body || post.title) {
      setProfiles(prev => prev.map(pr => {
        if (!allPeopleIds.includes(pr.id)) return pr;
        const memory: Memory = {
          id: sid('mem'),
          type: 'story',
          content: [post.title, post.body].filter(Boolean).join(' — '),
          timestamp: post.createdAt,
        };
        return { ...pr, memories: [...(pr.memories||[]), memory] };
      }));
    }
    showT('Posted!');
  };

  const handleDelete = (postId: string) => {
    if (!circle) return;
    updateCircle({ ...circle, posts: circle.posts.filter(p=>p.id!==postId) });
  };

  const handleComment = (postId: string, body: string) => {
    if (!circle) return;
    const comment: CircleComment = { id:sid('cm'), authorId:userId, authorName:userName, createdAt:new Date().toISOString(), body };
    updateCircle({ ...circle, posts: circle.posts.map(p => p.id!==postId ? p : { ...p, comments:[...(p.comments||[]),comment] }) });
  };

  const createCircle = () => {
    if (!newName.trim()) { showT('Add a circle name'); return; }
    const nc: Circle = { id:sid('circle'), userId, treeId:'', name:newName.trim(), description:newDesc.trim(), createdAt:new Date().toISOString(), posts:[] };
    setCircles(prev=>[...prev,nc]);
    setActiveId(nc.id);
    setNewName(''); setNewDesc('');
    showT('Circle created');
    setTab('feed');
  };

  // No circles at all
  if (circles.length===0) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:p.bg }}>
      <div style={{ paddingTop:52, paddingBottom:16, paddingLeft:20, paddingRight:20, background:p.card, borderBottom:`1px solid ${p.border}` }}>
        <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:p.faint, marginBottom:10 }}>
          <ChevronLeft size={18}/><span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase' }}>Back</span>
        </button>
        <h2 style={{ fontFamily:'Crimson Text, Georgia, serif', fontSize:26, margin:0, color:p.text }}>Family Circle</h2>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, gap:16 }}>
        <Users size={48} style={{ color:p.faint }} />
        <p style={{ fontFamily:'Crimson Text, Georgia, serif', fontSize:20, color:p.muted, textAlign:'center', margin:0, fontStyle:'italic' }}>Import a GEDCOM to auto-create your first circle, or create one manually below.</p>
        <div style={{ width:'100%', maxWidth:320, display:'flex', flexDirection:'column', gap:10 }}>
          <input placeholder="Circle name" value={newName} onChange={e=>setNewName(e.target.value)} style={{ padding:'12px 14px', borderRadius:14, border:`1px solid ${p.border}`, fontSize:15, background:p.card }} />
          <input placeholder="Description (optional)" value={newDesc} onChange={e=>setNewDesc(e.target.value)} style={{ padding:'12px 14px', borderRadius:14, border:`1px solid ${p.border}`, fontSize:15, background:p.card }} />
          <button onClick={createCircle} style={{ padding:14, borderRadius:14, background:p.dark, border:'none', color:'#fff', fontSize:14, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>Create Circle</button>
        </div>
      </div>
      {toast && <Toast msg={toast} />}
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:p.bg }}>

      {/* Header */}
      <div style={{ paddingTop:52, background:p.card, borderBottom:`1px solid ${p.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 20px 12px' }}>
          <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:p.faint }}>
            <ChevronLeft size={18}/><span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase' }}>Back</span>
          </button>
          <select value={activeId||''} onChange={e=>{ setActiveId(e.target.value); setTab('feed'); setSelPerson(null); }}
            style={{ fontFamily:'Crimson Text, Georgia, serif', fontSize:19, fontWeight:600, color:p.text, border:'none', background:'transparent', cursor:'pointer', maxWidth:220, textAlign:'center' }}>
            {circles.map(ci=><option key={ci.id} value={ci.id}>{ci.name}</option>)}
          </select>
          <button onClick={()=>setTab('settings')} style={{ background:'none', border:'none', cursor:'pointer', color:p.faint }}>
            <Settings size={18} />
          </button>
        </div>
        <div style={{ display:'flex' }}>
          {([
            { id:'feed',     label:'Feed',      icon:<BookOpen size={13}/> },
            { id:'people',   label:'Timelines', icon:<Users size={13}/> },
            { id:'settings', label:'Settings',  icon:<Settings size={13}/> },
          ] as {id:Tab; label:string; icon:React.ReactNode}[]).map(t=>(
            <button key={t.id} onClick={()=>{ setTab(t.id); setSelPerson(null); }} style={{
              flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5,
              padding:'10px 0', background:'none', border:'none', cursor:'pointer',
              fontSize:10, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase',
              color:tab===t.id?p.amber:p.faint,
              borderBottom:tab===t.id?`2px solid ${p.amber}`:'2px solid transparent',
            }}>{t.icon}{t.label}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 40px' }}>

        {/* FEED */}
        {tab==='feed' && circle && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <PostComposer profiles={profiles} userId={userId} userName={userName} circleId={circle.id} onSubmit={handleNewPost} />

            {circle.posts.length===0 ? (
              <div style={{ textAlign:'center', padding:40 }}>
                <p style={{ fontFamily:'Crimson Text, Georgia, serif', fontSize:18, color:p.faint, fontStyle:'italic' }}>No stories yet. Add the first memory above.</p>
              </div>
            ) : circle.posts.map(post=>(
              <PostCard key={post.id} post={post} profiles={profiles} userId={userId} onDelete={()=>handleDelete(post.id)} onAddComment={handleComment} />
            ))}
          </div>
        )}

        {/* TIMELINES */}
        {tab==='people' && circle && (
          selPerson ? (
            <PersonTimeline
              person={profiles.find(pr=>pr.id===selPerson)!}
              posts={circle.posts.filter(po=>po.peopleIds.includes(selPerson)||po.attachments.some(a=>(a.faceTags||[]).some(ft=>ft.profileId===selPerson)))}
              onBack={()=>setSelPerson(null)}
            />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <p style={{ fontSize:10, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:p.faint, margin:'0 0 6px' }}>Family members</p>
              {profiles.length===0 && <p style={{ fontSize:13, color:p.faint, fontStyle:'italic' }}>Import a GEDCOM to see your family here.</p>}
              {profiles.map(pr=>{
                const count = circle.posts.filter(po=>
                  po.peopleIds.includes(pr.id)||po.attachments.some(a=>(a.faceTags||[]).some(ft=>ft.profileId===pr.id))
                ).length;
                return (
                  <button key={pr.id} onClick={()=>setSelPerson(pr.id)} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:p.card, borderRadius:20, border:`1px solid ${p.border}`, cursor:'pointer', textAlign:'left' }}>
                    <img src={pr.imageUrl} style={{ width:44, height:44, borderRadius:14, objectFit:'cover', filter:'grayscale(40%)', flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'Crimson Text, Georgia, serif', fontSize:17, fontWeight:600, color:p.text }}>{pr.name}</div>
                      <div style={{ fontSize:10, color:p.faint, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>
                        {pr.birthYear}{pr.deathYear?` — ${pr.deathYear}`:''}{count>0?` · ${count} memor${count===1?'y':'ies'} in circle`:''}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color:p.faint }} />
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* SETTINGS */}
        {tab==='settings' && circle && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <SettingsPanel circle={circle} onUpdate={updateCircle} onToast={showT} />
            <div style={{ background:p.card, borderRadius:24, padding:20, border:`1px solid ${p.border}` }}>
              <p style={{ fontSize:10, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:p.faint, marginBottom:14, marginTop:0 }}>Create another circle</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <input placeholder="Circle name" value={newName} onChange={e=>setNewName(e.target.value)} style={{ padding:'10px 12px', borderRadius:12, border:`1px solid ${p.border}`, fontSize:14, background:p.bg }} />
                <input placeholder="Description (optional)" value={newDesc} onChange={e=>setNewDesc(e.target.value)} style={{ padding:'10px 12px', borderRadius:12, border:`1px solid ${p.border}`, fontSize:14, background:p.bg }} />
                <button onClick={createCircle} style={{ padding:'10px 20px', borderRadius:12, background:p.dark, border:'none', color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer', alignSelf:'flex-start', letterSpacing:'0.08em', textTransform:'uppercase' }}>Create</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast msg={toast} />}
    </div>
  );
};

export default FamilyCircleView;
