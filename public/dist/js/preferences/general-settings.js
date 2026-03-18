// js/preferences/general-settings.js

document.addEventListener('DOMContentLoaded', () => {
    // Aguarda carregar o core e o schoolId
    const wait = setInterval(() => {
        if (window.supabaseClient && sessionStorage.getItem('SCHOOL_ID')) {
            clearInterval(wait);
            carregarFusoAtual();
        }
    }, 500);
});

async function carregarFusoAtual() {
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    const _supabase = window.supabaseClient;

    const { data, error } = await _supabase
        .from('schools')
        .select('timezone')
        .eq('id', schoolId)
        .single();

    if (data && data.timezone) {
        const select = document.getElementById('schoolTimezone');
        if(select) select.value = data.timezone;
    }
}

async function salvarFusoHorario() {
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    const _supabase = window.supabaseClient;
    const novoFuso = document.getElementById('schoolTimezone').value;
    const btn = document.querySelector('button[onclick="salvarFusoHorario()"]');

    // Feedback visual
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btn.disabled = true;

    try {
        const { error } = await _supabase
            .from('schools')
            .update({ timezone: novoFuso })
            .eq('id', schoolId);

        if (error) throw error;

        // Sucesso
        Swal.fire({
            icon: 'success',
            title: 'Fuso Horário Atualizado!',
            text: 'Os relatórios de IA agora usarão essa região.',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Não foi possível salvar o fuso horário.', 'error');
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}