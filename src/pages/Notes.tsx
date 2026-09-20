import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Calendar, StickyNote, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';

interface Note {
  id: string;
  household_id: string;
  title: string | null;
  content: string;
  month: string | null;
  created_at: string;
  updated_at: string;
}

export default function Notes() {
  const { household } = useHousehold();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteMonth, setNewNoteMonth] = useState<string | null>(null);

  // Filter by month
  const [filterMonth, setFilterMonth] = useState<string | 'all' | 'general'>('all');
  const [currentMonthView, setCurrentMonthView] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const fetchNotes = async () => {
      if (!supabase || !household) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('household_id', household.id)
        .order('updated_at', { ascending: false });
      
      if (!error && data) {
        setNotes(data as Note[]);
      }
      setLoading(false);
    };
    fetchNotes();
  }, [household]);

  const loadNotes = async () => {
    if (!supabase || !household) return;
    setLoading(true);

    const { data, error } = await supabase.
    from('notes').
    select('*').
    eq('household_id', household.id).
    order('updated_at', { ascending: false });

    if (!error && data) {
      setNotes(data as Note[]);
    }
    setLoading(false);
  };

  const handleAddNote = async () => {
    if (!supabase || !household || !newNoteContent.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('notes').insert({
      household_id: household.id,
      title: newNoteTitle.trim() || null,
      content: newNoteContent.trim(),
      month: newNoteMonth
    });

    if (!error) {
      await loadNotes();
      setNewNoteTitle('');
      setNewNoteContent('');
      setNewNoteMonth(null);
      setShowAddForm(false);
    }
    setLoading(false);
  };

  const handleUpdateNote = async () => {
    if (!supabase || !editingNote) return;

    setLoading(true);
    const { error } = await supabase.
    from('notes').
    update({
      title: editingNote.title?.trim() || null,
      content: editingNote.content.trim(),
      month: editingNote.month,
      updated_at: new Date().toISOString()
    }).
    eq('id', editingNote.id);

    if (!error) {
      await loadNotes();
      setEditingNote(null);
    }
    setLoading(false);
  };

  const handleDeleteNote = async (id: string) => {
    if (!supabase || !confirm('בטוח שברצונך למחוק את ההערה?')) return;

    setLoading(true);
    await supabase.from('notes').delete().eq('id', id);
    await loadNotes();
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = currentMonthView.split('-').map(Number);
    const date = new Date(year, month - 1);
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    setCurrentMonthView(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  // Get all unique months from notes
  const uniqueMonths = [...new Set(notes.filter((n) => n.month).map((n) => n.month!))].sort().reverse();

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    if (filterMonth === 'all') return true;
    if (filterMonth === 'general') return note.month === null;
    return note.month === filterMonth;
  });

  // Group notes by month for display
  const generalNotes = filteredNotes.filter((n) => n.month === null);
  const monthlyNotes = filteredNotes.filter((n) => n.month !== null);

  if (loading && notes.length === 0) {
    return (
      <Layout>
        <div data-ev-id="ev_0ebd55889c" className="md:mr-52 flex items-center justify-center py-12">
          <div data-ev-id="ev_88433f4d7b" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Layout>);

  }

  return (
    <Layout>
      <div data-ev-id="ev_2e437a14ab" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        <div data-ev-id="ev_609df325e2" className="flex items-center justify-between">
          <div data-ev-id="ev_3c8013acd0">
            <h2 data-ev-id="ev_8482956c7e" className="text-2xl font-bold text-foreground">הערות</h2>
            <p data-ev-id="ev_9f90749c3f" className="text-muted-foreground">רשום תזכורות והערות לעצמך</p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4" />
            הערה חדשה
          </Button>
        </div>

        {/* Filter tabs */}
        <div data-ev-id="ev_a493aa5397" className="flex flex-wrap gap-2">
          <button data-ev-id="ev_6dfaf825ae"
          onClick={() => setFilterMonth('all')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
          filterMonth === 'all' ?
          'bg-primary text-primary-foreground' :
          'bg-muted text-muted-foreground hover:bg-muted/80'}`
          }>

            הכל ({notes.length})
          </button>
          <button data-ev-id="ev_899044c1b0"
          onClick={() => setFilterMonth('general')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
          filterMonth === 'general' ?
          'bg-primary text-primary-foreground' :
          'bg-muted text-muted-foreground hover:bg-muted/80'}`
          }>

            כללי ({notes.filter((n) => n.month === null).length})
          </button>
          {uniqueMonths.map((month) =>
          <button data-ev-id="ev_62480810ca"
          key={month}
          onClick={() => setFilterMonth(month)}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
          filterMonth === month ?
          'bg-primary text-primary-foreground' :
          'bg-muted text-muted-foreground hover:bg-muted/80'}`
          }>

              {getMonthName(month)} ({notes.filter((n) => n.month === month).length})
            </button>
          )}
        </div>

        {/* Notes list */}
        {filteredNotes.length === 0 ?
        <Card className="text-center py-12">
            <StickyNote className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p data-ev-id="ev_710aa56be9" className="text-muted-foreground">אין הערות {filterMonth !== 'all' ? 'בקטגוריה זו' : 'עדיין'}</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4" />
              הוסף הערה ראשונה
            </Button>
          </Card> :

        <div data-ev-id="ev_afeec03889" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) =>
          <Card key={note.id} className="flex flex-col">
                <div data-ev-id="ev_14bf71b33d" className="flex items-start justify-between mb-2">
                  <div data-ev-id="ev_8c840e008e" className="flex-1">
                    {note.title &&
                <h3 data-ev-id="ev_1c611fdc62" className="font-semibold text-foreground mb-1">{note.title}</h3>
                }
                    {note.month ?
                <span data-ev-id="ev_c49e14a048" className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        <Calendar className="w-3 h-3" />
                        {getMonthName(note.month)}
                      </span> :

                <span data-ev-id="ev_85365c5186" className="text-xs text-muted-foreground">הערה כללית</span>
                }
                  </div>
                  <div data-ev-id="ev_13e20222cc" className="flex gap-1">
                    <button data-ev-id="ev_7ec9330fbd"
                onClick={() => setEditingNote(note)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">

                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button data-ev-id="ev_0447c5973e"
                onClick={() => handleDeleteNote(note.id)}
                className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-600">

                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p data-ev-id="ev_1b6f6abbc7" className="text-foreground whitespace-pre-wrap flex-1 mb-3">{note.content}</p>
                <p data-ev-id="ev_e3b19c1144" className="text-xs text-muted-foreground border-t border-border pt-2">
                  עודכן: {formatDate(note.updated_at)}
                </p>
              </Card>
          )}
          </div>
        }

        {/* Add Note Modal */}
        {showAddForm &&
        <div data-ev-id="ev_d286b443ab" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddForm(false)}>
            <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div data-ev-id="ev_765ac2abad" className="flex items-center justify-between mb-4">
                <h3 data-ev-id="ev_6f91f6b98b" className="text-lg font-bold text-foreground">הערה חדשה</h3>
                <button data-ev-id="ev_b9ab42f3f5" onClick={() => setShowAddForm(false)} className="p-2 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div data-ev-id="ev_6cfd677227" className="flex flex-col gap-4">
                <Input
                label="כותרת (אופציונלי)"
                placeholder="כותרת ההערה"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)} />

                
                <div data-ev-id="ev_36e3804689">
                  <label data-ev-id="ev_537edaa8c5" className="block text-sm font-medium text-foreground mb-1">תוכן</label>
                  <textarea data-ev-id="ev_608f1bc9e1"
                className="w-full min-h-[120px] p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                placeholder="כתוב את ההערה שלך כאן..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)} />

                </div>
                
                <div data-ev-id="ev_646f1ef6fb">
                  <label data-ev-id="ev_49453f592d" className="block text-sm font-medium text-foreground mb-2">שיוך לחודש</label>
                  <div data-ev-id="ev_397b2fbaee" className="flex items-center gap-2">
                    <button data-ev-id="ev_b9c43f4cec"
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-muted rounded-lg">

                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button data-ev-id="ev_58a9846b61"
                  onClick={() => setNewNoteMonth(newNoteMonth === currentMonthView ? null : currentMonthView)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm transition-colors ${
                  newNoteMonth === currentMonthView ?
                  'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground hover:bg-muted/80'}`
                  }>

                      {getMonthName(currentMonthView)}
                    </button>
                    <button data-ev-id="ev_a37270b7f6"
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-muted rounded-lg">

                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>
                  <p data-ev-id="ev_c3224229ba" className="text-xs text-muted-foreground mt-2">
                    {newNoteMonth ? `משויך ל${getMonthName(newNoteMonth)}` : 'הערה כללית (לא משויכת לחודש)'}
                  </p>
                </div>
                
                <div data-ev-id="ev_7dcd2cd344" className="flex gap-3 mt-2">
                  <Button onClick={handleAddNote} disabled={loading || !newNoteContent.trim()}>
                    שמור
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    ביטול
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        }

        {/* Edit Note Modal */}
        {editingNote &&
        <div data-ev-id="ev_fa2005dda8" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setEditingNote(null)}>
            <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div data-ev-id="ev_a7da8e6b91" className="flex items-center justify-between mb-4">
                <h3 data-ev-id="ev_bd1f175f33" className="text-lg font-bold text-foreground">עריכת הערה</h3>
                <button data-ev-id="ev_eeb8b552cd" onClick={() => setEditingNote(null)} className="p-2 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div data-ev-id="ev_c978e1ec2c" className="flex flex-col gap-4">
                <Input
                label="כותרת (אופציונלי)"
                placeholder="כותרת ההערה"
                value={editingNote.title || ''}
                onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })} />

                
                <div data-ev-id="ev_084dc6c65d">
                  <label data-ev-id="ev_0b9fe91e64" className="block text-sm font-medium text-foreground mb-1">תוכן</label>
                  <textarea data-ev-id="ev_4b780b58dd"
                className="w-full min-h-[120px] p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                placeholder="כתוב את ההערה שלך כאן..."
                value={editingNote.content}
                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })} />

                </div>
                
                <div data-ev-id="ev_db195d85ba">
                  <label data-ev-id="ev_c70b77c49d" className="block text-sm font-medium text-foreground mb-2">שיוך לחודש</label>
                  <div data-ev-id="ev_8680ba6505" className="flex items-center gap-2">
                    <button data-ev-id="ev_19110fc847"
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-muted rounded-lg">

                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button data-ev-id="ev_4f36a8184d"
                  onClick={() => setEditingNote({
                    ...editingNote,
                    month: editingNote.month === currentMonthView ? null : currentMonthView
                  })}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm transition-colors ${
                  editingNote.month === currentMonthView ?
                  'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground hover:bg-muted/80'}`
                  }>

                      {getMonthName(currentMonthView)}
                    </button>
                    <button data-ev-id="ev_bccd786bd3"
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-muted rounded-lg">

                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>
                  <p data-ev-id="ev_bac34bd88b" className="text-xs text-muted-foreground mt-2">
                    {editingNote.month ? `משויך ל${getMonthName(editingNote.month)}` : 'הערה כללית (לא משויכת לחודש)'}
                  </p>
                </div>
                
                <div data-ev-id="ev_8acf1b4eed" className="flex gap-3 mt-2">
                  <Button onClick={handleUpdateNote} disabled={loading || !editingNote.content.trim()}>
                    שמור
                  </Button>
                  <Button variant="outline" onClick={() => setEditingNote(null)}>
                    ביטול
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        }
      </div>
    </Layout>);

}