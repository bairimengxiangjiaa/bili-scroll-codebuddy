// 刷B站设置页（CodeBuddy resident Mod，app.page）
// 安装：用 CodeBuddy 的 Mods 面板新建 resident Mod，把本文件内容作为 client 字段。
// 注意：页面运行在浏览器沙箱里，读不到磁盘，只能通过聊天回执同步配置。

return {
  slotContract: 'strict',
  inject: ['slots','chat'],
  apply(ctx){
    const h = React.createElement;
    const MARK = '【刷B站·已写入】';
    const T = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    const S = {
      page: {height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'20px 28px', color:'var(--color-text-primary)'},
      wrap: {maxWidth:840, margin:'0 auto'},
      head: {position:'sticky', top:0, zIndex:5, background:'var(--color-bg-primary)', paddingBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap'},
      h1: {fontSize:18, fontWeight:600, margin:0, display:'flex', alignItems:'center', gap:8},
      sub: {fontSize:12, color:'var(--color-text-secondary)', margin:'4px 0 0'},
      sync: {fontSize:11, marginTop:4, color:'var(--color-accent-green)'},
      sec: {marginTop:14, padding:16, border:'1px solid var(--color-border-muted)', borderRadius:8, background:'var(--color-bg-secondary)'},
      h2: {fontSize:13, fontWeight:600, margin:'0 0 12px'},
      label: {display:'block', fontSize:12, color:'var(--color-text-secondary)', marginBottom:4},
      input: {width:'100%', boxSizing:'border-box', padding:'6px 8px', borderRadius:6, border:'1px solid var(--color-border-input)', background:'var(--color-bg-input)', color:'var(--color-text-primary)', fontSize:13},
      hint: {fontSize:11, color:'var(--color-text-tertiary)', marginTop:4},
      row: {display:'flex', gap:16, flexWrap:'wrap'},
      chk: {display:'flex', gap:8, alignItems:'center', marginBottom:10, fontSize:13, cursor:'pointer'},
      btn: {padding:'7px 14px', borderRadius:6, border:'none', background:'var(--color-accent-brand)', color:'var(--color-accent-brand-foreground)', cursor:'pointer', fontSize:13, fontWeight:600},
      mini: {padding:'6px 12px', borderRadius:6, border:'1px solid var(--color-border-input)', background:'var(--color-bg-tertiary)', color:'var(--color-text-primary)', cursor:'pointer', fontSize:12, whiteSpace:'nowrap'},
      msg: {fontSize:12, color:'var(--color-accent-orange)', marginTop:8}
    };
    const D = {
      keywords: 'AI Agent\n大模型\nMCP',
      lookback_days: 3,
      max_deep_read_per_run: 4,
      max_picks_per_day: 8,
      search_per_keyword: 10,
      summary_enabled: true,
      report_detail: 'full',
      persona: '',
      comment_enabled: false,
      dry_run: true,
      max_per_day: 1,
      mode: 'at+dm',
      split_per_user: false,
      at_users: [],
      time1: '12:30',
      time2: '19:00'
    };

    function pickWritten(msgs){
      if (!msgs || !msgs.length) return null;
      for (let i = msgs.length - 1; i >= 0; i--) {
        const c = String((msgs[i] && msgs[i].content) || '');
        const at = c.lastIndexOf(MARK);
        if (at < 0) continue;
        const raw = c.slice(at + MARK.length);
        const s = raw.indexOf('{');
        const e = raw.lastIndexOf('}');
        if (s < 0 || e <= s) continue;
        try { return { id: msgs[i].id, cfg: JSON.parse(raw.slice(s, e + 1)) }; } catch(err) {}
      }
      return null;
    }

    function applyCfg(prev, cfg){
      const cm = cfg.comment || {};
      const n = Object.assign({}, prev);
      if (Array.isArray(cfg.keywords)) n.keywords = cfg.keywords.join('\n');
      if (typeof cfg.lookback_days === 'number') n.lookback_days = cfg.lookback_days;
      if (typeof cfg.max_deep_read_per_run === 'number') n.max_deep_read_per_run = cfg.max_deep_read_per_run;
      if (typeof cfg.max_picks_per_day === 'number') n.max_picks_per_day = cfg.max_picks_per_day;
      if (typeof cfg.search_per_keyword === 'number') n.search_per_keyword = cfg.search_per_keyword;
      if (cfg.summary && typeof cfg.summary.enabled === 'boolean') n.summary_enabled = cfg.summary.enabled;
      if (cfg.report_detail) n.report_detail = cfg.report_detail;
      if (typeof cfg.persona === 'string') n.persona = cfg.persona;
      n.comment_enabled = !!cm.enabled;
      n.dry_run = !!cm.dry_run;
      if (typeof cm.max_per_day === 'number') n.max_per_day = cm.max_per_day;
      if (cm.mode) n.mode = cm.mode;
      if (typeof cm.split_per_user === 'boolean') n.split_per_user = cm.split_per_user;
      if (Array.isArray(cm.at_users) && cm.at_users.length) {
        n.at_users = cm.at_users.map(function(u){ return {name: String(u.name || ''), uid: String(u.uid || '')}; });
      } else if (cm.at_user || cm.at_uid) {
        n.at_users = [{name: String(cm.at_user || ''), uid: String(cm.at_uid || '')}];
      }
      if (cfg.schedule && Array.isArray(cfg.schedule.times)) {
        if (cfg.schedule.times[0]) n.time1 = String(cfg.schedule.times[0]);
        if (cfg.schedule.times[1]) n.time2 = String(cfg.schedule.times[1]);
      }
      return n;
    }

    function Page(){
      const st = React.useState(D);
      const c = st[0], setC = st[1];
      const ms = React.useState('');
      const msg = ms[0], setMsg = ms[1];
      const sy = React.useState('正在读取聊天回执…');
      const sync = sy[0], setSync = sy[1];
      const mr = React.useRef('');

      React.useEffect(function(){
        const pulse = function(){
          let snap = null;
          try { snap = ctx.chat.getSnapshot(); } catch(e) { return; }
          const f = pickWritten(snap && snap.messages);
          if (f && f.id !== mr.current) {
            mr.current = f.id;
            setC(function(prev){ return applyCfg(prev, f.cfg); });
            setSync('已同步磁盘配置（' + new Date().toLocaleTimeString() + '）');
          } else if (!f) {
            setSync('无回执，显示内置默认值');
          }
        };
        pulse();
        let off = null;
        try { off = ctx.chat.subscribe(pulse); } catch(e) {}
        return function(){ if (off) try { off(); } catch(e) {} };
      }, []);

      const up = function(k, v){ setC(function(prev){ const x = Object.assign({}, prev); x[k] = v; return x; }); };
      const editUser = function(i, k, v){
        setC(function(prev){
          const arr = (prev.at_users || []).map(function(x){ return Object.assign({}, x); });
          arr[i][k] = v;
          const n = Object.assign({}, prev); n.at_users = arr; return n;
        });
      };
      const addUser = function(){
        setC(function(prev){
          const n = Object.assign({}, prev);
          n.at_users = (prev.at_users || []).concat([{name:'', uid:''}]);
          return n;
        });
      };
      const delUser = function(i){
        setC(function(prev){
          const n = Object.assign({}, prev);
          n.at_users = (prev.at_users || []).filter(function(_, idx){ return idx !== i; });
          return n;
        });
      };
      const num = function(k, label, hint){
        return h('div',{key:k, style:{flex:'1 1 150px'}},
          h('label',{style:S.label}, label),
          h('input',{type:'number', value:c[k], style:S.input, onChange:function(e){ up(k, Number(e.target.value)); }}),
          hint ? h('div',{style:S.hint}, hint) : null);
      };
      const tIn = function(k, label){
        return h('div',{key:k, style:{flex:'1 1 140px'}},
          h('label',{style:S.label}, label),
          h('input',{value:c[k], placeholder:'HH:MM', style:S.input, onChange:function(e){ up(k, e.target.value); }}));
      };
      const chk = function(k, label, hint){
        return h('label',{key:k, style:S.chk},
          h('input',{type:'checkbox', checked:!!c[k], onChange:function(e){ up(k, e.target.checked); }}),
          h('span',{}, label),
          hint ? h('span',{style:S.hint}, hint) : null);
      };
      const syncNow = async function(){
        try {
          await ctx.chat.submit('请读取项目根目录的 config.json，不要修改文件，并在回复末尾原样输出【刷B站·已写入】加文件完整内容。');
          setMsg('已请求重新同步，回执到达后本页会自动更新。');
        } catch(err) {
          setMsg('请求失败：' + String(err && err.message || err));
        }
      };
      const save = async function(){
        const t1 = String(c.time1 || '').trim();
        const t2 = String(c.time2 || '').trim();
        if (!T.test(t1) || !T.test(t2)) { setMsg('时间格式要写成 HH:MM，例如 12:30'); return; }
        const users = (c.at_users || []).map(function(u){ return {name: String(u.name || '').trim(), uid: String(u.uid || '').trim()}; }).filter(function(u){ return u.name && u.uid; });
        if (c.comment_enabled && !users.length) { setMsg('至少填一个接收人（昵称 + UID）'); return; }
        const mode = String(c.mode || 'at+dm');
        const cfg = {
          keywords: String(c.keywords).split('\n').map(function(x){ return x.trim(); }).filter(Boolean),
          lookback_days: Number(c.lookback_days),
          max_deep_read_per_run: Number(c.max_deep_read_per_run),
          max_picks_per_day: Number(c.max_picks_per_day),
          search_per_keyword: Number(c.search_per_keyword),
          summary: {enabled: !!c.summary_enabled},
          report_detail: c.report_detail,
          persona: c.persona,
          comment: {
            enabled: !!c.comment_enabled,
            dry_run: !!c.dry_run,
            max_per_day: Number(c.max_per_day),
            mode: mode,
            split_per_user: !!c.split_per_user,
            at_users: users,
            at_user: users.length ? users[0].name : '',
            at_uid: users.length ? users[0].uid : '',
            dm_notify_self: mode.indexOf('dm') >= 0
          },
          favorite: {enabled:false, folder_id:null},
          dm: {enabled:false},
          schedule: {times: [t1, t2]}
        };
        const body = '【刷B站 · 设置页】请把下面 JSON 的字段合并写入项目根目录的 config.json（保留 favorite 与 dm 字段）；若 schedule.times 与旧值不同，请按它重建 durable 定时任务。写完后在回复末尾原样附上【刷B站·已写入】标记加同一份 JSON：\n' + JSON.stringify(cfg, null, 2);
        try {
          await ctx.chat.submit(body);
          setMsg('已发送。agent 写完盘后会回「已写入」，本页会自动同步。');
        } catch(err) {
          setMsg('发送失败：' + String(err && err.message || err));
        }
      };

      return h('div',{style:S.page},
        h('div',{style:S.wrap},
          h('div',{style:S.head},
            h('div',{},
              h('h1',{style:S.h1},'🐟 刷B站'),
              h('p',{style:S.sub},'设置页 · 显示的是磁盘已写入的配置（从聊天回执同步）'),
              h('div',{style:S.sync}, sync)),
            h('div',{style:{display:'flex', gap:8, alignItems:'center'}},
              h('button',{style:S.mini, onClick:syncNow},'重新同步'),
              h('button',{style:S.btn, onClick:save},'保存到磁盘'))),
          msg ? h('div',{style:S.msg}, msg) : null,

          h('div',{style:S.sec},
            h('h2',{style:S.h2},'日常'),
            h('div',{style:S.row},
              num('lookback_days','回溯天数','只搜最近 N 天发布的'),
              num('search_per_keyword','每个关键词搜几条','× 关键词数 = 标题扫描量'),
              num('max_deep_read_per_run','每轮深读条数','最多读几条字幕'),
              num('max_picks_per_day','每日入选上限','0 = 只手动跑'))),

          h('div',{style:S.sec},
            h('h2',{style:S.h2},'偏好'),
            h('div',{},
              h('label',{style:S.label},'关注关键词（一行一个）'),
              h('textarea',{rows:5, value:c.keywords, style:Object.assign({},S.input,{resize:'vertical',fontFamily:'inherit'}), onChange:function(e){ up('keywords', e.target.value); }}),
              h('div',{style:S.hint},'留空则用内置默认组')),
            h('div',{style:{marginTop:12}},
              h('label',{style:S.label},'日报详细度'),
              h('select',{value:c.report_detail, style:S.input, onChange:function(e){ up('report_detail', e.target.value); }},
                h('option',{value:'full'},'完整'),
                h('option',{value:'thin'},'薄版：只留标题和一句话'),
                h('option',{value:'none'},'不写日报'))),
            h('div',{style:{marginTop:12}},
              chk('summary_enabled','真视频总结','日报里写 3–5 条要点 + 结论 + 局限 + 适合谁看（独立于日报详细度）')),
            h('div',{style:{marginTop:12}},
              h('label',{style:S.label},'人设提示词（可选）'),
              h('textarea',{rows:3, value:c.persona, style:Object.assign({},S.input,{resize:'vertical',fontFamily:'inherit'}), onChange:function(e){ up('persona', e.target.value); }}),
              h('div',{style:S.hint},'留空按中性口吻'))),

          h('div',{style:S.sec},
            h('h2',{style:S.h2},'互动'),
            chk('comment_enabled','自动评论','关闭后完全不评论'),
            chk('dry_run','dry-run（只出草稿不发送）','建议先看几轮草稿再关'),
            h('div',{style:S.row}, num('max_per_day','每天评论条数上限','按总条数算；不建议超过 3')),
            h('div',{style:{marginTop:8}},
              h('label',{style:S.label},'接收人（@ 与私信都按这个列表，不限人数）'),
              (c.at_users || []).map(function(u, i){
                return h('div',{key:'u' + i, style:{display:'flex', gap:8, marginBottom:8}},
                  h('input',{value:u.name, placeholder:'昵称（必须精确）', style:S.input, onChange:function(e){ editUser(i, 'name', e.target.value); }}),
                  h('input',{value:u.uid, placeholder:'UID', style:S.input, onChange:function(e){ editUser(i, 'uid', e.target.value); }}),
                  h('button',{style:S.mini, onClick:function(){ delUser(i); }},'✕'));
              }),
              h('button',{style:S.mini, onClick:addUser},'＋ 添加接收人')),
            h('div',{style:{marginTop:12}},
              h('label',{style:S.label},'通知方式'),
              h('select',{value:c.mode, style:S.input, onChange:function(e){ up('mode', e.target.value); }},
                h('option',{value:'at+dm'},'@ + 私信（推荐）'),
                h('option',{value:'at'},'仅 @（只在正文写 @昵称）'),
                h('option',{value:'dm'},'仅私信（正文不 @）'))),
            h('div',{style:{marginTop:12}},
              chk('split_per_user','每人一条评论（同文案，各 @ 一人）','同一视频发两条相同内容，折叠/风控概率更高；两条间隔 ≥5 秒'))),

          h('div',{style:S.sec},
            h('h2',{style:S.h2},'高级'),
            h('div',{style:S.row},
              tIn('time1','定时时间一'),
              tIn('time2','定时时间二')),
            h('div',{style:S.hint},'保存时 agent 会按这两个时间重建 durable 定时任务（先删旧任务）。格式 HH:MM'),
            h('div',{style:{marginTop:12, fontSize:12, color:'var(--color-text-secondary)', lineHeight:1.8}},
              h('div',{},'配置文件：项目根目录 config.json'),
              h('div',{},'日报目录：同目录 out/'))),

          h('div',{style:{height:24}})
        )
      );
    }

    ctx.slots.register({name:'app.page', id:'bili-scroll', label:'刷B站', icon:'🐟', order:2}, Page);
  }
};
