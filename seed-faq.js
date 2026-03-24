const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://daervzofihzytmvynkpi.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZXJ2em9maWh6eXRtdnlua3BpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY5MjIwNiwiZXhwIjoyMDg5MjY4MjA2fQ.-f0Sr3rzZV4za51mE5Gr-Pq5wuMki964Rqh4UypGvJ8');

(async () => {
  try {
    const faqItems = [
      {question: 'Qual é o horário de atendimento?', answer: 'Seg a Sex: 7h às 17h. Atendimento ao público até 16h.', category: 'Administrativo', audience: 'Responsáveis'},
      {question: 'Como faço para solicitar documentos?', answer: 'Compareça à secretaria com seu RG e CPF. Documentos simples são emitidos na hora.', category: 'Administrativo', audience: 'Responsáveis'},
      {question: 'Qual é a data de matrícula?', answer: 'Inscrições de fevereiro a março. Matrícula de março a abril.', category: 'Administrativo', audience: 'Responsáveis'},
      {question: 'Como participar de atividades extracurriculares?', answer: 'Inscrições abertas em janeiro. Consulte o mural ou converse com sua coordenação de turma.', category: 'Acadêmico', audience: 'Estudantes'},
      {question: 'Como consultar notas?', answer: 'Acesse o portal do aluno com suas credenciais. Boletins são enviados trimestralmente.', category: 'Acadêmico', audience: 'Responsáveis'}
    ];

    const schoolIds = ['b771fe3e-e95c-4db1-a6e0-962eb4ea254a', 'c5166e00-2e7a-445a-9946-d56380ad4a32', '314c2676-73b8-47e6-8582-29cadfaa3863'];
    
    for(const schoolId of schoolIds){
      const {data: existing, error: checkErr} = await supabase.from('official_content_records').select('id').eq('school_id', schoolId).eq('module_key', 'faq').eq('scope_key', 'school').single();
      
      if(!existing && !checkErr){
        const {data, error} = await supabase.from('official_content_records').insert([{
          school_id: schoolId, 
          module_key: 'faq', 
          scope_key: 'school', 
          title: 'FAQ da Escola', 
          summary: 'Perguntas e respostas frequentes sobre atendimento, documentos e atividades escolar.',
          content_payload: {items: faqItems}, 
          status: 'published', 
          updated_by: 'admin-seed'
        }]);
        
        if(error) console.log('⚠ Error for school', schoolId, error.message);
        else console.log('✓ Created FAQ for school:', schoolId);
      } else {
        console.log('- FAQ exists for school:', schoolId);
      }
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
})();
