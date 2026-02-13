import { useRef, useState } from 'react';
import { AppView, Circle, CirclePost, CirclePostWhen, FamilyTree, Profile, User } from '../types';
import { parseGedcom } from '../utils/gedcom';

function safeId(prefix: string) {
  return `${prefix}_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

// Format a GEDCOM date string into a readable form e.g. "15 JAN 1943" → "January 15, 1943"
function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const MONTH_MAP: Record<string, string> = {
    JAN:'January', FEB:'February', MAR:'March', APR:'April', MAY:'May', JUN:'June',
    JUL:'July', AUG:'August', SEP:'September', OCT:'October', NOV:'November', DEC:'December',
  };
  const upper = dateStr.toUpperCase().replace(/ABT\.?|EST\.?|BEF\.?|AFT\.?|CAL\.?|CIR\.?|CIRCA/g, '').trim();
  const parts = upper.split(/\s+/).filter(Boolean);
  const yearPart = parts.find(p => /^\d{4}$/.test(p)) || '';
  const monthKey = parts.find(p => MONTH_MAP[p]);
  const monthFull = monthKey ? MONTH_MAP[monthKey] : '';
  const dayPart = monthKey ? parts.find(p => /^\d{1,2}$/.test(p) && parseInt(p) >= 1 && parseInt(p) <= 31) : undefined;
  if (monthFull && dayPart && yearPart) return `${monthFull} ${parseInt(dayPart)}, ${yearPart}`;
  if (monthFull && yearPart) return `${monthFull} ${yearPart}`;
  if (yearPart) return yearPart;
  return dateStr;
}

// Turn a LifeEvent into a rich natural-language sentence for the circle feed
function eventToSentence(profile: Profile, ev: { type: string; date: string; place: string; spouseName?: string }): string {
  const place = ev.place || '';
  const dateF = formatReadableDate(ev.date || '');
  const whenOn = dateF ? ` on ${dateF}` : '';
  const whenIn = place ? ` in ${place}` : '';
  const when = dateF && place ? `on ${dateF} in ${place}` : dateF ? `on ${dateF}` : place ? `in ${place}` : '';

  switch (ev.type) {
    case 'Birth':         return `${profile.name} was born${when ? ' ' + when : ''}.`;
    case 'Death':         return `${profile.name} passed away${when ? ' ' + when : ''}.`;
    case 'Burial':        return `${profile.name} was laid to rest${when ? ' ' + when : ''}.`;
    case 'Marriage':      return `${profile.name} and ${ev.spouseName || 'their spouse'} were married${whenOn}${whenIn}.`;
    case 'Divorce':       return `${profile.name} and ${ev.spouseName || 'their spouse'} divorced${dateF ? ' in ' + dateF : ''}.`;
    case 'Baptism':
    case 'Christening':   return `${profile.name} was baptised${when ? ' ' + when : ''}.`;
    case 'Cremation':     return `${profile.name} was cremated${when ? ' ' + when : ''}.`;
    case 'Residence':     return `${profile.name} was recorded as residing${whenIn}${whenOn}.`;
    case 'Census':        return `${profile.name} appeared in a census record${when ? ' ' + when : ''}.`;
    case 'Graduation':    return `${profile.name} graduated${when ? ' ' + when : ''}.`;
    case 'Occupation':    return `${profile.name} was recorded as working${whenIn}${whenOn}.`;
    case 'Naturalization':return `${profile.name} became a naturalised citizen${when ? ' ' + when : ''}.`;
    case 'Immigration':
    case 'Arrival/Immigration': return `${profile.name} immigrated${when ? ' ' + when : ''}.`;
    case 'Departure/Emigration': return `${profile.name} emigrated${when ? ' ' + when : ''}.`;
    case 'Military':      return `${profile.name} served in the military${when ? ' ' + when : ''}.`;
    case 'Retirement':    return `${profile.name} retired${when ? ' ' + when : ''}.`;
    case 'Will':          return `${profile.name}'s will was recorded${when ? ' ' + when : ''}.`;
    case 'Probate':       return `The estate of ${profile.name} entered probate${when ? ' ' + when : ''}.`;
    case 'Education':     return `${profile.name} was enrolled in education${when ? ' ' + when : ''}.`;
    case 'Adoption':      return `${profile.name} was adopted${when ? ' ' + when : ''}.`;
    default:              return `${profile.name}: ${ev.type}${when ? ' — ' + when : ''}.`;
  }
}

// Parse "15 JAN 1943" or "1943" into a sortable ISO-ish date for CirclePostWhen
function gedcomDateToWhen(dateStr: string): CirclePostWhen {
  if (!dateStr) return { kind: 'unknown' };
  const upper = dateStr.toUpperCase().replace(/ABT\.?|EST\.?|BEF\.?|AFT\.?|CAL\.?|CIR\.?|CIRCA/g, '').trim();
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const yearMatch = upper.match(/\b(\d{4})\b/);
  if (!yearMatch) return { kind: 'unknown' };
  const year = yearMatch[1];
  const monthIdx = MONTHS.findIndex(m => upper.includes(m));
  const month = monthIdx >= 0 ? String(monthIdx + 1) : null;
  const parts = upper.split(/\s+/).filter(Boolean);
  let day: string | null = null;
  if (monthIdx >= 0) {
    const mi = parts.findIndex(p => p === MONTHS[monthIdx]);
    if (mi > 0) {
      const d = parseInt(parts[mi - 1]);
      if (!isNaN(d) && d >= 1 && d <= 31) day = String(d).padStart(2, '0');
    }
  }
  if (month && day) {
    const mm = String(monthIdx + 1).padStart(2, '0');
    return { kind: 'exact', exactDate: `${year}-${mm}-${day}` };
  }
  if (month) return { kind: 'yearMonth', year, month };
  return { kind: 'year', year };
}

// Generate historical event posts from all profiles in the tree
function generateEventPosts(profiles: Profile[], circleId: string, userId: string): CirclePost[] {
  const posts: CirclePost[] = [];
  const seenMarriages = new Set<string>();

  for (const profile of profiles) {
    for (const ev of profile.timeline || []) {
      // De-duplicate marriages (both spouses generate one)
      if (ev.type === 'Marriage' && ev.spouseName) {
        const key = [profile.name, ev.spouseName].sort().join('|') + ev.date;
        if (seenMarriages.has(key)) continue;
        seenMarriages.add(key);
      }
      if (!ev.date && !ev.place) continue; // skip completely empty events
      const sentence = eventToSentence(profile, ev as any);
      const dateLabel = formatReadableDate(ev.date || '');
      const titleBase = ev.type === 'Marriage' && (ev as any).spouseName
        ? `${profile.name} & ${(ev as any).spouseName} married`
        : `${profile.name} — ${ev.type}`;
      const titleFull = dateLabel ? `${titleBase}, ${dateLabel}` : titleBase;
      posts.push({
        id: safeId('ep'),
        circleId,
        authorId: 'system',
        authorName: 'Family Archive',
        createdAt: new Date().toISOString(),
        title: titleFull,
        body: sentence,
        peopleIds: [profile.id],
        when: gedcomDateToWhen(ev.date),
        attachments: [],
        comments: [],
        postKind: 'event',
      });
    }
  }

  // Sort chronologically
  posts.sort((a, b) => {
    const ka = whenSortKey(a.when);
    const kb = whenSortKey(b.when);
    return ka - kb;
  });

  return posts;
}

function whenSortKey(when: CirclePostWhen): number {
  if (when.kind === 'exact') {
    const d = new Date((when as any).exactDate);
    return isNaN(d.getTime()) ? 9999 : d.getFullYear() + d.getMonth() / 12 + d.getDate() / 365;
  }
  if (when.kind === 'year') return parseInt((when as any).year) || 9999;
  if (when.kind === 'yearMonth') return (parseInt((when as any).year) || 9999) + (parseInt((when as any).month) || 0) / 12;
  return 9999;
}

export const useGedcomImport = (args: {
  user: User | null;
  setView: (v: AppView) => void;
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  setFamilyTrees: React.Dispatch<React.SetStateAction<FamilyTree[]>>;
  setSelectedTreeId: (id: string | null) => void;
  setActiveProfileId: (id: string | null) => void;
  setCircles: React.Dispatch<React.SetStateAction<Circle[]>>;
  toast: (m: string) => void;
}) => {
  const { user, setView, setProfiles, setFamilyTrees, setSelectedTreeId, setActiveProfileId, setCircles, toast } = args;

  const gedFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{
    importedProfiles: Profile[];
    tree: FamilyTree;
    fileName: string;
  } | null>(null);

  const handleGedcomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && user) {
      const fileName = f.name.replace(/\.(ged|gedcom|txt)$/i, '').replace(/[_-]/g, ' ');
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          try {
            const result = parseGedcom(text, user.id, 4);
            setPendingImport({ ...result, fileName });
            setView(AppView.SELECT_HOME);
            toast(`Loaded ${result.importedProfiles.length} family members`);
          } catch (err) {
            console.error(err);
            toast('Error parsing GEDCOM');
          }
        }
      };
      reader.readAsText(f);
    }
    e.target.value = '';
  };

  const chooseHome = (selected: Profile) => {
    if (!pendingImport || !user) return;

    setProfiles((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const newProfiles = pendingImport.importedProfiles.filter((p) => !existingIds.has(p.id));
      return [...prev, ...newProfiles];
    });

    const updatedTree: FamilyTree = {
      ...pendingImport.tree,
      homePersonId: selected.id,
      name: `The ${selected.name} Archive`,
    };

    setFamilyTrees((prev) => [updatedTree, ...prev]);
    setSelectedTreeId(updatedTree.id);
    setActiveProfileId(selected.id);

    // Auto-create a Family Circle for this tree
    const circleId = safeId('circle');
    const eventPosts = generateEventPosts(pendingImport.importedProfiles, circleId, user.id);
    const newCircle: Circle = {
      id: circleId,
      userId: user.id,
      treeId: updatedTree.id,
      name: pendingImport.fileName || `The ${selected.name} Circle`,
      description: `Family circle for the ${updatedTree.name}. Share memories, photos, and stories.`,
      createdAt: new Date().toISOString(),
      posts: eventPosts,
    };
    setCircles((prev) => [newCircle, ...prev]);

    setPendingImport(null);
    setView(AppView.HOME);
    toast(`Archive imported · ${eventPosts.length} historical events added to circle`);
  };

  return { gedFileInputRef, pendingImport, setPendingImport, handleGedcomUpload, chooseHome };
};
