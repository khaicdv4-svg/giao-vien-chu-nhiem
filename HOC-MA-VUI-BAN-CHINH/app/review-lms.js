(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HmvReviewLms=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function exportAttempt(attempt,mapping,format='json'){
 if(!attempt||attempt.status!=='graded'||!Number.isFinite(attempt.score)||!Number.isFinite(attempt.maxScore)||attempt.maxScore<=0||attempt.score<0||attempt.score>attempt.maxScore||attempt.pendingManual>0)throw Error('Only fully graded attempts may be exported');
 if(!mapping||!['externalStudentId','assignmentId'].every(key=>typeof mapping[key]==='string'&&mapping[key].trim()))throw Error('Explicit external student and assignment mapping required');
 if(typeof attempt.id!=='string'||!attempt.id.trim())throw Error('Attempt id required');
 const row={schema:'hmv-attempt-interchange',version:1,attemptId:attempt.id,externalStudentId:mapping.externalStudentId,assignmentId:mapping.assignmentId,score:attempt.score,maxScore:attempt.maxScore};
 if(format==='json')return row;
 if(format!=='csv')throw Error('Unsupported export format');
 const cell=value=>{let text=String(value);if(/^\s*[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
 return Object.keys(row).map(cell).join(',')+'\r\n'+Object.values(row).map(cell).join(',')+'\r\n';
}
return {exportAttempt};
});
