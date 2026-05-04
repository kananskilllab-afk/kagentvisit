// ─── Layout: Sidebar + AppShell ───────────────────────────────
const { useState: _useState } = React;

const NAV_ITEMS = [
  { key:'dashboard',    label:'Dashboard',     icon:IC.dashboard,  roles:['superadmin','admin','user','home_visit','accounts','regional_bdm'] },
  { key:'calendar',     label:'Calendar',      icon:IC.calendar,   roles:['superadmin','admin','user','home_visit'] },
  { key:'visits',       label:'Visit History', icon:IC.visits,     roles:['superadmin','admin','user','home_visit','regional_bdm'] },
  { key:'expenses',     label:'Expenses',      icon:IC.expenses,   roles:['superadmin','admin','user','home_visit','accounts'] },
  { key:'claims',       label:'Claims',        icon:IC.claims,     roles:['superadmin','admin','user','home_visit','accounts'] },
  { key:'analytics',   label:'Analytics',     icon:IC.analytics,  roles:['superadmin','admin'] },
  { key:'agents',       label:'Manage Agents', icon:IC.agents,     roles:['superadmin','admin'] },
  { key:'users',        label:'Users',         icon:IC.users,      roles:['superadmin'] },
  { key:'form-builder', label:'Form Builder',  icon:IC.formBuilder,roles:['superadmin'] },
];

const RolePill = ({ role }) => {
  const r = ROLE_META[role] || {label:role, bg:'#F1F5F9', text:'#475569'};
  return (
    <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:3,
      background:r.bg,color:r.text,letterSpacing:0.5,textTransform:'uppercase'}}>
      {r.label}
    </span>
  );
};

const Sidebar = ({ currentPage, onNav, user, onLogout }) => {
  const role = user?.role || 'admin';
  const items = NAV_ITEMS.filter(n => n.roles.includes(role));

  return (
    <div style={{width:236,background:M.navy,display:'flex',flexDirection:'column',
      height:'100%',flexShrink:0,overflow:'hidden'}}>

      {/* Logo */}
      <div style={{padding:'24px 20px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <img src="logo.png" alt="Kanan" style={{height:28,width:'auto',objectFit:'contain',
            filter:'brightness(10)'}}/>
          <div>
            <div style={{color:'white',fontSize:13,fontWeight:700,letterSpacing:-0.2}}>Kanan AVS</div>
            <RolePill role={role}/>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{flex:1,padding:'10px 10px',display:'flex',flexDirection:'column',gap:1,
        overflowY:'auto'}}>
        {items.map(item => {
          const active = currentPage === item.key;
          return (
            <div key={item.key} onClick={()=>onNav(item.key)}
              style={{display:'flex',alignItems:'center',gap:9,padding:'9px 10px',
                borderRadius:6,cursor:'pointer',transition:'all 0.12s',
                background:active?'rgba(255,255,255,0.12)':'transparent',
                color:active?'white':'rgba(255,255,255,0.42)',
                fontSize:13,fontWeight:active?600:400,position:'relative'}}>
              <Icon path={item.icon} size={15}
                color={active?'white':'rgba(255,255,255,0.32)'}/>
              <span style={{flex:1}}>{item.label}</span>
              {active && (
                <div style={{position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',
                  width:3,height:18,background:M.gold,borderRadius:'2px 0 0 2px'}}/>
              )}
            </div>
          );
        })}
      </nav>

      {/* New Visit CTA */}
      <div style={{padding:'0 12px 12px'}}>
        <div onClick={()=>onNav('new-visit')}
          style={{height:38,background:M.blue,borderRadius:7,display:'flex',
            alignItems:'center',justifyContent:'center',gap:7,cursor:'pointer',
            fontSize:13,fontWeight:600,color:'white'}}>
          <Icon path={IC.plus} size={14} color="white"/>
          New Visit
        </div>
      </div>

      {/* User footer */}
      <div style={{padding:'12px 14px 16px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <Avatar name={user?.name||'Admin'} size={32} color={M.blue}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:'white',fontSize:12,fontWeight:600,
              whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {user?.name||'Admin User'}
            </div>
            <div style={{color:'rgba(255,255,255,0.3)',fontSize:10,
              whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {user?.email||'admin@kanan.co'}
            </div>
          </div>
          <div onClick={onLogout} style={{cursor:'pointer',padding:4}}>
            <Icon path={IC.logout} size={14} color="rgba(255,255,255,0.3)"/>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Top Bar ──────────────────────────────────────────────────
const TopBar = ({ title, subtitle, actions, onMenuClick }) => (
  <div style={{height:58,background:M.white,borderBottom:`1px solid ${M.border}`,
    padding:'0 28px',display:'flex',alignItems:'center',
    justifyContent:'space-between',flexShrink:0,
    boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div>
        <div style={{color:M.text,fontSize:18,fontWeight:900,letterSpacing:-0.5,
          fontFamily:'Manrope,sans-serif',lineHeight:1}}>{title}</div>
        {subtitle && <div style={{color:M.muted,fontSize:12,marginTop:2}}>{subtitle}</div>}
      </div>
    </div>
    {actions && (
      <div style={{display:'flex',gap:8,alignItems:'center'}}>{actions}</div>
    )}
  </div>
);

// ─── Notification Badge ───────────────────────────────────────
const NotifBell = ({ count=3 }) => (
  <div style={{position:'relative',width:36,height:36,borderRadius:7,
    border:`1.5px solid ${M.border}`,background:M.white,display:'flex',
    alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
    <Icon path={IC.bell} size={16} color={M.sub}/>
    {count>0 && (
      <div style={{position:'absolute',top:-4,right:-4,width:16,height:16,
        borderRadius:'50%',background:M.red,display:'flex',alignItems:'center',
        justifyContent:'center',fontSize:9,fontWeight:700,color:'white',
        border:'2px solid white'}}>
        {count}
      </div>
    )}
  </div>
);

// ─── App Shell ────────────────────────────────────────────────
const AppShell = ({ children, currentPage, onNav, user, onLogout }) => (
  <div style={{display:'flex',width:'100%',height:'100%',fontFamily:'Inter,sans-serif',
    background:M.bg,overflow:'hidden'}}>
    <Sidebar currentPage={currentPage} onNav={onNav} user={user} onLogout={onLogout}/>
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {children}
    </div>
  </div>
);

Object.assign(window, { NAV_ITEMS, Sidebar, TopBar, NotifBell, AppShell, RolePill });
