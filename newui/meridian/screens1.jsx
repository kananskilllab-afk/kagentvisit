// ─── screens-1: Login, Dashboard, Visit List, Visit Detail ────

// ═══════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════
const LoginScreen = ({ onLogin }) => {
  const [focus, setFocus] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const submit = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 900);
  };
  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'Inter,sans-serif',overflow:'hidden'}}>
      {/* Left panel */}
      <div style={{width:540,background:M.navy,display:'flex',flexDirection:'column',
        justifyContent:'space-between',padding:'52px 56px',position:'relative',overflow:'hidden',flexShrink:0}}>
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.055,pointerEvents:'none'}}
          viewBox="0 0 540 900" preserveAspectRatio="xMidYMid slice">
          {[...Array(7)].map((_,r)=>[...Array(7)].map((_,c)=>(
            <circle key={`${r}-${c}`} cx={c*90+45} cy={r*130+65} r="2.5" fill="white"/>
          )))}
          <line x1="0" y1="310" x2="540" y2="310" stroke="white" strokeWidth="0.5"/>
          <line x1="0" y1="620" x2="540" y2="620" stroke="white" strokeWidth="0.5"/>
          <line x1="270" y1="0" x2="270" y2="900" stroke="white" strokeWidth="0.5"/>
        </svg>
        <div style={{position:'relative',zIndex:1}}>
          <img src="logo.png" alt="Kanan" style={{height:36,objectFit:'contain',
            filter:'brightness(10)',marginBottom:52}}/>
          <div style={{width:48,height:4,background:M.gold,borderRadius:2,marginBottom:24}}/>
          <div style={{color:'white',fontSize:38,fontWeight:900,lineHeight:1.05,
            letterSpacing:-1.2,fontFamily:'Manrope,sans-serif',marginBottom:18}}>
            Field Visit<br/>Management
          </div>
          <div style={{color:'rgba(255,255,255,0.42)',fontSize:15,lineHeight:1.7,maxWidth:360}}>
            Track, manage, and review field agent visits with real-time analytics and structured reporting.
          </div>
        </div>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',gap:32,marginBottom:28}}>
            {[{n:'1,240+',l:'Visits tracked'},{n:'98',l:'Active agents'},{n:'12',l:'Cities'}].map((s,i)=>(
              <div key={i}>
                <div style={{color:'white',fontSize:26,fontWeight:900,
                  fontFamily:'Manrope,sans-serif',letterSpacing:-0.8}}>{s.n}</div>
                <div style={{color:'rgba(255,255,255,0.32)',fontSize:11,marginTop:3}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{color:'rgba(255,255,255,0.18)',fontSize:11}}>© 2026 Kanan International.</div>
        </div>
      </div>

      {/* Right form */}
      <div style={{flex:1,background:'#FAFAFA',display:'flex',alignItems:'center',
        justifyContent:'center',padding:60}}>
        <div style={{width:'100%',maxWidth:400}}>
          <div style={{marginBottom:36}}>
            <div style={{color:M.text,fontSize:28,fontWeight:900,letterSpacing:-0.8,
              fontFamily:'Manrope,sans-serif',marginBottom:6}}>Welcome back</div>
            <div style={{color:M.sub,fontSize:14}}>Sign in to your account to continue.</div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            {[{label:'Email Address',ph:'name@kanan.co',type:'email',
                icon:<Icon path={IC.mail} size={14} color={focus==='email'?M.blue:M.muted}/>},
              {label:'Password',ph:'••••••••',type:'password',
                icon:<Icon path={IC.lock} size={14} color={focus==='pass'?M.blue:M.muted}/>}
            ].map((f,i)=>(
              <div key={i}>
                <Lbl>{f.label}</Lbl>
                <div style={{position:'relative'}}>
                  <div style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',
                    pointerEvents:'none'}}>{f.icon}</div>
                  <input type={f.type} placeholder={f.ph}
                    onFocus={()=>setFocus(i===0?'email':'pass')}
                    onBlur={()=>setFocus(null)}
                    style={{width:'100%',height:50,border:`1.5px solid ${focus===(i===0?'email':'pass')?M.blue:M.border}`,
                      borderRadius:8,background:M.white,paddingLeft:40,paddingRight:14,
                      fontSize:14,color:M.text,outline:'none',transition:'border-color 0.15s',
                      fontFamily:'Inter,sans-serif',boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}/>
                </div>
              </div>
            ))}
          </div>

          <div onClick={submit} style={{marginTop:28,height:52,background:M.navy,borderRadius:8,
            display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            cursor:'pointer',fontSize:15,fontWeight:700,color:'white',letterSpacing:0.1}}>
            {loading
              ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                  style={{animation:'spin 0.8s linear infinite'}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg> Signing in…</>
              : <>Sign In <Icon path={IC.arrowR} size={16} color="white"/></>
            }
          </div>

          <div style={{marginTop:16,textAlign:'center'}}>
            <span style={{color:M.blue,fontSize:13,cursor:'pointer',fontWeight:500}}>Forgot password?</span>
          </div>

          <div style={{marginTop:36,padding:'16px 20px',background:'#F1F5F9',borderRadius:8,
            display:'flex',gap:14,alignItems:'center'}}>
            <div style={{width:34,height:34,borderRadius:7,background:M.navy,flexShrink:0,
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Icon path={IC.shield} size={16} color="white"/>
            </div>
            <div>
              <div style={{color:M.text,fontSize:12,fontWeight:700}}>Secure access</div>
              <div style={{color:M.sub,fontSize:11,marginTop:2}}>JWT · httpOnly cookies · Rate limited</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
const DashboardScreen = ({ onNav }) => {
  const kpis = [
    {label:'Total Visits',value:'47',sub:'this month',accent:M.blue,trend:'+12% vs last month',
      icon:IC.visits},
    {label:'Pending Review',value:'12',sub:'need attention',accent:M.gold,trend:'3 critical',
      icon:IC.info},
    {label:'Expenses',value:'₹82.4K',sub:'claimed this month',accent:M.green,trend:'+8% vs budget',
      icon:IC.expenses},
    {label:'On-time Rate',value:'93%',sub:'form completion',accent:M.purple,trend:'+5% vs last month',
      icon:IC.check},
  ];
  const recentVisits = MOCK_VISITS.slice(0,5);
  return (
    <div style={{flex:1,overflow:'auto',padding:24,display:'flex',flexDirection:'column',gap:20}}>
      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {kpis.map((k,i)=>(
          <div key={i} style={{background:M.white,borderRadius:8,padding:'18px 20px',
            borderLeft:`4px solid ${k.accent}`,boxShadow:M.cardShadow}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{color:M.sub,fontSize:10,fontWeight:700,letterSpacing:1.6,
                textTransform:'uppercase'}}>{k.label}</div>
              <div style={{width:30,height:30,borderRadius:6,
                background:`${k.accent}14`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon path={k.icon} size={14} color={k.accent}/>
              </div>
            </div>
            <div style={{color:M.text,fontSize:30,fontWeight:900,letterSpacing:-1.2,
              fontFamily:'Manrope,sans-serif',lineHeight:1,marginBottom:4}}>{k.value}</div>
            <div style={{color:M.muted,fontSize:11,marginBottom:6}}>{k.sub}</div>
            <div style={{color:k.accent,fontSize:11,fontWeight:600}}>{k.trend}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
        <Card style={{padding:'20px 22px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
            <div>
              <div style={{color:M.text,fontSize:14,fontWeight:700,fontFamily:'Manrope,sans-serif'}}>Visit Activity</div>
              <div style={{color:M.muted,fontSize:12,marginTop:2}}>12-month trend</div>
            </div>
            <div style={{display:'flex',gap:4}}>
              {['W','M','Y'].map(t=>(
                <div key={t} style={{width:28,height:28,borderRadius:5,cursor:'pointer',
                  background:t==='M'?M.navy:'#F1F5F9',display:'flex',alignItems:'center',
                  justifyContent:'center',fontSize:11,fontWeight:700,
                  color:t==='M'?'white':M.sub}}>{t}</div>
              ))}
            </div>
          </div>
          <SparkBar data={CHART_DATA} color={M.blue} height={120} uid="dash-bar"/>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
            {MONTHS_SHORT.filter((_,i)=>i%2===0).map(m=>(
              <span key={m} style={{color:M.muted,fontSize:10,fontWeight:500}}>{m}</span>
            ))}
          </div>
        </Card>

        <Card style={{padding:'20px 22px'}}>
          <div style={{color:M.text,fontSize:14,fontWeight:700,fontFamily:'Manrope,sans-serif',
            marginBottom:18}}>Status Breakdown</div>
          {[{l:'Closed',v:22,c:M.green},{l:'Reviewed',v:13,c:M.blue},
            {l:'Pending',v:8,c:M.gold},{l:'Action Req.',v:4,c:M.red}].map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',
              borderBottom:i<3?`1px solid #F8FAFC`:'none'}}>
              <div style={{width:8,height:8,borderRadius:2,background:s.c,flexShrink:0}}/>
              <div style={{flex:1,fontSize:12,fontWeight:500,color:'#374151'}}>{s.l}</div>
              <div style={{width:64,height:4,background:'#F1F5F9',borderRadius:2}}>
                <div style={{height:'100%',width:`${(s.v/47)*100}%`,background:s.c,borderRadius:2}}/>
              </div>
              <div style={{width:20,fontSize:12,fontWeight:700,color:M.text,textAlign:'right'}}>{s.v}</div>
            </div>
          ))}
        </Card>
      </div>

      {/* Recent visits */}
      <Card>
        <div style={{padding:'14px 20px',borderBottom:`1px solid #F1F5F9`,
          display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{color:M.text,fontSize:14,fontWeight:700,fontFamily:'Manrope,sans-serif'}}>Recent Visits</div>
          <span onClick={()=>onNav('visits')} style={{color:M.blue,fontSize:12,fontWeight:600,cursor:'pointer'}}>View all →</span>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#F8FAFC'}}>
              {['Institution','Agent','City','Status','Date'].map(h=>(
                <th key={h} style={{padding:'9px 18px',textAlign:'left',fontSize:10,fontWeight:700,
                  color:M.sub,letterSpacing:1.2,textTransform:'uppercase',
                  borderBottom:`1px solid #F1F5F9`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentVisits.map((v,i)=>(
              <tr key={v.id} style={{borderBottom:i<recentVisits.length-1?`1px solid #F8FAFC`:'none',cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'11px 18px'}}>
                  <div style={{fontSize:13,fontWeight:600,color:M.text}}>{v.institution}</div>
                </td>
                <td style={{padding:'11px 18px',fontSize:13,color:M.sub}}>{v.agent}</td>
                <td style={{padding:'11px 18px',fontSize:13,color:M.sub}}>{v.city}</td>
                <td style={{padding:'11px 18px'}}><StatusBadge status={v.status}/></td>
                <td style={{padding:'11px 18px',fontSize:12,color:M.muted}}>{v.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// VISIT LIST
// ═══════════════════════════════════════════════════════════════
const VisitListScreen = () => {
  const [search, setSearch] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [selected, setSelected] = React.useState(null);
  const statuses = ['all','submitted','reviewed','action_required','closed','draft'];
  const filtered = MOCK_VISITS.filter(v =>
    (filterStatus==='all' || v.status===filterStatus) &&
    (v.institution.toLowerCase().includes(search.toLowerCase()) ||
     v.agent.toLowerCase().includes(search.toLowerCase()) ||
     v.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{flex:1,display:'flex',overflow:'hidden'}}>
      {/* List panel */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Filters */}
        <div style={{padding:'14px 24px',background:M.white,borderBottom:`1px solid ${M.border}`,
          display:'flex',gap:10,alignItems:'center',flexShrink:0}}>
          <div style={{position:'relative',flex:1,maxWidth:280}}>
            <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
              <Icon path={IC.search} size={14} color={M.muted}/>
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search institution, agent, city…"
              style={{width:'100%',height:36,border:`1.5px solid ${M.border}`,borderRadius:7,
                background:M.white,paddingLeft:34,paddingRight:12,fontSize:13,
                color:M.text,outline:'none',fontFamily:'Inter,sans-serif'}}/>
          </div>
          <div style={{display:'flex',gap:4}}>
            {statuses.map(s=>(
              <div key={s} onClick={()=>setFilterStatus(s)}
                style={{height:32,paddingInline:12,borderRadius:6,cursor:'pointer',
                  fontSize:11,fontWeight:600,display:'flex',alignItems:'center',
                  background:filterStatus===s?M.navy:'#F1F5F9',
                  color:filterStatus===s?'white':M.sub,
                  textTransform:'capitalize',transition:'all 0.12s'}}>
                {s==='all'?'All':s==='action_required'?'Action Req.':s.charAt(0).toUpperCase()+s.slice(1)}
              </div>
            ))}
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            <Btn variant="secondary" size="sm" icon={<Icon path={IC.download} size={12} color={M.sub}/>}>Export</Btn>
            <Btn variant="primary" size="sm" icon={<Icon path={IC.plus} size={12} color="white"/>}>New Visit</Btn>
          </div>
        </div>

        <div style={{flex:1,overflow:'auto',padding:20}}>
          <Card>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#F8FAFC'}}>
                  {['Institution','Agent','City','Type','Status','Date','Rating'].map(h=>(
                    <th key={h} style={{padding:'10px 18px',textAlign:'left',fontSize:10,fontWeight:700,
                      color:M.sub,letterSpacing:1.2,textTransform:'uppercase',
                      borderBottom:`1px solid #F1F5F9`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={7}><EmptyState icon={IC.visits} title="No visits found" sub="Try a different search or filter"/></td></tr>
                ) : filtered.map((v,i)=>(
                  <tr key={v.id}
                    onClick={()=>setSelected(selected?.id===v.id?null:v)}
                    style={{borderBottom:i<filtered.length-1?`1px solid #F8FAFC`:'none',cursor:'pointer',
                      background:selected?.id===v.id?'#EFF6FF':'transparent'}}
                    onMouseEnter={e=>{if(selected?.id!==v.id)e.currentTarget.style.background='#F8FAFC'}}
                    onMouseLeave={e=>{if(selected?.id!==v.id)e.currentTarget.style.background='transparent'}}>
                    <td style={{padding:'12px 18px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <Avatar name={v.institution} size={32} color={M.navy}/>
                        <div style={{fontSize:13,fontWeight:600,color:M.text}}>{v.institution}</div>
                      </div>
                    </td>
                    <td style={{padding:'12px 18px',fontSize:13,color:M.sub}}>{v.agent}</td>
                    <td style={{padding:'12px 18px',fontSize:13,color:M.sub}}>{v.city}</td>
                    <td style={{padding:'12px 18px'}}>
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,
                        background:v.type==='B2B'?'#EFF6FF':'#F0FDF4',
                        color:v.type==='B2B'?M.blue:M.green}}>{v.type}</span>
                    </td>
                    <td style={{padding:'12px 18px'}}><StatusBadge status={v.status}/></td>
                    <td style={{padding:'12px 18px',fontSize:12,color:M.muted}}>{v.date}</td>
                    <td style={{padding:'12px 18px'}}>
                      {v.rating ? (
                        <div style={{display:'flex',gap:1}}>
                          {[1,2,3,4,5].map(n=>(
                            <Icon key={n} path={IC.star} size={12}
                              color={n<=v.rating?M.gold:M.border} fill={n<=v.rating?M.gold:'none'} sw={1}/>
                          ))}
                        </div>
                      ) : <span style={{color:M.muted,fontSize:11}}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{width:360,background:M.white,borderLeft:`1px solid ${M.border}`,
          display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
          <div style={{padding:'16px 20px',borderBottom:`1px solid #F1F5F9`,
            display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:M.text}}>Visit Detail</div>
            <div onClick={()=>setSelected(null)} style={{cursor:'pointer',padding:4}}>
              <Icon path={IC.x} size={16} color={M.muted}/>
            </div>
          </div>
          <div style={{flex:1,overflow:'auto',padding:20}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <Avatar name={selected.institution} size={44} color={M.navy}/>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:M.text,fontFamily:'Manrope,sans-serif'}}>
                  {selected.institution}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:4,marginTop:3}}>
                  <Icon path={IC.pin} size={11} color={M.muted}/>
                  <span style={{fontSize:12,color:M.muted}}>{selected.city}</span>
                </div>
              </div>
            </div>

            <div style={{display:'flex',gap:8,marginBottom:20}}>
              <StatusBadge status={selected.status}/>
              <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:4,
                background:selected.type==='B2B'?'#EFF6FF':'#F0FDF4',
                color:selected.type==='B2B'?M.blue:M.green}}>{selected.type}</span>
            </div>

            {[{l:'Agent',v:selected.agent},{l:'Visit Date',v:selected.date},
              {l:'Form Type',v:selected.type+' Visit'},{l:'City',v:selected.city}].map((row,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',
                borderBottom:`1px solid #F8FAFC`}}>
                <span style={{fontSize:12,color:M.muted,fontWeight:500}}>{row.l}</span>
                <span style={{fontSize:12,color:M.text,fontWeight:600}}>{row.v}</span>
              </div>
            ))}

            {selected.rating && (
              <div style={{marginTop:16}}>
                <div style={{fontSize:11,fontWeight:700,color:M.muted,marginBottom:8,
                  letterSpacing:1.2,textTransform:'uppercase'}}>Rating</div>
                <div style={{display:'flex',gap:3}}>
                  {[1,2,3,4,5].map(n=>(
                    <Icon key={n} path={IC.star} size={18}
                      color={n<=selected.rating?M.gold:M.border}
                      fill={n<=selected.rating?M.gold:'none'} sw={1}/>
                  ))}
                </div>
              </div>
            )}

            <div style={{marginTop:20,display:'flex',flexDirection:'column',gap:8}}>
              <Btn variant="primary" size="md" style={{width:'100%',justifyContent:'center'}}>
                View Full Report
              </Btn>
              <Btn variant="secondary" size="md" style={{width:'100%',justifyContent:'center'}}>
                Add Comment
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { LoginScreen, DashboardScreen, VisitListScreen });
