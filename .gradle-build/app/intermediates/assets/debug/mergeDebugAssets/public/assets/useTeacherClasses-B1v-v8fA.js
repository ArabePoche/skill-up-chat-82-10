import{aR as o,Q as l,U as _}from"./index-DCCXDwBm.js";const m=(t,a)=>{const{user:e}=o();return l({queryKey:["teacher-classes",t,a,e==null?void 0:e.id],queryFn:async()=>{if(!t||!a||!(e!=null&&e.id))return[];const{data:n,error:i}=await _.from("class_subjects").select(`
          id,
          coefficient,
          class_id,
          classes!inner (
            id,
            name,
            cycle,
            current_students,
            max_students,
            school_id,
            school_year_id
          ),
          subjects!inner (
            id,
            name
          )
        `).eq("teacher_id",e.id).eq("classes.school_id",t).eq("classes.school_year_id",a);if(i)throw console.error("Error fetching teacher classes:",i),i;const c=new Map;return n==null||n.forEach(r=>{var d;const s=r.classes,u=r.subjects;c.has(s.id)||c.set(s.id,{id:s.id,name:s.name,cycle:s.cycle,current_students:s.current_students,max_students:s.max_students,subjects:[]}),(d=c.get(s.id))==null||d.subjects.push({id:u.id,name:u.name,coefficient:r.coefficient})}),Array.from(c.values())},enabled:!!t&&!!a&&!!(e!=null&&e.id)})};export{m as u};
