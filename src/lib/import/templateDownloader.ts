import type { ImportType } from './templateSchemas';

/**
 * CSV template content for each import type
 */
const TEMPLATES: Record<ImportType, string> = {
  items: `item_id,form_id,item_type,sequence_number,stimulus,text,choices,correct_answer,scoring_tags,sentence_id,skill_tag,genre,word_count,sentence_count
{ASSESSMENT_ID}.G2.form01.passage01,{ASSESSMENT_ID}.G2.form01,passage,1,"","The Lost Ball. Max had a red ball. He rolled it down the hill.","","",narrative,,,narrative,25,3
{ASSESSMENT_ID}.G2.form01.recall.s1,{ASSESSMENT_ID}.G2.form01,recall_sentence_unit,2,"","Max had a red ball.","","",recall,s1,,,
{ASSESSMENT_ID}.G2.form01.q1,{ASSESSMENT_ID}.G2.form01,mcq_item,3,"What color was Max's ball?","",Blue|Red|Green|Yellow,Red,mcq|key_detail,,key_detail,,`,

  forms: `form_id,assessment_id,content_bank_id,grade_or_level_tag,form_number,status,equivalence_set_id
{ASSESSMENT_ID}.G2.form01,{ASSESSMENT_ID},{ASSESSMENT_ID}.bank1,G2,1,draft,
{ASSESSMENT_ID}.G3.form01,{ASSESSMENT_ID},{ASSESSMENT_ID}.bank1,G3,1,draft,`,

  banks: `content_bank_id,linked_assessment_id,name,target_bank_size,equivalence_set_required,differentiation_keys,status
{ASSESSMENT_ID}.bank1,{ASSESSMENT_ID},{ASSESSMENT_NAME} Content Bank,100,false,grade|form,empty`,

  asr: `asr_version_id,assessment_id,section,field,value
{ASSESSMENT_ID}.v1,{ASSESSMENT_ID},section_a,assessment_name,{ASSESSMENT_NAME}
{ASSESSMENT_ID}.v1,{ASSESSMENT_ID},section_a,version,1.0
{ASSESSMENT_ID}.v1,{ASSESSMENT_ID},section_b,component,{COMPONENT}
{ASSESSMENT_ID}.v1,{ASSESSMENT_ID},section_e,total_items,50`,

  scoring: `scoring_model_id,assessment_id,metric_type,metric_id,metric_name,metric_data_type,formula
{ASSESSMENT_ID}.scoring01,{ASSESSMENT_ID},raw,items_correct,Items Correct,count,
{ASSESSMENT_ID}.scoring01,{ASSESSMENT_ID},raw,items_total,Items Total,count,
{ASSESSMENT_ID}.scoring01,{ASSESSMENT_ID},derived,accuracy,Accuracy,rate,(items_correct/items_total)*100`,
};

/**
 * Get template content with placeholders replaced
 */
export function getTemplateContent(
  type: ImportType,
  assessmentId: string,
  assessmentName?: string,
  component?: string
): string {
  let content = TEMPLATES[type];
  
  content = content.replace(/{ASSESSMENT_ID}/g, assessmentId);
  content = content.replace(/{ASSESSMENT_NAME}/g, assessmentName || assessmentId);
  content = content.replace(/{COMPONENT}/g, component || 'Component');
  
  return content;
}

/**
 * Download template as CSV file
 */
export function downloadTemplate(
  type: ImportType,
  assessmentId: string,
  assessmentName?: string,
  component?: string
): void {
  const content = getTemplateContent(type, assessmentId, assessmentName, component);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${type}_${assessmentId}_template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get template description
 */
export function getTemplateDescription(type: ImportType): string {
  switch (type) {
    case 'items':
      return 'Items template includes comprehension support with sentence_id, skill_tag, and genre columns. Use pipe (|) for choices and scoring_tags.';
    case 'forms':
      return 'Forms template defines form structure with grade tags and bank references. form_number should be unique per grade.';
    case 'banks':
      return 'Banks template creates content bank metadata. Use pipe (|) for differentiation_keys.';
    case 'asr':
      return 'ASR template uses vertical format (one field per row) for updating assessment specification sections.';
    case 'scoring':
      return 'Scoring template defines raw and derived metrics. Derived metrics can include formulas.';
  }
}
