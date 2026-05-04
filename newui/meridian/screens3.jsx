// ─── screens-3: Expenses, Claims, Agents, Users, Form Builder ─

// ═══════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════
const CAT_ICONS = {
  flight:'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064',
  hotel:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  cab:'M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3m-7 12h3m-3 0a1 1 0 100 2 1 1 0 000-2zm3 0a1 1 0 100 2 1 1 0 000-2z',
  train:'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v11m0 0l3 3m-3-3l-3 3m12-3V9m0 8l3 3m-3-3l-3 3',
  food:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  other:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};

const ExpensesScreen = ({ onNav }) => {
  const [search, setSearch] = React.useState('');
  const [showAdd, setShowAdd] = React.useState(false);
  const filtered = MOCK_EXPENSES.filter(e=>
    e.desc.toLowerCase().includes(search.toLowerCase()) ||
    (CAT_META[e.category]?.label||'').toLowerCase().includes(search.toLowerCase())
  );
  const total = filtered.reduce((s,e)=>s+e.amount,0);

  return (
    <div style={{flex:1,display:'flex',overflow:'hidden'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Summary bar */}
        <div style={{padding:'12px 24px',background:M.white,borderBottom:`1px solid ${M.border}`,
          display:'flex',gap:20,alignItems:'center',flexShrink:0}}>
          {[{l:'Total Expenses',v:`₹${total.toLocaleString('en-IN')}`,c:M.blue},
            {l:'Approved',v:'₹14,700',c:M.green},
            {l:'Pending',v:'₹4,000',c:M.gold},
            {l:'Needs Review',v:'₹2,800',c:M.red},
          ].map((s,i)=>(
            <div key={i} style={{display:'flex',flexDirection:'column',gap:2,paddingRight:20,
              borderRight:i<3?`1px solid ${M.border}`:'none'}}>
              <span style={{fontSize:10,fontWeight:700,color:M.muted,letterSpacing:1.2,
                textTransform:'uppercase'}}>{s.l}</span>
              <span style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:'Manrope,sans-serif'}}>{s.v}</span>
            </div>
          ))}
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <div style={{position:'relative'}}>
              <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
                <Icon path={IC.search} size={13} color={M.muted}/>
              </div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search expenses…"
                style={{height:36,border:`1.5px solid ${M.border}`,borderRadius:7,
                  background:M.white,paddingLeft:32,paddingRight:12,fontSize:13,
                  color:M.text,outline:'none',fontFamily:'Inter,sans-serif',width:200}}/>
            </div>
            <Btn variant="primary" size="sm" onClick={()=>setShowAdd(true)}
              icon={<Icon path={IC.plus} size={12} color="white"/>}>Add Expense</Btn>
            <Btn variant="secondary" size="sm" onClick={()=>onNav('claims')}
              icon={<Icon path={IC.claims} size={12} color={M.sub}/>}>New Claim</Btn>
          </div>
        </div>

        <div style={{flex:1,overflow:'auto',padding:20}}>
          <Card>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#F8FAFC'}}>
                  {['Category','Description','Amount','Date','Payment','Claim','Status'].map(h=>(
                    <th key={h} style={{padding:'10px 18px',textAlign:'left',fontSize:10,fontWeight:700,
                      color:M.sub,letterSpacing:1.2,textTransform:'uppercase',
                      borderBottom:`1px solid #F1F5F9`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e,i)=>{
                  const cat = CAT_META[e.category]||{label:'Other',color:M.sub};
                  return (
                    <tr key={e.id} style={{borderBottom:i<filtered.length-1?`1px solid #F8FAFC`:'none',
                      cursor:'pointer'}}
                      onMouseEnter={ev=>ev.currentTarget.style.background='#F8FAFC'}
                      onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}>
                      <td style={{padding:'12px 18px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:30,height:30,borderRadius:7,
                            background:`${cat.color}14`,display:'flex',alignItems:'center',
                            justifyContent:'center',flexShrink:0}}>
                            <Icon path={CAT_ICONS[e.category]||CAT_ICONS.other} size={14} color={cat.color}/>
                          </div>
                          <span style={{fontSize:12,fontWeight:600,color:cat.color}}>{cat.label}</span>
                        </div>
                      </td>
                      <td style={{padding:'12px 18px',fontSize:13,color:M.text,fontWeight:500,maxWidth:200}}>
                        {e.desc}
                      </td>
                      <td style={{padding:'12px 18px'}}>
                        <span style={{fontSize:13,fontWeight:700,color:M.text}}>
                          ₹{e.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td style={{padding:'12px 18px',fontSize:12,color:M.muted}}>{e.date}</td>
                      <td style={{padding:'12px 18px',fontSize:12,color:M.sub,textTransform:'capitalize'}}>
                        {e.payBy.replace('_',' ')}
                      </td>
                      <td style={{padding:'12px 18px',fontSize:11,color:M.blue,fontWeight:600}}>{e.claimNo}</td>
                      <td style={{padding:'12px 18px'}}>
                        <StatusBadge status={e.status} map={EXPENSE_STATUS}/>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {/* Add expense drawer */}
      {showAdd && (
        <div style={{width:340,background:M.white,borderLeft:`1px solid ${M.border}`,
          display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'16px 20px',borderBottom:`1px solid #F1F5F9`,
            display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:700,color:M.text,fontFamily:'Manrope,sans-serif'}}>Add Expense</div>
            <div onClick={()=>setShowAdd(false)} style={{cursor:'pointer',padding:4}}>
              <Icon path={IC.x} size={16} color={M.muted}/>
            </div>
          </div>
          <div style={{flex:1,overflow:'auto',padding:20,display:'flex',flexDirection:'column',gap:16}}>
            <div><Lbl>Category</Lbl>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                {Object.entries(CAT_META).slice(0,6).map(([k,v])=>(
                  <div key={k} style={{height:56,border:`1.5px solid ${M.border}`,borderRadius:8,
                    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                    gap:4,cursor:'pointer',fontSize:10,fontWeight:600,color:M.sub}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=v.color;e.currentTarget.style.color=v.color;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=M.border;e.currentTarget.style.color=M.sub;}}>
                    <Icon path={CAT_ICONS[k]||CAT_ICONS.other} size={16} color={v.color}/>
                    {v.label}
                  </div>
                ))}
              </div>
            </div>
            <div><Lbl>Description</Lbl>
              <input placeholder="e.g. Flight Mumbai to Delhi" style={{width:'100%',height:44,
                border:`1.5px solid ${M.border}`,borderRadius:8,padding:'0 12px',fontSize:13,
                color:M.text,outline:'none',fontFamily:'Inter,sans-serif'}}/>
            </div>
            <div><Lbl>Amount (₹)</Lbl>
              <input type="number" placeholder="0.00" style={{width:'100%',height:44,
                border:`1.5px solid ${M.border}`,borderRadius:8,padding:'0 12px',fontSize:13,
                color:M.text,outline:'none',fontFamily:'Inter,sans-serif'}}/>
            </div>
            <div><Lbl>Date</Lbl>
              <input type="date" style={{width:'100%',height:44,border:`1.5px solid ${M.border}`,
                borderRadius:8,padding:'0 12px',fontSize:13,color:M.text,outline:'none',
                fontFamily:'Inter,sans-serif'}}/>
            </div>
            <div><Lbl>Receipt</Lbl>
              <div style={{border:`2px dashed ${M.border}`,borderRadius:8,padding:'20px',
                textAlign:'center',cursor:'pointer',fontSize:12,color:M.muted}}>
                <Icon path={IC.upload} size={18} color={M.muted}/>
                <div style={{marginTop:6}}>Upload receipt</div>
              </div>
            </div>
          </div>
          <div style={{padding:'14px 20px',borderTop:`1px solid #F1F5F9`,display:'flex',gap:8}}>
            <Btn variant="secondary" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowAdd(false)}>Save</Btn>
          </div>
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// CLAIMS
// ═══════════════════════════════════════════════════════════════
const ClaimsScreen = () => {
  const [selected, setSelected] = React.useState(null);
  return (
    <div style={{flex:1,display:'flex',overflow:'hidden'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'12px 24px',background:M.white,borderBottom:`1px solid ${M.border}`,
          display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
          <div style={{flex:1,position:'relative'}}>
            <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
              <Icon path={IC.search} size={13} color={M.muted}/>
            </div>
            <input placeholder="Search claims…" style={{width:'100%',maxWidth:280,height:36,
              border:`1.5px solid ${M.border}`,borderRadius:7,paddingLeft:32,paddingRight:12,
              fontSize:13,color:M.text,outline:'none',fontFamily:'Inter,sans-serif'}}/>
          </div>
          <Btn variant="primary" size="sm" icon={<Icon path={IC.plus} size={12} color="white"/>}>
            New Claim
          </Btn>
        </div>

        <div style={{flex:1,overflow:'auto',padding:20}}>
          <Card>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#F8FAFC'}}>
                  {['Claim No.','Submitted By','Period','Expenses','Amount','Status','Date'].map(h=>(
                    <th key={h} style={{padding:'10px 18px',textAlign:'left',fontSize:10,fontWeight:700,
                      color:M.sub,letterSpacing:1.2,textTransform:'uppercase',
                      borderBottom:`1px solid #F1F5F9`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_CLAIMS.map((c,i)=>(
                  <tr key={c.id} onClick={()=>setSelected(selected?.id===c.id?null:c)}
                    style={{borderBottom:i<MOCK_CLAIMS.length-1?`1px solid #F8FAFC`:'none',cursor:'pointer',
                      background:selected?.id===c.id?'#EFF6FF':'transparent'}}
                    onMouseEnter={e=>{if(selected?.id!==c.id)e.currentTarget.style.background='#F8FAFC'}}
                    onMouseLeave={e=>{if(selected?.id!==c.id)e.currentTarget.style.background='transparent'}}>
                    <td style={{padding:'12px 18px'}}>
                      <span style={{fontSize:12,fontWeight:700,color:M.blue,fontFamily:'Manrope,sans-serif'}}>
                        {c.claimNo}
                      </span>
                    </td>
                    <td style={{padding:'12px 18px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <Avatar name={c.user} size={28}/>
                        <span style={{fontSize:13,color:M.text,fontWeight:500}}>{c.user}</span>
                      </div>
                    </td>
                    <td style={{padding:'12px 18px',fontSize:12,color:M.sub}}>{c.period}</td>
                    <td style={{padding:'12px 18px',fontSize:13,color:M.text,fontWeight:600,textAlign:'center'}}>
                      {c.expenses}
                    </td>
                    <td style={{padding:'12px 18px'}}>
                      <span style={{fontSize:13,fontWeight:700,color:M.text}}>
                        ₹{c.amount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td style={{padding:'12px 18px'}}>
                      <StatusBadge status={c.status} map={EXPENSE_STATUS}/>
                    </td>
                    <td style={{padding:'12px 18px',fontSize:12,color:M.muted}}>{c.submitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {selected && (
        <div style={{width:320,background:M.white,borderLeft:`1px solid ${M.border}`,
          display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'14px 18px',borderBottom:`1px solid #F1F5F9`,
            display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:M.text}}>Claim Detail</div>
            <div onClick={()=>setSelected(null)} style={{cursor:'pointer',padding:4}}>
              <Icon path={IC.x} size={15} color={M.muted}/>
            </div>
          </div>
          <div style={{flex:1,overflow:'auto',padding:18}}>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:16,fontWeight:800,color:M.blue,fontFamily:'Manrope,sans-serif',
                marginBottom:4}}>{selected.claimNo}</div>
              <StatusBadge status={selected.status} map={EXPENSE_STATUS}/>
            </div>
            {[{l:'Submitted By',v:selected.user},{l:'Period',v:selected.period},
              {l:'Total Amount',v:`₹${selected.amount.toLocaleString('en-IN')}`},
              {l:'Expense Items',v:selected.expenses},{l:'Submitted',v:selected.submitted}
            ].map((r,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',
                borderBottom:`1px solid #F8FAFC`,fontSize:13}}>
                <span style={{color:M.muted,fontWeight:500}}>{r.l}</span>
                <span style={{color:M.text,fontWeight:600}}>{r.v}</span>
              </div>
            ))}
            <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:8}}>
              <Btn variant="blue" style={{width:'100%',justifyContent:'center'}}>Approve Claim</Btn>
              <Btn variant="danger" style={{width:'100%',justifyContent:'center'}}>Request Changes</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// MANAGE AGENTS
// ═══════════════════════════════════════════════════════════════
const RANK_STYLE = {
  Platinum:{bg:'#EDE9FE',text:'#7C3AED'},
  Diamond: {bg:'#EFF6FF',text:'#2563EB'},
  Gold:    {bg:'#FFFBEB',text:'#D97706'},
  Silver:  {bg:'#F1F5F9',text:'#475569'},
  Bronze:  {bg:'#FFF7ED',text:'#C2410C'},
};

const AgentsScreen = () => {
  const [search, setSearch] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const filtered = MOCK_AGENTS.filter(a=>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.city.toLowerCase().includes(search.toLowerCase()) ||
    a.bdm.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div style={{flex:1,display:'flex',overflow:'hidden'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'12px 24px',background:M.white,borderBottom:`1px solid ${M.border}`,
          display:'flex',gap:10,alignItems:'center',flexShrink:0}}>
          <div style={{position:'relative'}}>
            <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
              <Icon path={IC.search} size={13} color={M.muted}/>
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search agents, city, BDM…"
              style={{height:36,border:`1.5px solid ${M.border}`,borderRadius:7,
                paddingLeft:32,paddingRight:12,fontSize:13,color:M.text,outline:'none',
                fontFamily:'Inter,sans-serif',width:260}}/>
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <Btn variant="secondary" size="sm" icon={<Icon path={IC.upload} size={12} color={M.sub}/>}>
              Import CSV
            </Btn>
            <Btn variant="secondary" size="sm" icon={<Icon path={IC.download} size={12} color={M.sub}/>}>
              Export
            </Btn>
            <Btn variant="primary" size="sm" onClick={()=>setShowForm(true)}
              icon={<Icon path={IC.plus} size={12} color="white"/>}>Add Agent</Btn>
          </div>
        </div>

        <div style={{flex:1,overflow:'auto',padding:20}}>
          <Card>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#F8FAFC'}}>
                  {['Agent / Firm','Contact','Location','BDM / RM','Visits','Last Visit','Actions'].map(h=>(
                    <th key={h} style={{padding:'10px 18px',textAlign:'left',fontSize:10,fontWeight:700,
                      color:M.sub,letterSpacing:1.2,textTransform:'uppercase',
                      borderBottom:`1px solid #F1F5F9`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a,i)=>{
                  const rank = RANK_STYLE[a.rank]||RANK_STYLE.Bronze;
                  return (
                    <tr key={a.id} style={{borderBottom:i<filtered.length-1?`1px solid #F8FAFC`:'none'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'12px 18px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <Avatar name={a.name} size={36} color={M.purple}/>
                          <div>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <span style={{fontSize:13,fontWeight:700,color:M.text}}>{a.name}</span>
                              <span style={{fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,
                                background:rank.bg,color:rank.text,letterSpacing:0.5}}>{a.rank}</span>
                            </div>
                            <div style={{display:'flex',gap:5,marginTop:2}}>
                              <span style={{fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,
                                background:a.active?'#ECFDF5':'#FEF2F2',
                                color:a.active?'#059669':'#DC2626',letterSpacing:0.5}}>
                                {a.active?'Active':'Inactive'}
                              </span>
                              <span style={{fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,
                                background:'#F1F5F9',color:M.sub}}>{a.type}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{padding:'12px 18px'}}>
                        <div style={{fontSize:12,fontWeight:600,color:M.text}}>{a.mobile}</div>
                        <div style={{fontSize:11,color:M.muted,marginTop:2}}>{a.email}</div>
                      </td>
                      <td style={{padding:'12px 18px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <Icon path={IC.pin} size={11} color={M.muted}/>
                          <span style={{fontSize:12,color:M.text,fontWeight:500}}>
                            {a.city}, {a.state}
                          </span>
                        </div>
                      </td>
                      <td style={{padding:'12px 18px'}}>
                        <div style={{fontSize:12,fontWeight:600,color:M.text}}>{a.bdm}</div>
                        <div style={{fontSize:11,color:M.muted,marginTop:2}}>{a.rm}</div>
                      </td>
                      <td style={{padding:'12px 18px',textAlign:'center'}}>
                        <span style={{width:32,height:32,borderRadius:'50%',background:`${M.sky}18`,
                          color:M.sky,fontSize:12,fontWeight:700,display:'inline-flex',
                          alignItems:'center',justifyContent:'center',border:`1px solid ${M.sky}30`}}>
                          {a.visits}
                        </span>
                      </td>
                      <td style={{padding:'12px 18px',fontSize:12,color:M.muted}}>{a.lastVisit}</td>
                      <td style={{padding:'12px 18px'}}>
                        <div style={{display:'flex',gap:4}}>
                          <div style={{width:28,height:28,borderRadius:6,background:'#EFF6FF',
                            display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                            <Icon path={IC.edit} size={13} color={M.blue}/>
                          </div>
                          <div style={{width:28,height:28,borderRadius:6,background:'#FEF2F2',
                            display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                            <Icon path={IC.trash} size={13} color={M.red}/>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {showForm && (
        <div style={{width:340,background:M.white,borderLeft:`1px solid ${M.border}`,
          display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'16px 20px',borderBottom:`1px solid #F1F5F9`,
            display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:700,color:M.text,fontFamily:'Manrope,sans-serif'}}>Add Agent</div>
            <div onClick={()=>setShowForm(false)} style={{cursor:'pointer',padding:4}}>
              <Icon path={IC.x} size={16} color={M.muted}/>
            </div>
          </div>
          <div style={{flex:1,overflow:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>
            {[{l:'Agency Name',ph:'e.g. Premium Study Hub'},{l:'City',ph:'e.g. Mumbai'},
              {l:'Mobile',ph:'+91 98xxx xxxxx'},{l:'Email',ph:'contact@agency.in'},
              {l:'BDM Name',ph:'Assigned BDM'},{l:'RM Name',ph:'Assigned RM'},
            ].map((f,i)=>(
              <div key={i}><Lbl>{f.l}</Lbl>
                <input placeholder={f.ph} style={{width:'100%',height:42,
                  border:`1.5px solid ${M.border}`,borderRadius:7,padding:'0 12px',
                  fontSize:13,color:M.text,outline:'none',fontFamily:'Inter,sans-serif'}}/>
              </div>
            ))}
          </div>
          <div style={{padding:'14px 20px',borderTop:`1px solid #F1F5F9`,display:'flex',gap:8}}>
            <Btn variant="secondary" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowForm(false)}>Cancel</Btn>
            <Btn variant="primary" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowForm(false)}>Save Agent</Btn>
          </div>
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════
const UsersScreen = () => {
  const [showInvite, setShowInvite] = React.useState(false);
  return (
    <div style={{flex:1,display:'flex',overflow:'hidden'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'12px 24px',background:M.white,borderBottom:`1px solid ${M.border}`,
          display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
          <div style={{position:'relative'}}>
            <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
              <Icon path={IC.search} size={13} color={M.muted}/>
            </div>
            <input placeholder="Search users…" style={{height:36,border:`1.5px solid ${M.border}`,
              borderRadius:7,paddingLeft:32,paddingRight:12,fontSize:13,color:M.text,
              outline:'none',fontFamily:'Inter,sans-serif',width:240}}/>
          </div>
          <div style={{marginLeft:'auto'}}>
            <Btn variant="primary" size="sm" onClick={()=>setShowInvite(true)}
              icon={<Icon path={IC.plus} size={12} color="white"/>}>Invite User</Btn>
          </div>
        </div>

        <div style={{flex:1,overflow:'auto',padding:20}}>
          <Card>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#F8FAFC'}}>
                  {['User','Email','Role','Department','Last Login','Status','Actions'].map(h=>(
                    <th key={h} style={{padding:'10px 18px',textAlign:'left',fontSize:10,fontWeight:700,
                      color:M.sub,letterSpacing:1.2,textTransform:'uppercase',
                      borderBottom:`1px solid #F1F5F9`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_USERS.map((u,i)=>{
                  const role=ROLE_META[u.role]||{label:u.role,bg:'#F1F5F9',text:M.sub};
                  return (
                    <tr key={u.id} style={{borderBottom:i<MOCK_USERS.length-1?`1px solid #F8FAFC`:'none'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'12px 18px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <Avatar name={u.name} size={34}/>
                          <span style={{fontSize:13,fontWeight:600,color:M.text}}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{padding:'12px 18px',fontSize:12,color:M.sub}}>{u.email}</td>
                      <td style={{padding:'12px 18px'}}>
                        <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:4,
                          background:role.bg,color:role.text,letterSpacing:0.4}}>{role.label}</span>
                      </td>
                      <td style={{padding:'12px 18px',fontSize:12,color:M.sub}}>{u.dept}</td>
                      <td style={{padding:'12px 18px',fontSize:11,color:M.muted}}>{u.lastLogin}</td>
                      <td style={{padding:'12px 18px'}}>
                        <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:4,
                          background:u.active?'#ECFDF5':'#F1F5F9',
                          color:u.active?'#059669':M.muted}}>
                          {u.active?'Active':'Inactive'}
                        </span>
                      </td>
                      <td style={{padding:'12px 18px'}}>
                        <div style={{display:'flex',gap:4}}>
                          <div style={{width:28,height:28,borderRadius:6,background:'#EFF6FF',
                            display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                            <Icon path={IC.edit} size={13} color={M.blue}/>
                          </div>
                          {u.role!=='superadmin' && (
                            <div style={{width:28,height:28,borderRadius:6,background:'#FEF2F2',
                              display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                              <Icon path={IC.trash} size={13} color={M.red}/>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {showInvite && (
        <div style={{width:320,background:M.white,borderLeft:`1px solid ${M.border}`,
          display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'16px 20px',borderBottom:`1px solid #F1F5F9`,
            display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:700,color:M.text,fontFamily:'Manrope,sans-serif'}}>Invite User</div>
            <div onClick={()=>setShowInvite(false)} style={{cursor:'pointer',padding:4}}>
              <Icon path={IC.x} size={16} color={M.muted}/>
            </div>
          </div>
          <div style={{padding:20,display:'flex',flexDirection:'column',gap:16}}>
            {[{l:'Full Name',ph:'e.g. Priya Sharma'},{l:'Email Address',ph:'name@kanan.co'}].map((f,i)=>(
              <div key={i}><Lbl>{f.l}</Lbl>
                <input placeholder={f.ph} style={{width:'100%',height:42,
                  border:`1.5px solid ${M.border}`,borderRadius:7,padding:'0 12px',
                  fontSize:13,color:M.text,outline:'none',fontFamily:'Inter,sans-serif'}}/>
              </div>
            ))}
            <div><Lbl>Role</Lbl>
              <select style={{width:'100%',height:42,border:`1.5px solid ${M.border}`,
                borderRadius:7,padding:'0 12px',fontSize:13,color:M.text,outline:'none',
                fontFamily:'Inter,sans-serif',background:M.white,cursor:'pointer'}}>
                {Object.entries(ROLE_META).map(([k,v])=>(
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div><Lbl>Department</Lbl>
              <select style={{width:'100%',height:42,border:`1.5px solid ${M.border}`,
                borderRadius:7,padding:'0 12px',fontSize:13,color:M.text,outline:'none',
                fontFamily:'Inter,sans-serif',background:M.white,cursor:'pointer'}}>
                {['B2B','B2C','Admin','Finance'].map(d=>(
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{padding:'14px 20px',borderTop:`1px solid #F1F5F9`,display:'flex',gap:8,marginTop:'auto'}}>
            <Btn variant="secondary" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowInvite(false)}>Cancel</Btn>
            <Btn variant="primary" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowInvite(false)}>Send Invite</Btn>
          </div>
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// FORM BUILDER
// ═══════════════════════════════════════════════════════════════
const FIELD_TYPES = [
  {type:'text',label:'Text Input',icon:IC.edit},
  {type:'number',label:'Number',icon:IC.rupee},
  {type:'select',label:'Dropdown',icon:IC.chevD},
  {type:'multiselect',label:'Multi-select',icon:IC.filter},
  {type:'rating',label:'Star Rating',icon:IC.star},
  {type:'photo',label:'Photo Upload',icon:IC.upload},
  {type:'date',label:'Date Picker',icon:IC.calendar},
  {type:'textarea',label:'Text Area',icon:IC.claims},
];

const DEFAULT_FIELDS = [
  {id:'f1',type:'text',label:'Institution Name',required:true,group:'Visit Info'},
  {id:'f2',type:'select',label:'Visit Type',required:true,group:'Visit Info'},
  {id:'f3',type:'date',label:'Visit Date',required:true,group:'Visit Info'},
  {id:'f4',type:'textarea',label:'Meeting Summary',required:true,group:'Meeting Details'},
  {id:'f5',type:'rating',label:'Overall Rating',required:false,group:'Feedback'},
  {id:'f6',type:'photo',label:'Visit Photos',required:false,group:'Documents'},
];

const FormBuilderScreen = () => {
  const [fields, setFields] = React.useState(DEFAULT_FIELDS);
  const [dragOver, setDragOver] = React.useState(null);
  const groups = [...new Set(fields.map(f=>f.group))];
  const addField = (type) => {
    const meta = FIELD_TYPES.find(t=>t.type===type);
    setFields(f=>[...f,{
      id:`f${Date.now()}`,type,label:`New ${meta?.label||type}`,
      required:false,group:groups[0]||'Visit Info'
    }]);
  };
  const removeField = (id) => setFields(f=>f.filter(x=>x.id!==id));

  return (
    <div style={{flex:1,display:'flex',overflow:'hidden'}}>
      {/* Field palette */}
      <div style={{width:220,background:M.white,borderRight:`1px solid ${M.border}`,
        display:'flex',flexDirection:'column',flexShrink:0,overflow:'auto'}}>
        <div style={{padding:'14px 16px',borderBottom:`1px solid #F1F5F9`}}>
          <div style={{fontSize:12,fontWeight:700,color:M.text,fontFamily:'Manrope,sans-serif',
            marginBottom:2}}>Field Types</div>
          <div style={{fontSize:11,color:M.muted}}>Click or drag to add</div>
        </div>
        <div style={{padding:10,display:'flex',flexDirection:'column',gap:4}}>
          {FIELD_TYPES.map(ft=>(
            <div key={ft.type} onClick={()=>addField(ft.type)}
              style={{display:'flex',alignItems:'center',gap:9,padding:'9px 10px',
                borderRadius:7,border:`1px solid ${M.border}`,background:M.white,cursor:'pointer',
                transition:'all 0.12s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=M.blue;e.currentTarget.style.background='#EFF6FF';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=M.border;e.currentTarget.style.background=M.white;}}>
              <Icon path={ft.icon} size={14} color={M.sub}/>
              <span style={{fontSize:12,fontWeight:500,color:M.text}}>{ft.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Builder canvas */}
      <div style={{flex:1,overflow:'auto',padding:20}}>
        <div style={{maxWidth:680,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>
          {/* Form meta */}
          <Card style={{padding:'18px 22px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:700,color:M.text,fontFamily:'Manrope,sans-serif'}}>
                B2B Visit Form
              </div>
              <div style={{display:'flex',gap:8}}>
                <Btn variant="secondary" size="sm">Preview</Btn>
                <Btn variant="primary" size="sm">Save Form</Btn>
              </div>
            </div>
            <div style={{display:'flex',gap:12}}>
              <div style={{flex:1,height:40,border:`1.5px solid ${M.border}`,borderRadius:7,
                padding:'0 12px',display:'flex',alignItems:'center',fontSize:13,color:M.muted}}>
                B2B Agent Visit Survey
              </div>
              <div style={{height:40,paddingInline:14,border:`1.5px solid ${M.border}`,borderRadius:7,
                display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:600,color:M.sub,cursor:'pointer'}}>
                <Icon path={IC.plus} size={13} color={M.sub}/>
                Add Section
              </div>
            </div>
          </Card>

          {groups.map(group=>(
            <Card key={group} style={{overflow:'hidden'}}>
              <div style={{padding:'12px 18px',background:'#F8FAFC',borderBottom:`1px solid #F1F5F9`,
                display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:12,fontWeight:700,color:M.text,letterSpacing:0.3}}>{group}</div>
                <div style={{display:'flex',gap:6}}>
                  <div style={{fontSize:11,color:M.muted}}>{fields.filter(f=>f.group===group).length} fields</div>
                </div>
              </div>
              <div style={{padding:14,display:'flex',flexDirection:'column',gap:8}}>
                {fields.filter(f=>f.group===group).map(f=>(
                  <div key={f.id}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                      borderRadius:7,border:`1px solid ${dragOver===f.id?M.blue:M.border}`,
                      background:dragOver===f.id?'#EFF6FF':M.white,cursor:'grab'}}
                    onMouseEnter={e=>setDragOver(f.id)}
                    onMouseLeave={e=>setDragOver(null)}>
                    <Icon path={IC.drag} size={14} color={M.muted}/>
                    <div style={{width:28,height:28,borderRadius:6,background:'#F1F5F9',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Icon path={FIELD_TYPES.find(t=>t.type===f.type)?.icon||IC.edit} size={13} color={M.sub}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:M.text}}>{f.label}</div>
                      <div style={{fontSize:10,color:M.muted,marginTop:1,textTransform:'capitalize'}}>{f.type}</div>
                    </div>
                    {f.required && (
                      <span style={{fontSize:9,fontWeight:700,padding:'2px 5px',borderRadius:3,
                        background:'#FEF2F2',color:M.red,letterSpacing:0.5}}>REQUIRED</span>
                    )}
                    <div style={{display:'flex',gap:3}}>
                      <div style={{width:24,height:24,borderRadius:5,display:'flex',alignItems:'center',
                        justifyContent:'center',cursor:'pointer',background:'#EFF6FF'}}>
                        <Icon path={IC.edit} size={11} color={M.blue}/>
                      </div>
                      <div onClick={()=>removeField(f.id)} style={{width:24,height:24,borderRadius:5,
                        display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',background:'#FEF2F2'}}>
                        <Icon path={IC.x} size={11} color={M.red}/>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
                  borderRadius:7,border:`2px dashed ${M.border}`,cursor:'pointer',
                  color:M.muted,fontSize:12}}
                  onClick={()=>addField('text')}>
                  <Icon path={IC.plus} size={14} color={M.muted}/>
                  Add field to {group}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Properties panel */}
      <div style={{width:240,background:M.white,borderLeft:`1px solid ${M.border}`,
        display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'14px 16px',borderBottom:`1px solid #F1F5F9`}}>
          <div style={{fontSize:12,fontWeight:700,color:M.text,fontFamily:'Manrope,sans-serif'}}>
            Field Properties
          </div>
        </div>
        <div style={{padding:16,display:'flex',flexDirection:'column',gap:14}}>
          <div><Lbl>Field Label</Lbl>
            <input defaultValue="Institution Name" style={{width:'100%',height:38,
              border:`1.5px solid ${M.border}`,borderRadius:7,padding:'0 10px',fontSize:12,
              color:M.text,outline:'none',fontFamily:'Inter,sans-serif'}}/>
          </div>
          <div><Lbl>Placeholder</Lbl>
            <input defaultValue="e.g. DPS International" style={{width:'100%',height:38,
              border:`1.5px solid ${M.border}`,borderRadius:7,padding:'0 10px',fontSize:12,
              color:M.text,outline:'none',fontFamily:'Inter,sans-serif'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
            padding:'10px 0',borderBottom:`1px solid #F8FAFC`}}>
            <span style={{fontSize:12,color:M.text,fontWeight:500}}>Required</span>
            <div style={{width:36,height:20,borderRadius:10,background:M.navy,cursor:'pointer',
              position:'relative'}}>
              <div style={{width:16,height:16,borderRadius:'50%',background:'white',
                position:'absolute',top:2,right:2,boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0'}}>
            <span style={{fontSize:12,color:M.text,fontWeight:500}}>Visible to Admin only</span>
            <div style={{width:36,height:20,borderRadius:10,background:'#E2E8F0',cursor:'pointer',
              position:'relative'}}>
              <div style={{width:16,height:16,borderRadius:'50%',background:'white',
                position:'absolute',top:2,left:2,boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ExpensesScreen, ClaimsScreen, AgentsScreen, UsersScreen, FormBuilderScreen });
