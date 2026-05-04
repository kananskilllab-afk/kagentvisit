// ─── screens-2: New Visit Form, Calendar, Analytics ───────────

// ═══════════════════════════════════════════════════════════════
// NEW VISIT — Multi-step form
// ═══════════════════════════════════════════════════════════════
const FORM_STEPS = [
  { title:'Visit Info',      sub:'Institution & location details' },
  { title:'Meeting Details', sub:'Attendees, agenda & discussion' },
  { title:'Performance',     sub:'Ratings, targets & feedback' },
  { title:'Documents',       sub:'Photos, receipts & attachments' },
  { title:'Review & Submit', sub:'Confirm all details before submitting' },
];

const StepDot = ({ idx, current, done }) => {
  const active = idx === current;
  const completed = idx < current || done;
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
      <div style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',
        justifyContent:'center',border:`2px solid ${completed?M.green:active?M.navy:M.border}`,
        background:completed?M.green:active?M.navy:'white',
        transition:'all 0.2s',fontFamily:'Manrope,sans-serif'}}>
        {completed
          ? <Icon path={IC.check} size={14} color="white" sw={2.5}/>
          : <span style={{fontSize:12,fontWeight:700,color:active?'white':M.muted}}>{idx+1}</span>
        }
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:11,fontWeight:700,color:active?M.text:completed?M.green:M.muted,
          whiteSpace:'nowrap'}}>{FORM_STEPS[idx].title}</div>
      </div>
    </div>
  );
};

const FieldGroup = ({ label, children, required }) => (
  <div style={{marginBottom:18}}>
    <div style={{color:M.sub,fontSize:10,fontWeight:700,letterSpacing:1.6,
      textTransform:'uppercase',marginBottom:7}}>
      {label}{required && <span style={{color:M.red,marginLeft:3}}>*</span>}
    </div>
    {children}
  </div>
);

const TextInput = ({ placeholder, value, onChange, multiline=false }) => {
  const base = {width:'100%',border:`1.5px solid ${M.border}`,borderRadius:8,
    background:M.white,padding:'11px 14px',fontSize:13,color:M.text,
    outline:'none',fontFamily:'Inter,sans-serif',resize:'none',
    boxShadow:'0 1px 2px rgba(0,0,0,0.04)'};
  return multiline
    ? <textarea placeholder={placeholder} value={value} onChange={onChange}
        rows={3} style={{...base,display:'block'}}/>
    : <input type="text" placeholder={placeholder} value={value} onChange={onChange}
        style={{...base,height:44,display:'block'}}/>;
};

const SelectInput = ({ options, value, onChange }) => (
  <select value={value} onChange={onChange}
    style={{width:'100%',height:44,border:`1.5px solid ${M.border}`,borderRadius:8,
      background:M.white,padding:'0 14px',fontSize:13,color:value?M.text:M.muted,
      outline:'none',fontFamily:'Inter,sans-serif',appearance:'none',
      boxShadow:'0 1px 2px rgba(0,0,0,0.04)',cursor:'pointer'}}>
    {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const StarRatingInput = ({ value, onChange }) => (
  <div style={{display:'flex',gap:8}}>
    {[1,2,3,4,5].map(n=>(
      <div key={n} onClick={()=>onChange(n)} style={{cursor:'pointer'}}>
        <Icon path={IC.star} size={28}
          color={n<=(value||0)?M.gold:M.border}
          fill={n<=(value||0)?M.gold:'none'} sw={1.5}/>
      </div>
    ))}
  </div>
);

const PhotoUploadBox = () => (
  <div style={{border:`2px dashed ${M.border}`,borderRadius:8,padding:'32px 20px',
    display:'flex',flexDirection:'column',alignItems:'center',gap:10,cursor:'pointer',
    background:'#FAFAFA',transition:'border-color 0.15s'}}
    onMouseEnter={e=>e.currentTarget.style.borderColor=M.blue}
    onMouseLeave={e=>e.currentTarget.style.borderColor=M.border}>
    <div style={{width:44,height:44,borderRadius:10,background:'#F1F5F9',
      display:'flex',alignItems:'center',justifyContent:'center'}}>
      <Icon path={IC.upload} size={20} color={M.muted}/>
    </div>
    <div style={{textAlign:'center'}}>
      <div style={{fontSize:13,fontWeight:600,color:M.text}}>Click to upload or drag & drop</div>
      <div style={{fontSize:12,color:M.muted,marginTop:3}}>PNG, JPG, PDF up to 10MB each</div>
    </div>
    <Btn variant="secondary" size="sm">Browse files</Btn>
  </div>
);

// ─── Agent Autocomplete ───────────────────────────────────────
const AgentAutocomplete = ({ value, onChange, onSelect }) => {
  const [query, setQuery] = React.useState(value || '');
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [isNew, setIsNew] = React.useState(false);
  const ref = React.useRef(null);
  const debounceRef = React.useRef(null);

  React.useEffect(() => {
    setQuery(value || '');
  }, [value]);

  React.useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = (q) => {
    clearTimeout(debounceRef.current);
    setQuery(q);
    onChange(q);
    if (!q || q.length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/agents?search=${encodeURIComponent(q)}&limit=10`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          const agents = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
          setResults(agents);
          setIsNew(agents.length === 0 || !agents.some(a => a.name.toLowerCase() === q.toLowerCase()));
          setOpen(true);
        }
      } catch (err) {
        console.warn('[AgentAutocomplete] Fetch failed:', err.message);
      } finally {
        setLoading(false);
      }
    }, 280);
  };

  const pick = (agent) => {
    setQuery(agent.name);
    setOpen(false);
    setIsNew(false);
    onSelect(agent);
  };

  const base = { width: '100%', border: `1.5px solid ${M.border}`, borderRadius: 8,
    background: M.white, padding: '11px 14px', fontSize: 13, color: M.text,
    outline: 'none', fontFamily: 'Inter,sans-serif', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', height: 44 };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Type agency/institution name…"
          value={query}
          onChange={e => search(e.target.value)}
          onFocus={() => query.length >= 2 && results.length > 0 && setOpen(true)}
          style={{ ...base, paddingRight: 36 }}
        />
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          {loading
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={M.muted} strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
            : <Icon path={IC.search} size={14} color={M.muted} />
          }
        </div>
      </div>
      {isNew && query.trim().length >= 2 && (
        <div style={{ marginTop: 4, fontSize: 11, color: M.gold, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon path={IC.info} size={12} color={M.gold} />
          New agency — will be auto-registered in Manage Agents on submission.
        </div>
      )}
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, marginTop: 4,
          background: M.white, borderRadius: 8, border: `1.5px solid ${M.border}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
          {results.map((agent, i) => (
            <div key={agent._id || i} onClick={() => pick(agent)}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid #F1F5F9`,
                transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontSize: 13, fontWeight: 600, color: M.text }}>{agent.name}</div>
              <div style={{ fontSize: 11, color: M.muted, marginTop: 2 }}>
                {[agent.city, agent.state].filter(Boolean).join(', ')}
                {agent.bdmName ? ` · BDM: ${agent.bdmName}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NewVisitScreen = ({ onNav }) => {
  const [step, setStep] = React.useState(0);
  const [submitted, setSubmitted] = React.useState(false);
  const [form, setForm] = React.useState({
    institution: '', agentId: '', city: '', bdmName: '', rmName: '',
    type: '', date: '', visitType: 'generic',
    attendees: '', agenda: '', discussion: '', notes: '',
    overallRating: 0, communicationRating: 0, target: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAgentSelect = (agent) => {
    setForm(f => ({
      ...f,
      institution: agent.name,
      agentId: agent._id || '',
      city: agent.city || f.city,
      bdmName: agent.bdmName || f.bdmName,
      rmName: agent.rmName || f.rmName,
    }));
  };

  if (submitted) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: '#F0FDF4',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Icon path={IC.check} size={32} color={M.green} sw={2.5} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: M.text, fontFamily: 'Manrope,sans-serif', marginBottom: 8 }}>Visit Submitted!</div>
        <div style={{ fontSize: 14, color: M.sub, marginBottom: 28, lineHeight: 1.6 }}>
          Your visit report has been submitted for review. You'll be notified once it's processed.
          {!form.agentId && form.institution && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 12, color: '#92400E' }}>
              <strong>{form.institution}</strong> has been auto-registered in Manage Agents.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Btn variant="secondary" onClick={() => {
            setSubmitted(false); setStep(0);
            setForm({ institution: '', agentId: '', city: '', bdmName: '', rmName: '', type: '', date: '', visitType: 'generic', attendees: '', agenda: '', discussion: '', notes: '', overallRating: 0, communicationRating: 0, target: '' });
          }}>New Visit</Btn>
          <Btn variant="primary" onClick={() => onNav('visits')}>View All Visits</Btn>
        </div>
      </div>
    </div>
  );

  const stepContent = [
    // Step 0: Visit Info
    <div key="s0" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      <div style={{ gridColumn: '1/-1' }}>
        <FieldGroup label="Agency / Institution Name" required>
          <AgentAutocomplete
            value={form.institution}
            onChange={v => set('institution', v)}
            onSelect={handleAgentSelect}
          />
        </FieldGroup>
      </div>
      <FieldGroup label="City" required>
        <TextInput placeholder="e.g. Mumbai" value={form.city} onChange={e => set('city', e.target.value)} />
      </FieldGroup>
      <FieldGroup label="Visit Type" required>
        <SelectInput value={form.visitType} onChange={e => set('visitType', e.target.value)}
          options={[{ value: '', label: 'Select type…' }, { value: 'generic', label: 'B2B Visit' }, { value: 'home_visit', label: 'B2C Home Visit' }, { value: 'demo', label: 'Demo Visit' }]} />
      </FieldGroup>
      <FieldGroup label="Visit Date" required>
        <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
          style={{ width: '100%', height: 44, border: `1.5px solid ${M.border}`, borderRadius: 8,
            background: M.white, padding: '0 14px', fontSize: 13, color: M.text, outline: 'none',
            fontFamily: 'Inter,sans-serif' }} />
      </FieldGroup>
      {(form.bdmName || form.rmName) && (
        <div style={{ gridColumn: '1/-1', padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, display: 'flex', gap: 24, fontSize: 12 }}>
          <Icon path={IC.check} size={14} color={M.green} />
          {form.bdmName && <span><span style={{ color: M.muted }}>BDM:</span> <strong style={{ color: M.text }}>{form.bdmName}</strong></span>}
          {form.rmName && <span><span style={{ color: M.muted }}>RM:</span> <strong style={{ color: M.text }}>{form.rmName}</strong></span>}
          <span style={{ color: M.muted, marginLeft: 'auto', fontSize: 11 }}>Auto-filled from agent profile</span>
        </div>
      )}
      <div style={{ gridColumn: '1/-1' }}>
        <FieldGroup label="GPS Location">
          <div style={{ height: 44, border: `1.5px solid ${M.border}`, borderRadius: 8, background: '#FAFAFA',
            display: 'flex', alignItems: 'center', paddingInline: 14, gap: 10 }}>
            <Icon path={IC.mappin} size={14} color={M.muted} />
            <span style={{ fontSize: 13, color: M.muted }}>Fetching location… (auto-populated)</span>
          </div>
        </FieldGroup>
      </div>
    </div>,

    // Step 1: Meeting Details
    <div key="s1" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <FieldGroup label="Attendees" required>
        <TextInput placeholder="Names and roles of people you met" value={form.attendees}
          onChange={e => set('attendees', e.target.value)} multiline />
      </FieldGroup>
      <FieldGroup label="Meeting Agenda">
        <TextInput placeholder="What was the purpose of this visit?" value={form.agenda}
          onChange={e => set('agenda', e.target.value)} multiline />
      </FieldGroup>
      <FieldGroup label="Discussion Summary" required>
        <TextInput placeholder="Key points discussed, decisions made, follow-ups needed…"
          value={form.discussion} onChange={e => set('discussion', e.target.value)} multiline />
      </FieldGroup>
      <FieldGroup label="Additional Notes">
        <TextInput placeholder="Any extra context or observations" value={form.notes}
          onChange={e => set('notes', e.target.value)} multiline />
      </FieldGroup>
    </div>,

    // Step 2: Performance
    <div key="s2" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ padding: 20, background: '#F8FAFC', borderRadius: 8, border: `1px solid ${M.border}` }}>
        <FieldGroup label="Overall Visit Rating">
          <StarRatingInput value={form.overallRating} onChange={v => set('overallRating', v)} />
          <div style={{ marginTop: 8, fontSize: 12, color: M.muted }}>
            {['', 'Very Poor', 'Poor', 'Average', 'Good', 'Excellent'][form.overallRating] || 'Tap a star to rate'}
          </div>
        </FieldGroup>
      </div>
      <div style={{ padding: 20, background: '#F8FAFC', borderRadius: 8, border: `1px solid ${M.border}` }}>
        <FieldGroup label="Agent Communication Rating">
          <StarRatingInput value={form.communicationRating} onChange={v => set('communicationRating', v)} />
        </FieldGroup>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FieldGroup label="Student Target (Monthly)">
          <TextInput placeholder="e.g. 25 students" value={form.target} onChange={e => set('target', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Outcome">
          <SelectInput value="" onChange={() => {}}
            options={[{ value: '', label: 'Select outcome…' }, { value: 'positive', label: 'Positive — follow-up planned' }, { value: 'neutral', label: 'Neutral — monitoring' }, { value: 'needs_work', label: 'Needs improvement' }]} />
        </FieldGroup>
      </div>
    </div>,

    // Step 3: Documents
    <div key="s3" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <FieldGroup label="Visit Photos">
        <PhotoUploadBox />
      </FieldGroup>
      <FieldGroup label="Supporting Documents">
        <PhotoUploadBox />
      </FieldGroup>
      <div style={{ padding: 14, background: '#FFFBEB', border: `1px solid #FDE68A`, borderRadius: 8,
        display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Icon path={IC.info} size={16} color={M.gold} />
        <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
          Photos are verified at submission. Ensure images are clear and timestamped. Max 10MB per file.
        </div>
      </div>
    </div>,

    // Step 4: Review
    <div key="s4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: 20, background: '#F8FAFC', borderRadius: 8, border: `1px solid ${M.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: M.text, marginBottom: 14, fontFamily: 'Manrope,sans-serif' }}>Visit Summary</div>
        {[
          ['Institution', form.institution || '—'],
          ['City', form.city || '—'],
          ['BDM', form.bdmName || '—'],
          ['RM', form.rmName || '—'],
          ['Visit Type', form.visitType || '—'],
          ['Date', form.date || '—'],
          ['Attendees', form.attendees || '—'],
          ['Overall Rating', form.overallRating ? '★'.repeat(form.overallRating) + '☆'.repeat(5 - form.overallRating) : '—'],
        ].map(([l, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0',
            borderBottom: `1px solid #EEF2F6`, fontSize: 13 }}>
            <span style={{ color: M.muted, fontWeight: 500 }}>{l}</span>
            <span style={{ color: M.text, fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{v}</span>
          </div>
        ))}
        {!form.agentId && form.institution && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 11, color: '#92400E' }}>
            ⚡ <strong>New agency</strong> — "{form.institution}" will be auto-added to Manage Agents on submission.
          </div>
        )}
      </div>
      <div style={{ padding: 14, background: '#EFF6FF', border: `1px solid #BFDBFE`, borderRadius: 8,
        display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Icon path={IC.info} size={16} color={M.blue} />
        <div style={{ fontSize: 12, color: '#1E3A5F', lineHeight: 1.5 }}>
          Once submitted, you have <strong>24 hours</strong> to make changes. After that, an admin unlock will be required.
        </div>
      </div>
    </div>,
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Step indicator bar */}
      <div style={{ background: M.white, borderBottom: `1px solid ${M.border}`, padding: '20px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          {FORM_STEPS.map((_, i) => (
            <React.Fragment key={i}>
              <StepDot idx={i} current={step} />
              {i < FORM_STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < step ? M.green : M.border, marginTop: 15, transition: 'background 0.3s' }} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: M.text, fontFamily: 'Manrope,sans-serif' }}>
            {FORM_STEPS[step].title}
          </div>
          <div style={{ fontSize: 12, color: M.muted, marginTop: 2 }}>{FORM_STEPS[step].sub}</div>
        </div>
      </div>

      {/* Form content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <Card style={{ padding: 28 }}>{stepContent[step]}</Card>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ background: M.white, borderTop: `1px solid ${M.border}`, padding: '14px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {step > 0 && (
            <Btn variant="secondary" onClick={() => setStep(s => s - 1)}
              icon={<Icon path={IC.chevL} size={14} color={M.sub} />}>Back</Btn>
          )}
          <span style={{ fontSize: 12, color: M.muted }}>Auto-saved as draft</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" onClick={() => onNav('visits')}>Save Draft</Btn>
          {step < FORM_STEPS.length - 1
            ? <Btn variant="primary" onClick={() => setStep(s => s + 1)}
                icon={<Icon path={IC.chevR} size={14} color="white" />} style={{ flexDirection: 'row-reverse' }}>
                Next
              </Btn>
            : <Btn variant="blue" onClick={() => setSubmitted(true)}
                icon={<Icon path={IC.check} size={14} color="white" />}>
                Submit Visit
              </Btn>
          }
        </div>
      </div>
    </div>
  );
};



// ═══════════════════════════════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════════════════════════════
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const SAMPLE_EVENTS = [
  {id:1,day:3,title:'DPS School Visit',agent:'Priya Sharma',time:'10:00 AM',status:'attended',type:'B2B'},
  {id:2,day:7,title:'EduStar Academy',agent:'Rajan Mehta',time:'2:00 PM',status:'pending',type:'B2B'},
  {id:3,day:10,title:'Global Study Centre',agent:'Aisha Khan',time:'11:30 AM',status:'attended',type:'B2C'},
  {id:4,day:14,title:'Cambridge Prep',agent:'Sara Ali',time:'9:00 AM',status:'pending',type:'B2B'},
  {id:5,day:15,title:'Wisdom World Academy',agent:'Karan Singh',time:'3:00 PM',status:'missed',type:'B2C'},
  {id:6,day:18,title:'Oxford Public School',agent:'Neha Joshi',time:'10:30 AM',status:'attended',type:'B2B'},
  {id:7,day:21,title:'Sunrise International',agent:'Vikram Rao',time:'1:00 PM',status:'pending',type:'B2B'},
  {id:8,day:25,title:'Bright Future Inst.',agent:'Dev Patel',time:'11:00 AM',status:'pending',type:'B2C'},
  {id:9,day:28,title:'Premium Study Hub',agent:'Priya Sharma',time:'4:00 PM',status:'pending',type:'B2B'},
  {id:10,day:30,title:'Future Scholars',agent:'Rajan Mehta',time:'9:30 AM',status:'pending',type:'B2B'},
];

const STATUS_DOT = {
  attended:  {bg:'#ECFDF5',text:'#059669',dot:'#10B981'},
  pending:   {bg:'#FFFBEB',text:'#D97706',dot:'#F59E0B'},
  missed:    {bg:'#FEF2F2',text:'#DC2626',dot:'#EF4444'},
  cancelled: {bg:'#F1F5F9',text:'#475569',dot:'#94A3B8'},
};

const CalendarScreen = () => {
  const [view, setView] = React.useState('month');
  const [selectedDay, setSelectedDay] = React.useState(null);
  const year = 2026, month = 3; // April 2026
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = 30;
  const eventsForDay = d => SAMPLE_EVENTS.filter(e=>e.day===d);

  return (
    <div style={{flex:1,display:'flex',overflow:'hidden'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Calendar toolbar */}
        <div style={{padding:'12px 24px',background:M.white,borderBottom:`1px solid ${M.border}`,
          display:'flex',gap:10,alignItems:'center',flexShrink:0}}>
          <Btn variant="secondary" size="sm" icon={<Icon path={IC.chevL} size={13} color={M.sub}/>}/>
          <div style={{fontFamily:'Manrope,sans-serif',fontSize:15,fontWeight:700,color:M.text}}>
            April 2026
          </div>
          <Btn variant="secondary" size="sm" icon={<Icon path={IC.chevR} size={13} color={M.sub}/>}/>
          <Btn variant="secondary" size="sm">Today</Btn>
          <div style={{marginLeft:'auto',display:'flex',gap:4}}>
            {['month','week','agenda'].map(v=>(
              <div key={v} onClick={()=>setView(v)}
                style={{height:32,paddingInline:12,borderRadius:6,cursor:'pointer',fontSize:11,
                  fontWeight:600,display:'flex',alignItems:'center',transition:'all 0.12s',
                  background:view===v?M.navy:'#F1F5F9',color:view===v?'white':M.sub,
                  textTransform:'capitalize'}}>{v}</div>
            ))}
          </div>
          <Btn variant="primary" size="sm" icon={<Icon path={IC.plus} size={12} color="white"/>}>
            Schedule Visit
          </Btn>
        </div>

        {/* Calendar grid */}
        <div style={{flex:1,overflow:'auto',padding:16}}>
          <Card style={{overflow:'hidden'}}>
            {/* Day headers */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',
              borderBottom:`1px solid ${M.border}`}}>
              {DAYS.map(d=>(
                <div key={d} style={{padding:'10px 0',textAlign:'center',fontSize:11,fontWeight:700,
                  color:M.muted,letterSpacing:1,textTransform:'uppercase'}}>{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
              {[...Array(firstDay)].map((_,i)=>(
                <div key={`e${i}`} style={{minHeight:100,borderRight:`1px solid #F1F5F9`,
                  borderBottom:`1px solid #F1F5F9`,background:'#FAFAFA'}}/>
              ))}
              {[...Array(daysInMonth)].map((_,i)=>{
                const d = i+1;
                const events = eventsForDay(d);
                const isToday = d===today;
                const selected = selectedDay===d;
                return (
                  <div key={d} onClick={()=>setSelectedDay(selected?null:d)}
                    style={{minHeight:100,borderRight:`1px solid #F1F5F9`,
                      borderBottom:`1px solid #F1F5F9`,padding:'6px 8px',cursor:'pointer',
                      background:selected?'#EFF6FF':isToday?'#FAFBFF':'white',
                      transition:'background 0.12s'}}>
                    <div style={{width:24,height:24,borderRadius:'50%',display:'flex',
                      alignItems:'center',justifyContent:'center',marginBottom:4,
                      background:isToday?M.navy:'transparent',
                      fontSize:12,fontWeight:isToday?700:500,
                      color:isToday?'white':M.text}}>{d}</div>
                    {events.slice(0,2).map(e=>{
                      const sc = STATUS_DOT[e.status]||STATUS_DOT.pending;
                      return (
                        <div key={e.id} style={{background:sc.bg,color:sc.text,fontSize:10,
                          fontWeight:600,padding:'2px 5px',borderRadius:3,marginBottom:2,
                          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                          {e.title}
                        </div>
                      );
                    })}
                    {events.length>2 && (
                      <div style={{fontSize:10,color:M.muted,fontWeight:600}}>
                        +{events.length-2} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Day detail */}
      {selectedDay && (
        <div style={{width:300,background:M.white,borderLeft:`1px solid ${M.border}`,
          display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'14px 18px',borderBottom:`1px solid #F1F5F9`,
            display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:M.text}}>
              April {selectedDay}, 2026
            </div>
            <div onClick={()=>setSelectedDay(null)} style={{cursor:'pointer',padding:4}}>
              <Icon path={IC.x} size={15} color={M.muted}/>
            </div>
          </div>
          <div style={{flex:1,overflow:'auto',padding:14}}>
            {eventsForDay(selectedDay).length===0
              ? <EmptyState icon={IC.calendar} title="No visits" sub="Nothing scheduled for this day"/>
              : eventsForDay(selectedDay).map(e=>{
                const sc=STATUS_DOT[e.status]||STATUS_DOT.pending;
                return (
                  <div key={e.id} style={{padding:'12px 14px',borderRadius:8,border:`1px solid ${M.border}`,
                    marginBottom:8,cursor:'pointer'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                      <div style={{fontSize:12,fontWeight:700,color:M.text}}>{e.title}</div>
                      <div style={{width:7,height:7,borderRadius:'50%',background:sc.dot,flexShrink:0,marginTop:3}}/>
                    </div>
                    <div style={{fontSize:11,color:M.muted,marginBottom:4}}>{e.agent}</div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:10,color:M.muted}}>{e.time}</span>
                      <span style={{background:sc.bg,color:sc.text,fontSize:9,fontWeight:700,
                        padding:'2px 6px',borderRadius:3,textTransform:'uppercase'}}>
                        {e.status}
                      </span>
                    </div>
                  </div>
                );
              })
            }
            <Btn variant="primary" size="sm" style={{width:'100%',justifyContent:'center',marginTop:8}}
              icon={<Icon path={IC.plus} size={12} color="white"/>}>
              Add Visit
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════
const AnalyticsScreen = () => {
  const [period, setPeriod] = React.useState('month');
  const agentData = [
    {name:'Priya Sharma',visits:14,closed:11,pending:2,score:93},
    {name:'Rajan Mehta',visits:9,closed:7,pending:1,score:88},
    {name:'Aisha Khan',visits:12,closed:9,pending:2,score:85},
    {name:'Dev Patel',visits:6,closed:3,pending:2,score:72},
    {name:'Sara Ali',visits:8,closed:6,pending:1,score:90},
  ];
  const cityData = [
    {city:'Mumbai',visits:18,pct:38},{city:'Delhi',visits:12,pct:26},
    {city:'Pune',visits:8,pct:17},{city:'Bangalore',visits:5,pct:11},{city:'Others',visits:4,pct:8},
  ];
  const cityColors = [M.blue,M.navy,M.green,M.gold,M.muted];

  return (
    <div style={{flex:1,overflow:'auto',padding:24,display:'flex',flexDirection:'column',gap:20}}>
      {/* Period filter */}
      <div style={{display:'flex',gap:4}}>
        {['week','month','quarter','year'].map(p=>(
          <div key={p} onClick={()=>setPeriod(p)}
            style={{height:32,paddingInline:14,borderRadius:6,cursor:'pointer',fontSize:12,
              fontWeight:600,display:'flex',alignItems:'center',transition:'all 0.12s',
              background:period===p?M.navy:'white',color:period===p?'white':M.sub,
              textTransform:'capitalize',boxShadow:period===p?'none':M.cardShadow}}>
            {p}
          </div>
        ))}
      </div>

      {/* Top KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {[{label:'Total Visits',v:'47',accent:M.blue,trend:'+12%'},
          {label:'Avg per Agent',v:'9.4',accent:M.navy,trend:'+2.1'},
          {label:'Closure Rate',v:'79%',accent:M.green,trend:'+6%'},
          {label:'Avg Rating',v:'4.1★',accent:M.gold,trend:'+0.3'},
        ].map((k,i)=>(
          <Card key={i} style={{padding:'16px 18px',borderLeft:`4px solid ${k.accent}`}}>
            <div style={{color:M.muted,fontSize:10,fontWeight:700,letterSpacing:1.6,
              textTransform:'uppercase',marginBottom:8}}>{k.label}</div>
            <div style={{color:M.text,fontSize:28,fontWeight:900,letterSpacing:-1,
              fontFamily:'Manrope,sans-serif',lineHeight:1}}>{k.v}</div>
            <div style={{color:k.accent,fontSize:11,fontWeight:600,marginTop:5}}>{k.trend} vs last period</div>
          </Card>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
        {/* Trend chart */}
        <Card style={{padding:'20px 22px'}}>
          <SectionTitle>Visit Trend
            <div style={{display:'flex',gap:4}}>
              {['W','M','Y'].map(t=>(
                <div key={t} style={{width:28,height:28,borderRadius:5,cursor:'pointer',
                  background:t==='M'?M.navy:'#F1F5F9',display:'flex',alignItems:'center',
                  justifyContent:'center',fontSize:11,fontWeight:700,
                  color:t==='M'?'white':M.sub}}>{t}</div>
              ))}
            </div>
          </SectionTitle>
          <SparkArea data={CHART_DATA} color={M.blue} height={140} uid="analytics-area"/>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
            {MONTHS_SHORT.filter((_,i)=>i%3===0).map(m=>(
              <span key={m} style={{color:M.muted,fontSize:10,fontWeight:500}}>{m}</span>
            ))}
          </div>
        </Card>

        {/* City breakdown */}
        <Card style={{padding:'20px 22px'}}>
          <SectionTitle>By City</SectionTitle>
          {cityData.map((c,i)=>(
            <div key={i} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontSize:12,fontWeight:600,color:M.text}}>{c.city}</span>
                <span style={{fontSize:12,fontWeight:700,color:M.text}}>{c.visits}</span>
              </div>
              <div style={{height:6,borderRadius:3,background:'#F1F5F9'}}>
                <div style={{height:'100%',borderRadius:3,width:`${c.pct}%`,background:cityColors[i]}}/>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Agent performance table */}
      <Card>
        <div style={{padding:'14px 20px',borderBottom:`1px solid #F1F5F9`,
          display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:14,fontWeight:700,color:M.text,fontFamily:'Manrope,sans-serif'}}>
            Agent Performance
          </div>
          <Btn variant="secondary" size="sm" icon={<Icon path={IC.download} size={12} color={M.sub}/>}>
            Export
          </Btn>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#F8FAFC'}}>
              {['Agent','Visits','Closed','Pending','Score','Trend'].map(h=>(
                <th key={h} style={{padding:'9px 18px',textAlign:'left',fontSize:10,fontWeight:700,
                  color:M.sub,letterSpacing:1.2,textTransform:'uppercase',
                  borderBottom:`1px solid #F1F5F9`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agentData.map((a,i)=>(
              <tr key={i} style={{borderBottom:i<agentData.length-1?`1px solid #F8FAFC`:'none'}}>
                <td style={{padding:'12px 18px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:9}}>
                    <Avatar name={a.name} size={30}/>
                    <span style={{fontSize:13,fontWeight:600,color:M.text}}>{a.name}</span>
                  </div>
                </td>
                <td style={{padding:'12px 18px',fontSize:13,fontWeight:600,color:M.text}}>{a.visits}</td>
                <td style={{padding:'12px 18px',fontSize:13,color:M.green,fontWeight:600}}>{a.closed}</td>
                <td style={{padding:'12px 18px',fontSize:13,color:M.gold,fontWeight:600}}>{a.pending}</td>
                <td style={{padding:'12px 18px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{flex:1,height:6,borderRadius:3,background:'#F1F5F9',maxWidth:80}}>
                      <div style={{height:'100%',borderRadius:3,width:`${a.score}%`,
                        background:a.score>=90?M.green:a.score>=75?M.blue:M.gold}}/>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:M.text}}>{a.score}%</span>
                  </div>
                </td>
                <td style={{padding:'12px 18px'}}>
                  <SparkArea data={CHART_DATA.slice(-6).map(v=>Math.round(v*(a.score/100)))}
                    color={M.blue} height={28} uid={`at${i}`}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

Object.assign(window, { NewVisitScreen, CalendarScreen, AnalyticsScreen });
