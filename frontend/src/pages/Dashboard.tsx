import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, TrendingUp, TrendingDown, Users, FolderOpen,
  CheckCircle2, Clock, AlertTriangle, Bug, Eye, Zap,
  ArrowUpRight, ArrowDownRight, Target, Activity,
  ListTodo, Shield, UserCheck, UserX,
  CalendarClock, Flame, Award, RefreshCw,
  ChevronRight,
} from 'lucide-react';
import Header from '../components/layout/Header';
import api from '../services/api';
import { useAppSelector } from '../hooks/useAppDispatch';

// ── Color constants ──────────────────────────────────────────────────

const STATUS_COLORS: Record<string,string> = {
  todo:'#94a3b8', backlog:'#cbd5e1', in_progress:'#3b82f6',
  in_review:'#a855f7', done:'#22c55e', closed:'#6b7280',
};
const PRIORITY_COLORS: Record<string,string> = {
  critical:'#ef4444', high:'#f97316', medium:'#eab308', low:'#22c55e',
};
const ROLE_COLORS: Record<string,string> = {
  admin:'#6366f1', manager:'#a855f7', team_leader:'#3b82f6',
  developer:'#0ea5e9', designer:'#ec4899', tester:'#f97316', hr:'#14b8a6',
};
const TYPE_COLORS: Record<string,string> = {
  task:'#6366f1', bug:'#ef4444', feature:'#a855f7',
  improvement:'#0ea5e9', test:'#f97316', story:'#22c55e',
};

// ── Helpers ──────────────────────────────────────────────────────────

const fmtRole  = (r:string) => r.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const fmtDate  = (d:string) => new Date(d).toLocaleDateString('en',{month:'short',day:'numeric'});
const initials = (n:string) => (n||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

// ── Avatar ───────────────────────────────────────────────────────────

function Av({name,sz=8,color='#6366f1'}:{name:string;sz?:number;color?:string}) {
  const dim = `w-${sz} h-${sz}`;
  const fs  = sz<=7?'text-xs':sz<=9?'text-sm':'text-base';
  return (
    <div className={`${dim} ${fs} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{background:color}}>{initials(name)}</div>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────

const PAL:Record<string,{bg:string;text:string;grad:string}> = {
  indigo:{bg:'bg-indigo-50', text:'text-indigo-600',  grad:'#6366f1'},
  blue:  {bg:'bg-blue-50',   text:'text-blue-600',    grad:'#3b82f6'},
  green: {bg:'bg-emerald-50',text:'text-emerald-600', grad:'#22c55e'},
  red:   {bg:'bg-red-50',    text:'text-red-600',     grad:'#ef4444'},
  amber: {bg:'bg-amber-50',  text:'text-amber-600',   grad:'#f59e0b'},
  purple:{bg:'bg-purple-50', text:'text-purple-600',  grad:'#a855f7'},
  teal:  {bg:'bg-teal-50',   text:'text-teal-600',    grad:'#14b8a6'},
  orange:{bg:'bg-orange-50', text:'text-orange-600',  grad:'#f97316'},
  pink:  {bg:'bg-pink-50',   text:'text-pink-600',    grad:'#ec4899'},
  gray:  {bg:'bg-gray-100',  text:'text-gray-600',    grad:'#6b7280'},
  sky:   {bg:'bg-sky-50',    text:'text-sky-600',     grad:'#0ea5e9'},
};

function StatCard({label,value,icon:Icon,color='indigo',sub,trend}:{
  label:string; value:string|number; icon:React.ComponentType<any>;
  color?:string; sub?:string; trend?:{value:number;label:string};
}) {
  const c = PAL[color]??PAL.indigo;
  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-hidden hover:shadow-md transition-all">
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 -translate-y-6 translate-x-6 pointer-events-none"
        style={{background:c.grad}}/>
      <div className="flex items-start gap-3 relative">
        <div className={`${c.bg} ring-1 ring-inset p-2.5 rounded-xl flex-shrink-0`}
          style={{'--tw-ring-color':c.grad+'25'} as any}>
          <Icon className={`w-5 h-5 ${c.text}`}/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-extrabold text-gray-900 leading-tight tabular-nums">{value}</p>
          <p className="text-xs font-semibold text-gray-500 mt-0.5 truncate">{label}</p>
          {sub&&<p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
          {trend&&(
            <div className={`flex items-center gap-1 mt-1.5 ${trend.value>=0?'text-emerald-600':'text-red-500'}`}>
              {trend.value>=0?<ArrowUpRight className="w-3 h-3"/>:<ArrowDownRight className="w-3 h-3"/>}
              <span className="text-[10px] font-bold">{Math.abs(trend.value)}% {trend.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ring (SVG progress circle) ───────────────────────────────────────

function Ring({pct,size=80,stroke=8,color='#6366f1',label,sub}:{
  pct:number;size?:number;stroke?:number;color?:string;label?:string;sub?:string;
}) {
  const [d,setD]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setD(pct),100);return()=>clearTimeout(t);},[pct]);
  const r=((size-stroke)/2), circ=2*Math.PI*r, off=circ-(Math.min(d,100)/100)*circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{transition:'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)'}}/>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          fill="#1e293b" fontSize={size*.21} fontWeight="800"
          style={{transform:'rotate(90deg)',transformOrigin:'50% 50%'}}>{d}%</text>
      </svg>
      {label&&<p className="text-xs font-bold text-gray-600 text-center">{label}</p>}
      {sub&&<p className="text-[10px] text-gray-400 text-center">{sub}</p>}
    </div>
  );
}

// ── HBar ─────────────────────────────────────────────────────────────

function HBar({data,colorFn}:{data:Record<string,number>;colorFn?:(k:string)=>string;}) {
  const entries=Object.entries(data).sort((a,b)=>b[1]-a[1]);
  const max=Math.max(...entries.map(e=>e[1]),1);
  const sum=entries.reduce((a,[,v])=>a+v,0)||1;
  return (
    <div className="space-y-3">
      {entries.map(([key,val])=>(
        <div key={key}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500 capitalize truncate flex-1 mr-3">
              {key.replace(/_/g,' ')}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-gray-400">{Math.round((val/sum)*100)}%</span>
              <span className="text-xs font-bold text-gray-700 w-5 text-right">{val}</span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{width:`${(val/max)*100}%`,background:colorFn?colorFn(key):'#6366f1'}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── DonutChart ───────────────────────────────────────────────────────

function Donut({data,colorFn,size=84}:{data:Record<string,number>;colorFn:(k:string)=>string;size?:number}) {
  const total=Object.values(data).reduce((a,b)=>a+b,0)||1;
  const entries=Object.entries(data).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  let cum=0;
  const stops=entries.map(([key,val])=>{
    const p=(val/total)*100;
    const s=`${colorFn(key)} ${cum.toFixed(1)}% ${(cum+p).toFixed(1)}%`;
    cum+=p; return s;
  });
  const hole=size*.35;
  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0" style={{width:size,height:size}}>
        <div className="absolute inset-0 rounded-full"
          style={{background:`conic-gradient(${stops.join(',')})`}}/>
        <div className="absolute rounded-full bg-white flex items-center justify-center"
          style={{top:hole,left:hole,right:hole,bottom:hole}}>
          <span className="text-[9px] font-bold text-gray-500">{total}</span>
        </div>
      </div>
      <div className="space-y-1.5 flex-1 min-w-0">
        {entries.slice(0,6).map(([key,val])=>(
          <div key={key} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background:colorFn(key)}}/>
            <span className="text-xs text-gray-600 capitalize flex-1 truncate">{key.replace(/_/g,' ')}</span>
            <span className="text-xs font-bold text-gray-700">{val}</span>
            <span className="text-[10px] text-gray-400 w-7 text-right">{Math.round((val/total)*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pill badge ───────────────────────────────────────────────────────

function Pill({value,type='status'}:{value:string;type?:'status'|'priority'|'type'|'role'}) {
  const map=type==='priority'?PRIORITY_COLORS:type==='role'?ROLE_COLORS:type==='type'?TYPE_COLORS:STATUS_COLORS;
  const clr=map[value]??'#94a3b8';
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
      style={{background:clr+'20',color:clr}}>{value.replace(/_/g,' ')}</span>
  );
}

// ── Card ─────────────────────────────────────────────────────────────

function Card({title,icon:Icon,children,action,accent}:{
  title?:string;icon?:React.ComponentType<any>;
  children:React.ReactNode;action?:React.ReactNode;accent?:string;
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden"
      style={accent?{borderColor:accent+'30'}:{borderColor:'#f1f5f9'}}>
      {title&&(
        <div className="flex items-center justify-between px-5 pt-5 pb-0 mb-4">
          <div className="flex items-center gap-2">
            {Icon&&<Icon className="w-4 h-4 text-gray-400"/>}
            <h3 className="text-sm font-bold text-gray-700">{title}</h3>
          </div>
          {action}
        </div>
      )}
      <div className={title?'px-5 pb-5':'p-5'}>{children}</div>
    </div>
  );
}

// ── TaskRow ──────────────────────────────────────────────────────────

function TRow({task,showType=false}:{task:any;showType?:boolean}) {
  const pc=PRIORITY_COLORS[task.priority]??'#94a3b8';
  return (
    <Link to={`/tasks/${task.id}`}
      className="flex items-center gap-3 py-2 px-2.5 -mx-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{background:pc}}/>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-indigo-600 transition-colors">
          {task.title}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {task.project?.name&&<span className="text-[10px] text-gray-400 truncate">{task.project.name}</span>}
          {task.due_date&&<span className="text-[10px] text-gray-400 hidden sm:inline"> · {fmtDate(task.due_date)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {showType&&task.type&&<Pill value={task.type} type="type"/>}
        <Pill value={task.status}/>
        <ChevronRight className="w-3 h-3 text-gray-200 group-hover:text-indigo-300 transition-colors"/>
      </div>
    </Link>
  );
}

// ── ProjectRow ───────────────────────────────────────────────────────

function PRow({project}:{project:any}) {
  const sc=({active:'#22c55e',on_hold:'#f59e0b',completed:'#6366f1',cancelled:'#ef4444'} as any)[project.status]??'#94a3b8';
  return (
    <Link to={`/projects/${project.id}`}
      className="flex items-center gap-3 py-2 px-2.5 -mx-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:sc+'18'}}>
        <FolderOpen className="w-4 h-4" style={{color:sc}}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-indigo-600">{project.name}</p>
        {project.owner?.name&&<p className="text-[10px] text-gray-400">{project.owner.name}</p>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {project.priority&&<Pill value={project.priority} type="priority"/>}
        <Pill value={project.status}/>
        <ChevronRight className="w-3 h-3 text-gray-200 group-hover:text-indigo-300 transition-colors"/>
      </div>
    </Link>
  );
}

// ── WorkloadBar ──────────────────────────────────────────────────────

function WBar({name,count,max,roleColor}:{name:string;count:number;max:number;roleColor?:string}) {
  const pct=max>0?(count/max)*100:0;
  const fill=pct>80?'#ef4444':pct>50?'#f59e0b':'#22c55e';
  return (
    <div className="flex items-center gap-3">
      <Av name={name} sz={7} color={roleColor??'#6366f1'}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-700 truncate">{name}</p>
          <span className="text-xs font-bold tabular-nums ml-2" style={{color:fill}}>{count}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:fill}}/>
        </div>
      </div>
    </div>
  );
}

// ── SeeAll link ──────────────────────────────────────────────────────

function SeeAll({to,c='text-indigo-500 hover:text-indigo-700'}:{to:string;c?:string}) {
  return (
    <Link to={to} className={`text-xs font-semibold flex items-center gap-0.5 ${c}`}>
      All <ChevronRight className="w-3 h-3"/>
    </Link>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Role dashboards
// ══════════════════════════════════════════════════════════════════════

// ── ADMIN ────────────────────────────────────────────────────────────

function AdminDash({d}:{d:any}) {
  const completionRate = d.completion_rate??0;
  const activeProj     = d.total_projects>0 ? Math.round((d.active_projects/d.total_projects)*100) : 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Projects" value={d.total_projects}  icon={FolderOpen}    color="indigo" sub={`${d.active_projects} active`}/>
        <StatCard label="Team Members"   value={d.total_users}     icon={Users}         color="blue"   sub={`${d.active_users} active`}/>
        <StatCard label="All Tasks"      value={d.total_tasks}     icon={ListTodo}      color="purple" sub={`${d.done_tasks} done`}/>
        <StatCard label="Overdue"        value={d.overdue_tasks}   icon={AlertTriangle} color="red"    sub={`${d.due_this_week??0} due this week`}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Completion Overview" icon={Target}>
          <div className="flex items-center justify-around pt-1">
            <Ring pct={completionRate} size={84} color="#6366f1" label="Tasks Done"       sub={`${d.done_tasks}/${d.total_tasks}`}/>
            <Ring pct={activeProj}     size={84} color="#22c55e" label="Projects Active" sub={`${d.active_projects}/${d.total_projects}`}/>
          </div>
        </Card>
        <Card title="Tasks by Status"   icon={Activity}><HBar data={d.tasks_by_status??{}}   colorFn={k=>STATUS_COLORS[k]??'#94a3b8'}/></Card>
        <Card title="Tasks by Priority" icon={Flame}>   <HBar data={d.tasks_by_priority??{}} colorFn={k=>PRIORITY_COLORS[k]??'#94a3b8'}/></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Team by Role" icon={Shield} action={<SeeAll to="/users"/>}>
          <Donut data={d.users_by_role??{}} colorFn={k=>ROLE_COLORS[k]??'#94a3b8'}/>
          <div className="mt-4 pt-4 border-t border-gray-50">
            <HBar data={d.users_by_role??{}} colorFn={k=>ROLE_COLORS[k]??'#94a3b8'}/>
          </div>
        </Card>
        <Card title="Top Assignees" icon={Award}>
          <div className="space-y-1.5">
            {(d.top_assignees??[]).map((u:any,i:number)=>{
              const rc=ROLE_COLORS[u.roles?.[0]?.name??'']??'#6366f1';
              return (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
                  <span className="w-5 text-center text-[10px] font-bold text-gray-400">{i+1}</span>
                  <Av name={u.name} sz={8} color={rc}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{(u.roles?.[0]?.name??'').replace(/_/g,' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold" style={{color:rc}}>{u.task_count}</p>
                    <p className="text-[10px] text-gray-400">tasks</p>
                  </div>
                </div>
              );
            })}
            {!d.top_assignees?.length&&<p className="text-sm text-gray-400 text-center py-6">No assignments yet</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Recent Projects" icon={FolderOpen} action={<SeeAll to="/projects"/>}>
          <div className="space-y-0.5">{(d.recent_projects??[]).map((p:any)=><PRow key={p.id} project={p}/>)}</div>
        </Card>
        <Card title="Recent Tasks" icon={ListTodo} action={<SeeAll to="/tasks"/>}>
          <div className="space-y-0.5">{(d.recent_tasks??[]).map((t:any)=><TRow key={t.id} task={t}/>)}</div>
        </Card>
      </div>
    </div>
  );
}

// ── MANAGER ──────────────────────────────────────────────────────────

function ManagerDash({d}:{d:any}) {
  const maxWl=Math.max(...(d.team_workload??[]).map((u:any)=>u.open_tasks),1);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Projects" value={d.total_projects}  icon={FolderOpen}    color="indigo" sub={`${d.active_projects} active · ${d.completed_projects??0} done`}/>
        <StatCard label="All Tasks"      value={d.total_tasks}     icon={ListTodo}      color="blue"   sub={`${d.done_tasks} done`}/>
        <StatCard label="Overdue"        value={d.overdue_tasks}   icon={AlertTriangle} color="red"    sub={`${d.due_this_week??0} due this week`}/>
        <StatCard label="Completion"     value={`${d.completion_rate??0}%`} icon={Target} color="green"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Task Progress" icon={Target}>
          <div className="flex items-center justify-around pt-1">
            <Ring pct={d.completion_rate??0} size={84} color="#6366f1" label="Done" sub={`${d.done_tasks??0}/${d.total_tasks}`}/>
            <div className="space-y-3 pr-2">
              {[{l:'Done',v:d.done_tasks,c:'#22c55e'},{l:'Overdue',v:d.overdue_tasks,c:'#ef4444'},{l:'This week',v:d.due_this_week,c:'#f59e0b'}].map(s=>(
                <div key={s.l} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{background:s.c}}/>
                  <span className="text-xs text-gray-500">{s.l}</span>
                  <span className="text-xs font-bold text-gray-700 ml-auto pl-3 tabular-nums">{s.v??0}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card title="By Status"   icon={Activity}><HBar data={d.tasks_by_status??{}}   colorFn={k=>STATUS_COLORS[k]??'#94a3b8'}/></Card>
        <Card title="By Priority" icon={Flame}>   <HBar data={d.tasks_by_priority??{}} colorFn={k=>PRIORITY_COLORS[k]??'#94a3b8'}/></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Team Workload" icon={Users}>
          <div className="space-y-3">
            {(d.team_workload??[]).map((u:any)=>(
              <WBar key={u.id} name={u.name} count={u.open_tasks} max={maxWl}
                roleColor={ROLE_COLORS[u.roles?.[0]?.name??'']??'#6366f1'}/>
            ))}
            {!d.team_workload?.length&&<p className="text-sm text-gray-400 text-center py-4">No team data</p>}
          </div>
        </Card>
        <Card title="Recent Projects" icon={FolderOpen} action={<SeeAll to="/projects"/>}>
          <div className="space-y-0.5">{(d.recent_projects??[]).map((p:any)=><PRow key={p.id} project={p}/>)}</div>
        </Card>
      </div>

      <Card title="Recent Tasks" icon={ListTodo} action={<SeeAll to="/tasks"/>}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-0.5">
          {(d.recent_tasks??[]).map((t:any)=><TRow key={t.id} task={t}/>)}
        </div>
      </Card>
    </div>
  );
}

// ── TEAM LEADER ──────────────────────────────────────────────────────

function TeamLeaderDash({d}:{d:any}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="My Tasks"    value={d.my_tasks}            icon={ListTodo}      color="indigo" sub={`${d.my_todo??0} to do`}/>
        <StatCard label="In Progress" value={d.my_in_progress??0}   icon={Clock}         color="blue"   sub={`${d.my_done??0} done`}/>
        <StatCard label="Team Tasks"  value={d.team_tasks}          icon={Users}         color="purple" sub={`${d.team_overdue??0} overdue`}/>
        <StatCard label="My Overdue"  value={d.my_overdue??0}       icon={AlertTriangle} color="red"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="My Progress" icon={Target}>
          <div className="flex items-center justify-around pt-1">
            <Ring pct={d.my_completion_rate??0} size={84} color="#6366f1" label="Completed" sub={`${d.my_done??0}/${d.my_tasks}`}/>
            <div className="space-y-3 pr-2">
              {[{l:'Todo',v:d.my_todo,c:STATUS_COLORS.todo},{l:'In Progress',v:d.my_in_progress,c:STATUS_COLORS.in_progress},{l:'Done',v:d.my_done,c:STATUS_COLORS.done}].map(s=>(
                <div key={s.l} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{background:s.c}}/>
                  <span className="text-xs text-gray-500">{s.l}</span>
                  <span className="text-xs font-bold text-gray-700 ml-auto pl-3 tabular-nums">{s.v??0}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card title="By Status"   icon={Activity}><HBar data={d.my_tasks_by_status??{}}   colorFn={k=>STATUS_COLORS[k]??'#94a3b8'}/></Card>
        <Card title="By Priority" icon={Flame}>   <HBar data={d.my_tasks_by_priority??{}} colorFn={k=>PRIORITY_COLORS[k]??'#94a3b8'}/></Card>
      </div>

      <Card title="My Recent Tasks" icon={ListTodo} action={<SeeAll to="/tasks"/>}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-0.5">
          {(d.my_recent_tasks??[]).map((t:any)=><TRow key={t.id} task={t}/>)}
          {!d.my_recent_tasks?.length&&<p className="text-sm text-gray-400 py-6">No tasks assigned yet</p>}
        </div>
      </Card>
    </div>
  );
}

// ── DEVELOPER ────────────────────────────────────────────────────────

function DeveloperDash({d}:{d:any}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="My Tasks"    value={d.my_tasks}              icon={ListTodo}      color="indigo" sub={`${d.todo_tasks??0} to do`}/>
        <StatCard label="In Progress" value={d.in_progress_tasks??0}  icon={Clock}         color="blue"   sub={`${d.in_review_tasks??0} in review`}/>
        <StatCard label="Completed"   value={d.done_tasks??0}         icon={CheckCircle2}  color="green"  sub={`${d.completion_rate??0}% rate`}/>
        <StatCard label="Overdue"     value={d.overdue_tasks??0}      icon={AlertTriangle} color="red"    sub={`${d.due_today??0} due today`}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Progress" icon={Target}>
          <div className="flex items-center justify-around pt-1">
            <Ring pct={d.completion_rate??0} size={84} color="#6366f1" label="Done" sub={`${d.done_tasks??0}/${d.my_tasks}`}/>
            <div className="space-y-2 pr-2">
              {[{l:'Todo',v:d.todo_tasks,c:STATUS_COLORS.todo},{l:'In Progress',v:d.in_progress_tasks,c:STATUS_COLORS.in_progress},{l:'In Review',v:d.in_review_tasks,c:STATUS_COLORS.in_review},{l:'Done',v:d.done_tasks,c:STATUS_COLORS.done}].map(s=>(
                <div key={s.l} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{background:s.c}}/>
                  <span className="text-xs text-gray-500">{s.l}</span>
                  <span className="text-xs font-bold text-gray-700 ml-auto pl-3 tabular-nums">{s.v??0}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card title="By Status" icon={Activity}><HBar data={d.tasks_by_status??{}} colorFn={k=>STATUS_COLORS[k]??'#94a3b8'}/></Card>
        <Card title="By Type"   icon={Zap}><Donut data={d.tasks_by_type??{}} colorFn={k=>TYPE_COLORS[k]??'#94a3b8'} size={84}/></Card>
      </div>

      {(d.urgent_tasks??[]).length>0&&(
        <Card title="Urgent Tasks" icon={Flame} accent="#ef4444">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-0.5">
            {d.urgent_tasks.map((t:any)=><TRow key={t.id} task={t}/>)}
          </div>
        </Card>
      )}

      <Card title="My Recent Tasks" icon={ListTodo} action={<SeeAll to="/tasks"/>}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-0.5">
          {(d.recent_tasks??[]).map((t:any)=><TRow key={t.id} task={t}/>)}
          {!d.recent_tasks?.length&&<p className="text-sm text-gray-400 py-6">No tasks assigned yet</p>}
        </div>
      </Card>
    </div>
  );
}

// ── DESIGNER ─────────────────────────────────────────────────────────

function DesignerDash({d}:{d:any}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="My Tasks"     value={d.my_tasks}           icon={ListTodo}      color="pink"   sub={`${d.todo_tasks??0} to do`}/>
        <StatCard label="Design Tasks" value={d.design_tasks??0}    icon={Zap}           color="purple" sub="features & improvements"/>
        <StatCard label="In Review"    value={d.review_tasks??0}    icon={Eye}           color="indigo"/>
        <StatCard label="Overdue"      value={d.overdue_tasks??0}   icon={AlertTriangle} color="red"    sub={`${d.completion_rate??0}% done`}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Progress" icon={Target}>
          <div className="flex items-center justify-around pt-1">
            <Ring pct={d.completion_rate??0} size={84} color="#ec4899" label="Completed" sub={`${d.done_tasks??0}/${d.my_tasks}`}/>
            <div className="space-y-3 pr-2">
              {[{l:'Todo',v:d.todo_tasks,c:STATUS_COLORS.todo},{l:'In Progress',v:d.in_progress_tasks,c:'#ec4899'},{l:'Done',v:d.done_tasks,c:STATUS_COLORS.done}].map(s=>(
                <div key={s.l} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{background:s.c}}/>
                  <span className="text-xs text-gray-500">{s.l}</span>
                  <span className="text-xs font-bold text-gray-700 ml-auto pl-3 tabular-nums">{s.v??0}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card title="By Status"   icon={Activity}><HBar data={d.tasks_by_status??{}}   colorFn={k=>STATUS_COLORS[k]??'#94a3b8'}/></Card>
        <Card title="By Priority" icon={Flame}>   <HBar data={d.tasks_by_priority??{}} colorFn={k=>PRIORITY_COLORS[k]??'#94a3b8'}/></Card>
      </div>

      {(d.urgent_tasks??[]).length>0&&(
        <Card title="Urgent Tasks" icon={Flame} accent="#ec4899">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-0.5">
            {d.urgent_tasks.map((t:any)=><TRow key={t.id} task={t}/>)}
          </div>
        </Card>
      )}

      <Card title="My Recent Tasks" icon={ListTodo} action={<SeeAll to="/tasks" c="text-pink-500 hover:text-pink-700"/>}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-0.5">
          {(d.recent_tasks??[]).map((t:any)=><TRow key={t.id} task={t}/>)}
          {!d.recent_tasks?.length&&<p className="text-sm text-gray-400 py-6">No tasks assigned yet</p>}
        </div>
      </Card>
    </div>
  );
}

// ── TESTER ───────────────────────────────────────────────────────────

function TesterDash({d}:{d:any}) {
  const bfr=d.bug_fix_rate??0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="My Tasks"   value={d.my_tasks}          icon={ListTodo}      color="orange" sub={`${d.in_review_tasks??0} in review`}/>
        <StatCard label="Open Bugs"  value={d.open_bugs??0}      icon={Bug}           color="red"    sub={`${d.total_bugs??0} total`}/>
        <StatCard label="Bugs Fixed" value={d.closed_bugs??0}    icon={CheckCircle2}  color="green"  sub={`${bfr}% fix rate`}/>
        <StatCard label="Overdue"    value={d.overdue_tasks??0}  icon={AlertTriangle} color="amber"  sub={`${d.completion_rate??0}% done`}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Bug Fix Rate" icon={Target}>
          <div className="flex items-center justify-around pt-1">
            <Ring pct={bfr} size={84} color="#f97316" label="Fixed" sub={`${d.closed_bugs??0}/${d.total_bugs??0}`}/>
            <div className="space-y-4 pr-2">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-red-500 tabular-nums">{d.open_bugs??0}</p>
                <p className="text-xs text-gray-400">Open Bugs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-emerald-500 tabular-nums">{d.closed_bugs??0}</p>
                <p className="text-xs text-gray-400">Fixed</p>
              </div>
            </div>
          </div>
        </Card>
        <Card title="Task Completion" icon={Activity}>
          <div className="flex flex-col items-center pt-1">
            <Ring pct={d.completion_rate??0} size={84} color="#22c55e" label="Completed"/>
          </div>
        </Card>
        <Card title="By Status" icon={BarChart3}><HBar data={d.tasks_by_status??{}} colorFn={k=>STATUS_COLORS[k]??'#94a3b8'}/></Card>
      </div>

      {(d.critical_bugs??[]).length>0&&(
        <Card title="Critical Bugs" icon={Bug} accent="#ef4444">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-0.5">
            {d.critical_bugs.map((t:any)=><TRow key={t.id} task={t} showType/>)}
          </div>
        </Card>
      )}

      <Card title="Recent Tasks" icon={ListTodo} action={<SeeAll to="/tasks" c="text-orange-500 hover:text-orange-700"/>}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-0.5">
          {(d.recent_tasks??[]).map((t:any)=><TRow key={t.id} task={t} showType/>)}
          {!d.recent_tasks?.length&&<p className="text-sm text-gray-400 py-6">No tasks assigned yet</p>}
        </div>
      </Card>
    </div>
  );
}

// ── HR ───────────────────────────────────────────────────────────────

function HrDash({d}:{d:any}) {
  const ar=d.total_employees>0?Math.round((d.active_employees/d.total_employees)*100):0;
  const gp=(d.headcount_growth??0)>=0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Employees" value={d.total_employees}    icon={Users}     color="teal"   sub="all headcount"/>
        <StatCard label="Active"          value={d.active_employees}   icon={UserCheck} color="green"  sub={`${ar}% active rate`}/>
        <StatCard label="Inactive"        value={d.inactive_employees} icon={UserX}     color="gray"/>
        <StatCard label="New This Month"  value={d.new_this_month}     icon={TrendingUp} color="indigo"
          trend={{value:d.headcount_growth??0,label:'vs last month'}}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Team Composition" icon={Shield}>
          <Donut data={d.employees_by_role??{}} colorFn={k=>ROLE_COLORS[k]??'#94a3b8'} size={90}/>
          <div className="mt-4 pt-4 border-t border-gray-50">
            <HBar data={d.employees_by_role??{}} colorFn={k=>ROLE_COLORS[k]??'#94a3b8'}/>
          </div>
        </Card>
        <Card title="Headcount Overview" icon={Users}>
          <div className="flex items-center justify-around pt-2">
            <Ring pct={ar} size={84} color="#14b8a6" label="Active Rate"/>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-gray-800 tabular-nums">{d.total_employees}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
              <div className={`flex items-center gap-1.5 justify-center ${gp?'text-emerald-600':'text-red-500'}`}>
                {gp?<ArrowUpRight className="w-4 h-4"/>:<ArrowDownRight className="w-4 h-4"/>}
                <span className="text-sm font-bold">{Math.abs(d.headcount_growth??0)}% growth</span>
              </div>
              <div className="flex items-center justify-center gap-4 text-center">
                <div>
                  <p className="text-lg font-extrabold text-emerald-500 tabular-nums">{d.active_employees}</p>
                  <p className="text-[10px] text-gray-400">Active</p>
                </div>
                <div className="w-px h-8 bg-gray-100"/>
                <div>
                  <p className="text-lg font-extrabold text-gray-400 tabular-nums">{d.inactive_employees}</p>
                  <p className="text-[10px] text-gray-400">Inactive</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Recent Hires" icon={CalendarClock} action={<SeeAll to="/users" c="text-teal-500 hover:text-teal-700"/>}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
          {(d.recent_hires??[]).map((u:any)=>{
            const rc=ROLE_COLORS[u.roles?.[0]?.name??'']??'#14b8a6';
            return (
              <div key={u.id} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-xl hover:bg-gray-50 transition-colors">
                <Av name={u.name} sz={8} color={rc}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{u.job_title||u.department||u.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Pill value={u.roles?.[0]?.name??'member'} type="role"/>
                  <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(u.created_at)}</p>
                </div>
              </div>
            );
          })}
          {!d.recent_hires?.length&&<p className="text-sm text-gray-400 py-6">No recent hires</p>}
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Main Dashboard export
// ══════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const {user:authUser} = useAppSelector(s=>s.auth);
  const [dash,setDash]   = useState<any>(null);
  const [loading,setL]   = useState(true);
  const [error,setError] = useState('');

  const load = async () => {
    setL(true); setError('');
    try { const r = await api.get('/dashboard'); setDash(r.data); }
    catch(e:any) { setError(e?.response?.data?.message??'Failed to load dashboard'); }
    finally { setL(false); }
  };

  useEffect(()=>{load();},[]);

  const role     = dash?.role ?? (authUser as any)?.roles?.[0]?.name ?? '';
  const userName = dash?.user?.name ?? (authUser as any)?.name ?? '';
  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';

  const ROLE_META:Record<string,{from:string;to:string;emoji:string}> = {
    admin:      {from:'#4f46e5',to:'#7c3aed', emoji:'🛡️'},
    manager:    {from:'#7c3aed',to:'#db2777', emoji:'📊'},
    team_leader:{from:'#2563eb',to:'#0891b2', emoji:'🎯'},
    developer:  {from:'#0284c7',to:'#2563eb', emoji:'💻'},
    designer:   {from:'#db2777',to:'#9333ea', emoji:'🎨'},
    tester:     {from:'#ea580c',to:'#d97706', emoji:'🔍'},
    hr:         {from:'#0d9488',to:'#059669', emoji:'🤝'},
  };
  const meta = ROLE_META[role]??ROLE_META.developer;

  const renderContent = () => {
    if(!dash) return null;
    const d = dash.data;
    switch(role){
      case 'admin':       return <AdminDash      d={d}/>;
      case 'manager':     return <ManagerDash    d={d}/>;
      case 'team_leader': return <TeamLeaderDash d={d}/>;
      case 'developer':   return <DeveloperDash  d={d}/>;
      case 'designer':    return <DesignerDash   d={d}/>;
      case 'tester':      return <TesterDash     d={d}/>;
      case 'hr':          return <HrDash         d={d}/>;
      default:            return <DeveloperDash  d={d}/>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Dashboard"/>
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">

        {/* Welcome banner */}
        <div className="relative rounded-2xl overflow-hidden shadow-lg text-white p-6 flex items-center justify-between gap-4"
          style={{background:`linear-gradient(135deg,${meta.from},${meta.to})`}}>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10 bg-white"/>
          <div className="absolute -bottom-8 right-16 w-24 h-24 rounded-full opacity-10 bg-white"/>
          <div className="relative">
            <p className="text-white/70 text-sm font-medium">{greeting} {meta.emoji}</p>
            <h1 className="text-2xl font-extrabold mt-0.5 tracking-tight">{userName||'Welcome'}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="bg-white/20 backdrop-blur-sm px-3 py-0.5 rounded-full text-xs font-bold capitalize">
                {fmtRole(role)}
              </span>
              <span className="text-white/60 text-xs hidden sm:block">
                {now.toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
              </span>
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="relative flex-shrink-0 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center transition-colors"
            title="Refresh">
            <RefreshCw className={`w-4 h-4 text-white ${loading?'animate-spin':''}`}/>
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin"
              style={{borderTopColor:meta.from}}/>
            <p className="text-sm text-gray-400">Loading your dashboard…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertTriangle className="w-10 h-10 text-red-400"/>
            <p className="text-sm text-red-500 font-medium">{error}</p>
            <button onClick={load}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
              Retry
            </button>
          </div>
        ) : renderContent()}

      </div>
    </div>
  );
}