import React, { useState, useRef } from 'react';
import {
  ChevronLeft, PenTool, Library, Image as ImageIcon,
  Trash2, UserPlus, Camera, Plus, Wand2, Sparkles,
  ChevronRight, Paperclip, Volume2, Video, FileText, X
} from 'lucide-react';
import { Profile, MediaItem, FamilyTree } from '../types';
import { getEventIcon } from '../constants';
import { gedcomDateToSortKey } from '../utils/gedcom';

// ── colour tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      '#faf9f7',
  paper:   '#ffffff',
  line:    '#e5e0d8',
  text:    '#1a1714',
  muted:   '#6b6560',
  faint:   '#a09890',
  amber:   '#b45309',
  amberBg: '#fef3c7',
  blue:    '#1d4ed8',
  blueBg:  '#eff6ff',
  dark:    '#1a1714',
};

// ── date helpers ──────────────────────────────────────────────────────────────
const MONTH_MAP: Record<string,string> = {
  JAN:'January',FEB:'February',MAR:'March',APR:'April',MAY:'May',JUN:'June',
  JUL:'July',AUG:'August',SEP:'September',OCT:'October',NOV:'November',DEC:'December',
};

function formatLongDate(raw?: string): string {
  if (!raw) return '';
  const upper = raw.toUpperCase().replace(/ABT\.?|EST\.?|BEF\.?|AFT\.?|CAL\.?|CIR\.?|CIRCA/g,'').trim();
  const parts = upper.split(/\s+/).filter(Boolean);
  const year = parts.find(p => /^\d{4}$/.test(p)) || '';
  const mKey = parts.find(p => MONTH_MAP[p]);
  const mon  = mKey ? MONTH_MAP[mKey] : '';
  const day  = mKey ? parts.find(p => /^\d{1,2}$/.test(p) && +p >= 1 && +p <= 31) : undefined;
  if (mon && day && year) return `${mon} ${parseInt(day)}, ${year}`;
  if (mon && year)        return `${mon} ${year}`;
  return year || raw;
}

function getYear(raw?: string): string {
  if (!raw) return '';
  const m = raw.match(/\b(\d{4})\b/);
  return m ? m[1] : '';
}

// ── tiny helpers ──────────────────────────────────────────────────────────────
function sid(p: string) { return `${p}_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`; }
function hSize(b: number) { return b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`; }
function inferKind(mime: string, name: string) {
  const t = mime.toLowerCase();
  if (t.startsWith('image/')) return 'photo' as const;
  if (t.startsWith('video/')) return 'video' as const;
  if (t.startsWith('audio/')) return 'audio' as const;
  if (t === 'application/pdf' || name.endsWith('.pdf')) return 'document' as const;
  return 'document' as const;
}

// ── EventMediaRow ─────────────────────────────────────────────────────────────
const EventMediaRow: React.FC<{
  eventId: string;
  media: MediaItem[];
  onUpload: (eventId: string, files: FileList) => void;
}> = ({ eventId, media, onUpload }) => {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<MediaItem|null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const KindIcon = (m: MediaItem) =>
    m.kind === 'photo' ? ImageIcon : m.kind === 'video' ? Video : m.kind === 'audio' ? Volume2 : FileText;

  return (
    <div style={{ marginTop: 14 }}>
      {/* Existing media thumbnails */}
      {media.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {media.map(m => {
            const Icon = KindIcon(m);
            return (
              <button key={m.id} onClick={() => setPreview(m)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 8,
                background: C.bg, border: `1px solid ${C.line}`,
                cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.muted,
                maxWidth: 180,
              }}>
                <Icon size={13} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Upload trigger */}
      {!open ? (
        <button onClick={() => setOpen(true)} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 8,
          background: 'none', border: `1px dashed ${C.line}`,
          cursor: 'pointer', fontSize: 11, fontWeight: 700,
          color: C.faint, letterSpacing: '0.06em',
        }}>
          <Paperclip size={12} /> Add media
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: 'Photo',  accept: 'image/*',  icon: '🖼' },
            { label: 'Video',  accept: 'video/*',  icon: '🎬' },
            { label: 'Audio',  accept: 'audio/*',  icon: '🎵' },
          ].map(({ label, accept, icon }) => (
            <button key={label} onClick={() => { if (ref.current) { ref.current.accept = accept; ref.current.click(); }}} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8,
              background: C.amberBg, border: `1px solid #fde68a`,
              cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.amber,
            }}>{icon} {label}</button>
          ))}
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint }}>
            <X size={14} />
          </button>
          <input ref={ref} type="file" multiple style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.length) { onUpload(eventId, e.target.files); setOpen(false); e.target.value = ''; }}}
          />
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 24,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 640, width: '100%', background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
            {preview.kind === 'photo' && <img src={preview.url} style={{ width: '100%', display: 'block' }} />}
            {preview.kind === 'video' && <video src={preview.url} controls style={{ width: '100%', display: 'block' }} />}
            {preview.kind === 'audio' && <div style={{ padding: 20 }}><audio src={preview.url} controls style={{ width: '100%' }} /></div>}
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.muted }}>{preview.name}</span>
              <button onClick={() => setPreview(null)} style={{ background: C.dark, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── EventCard — one entry on the life story timeline ─────────────────────────
const EventCard: React.FC<{
  ev: any;
  profileName: string;
  isFirst: boolean;
  isLast: boolean;
  onEventMediaUpload: (eventId: string, files: FileList) => void;
  onAiSuggest?: (eventId: string) => void;
  isAiLoading?: boolean;
}> = ({ ev, profileName, isFirst, isLast, onEventMediaUpload, onAiSuggest, isAiLoading }) => {
  const [showAi, setShowAi] = useState(false);
  const year = getYear(ev.date);
  const longDate = formatLongDate(ev.date);
  const Icon = getEventIcon(ev.type);

  // Generate a one-line description from event data
  const description = (() => {
    const place = ev.place || '';
    const when  = longDate && place ? `on ${longDate} in ${place}` : longDate ? `on ${longDate}` : place ? `in ${place}` : '';
    switch (ev.type) {
      case 'Birth':       return `${profileName} was born${when ? ' ' + when : ''}.`;
      case 'Death':       return `${profileName} passed away${when ? ' ' + when : ''}.`;
      case 'Burial':      return `${profileName} was laid to rest${when ? ' ' + when : ''}.`;
      case 'Marriage':    return `${profileName} married ${ev.spouseName || 'their spouse'}${when ? ' ' + when : ''}.`;
      case 'Divorce':     return `${profileName} and ${ev.spouseName || 'their spouse'} divorced${longDate ? ' in ' + longDate : ''}.`;
      case 'Baptism':
      case 'Christening': return `${profileName} was baptised${when ? ' ' + when : ''}.`;
      case 'Bar Mitzvah':
      case 'Bat Mitzvah': return `${profileName} celebrated their Bar/Bat Mitzvah${when ? ' ' + when : ''}.`;
      case 'Residence':   return `${profileName} was residing${place ? ' in ' + place : ''}${longDate ? ' (' + longDate + ')' : ''}.`;
      case 'Census':      return `${profileName} appeared in the census${when ? ' ' + when : ''}.`;
      case 'Graduation':  return `${profileName} graduated${when ? ' ' + when : ''}.`;
      case 'Immigration':
      case 'Arrival/Immigration': return `${profileName} immigrated${when ? ' ' + when : ''}.`;
      default:            return `${profileName} — ${ev.type}${when ? ', ' + when : ''}.`;
    }
  })();

  return (
    <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
      {/* Left column: year bubble + line */}
      <div style={{ width: 72, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
        {/* Year bubble */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: C.paper, border: `2px solid ${C.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, zIndex: 1,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: C.amber, letterSpacing: '-0.02em' }}>{year || '—'}</span>
        </div>
        {/* Connecting line */}
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 32, background: C.line, marginTop: 0 }} />
        )}
      </div>

      {/* Right column: event content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 32, paddingLeft: 4 }}>
        {/* Section heading (bold, like Ancestry) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, marginTop: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={13} style={{ color: C.amber }} />
          </div>
          <h3 style={{ margin: 0, fontFamily: 'Georgia, Cambria, serif', fontSize: 17, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
            {ev.type}
          </h3>
        </div>

        {/* Card body */}
        <div style={{
          background: C.paper, border: `1px solid ${C.line}`,
          borderRadius: 12, padding: '16px 18px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        }}>
          {/* Description sentence */}
          <p style={{ margin: '0 0 10px', fontSize: 14, color: C.text, lineHeight: 1.65 }}>
            {description}
          </p>

          {/* Date + place metadata */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
            {longDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.amber, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {longDate}
                </span>
              </div>
            )}
            {ev.place && (
              <div style={{ fontSize: 11, color: C.muted, fontStyle: 'italic' }}>
                {ev.place}
              </div>
            )}
          </div>

          {/* Notes / sub-type */}
          {ev.note && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: C.muted, lineHeight: 1.5, fontStyle: 'italic', borderLeft: `3px solid ${C.line}`, paddingLeft: 10 }}>
              {ev.note}
            </p>
          )}

          {/* Media */}
          <EventMediaRow
            eventId={ev.id}
            media={ev.media || []}
            onUpload={onEventMediaUpload}
          />

          {/* AI actions bar */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => { setShowAi(!showAi); onAiSuggest?.(ev.id); }} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 8,
              background: showAi ? C.amberBg : 'none',
              border: `1px solid ${showAi ? '#fde68a' : C.line}`,
              cursor: 'pointer', fontSize: 11, fontWeight: 700,
              color: C.amber, letterSpacing: '0.05em',
            }}>
              <Sparkles size={12} /> {isAiLoading ? 'Generating…' : 'AI Narrative'}
            </button>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 8,
              background: 'none', border: `1px solid ${C.line}`,
              cursor: 'pointer', fontSize: 11, fontWeight: 700,
              color: C.muted, letterSpacing: '0.05em',
            }}>
              <Library size={12} /> Historical Context
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── RelativeChip ──────────────────────────────────────────────────────────────
const RelativeChip: React.FC<{ profile: Profile; onClick: () => void }> = ({ profile, onClick }) => (
  <button onClick={onClick} style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '10px 8px', borderRadius: 12,
    background: C.paper, border: `1px solid ${C.line}`,
    cursor: 'pointer', minWidth: 72, width: 72,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.15s',
  }}>
    <img src={profile.imageUrl} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', filter: 'grayscale(35%)' }} />
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
        {profile.name.split(' ')[0]}
      </div>
      {profile.name.split(' ').length > 1 && (
        <div style={{ fontSize: 10, color: C.faint, lineHeight: 1.2 }}>{profile.name.split(' ').slice(1).join(' ')}</div>
      )}
      <div style={{ fontSize: 9, color: C.faint, marginTop: 2 }}>{profile.birthYear}</div>
    </div>
  </button>
);

// ── Main ProfileView ──────────────────────────────────────────────────────────
const ProfileView: React.FC<{
  activeProfile: Profile;
  profiles: Profile[];
  familyTrees: FamilyTree[];
  selectedTreeId: string | null;
  onBack: () => void;
  onEdit: () => void;
  onLinkRelative: (role: 'parent' | 'spouse' | 'child') => void;
  onDeleteProfile: () => void;
  onSetActiveProfile: (id: string) => void;
  onUploadMediaClick: () => void;
  onMediaFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  mediaInputRef: React.RefObject<HTMLInputElement>;
  onEventMediaUpload: (eventId: string, files: FileList) => void;
  attachingToEventId: string | null;
  setAttachingToEventId: (id: string | null) => void;
  isAiLoading: boolean;
  isResearchLoading: boolean;
  isPhotoLoading: boolean;
  isGeneratingPortrait: boolean;
  onGenerateSummary: () => void;
  onResearch: () => void;
  onGeneratePortrait: () => void;
  showToast: (m: string) => void;
}> = (props) => {
  const {
    activeProfile, profiles,
    onBack, onEdit, onLinkRelative, onDeleteProfile, onSetActiveProfile,
    onUploadMediaClick, onMediaFileChange, mediaInputRef, onEventMediaUpload,
    isAiLoading, isResearchLoading, isPhotoLoading, isGeneratingPortrait,
    onGenerateSummary, onResearch, onGeneratePortrait,
  } = props;

  const isPlaceholder = activeProfile.imageUrl.startsWith('data:image/svg+xml');

  const rels = {
    parents:  profiles.filter(p => activeProfile.parentIds.includes(p.id)),
    spouses:  profiles.filter(p => activeProfile.spouseIds.includes(p.id)),
    children: profiles.filter(p => activeProfile.childIds.includes(p.id)),
  };

  const timeline = [...(activeProfile.timeline || [])].sort(
    (a, b) => gedcomDateToSortKey(a.date) - gedcomDateToSortKey(b.date)
  );

  const allMedia = timeline.flatMap(ev => ev.media || []) as MediaItem[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflowY: 'auto' }}>

      {/* ══════════════════════════ HERO (unchanged) ══════════════════════════ */}
      <div style={{ position: 'relative', height: 340, flexShrink: 0, overflow: 'hidden' }}>
        <img src={activeProfile.imageUrl} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', filter: isPlaceholder ? 'none' : 'grayscale(60%) brightness(0.75)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.0) 35%, rgba(20,16,12,0.82) 100%)' }} />

        {/* Back */}
        <button onClick={onBack} style={{
          position: 'absolute', top: 52, left: 20,
          width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', cursor: 'pointer',
        }}><ChevronLeft size={18} /></button>

        {/* Edit / Delete */}
        <div style={{ position: 'absolute', top: 52, right: 20, display: 'flex', gap: 8 }}>
          {[{ icon: <PenTool size={15} />, fn: onEdit }, { icon: <Trash2 size={15} />, fn: onDeleteProfile }].map((b, i) => (
            <button key={i} onClick={b.fn} style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
            }}>{b.icon}</button>
          ))}
        </div>

        {/* Camera */}
        <button onClick={onUploadMediaClick} style={{
          position: 'absolute', bottom: 80, right: 20,
          width: 44, height: 44, borderRadius: '50%',
          background: '#1c1917', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}><Camera size={18} /></button>
        <input ref={mediaInputRef} type="file" onChange={onMediaFileChange} accept="image/*" style={{ display: 'none' }} />

        {/* Name overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 24px' }}>
          <h1 style={{ fontFamily: 'Georgia, Cambria, serif', fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1.1, margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            {activeProfile.name}
          </h1>
          <p style={{ marginTop: 5, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
            {activeProfile.birthYear} — {activeProfile.deathYear || 'Present'}
          </p>
        </div>
      </div>

      {/* ══════════════════════════ LIFE STORY BODY ═══════════════════════════ */}
      <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* ── Relationships bar (compact, above bio) ── */}
        {(rels.parents.length > 0 || rels.spouses.length > 0 || rels.children.length > 0) && (
          <div style={{ marginBottom: 28, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint }}>Family</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['parent','spouse','child'] as const).map(role => (
                  <button key={role} onClick={() => onLinkRelative(role)} style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '4px 9px', borderRadius: 8,
                    background: 'none', border: `1px solid ${C.line}`,
                    cursor: 'pointer', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.07em', textTransform: 'uppercase', color: C.amber,
                  }}><UserPlus size={10} />{role}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'Parents',  list: rels.parents  },
                { label: 'Spouses',  list: rels.spouses  },
                { label: 'Children', list: rels.children },
              ].map(group => group.list.length > 0 && (
                <div key={group.label}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, marginBottom: 8 }}>{group.label}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {group.list.map(p => <RelativeChip key={p.id} profile={p} onClick={() => onSetActiveProfile(p.id)} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Life Narrative / Bio ── */}
        <div style={{ marginBottom: 32, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 20, background: C.amber, borderRadius: 2 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint }}>Life Narrative</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onGenerateSummary} disabled={isAiLoading} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8,
                background: C.amberBg, border: '1px solid #fde68a',
                cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.amber,
                opacity: isAiLoading ? 0.5 : 1,
              }}>
                <Wand2 size={12} />{isAiLoading ? 'Writing…' : 'Generate'}
              </button>
              <button onClick={onResearch} disabled={isResearchLoading} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8,
                background: C.blueBg, border: '1px solid #bfdbfe',
                cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.blue,
                opacity: isResearchLoading ? 0.5 : 1,
              }}>
                <Library size={12} />{isResearchLoading ? 'Researching…' : 'Context'}
              </button>
              <button onClick={onGeneratePortrait} disabled={isGeneratingPortrait || isPhotoLoading} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#15803d',
                opacity: (isGeneratingPortrait || isPhotoLoading) ? 0.5 : 1,
              }}>
                <ImageIcon size={12} />{(isGeneratingPortrait || isPhotoLoading) ? 'Painting…' : 'Portrait'}
              </button>
            </div>
          </div>

          {activeProfile.summary ? (
            <div>
              <p style={{ fontFamily: 'Georgia, Cambria, serif', fontSize: 16, lineHeight: 1.8, color: C.text, margin: 0 }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 52, fontWeight: 700, color: C.amber, lineHeight: 0.8, float: 'left', marginRight: 6, marginTop: 8 }}>
                  {activeProfile.summary[0]}
                </span>
                {activeProfile.summary.slice(1)}
              </p>
            </div>
          ) : (
            <p style={{ fontFamily: 'Georgia, Cambria, serif', fontSize: 15, color: C.faint, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              This individual's life story is being curated from historical records. Use the Generate button above to create a biography from the timeline data.
            </p>
          )}

          {/* Historical context if present */}
          {activeProfile.historicalContext && (
            <div style={{ marginTop: 16, padding: '14px 16px', background: C.blueBg, borderRadius: 10, border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.blue, marginBottom: 8 }}>Historical Context</div>
              <p style={{ fontSize: 13, color: '#1e3a5f', lineHeight: 1.6, margin: 0 }}>{activeProfile.historicalContext.text}</p>
            </div>
          )}

          {/* Memories / oral traditions */}
          {activeProfile.memories.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, marginBottom: 10 }}>Oral Traditions</div>
              {activeProfile.memories.map(m => (
                <div key={m.id} style={{ padding: '12px 14px', background: C.bg, borderRadius: 10, border: `1px solid ${C.line}`, marginBottom: 8 }}>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.6, color: C.text, margin: '0 0 6px', fontStyle: 'italic' }}>"{m.content}"</p>
                  <span style={{ fontSize: 10, color: C.faint, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{m.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Life Events — Ancestry-style vertical timeline ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 3, height: 20, background: C.amber, borderRadius: 2 }} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint }}>
              Chronicle of Events
            </span>
            <span style={{ fontSize: 10, color: C.faint }}>· {timeline.length} events</span>
          </div>

          {timeline.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: C.faint, fontStyle: 'italic' }}>
                No life events recorded yet. Import a GEDCOM or add events manually.
              </p>
            </div>
          ) : (
            <div>
              {timeline.map((ev, idx) => (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  profileName={activeProfile.name}
                  isFirst={idx === 0}
                  isLast={idx === timeline.length - 1}
                  onEventMediaUpload={onEventMediaUpload}
                  isAiLoading={isAiLoading}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Media archive (if any) ── */}
        {allMedia.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 3, height: 20, background: C.amber, borderRadius: 2 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint }}>Media Archive</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {allMedia.map(m => (
                <a key={m.id} href={m.url} target="_blank" rel="noreferrer" style={{
                  background: C.paper, borderRadius: 12, padding: '12px 14px',
                  border: `1px solid ${C.line}`, textDecoration: 'none',
                }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint }}>
                    {m.kind === 'photo' ? '🖼 Photo' : m.kind === 'video' ? '🎬 Video' : m.kind === 'audio' ? '🎵 Audio' : '📄 Document'}
                  </div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.text, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProfileView;
