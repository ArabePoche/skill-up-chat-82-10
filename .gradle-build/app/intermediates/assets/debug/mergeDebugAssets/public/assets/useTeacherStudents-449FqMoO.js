import{aR as l,Q as m,U as _}from"./index-DCCXDwBm.js";const f=(a,r)=>{const{user:e}=l();return m({queryKey:["teacher-students",a,r,e==null?void 0:e.id],queryFn:async()=>{if(!a||!r||!(e!=null&&e.id))return[];const{data:t,error:n}=await _.from("class_subjects").select(`
          class_id,
          classes!inner (
            id,
            name,
            school_id,
            school_year_id
          )
        `).eq("teacher_id",e.id).eq("classes.school_id",a).eq("classes.school_year_id",r);if(n)throw console.error("Error fetching teacher class subjects:",n),n;const d=[...new Set((t==null?void 0:t.map(s=>s.class_id))||[])];if(d.length===0)return[];const{data:c,error:i}=await _.from("students_school").select(`
          id,
          first_name,
          last_name,
          student_code,
          gender,
          class_id,
          classes (
            name
          )
        `).in("class_id",d).order("last_name");if(i)throw console.error("Error fetching students:",i),i;return(c==null?void 0:c.map(s=>{var o;return{id:s.id,first_name:s.first_name,last_name:s.last_name,student_code:s.student_code,gender:s.gender,class_id:s.class_id,class_name:((o=s.classes)==null?void 0:o.name)||""}}))||[]},enabled:!!a&&!!r&&!!(e!=null&&e.id)})};export{f as u};
