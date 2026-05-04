// ─── Meridian Design Tokens ──────────────────────────────────
const M = {
  navy:    '#1E1B4B',
  blue:    '#3B82F6',
  gold:    '#F59E0B',
  green:   '#10B981',
  red:     '#EF4444',
  sky:     '#0EA5E9',
  purple:  '#8B5CF6',
  bg:      '#F1F5F9',
  white:   '#FFFFFF',
  border:  '#E2E8F0',
  text:    '#0F172A',
  sub:     '#64748B',
  muted:   '#94A3B8',
  rowHov:  '#F8FAFC',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04)',
};

// ─── Icon primitive ───────────────────────────────────────────
const Icon = ({ path, size=16, color='currentColor', sw=1.75, fill='none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    <path d={path}/>
  </svg>
);

// ─── Icon paths ───────────────────────────────────────────────
const IC = {
  dashboard:   'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  calendar:    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  expenses:    'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  claims:      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  visits:      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  analytics:   'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  users:       'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  agents:      'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  formBuilder: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  forms:       'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  plus:        'M12 4v16m8-8H4',
  search:      'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  filter:      'M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z',
  chevR:       'M9 5l7 7-7 7',
  chevL:       'M15 19l-7-7 7-7',
  chevD:       'M19 9l-7 7-7-7',
  chevU:       'M5 15l7-7 7 7',
  arrowR:      'M13 7l5 5m0 0l-5 5m5-5H6',
  check:       'M5 13l4 4L19 7',
  x:           'M6 18L18 6M6 6l12 12',
  logout:      'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  eye:         'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  mail:        'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  lock:        'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  bell:        'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  pin:         'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  star:        'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  edit:        'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash:       'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  upload:      'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  download:    'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  shield:      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  rupee:       'M6 3h12M6 8h12m-7 5h7M6 3a9 9 0 010 18h-.5M6 8a9 9 0 010 10',
  trend:       'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  info:        'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  mappin:      'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  drag:        'M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01',
};

// ─── Chart primitives ─────────────────────────────────────────
const SparkArea = ({ data, color, height=80, uid='x' }) => {
  const max = Math.max(...data), n = data.length;
  const pts = data.map((v,i) => `${(i/(n-1))*100},${height-(v/max)*(height-4)}`).join(' ');
  const area = `0,${height} ${pts} 100,${height}`;
  const gid = `mer_sa_${uid}`;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{width:'100%',height:`${height}px`,display:'block'}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

const SparkBar = ({ data, color, height=80, uid='y' }) => {
  const max = Math.max(...data), w = 100/data.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{width:'100%',height:`${height}px`,display:'block'}}>
      {data.map((v,i)=>(
        <rect key={i} x={i*w+w*0.1} y={height-(v/max)*(height-2)} width={w*0.8} height={(v/max)*(height-2)}
          rx="1.5" fill={color} opacity={0.2+0.8*(i/(data.length-1))}/>
      ))}
    </svg>
  );
};

// ─── Status badge ─────────────────────────────────────────────
const VISIT_STATUS = {
  draft:           {bg:'#F1F5F9',text:'#475569',label:'Draft'},
  submitted:       {bg:'#FFFBEB',text:'#D97706',label:'Pending'},
  reviewed:        {bg:'#EFF6FF',text:'#2563EB',label:'Reviewed'},
  action_required: {bg:'#FEF2F2',text:'#DC2626',label:'Action Req.'},
  closed:          {bg:'#F0FDF4',text:'#15803D',label:'Closed'},
};
const EXPENSE_STATUS = {
  draft:               {bg:'#F1F5F9',text:'#475569',label:'Draft'},
  submitted:           {bg:'#FFFBEB',text:'#D97706',label:'Submitted'},
  under_review:        {bg:'#EFF6FF',text:'#2563EB',label:'Under Review'},
  needs_justification: {bg:'#FEF2F2',text:'#DC2626',label:'Needs Justification'},
  approved:            {bg:'#F0FDF4',text:'#15803D',label:'Approved'},
  paid:                {bg:'#ECFDF5',text:'#059669',label:'Paid'},
  rejected:            {bg:'#FEF2F2',text:'#6B7280',label:'Rejected'},
};
const StatusBadge = ({ status, map=VISIT_STATUS }) => {
  const s = map[status] || map.draft;
  return (
    <span style={{background:s.bg,color:s.text,fontSize:10,fontWeight:700,padding:'3px 8px',
      borderRadius:4,letterSpacing:0.4,whiteSpace:'nowrap'}}>{s.label}</span>
  );
};

// ─── Shared UI atoms ──────────────────────────────────────────
const Card = ({ children, style={}, className='' }) => (
  <div style={{background:M.white,borderRadius:8,boxShadow:M.cardShadow,...style}}>{children}</div>
);

const SectionTitle = ({ children, action }) => (
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
    marginBottom:18}}>
    <h2 style={{fontSize:14,fontWeight:700,color:M.text,fontFamily:'Manrope,sans-serif'}}>{children}</h2>
    {action}
  </div>
);

const Lbl = ({ children }) => (
  <div style={{color:M.sub,fontSize:10,fontWeight:700,letterSpacing:1.6,
    textTransform:'uppercase',marginBottom:7}}>{children}</div>
);

const Input = ({ placeholder, value, onChange, type='text', icon, style={} }) => (
  <div style={{position:'relative'}}>
    {icon && <div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',
      pointerEvents:'none'}}>{icon}</div>}
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      style={{width:'100%',height:40,border:`1.5px solid ${M.border}`,borderRadius:7,
        background:M.white,paddingLeft:icon?38:12,paddingRight:12,fontSize:13,
        color:M.text,outline:'none',fontFamily:'Inter,sans-serif',...style}}/>
  </div>
);

const Btn = ({ children, onClick, variant='primary', size='md', icon, style={} }) => {
  const base = {display:'inline-flex',alignItems:'center',justifyContent:'center',
    gap:6,cursor:'pointer',fontWeight:600,fontFamily:'Inter,sans-serif',
    border:'none',transition:'opacity 0.15s'};
  const variants = {
    primary: {background:M.navy,color:'white',borderRadius:6},
    secondary: {background:M.white,color:M.sub,border:`1.5px solid ${M.border}`,borderRadius:6},
    danger: {background:'#FEF2F2',color:M.red,border:`1.5px solid #FECACA`,borderRadius:6},
    ghost: {background:'transparent',color:M.sub,border:'none',borderRadius:6},
    blue: {background:M.blue,color:'white',borderRadius:6},
  };
  const sizes = {
    sm: {height:30,paddingInline:10,fontSize:12},
    md: {height:36,paddingInline:14,fontSize:13},
    lg: {height:44,paddingInline:20,fontSize:14},
  };
  return (
    <div onClick={onClick} style={{...base,...variants[variant],...sizes[size],...style}}>
      {icon}{children}
    </div>
  );
};

const Avatar = ({ name='', size=32, color=M.navy }) => (
  <div style={{width:size,height:size,borderRadius:size>40?10:7,background:color,
    display:'flex',alignItems:'center',justifyContent:'center',
    fontSize:size>40?14:11,fontWeight:700,color:'white',flexShrink:0,
    fontFamily:'Manrope,sans-serif'}}>
    {name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?'}
  </div>
);

const EmptyState = ({ icon, title, sub }) => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
    justifyContent:'center',padding:'60px 20px',gap:12}}>
    <div style={{width:48,height:48,borderRadius:12,background:'#F1F5F9',
      display:'flex',alignItems:'center',justifyContent:'center'}}>
      <Icon path={icon} size={20} color={M.muted}/>
    </div>
    <div style={{color:M.text,fontSize:14,fontWeight:700,fontFamily:'Manrope,sans-serif'}}>{title}</div>
    {sub && <div style={{color:M.muted,fontSize:12}}>{sub}</div>}
  </div>
);

// ─── Mock data ────────────────────────────────────────────────
const CHART_DATA = [28,35,22,41,38,47,53,45,62,58,71,65];
const MONTHS_SHORT = ['Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'];

const MOCK_VISITS = [
  {id:'v1',institution:'DPS International School',city:'Mumbai',agent:'Priya Sharma',agentInitials:'PS',status:'reviewed',date:'Apr 28',type:'B2B',rating:4},
  {id:'v2',institution:'EduStar Academy',city:'Delhi',agent:'Rajan Mehta',agentInitials:'RM',status:'submitted',date:'Apr 27',type:'B2B',rating:5},
  {id:'v3',institution:'Global Study Centre',city:'Pune',agent:'Aisha Khan',agentInitials:'AK',status:'closed',date:'Apr 26',type:'B2C',rating:3},
  {id:'v4',institution:'Bright Future Institute',city:'Bangalore',agent:'Dev Patel',agentInitials:'DP',status:'action_required',date:'Apr 25',type:'B2B',rating:2},
  {id:'v5',institution:'Cambridge Prep School',city:'Hyderabad',agent:'Sara Ali',agentInitials:'SA',status:'submitted',date:'Apr 24',type:'B2C',rating:4},
  {id:'v6',institution:'Wisdom World Academy',city:'Chennai',agent:'Karan Singh',agentInitials:'KS',status:'closed',date:'Apr 23',type:'B2B',rating:5},
  {id:'v7',institution:'Oxford Public School',city:'Kolkata',agent:'Neha Joshi',agentInitials:'NJ',status:'draft',date:'Apr 22',type:'B2B',rating:null},
  {id:'v8',institution:'Sunrise International',city:'Ahmedabad',agent:'Vikram Rao',agentInitials:'VR',status:'reviewed',date:'Apr 21',type:'B2C',rating:4},
];

const MOCK_AGENTS = [
  {id:'a1',name:'Premium Study Hub',city:'Mumbai',state:'Maharashtra',mobile:'98201 23456',email:'contact@psh.in',bdm:'Priya Sharma',rm:'Ankit Gupta',visits:14,lastVisit:'Apr 22',rank:'Gold',active:true,type:'B2B'},
  {id:'a2',name:'Future Scholars',city:'Delhi',state:'Delhi NCR',mobile:'98765 43210',email:'info@fs.in',bdm:'Rajan Mehta',rm:'Sunita Patel',visits:8,lastVisit:'Apr 19',rank:'Silver',active:true,type:'B2B'},
  {id:'a3',name:'Bright Path Consultants',city:'Pune',state:'Maharashtra',mobile:'90001 56789',email:'hello@bpc.in',bdm:'Aisha Khan',rm:'Dev Nair',visits:21,lastVisit:'Apr 25',rank:'Platinum',active:true,type:'B2C'},
  {id:'a4',name:'Global Education Advisors',city:'Bangalore',state:'Karnataka',mobile:'80001 23456',email:'adv@gea.in',bdm:'Dev Patel',rm:'Meera Iyer',visits:6,lastVisit:'Mar 31',rank:'Bronze',active:false,type:'B2B'},
  {id:'a5',name:'Wisdom Overseas',city:'Hyderabad',state:'Telangana',mobile:'70001 98765',email:'info@wo.in',bdm:'Sara Ali',rm:'Rahul Jain',visits:11,lastVisit:'Apr 20',rank:'Gold',active:true,type:'B2C'},
  {id:'a6',name:'EduPath India',city:'Chennai',state:'Tamil Nadu',mobile:'99001 45678',email:'ed@edupath.in',bdm:'Karan Singh',rm:'Pooja Shah',visits:3,lastVisit:'Apr 10',rank:'Silver',active:true,type:'B2B'},
];

const MOCK_EXPENSES = [
  {id:'e1',category:'flight',desc:'Mumbai–Delhi Return',amount:8500,date:'Apr 26',payBy:'company_card',status:'approved',claimNo:'CLM-2024-089'},
  {id:'e2',category:'hotel',desc:'Taj Hotel, Delhi — 2 nights',amount:6200,date:'Apr 25',payBy:'company_card',status:'approved',claimNo:'CLM-2024-089'},
  {id:'e3',category:'cab',desc:'Airport transfers',amount:1200,date:'Apr 25',payBy:'upi',status:'submitted',claimNo:'CLM-2024-091'},
  {id:'e4',category:'food',desc:'Client lunch meeting',amount:2800,date:'Apr 24',payBy:'cash',status:'needs_justification',claimNo:'CLM-2024-091'},
  {id:'e5',category:'train',desc:'Pune–Mumbai local',amount:480,date:'Apr 23',payBy:'upi',status:'paid',claimNo:'CLM-2024-087'},
  {id:'e6',category:'other',desc:'Stationery & materials',amount:650,date:'Apr 22',payBy:'cash',status:'paid',claimNo:'CLM-2024-087'},
];

const MOCK_CLAIMS = [
  {id:'c1',claimNo:'CLM-2024-091',user:'Priya Sharma',period:'Apr 22–28, 2026',amount:18300,expenses:6,status:'submitted',submitted:'Apr 28'},
  {id:'c2',claimNo:'CLM-2024-090',user:'Rajan Mehta',period:'Apr 15–21, 2026',amount:12750,expenses:4,status:'under_review',submitted:'Apr 22'},
  {id:'c3',claimNo:'CLM-2024-089',user:'Priya Sharma',period:'Apr 8–14, 2026',amount:14700,expenses:5,status:'approved',submitted:'Apr 15'},
  {id:'c4',claimNo:'CLM-2024-088',user:'Aisha Khan',period:'Apr 1–7, 2026',amount:9600,expenses:3,status:'paid',submitted:'Apr 8'},
  {id:'c5',claimNo:'CLM-2024-087',user:'Dev Patel',period:'Mar 25–31, 2026',amount:6800,expenses:4,status:'paid',submitted:'Apr 1'},
];

const MOCK_USERS = [
  {id:'u1',name:'Super Admin',email:'superadmin@kanan.co',role:'superadmin',dept:'Admin',lastLogin:'Apr 30, 10:42 AM',active:true},
  {id:'u2',name:'Priya Sharma',email:'priya@kanan.co',role:'admin',dept:'B2B',lastLogin:'Apr 30, 9:15 AM',active:true},
  {id:'u3',name:'Rajan Mehta',email:'rajan@kanan.co',role:'user',dept:'B2B',lastLogin:'Apr 29, 6:00 PM',active:true},
  {id:'u4',name:'Aisha Khan',email:'aisha@kanan.co',role:'home_visit',dept:'B2C',lastLogin:'Apr 29, 4:30 PM',active:true},
  {id:'u5',name:'Dev Patel',email:'dev@kanan.co',role:'user',dept:'B2B',lastLogin:'Apr 28, 11:00 AM',active:false},
  {id:'u6',name:'Accounts Team',email:'accounts@kanan.co',role:'accounts',dept:'Finance',lastLogin:'Apr 30, 8:00 AM',active:true},
];

const ROLE_META = {
  superadmin: {label:'Super Admin',bg:'#EDE9FE',text:'#7C3AED'},
  admin:      {label:'Admin',bg:'#EFF6FF',text:'#2563EB'},
  user:       {label:'Field Agent',bg:'#F0FDF4',text:'#15803D'},
  home_visit: {label:'Home Visit',bg:'#FFF7ED',text:'#C2410C'},
  accounts:   {label:'Accounts',bg:'#FFFBEB',text:'#D97706'},
  regional_bdm:{label:'Regional BDM',bg:'#F0FDF4',text:'#059669'},
};

const CAT_META = {
  flight: {label:'Flight',color:'#2563EB'},
  train:  {label:'Train',color:'#15803D'},
  bus:    {label:'Bus',color:'#C2410C'},
  cab:    {label:'Cab',color:'#D97706'},
  hotel:  {label:'Hotel',color:'#9333EA'},
  food:   {label:'Food',color:'#DC2626'},
  other:  {label:'Other',color:'#475569'},
};

// Export everything to window
Object.assign(window, {
  M, IC, Icon, SparkArea, SparkBar,
  VISIT_STATUS, EXPENSE_STATUS, StatusBadge, ROLE_META, CAT_META,
  Card, SectionTitle, Lbl, Input, Btn, Avatar, EmptyState,
  CHART_DATA, MONTHS_SHORT,
  MOCK_VISITS, MOCK_AGENTS, MOCK_EXPENSES, MOCK_CLAIMS, MOCK_USERS,
});
